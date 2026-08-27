import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DirectoryEmployee, EligibilityResult, IIdentityProvider } from '../interfaces/identity-provider.interface';

export interface ScimUserResource {
  schemas?: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    formatted?: string;
    familyName?: string;
    givenName?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  active?: boolean;
  title?: string;
  department?: string;
  costCenter?: string;
}

@Injectable()
export class ScimProvider implements IIdentityProvider {
  private readonly logger = new Logger(ScimProvider.name);
  readonly providerName = 'SCIM';

  constructor(private readonly prisma: PrismaService) {}

  async lookupByEmail(email: string): Promise<DirectoryEmployee | null> {
    const cleanEmail = email.trim().toLowerCase();
    const record = await this.prisma.employeeIdentity.findUnique({
      where: { primaryEmail: cleanEmail },
      include: { user: true }
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

  async lookupById(externalDirectoryId: string): Promise<DirectoryEmployee | null> {
    const record = await this.prisma.employeeIdentity.findUnique({
      where: { externalDirectoryId },
      include: { user: true }
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

  async checkEligibility(email: string): Promise<EligibilityResult> {
    const cleanEmail = email.trim().toLowerCase();
    const employee = await this.lookupByEmail(cleanEmail);

    if (!employee) {
      return {
        isEligible: false,
        status: 'NOT_FOUND',
        reason: 'Employee email not provisioned in SCIM directory.',
      };
    }

    if (employee.status !== 'ACTIVE') {
      return {
        isEligible: false,
        status: 'SUSPENDED',
        reason: 'Account is deactivated in corporate directory.',
        employee,
      };
    }

    return {
      isEligible: true,
      status: 'ELIGIBLE',
      employee,
    };
  }

  /**
   * Provision or update employee identity via SCIM 2.0 payload
   */
  async provisionUser(resource: ScimUserResource) {
    const primaryEmail = (
      resource.emails?.find(e => e.primary)?.value ||
      resource.emails?.[0]?.value ||
      resource.userName
    ).trim().toLowerCase();

    const externalId = resource.externalId || resource.id || `scim_${Date.now()}`;
    const givenName = resource.name?.givenName || resource.userName.split('@')[0];
    const familyName = resource.name?.familyName || '';
    const displayName = resource.name?.formatted || `${givenName} ${familyName}`.trim();
    const status = resource.active === false ? 'SUSPENDED' : 'ACTIVE';

    this.logger.log(`Provisioning SCIM User: ${primaryEmail} (externalId: ${externalId}, status: ${status})`);

    const identity = await this.prisma.employeeIdentity.upsert({
      where: { primaryEmail },
      update: {
        externalDirectoryId: externalId,
        firstName: givenName,
        lastName: familyName,
        displayName,
        jobTitle: resource.title || undefined,
        department: resource.department || undefined,
        status: status as any,
        source: 'SCIM',
        metadata: JSON.stringify({ scimPayload: resource }),
        lastSyncedAt: new Date(),
      },
      create: {
        externalDirectoryId: externalId,
        primaryEmail,
        firstName: givenName,
        lastName: familyName,
        displayName,
        jobTitle: resource.title || 'Staff',
        department: resource.department || 'General',
        costCenter: resource.costCenter || 'Corporate',
        status: status as any,
        source: 'SCIM',
        metadata: JSON.stringify({ scimPayload: resource }),
        lastSyncedAt: new Date(),
      }
    });

    // If account was suspended/deactivated via SCIM, synchronize application user status
    if (status === 'SUSPENDED') {
      await this.prisma.user.updateMany({
        where: { employeeIdentityId: identity.id },
        data: { status: 'SUSPENDED' }
      });
    }

    return identity;
  }
}
