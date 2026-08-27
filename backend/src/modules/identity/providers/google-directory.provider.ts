import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DirectoryEmployee, EligibilityResult, IIdentityProvider } from '../interfaces/identity-provider.interface';

@Injectable()
export class GoogleDirectoryProvider implements IIdentityProvider {
  private readonly logger = new Logger(GoogleDirectoryProvider.name);
  readonly providerName = 'GOOGLE_WORKSPACE';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up employee identity from authoritative Google Cloud Identity / Workspace SCIM Directory.
   * Directly queries the live Google Cloud Identity SCIM 2.0 API in real-time.
   */
  async lookupByEmail(email: string): Promise<DirectoryEmployee | null> {
    const cleanEmail = email.trim().toLowerCase();
    const scimBaseUrl = process.env.GOOGLE_SCIM_BASE_URL;
    const scimApiKey = process.env.GOOGLE_SCIM_API_KEY;

    if (scimBaseUrl && scimApiKey) {
      try {
        const filterQuery = encodeURIComponent(`userName eq "${cleanEmail}"`);
        const targetUrl = `${scimBaseUrl}/Users?filter=${filterQuery}`;

        this.logger.log(`Querying Google Cloud Identity SCIM directory for: ${cleanEmail}`);

        const response = await fetch(targetUrl, {
          headers: {
            'Authorization': `Bearer ${scimApiKey}`,
            'Content-Type': 'application/scim+json',
            'Accept': 'application/scim+json, application/json',
          },
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data && data.resources && data.resources.length > 0) {
            const googleUser = data.resources[0];
            const googleId = googleUser.id || `goog_${Date.now()}`;
            const givenName = googleUser.name?.givenName || cleanEmail.split('@')[0];
            const familyName = googleUser.name?.familyName || '';
            const displayName = googleUser.name?.formatted || `${givenName} ${familyName}`.trim();
            const isActive = googleUser.active !== false;
            const status = isActive ? 'ACTIVE' : 'SUSPENDED';

            this.logger.log(`Google Cloud Identity verified employee: ${displayName} (Google ID: ${googleId}, Active: ${isActive})`);

            // Synchronize and upsert into PostgreSQL EmployeeIdentity mirror table
            const synchronizedRecord = await this.prisma.employeeIdentity.upsert({
              where: { primaryEmail: cleanEmail },
              update: {
                externalDirectoryId: googleId,
                firstName: givenName,
                lastName: familyName,
                displayName,
                status: status as any,
                source: 'GOOGLE_WORKSPACE',
                metadata: JSON.stringify({ googleCloudIdentity: googleUser }),
                lastSyncedAt: new Date(),
              },
              create: {
                externalDirectoryId: googleId,
                primaryEmail: cleanEmail,
                firstName: givenName,
                lastName: familyName,
                displayName,
                jobTitle: 'Corporate Staff',
                department: 'Engineering',
                costCenter: 'R&D Development',
                status: status as any,
                source: 'GOOGLE_WORKSPACE',
                metadata: JSON.stringify({ googleCloudIdentity: googleUser }),
                lastSyncedAt: new Date(),
              },
            });

            return {
              externalDirectoryId: synchronizedRecord.externalDirectoryId,
              employeeId: synchronizedRecord.employeeId || undefined,
              primaryEmail: synchronizedRecord.primaryEmail,
              secondaryEmail: synchronizedRecord.secondaryEmail || undefined,
              firstName: synchronizedRecord.firstName,
              lastName: synchronizedRecord.lastName,
              displayName: synchronizedRecord.displayName,
              jobTitle: synchronizedRecord.jobTitle || 'Corporate Staff',
              department: synchronizedRecord.department || 'General',
              costCenter: synchronizedRecord.costCenter || 'Corporate',
              status: synchronizedRecord.status as any,
              source: synchronizedRecord.source as any,
              metadata: googleUser,
            };
          }
        } else {
          this.logger.warn(`Google SCIM query returned status ${response.status}: ${await response.text().catch(() => '')}`);
        }
      } catch (err) {
        this.logger.error(`Error querying Google Cloud Identity SCIM endpoint:`, err);
      }
    }

    // Fallback: Query synchronized local PostgreSQL EmployeeIdentity table
    const localRecord = await this.prisma.employeeIdentity.findUnique({
      where: { primaryEmail: cleanEmail },
      include: { user: true },
    });

    if (!localRecord) {
      this.logger.warn(`Master Directory lookup: email "${cleanEmail}" not found in Google or local directory.`);
      return null;
    }

    return {
      externalDirectoryId: localRecord.externalDirectoryId,
      employeeId: localRecord.employeeId || undefined,
      primaryEmail: localRecord.primaryEmail,
      secondaryEmail: localRecord.secondaryEmail || undefined,
      firstName: localRecord.firstName,
      lastName: localRecord.lastName,
      displayName: localRecord.displayName,
      jobTitle: localRecord.jobTitle || undefined,
      department: localRecord.department || undefined,
      costCenter: localRecord.costCenter || undefined,
      status: localRecord.status as any,
      source: localRecord.source as any,
      metadata: localRecord.metadata ? JSON.parse(localRecord.metadata) : undefined,
    };
  }

  async lookupById(externalDirectoryId: string): Promise<DirectoryEmployee | null> {
    const record = await this.prisma.employeeIdentity.findUnique({
      where: { externalDirectoryId },
      include: { user: true },
    });

    if (!record) return null;

    return {
      externalDirectoryId: record.externalDirectoryId,
      employeeId: record.employeeId || undefined,
      primaryEmail: record.primaryEmail,
      secondaryEmail: record.secondaryEmail || undefined,
      firstName: record.firstName,
      lastName: record.lastName,
      displayName: record.displayName,
      jobTitle: record.jobTitle || undefined,
      department: record.department || undefined,
      costCenter: record.costCenter || undefined,
      status: record.status as any,
      source: record.source as any,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
    };
  }

  /**
   * Enforce business rules for employee eligibility against Google Cloud Identity:
   * 1. Does employee exist in Google Workspace / Cloud Identity directory?
   * 2. Is account ACTIVE or SUSPENDED/DEPROVISIONED?
   * 3. Has employee already activated an Expense account?
   */
  async checkEligibility(email: string): Promise<EligibilityResult> {
    const cleanEmail = email.trim().toLowerCase();
    const employee = await this.lookupByEmail(cleanEmail);

    if (!employee) {
      return {
        isEligible: false,
        status: 'NOT_FOUND',
        reason: 'This corporate email address was not found in the Google Cloud Identity master directory.',
      };
    }

    if (employee.status === 'SUSPENDED' || employee.status === 'DEPROVISIONED') {
      return {
        isEligible: false,
        status: 'SUSPENDED',
        reason: 'Your Google Workspace / Cloud Identity account is currently inactive or suspended. Please contact your IT administrator.',
        employee,
      };
    }

    // Check if Expense application user already exists and is activated
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { employeeIdentity: { externalDirectoryId: employee.externalDirectoryId } },
        ],
      },
    });

    if (existingUser && existingUser.passwordHash && existingUser.status === 'ACTIVE') {
      return {
        isEligible: false,
        status: 'ALREADY_ACTIVATED',
        reason: 'Your account is already activated. Please proceed to Sign In or use password recovery.',
        employee,
        userAlreadyExists: true,
      };
    }

    return {
      isEligible: true,
      status: 'ELIGIBLE',
      employee,
      userAlreadyExists: !!existingUser,
    };
  }
}
