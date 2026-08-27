import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoogleDirectoryProvider } from './providers/google-directory.provider';
import { ScimProvider } from './providers/scim.provider';
import { DirectoryEmployee, EligibilityResult } from './interfaces/identity-provider.interface';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleProvider: GoogleDirectoryProvider,
    private readonly scimProvider: ScimProvider,
  ) {}

  /**
   * Verify employee eligibility against company master identity directory.
   */
  async verifyEmployeeEligibility(email: string): Promise<EligibilityResult> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check Google Directory Provider
    const result = await this.googleProvider.checkEligibility(cleanEmail);
    if (result.isEligible || result.status === 'ALREADY_ACTIVATED' || result.status === 'SUSPENDED') {
      return result;
    }

    // Fallback check SCIM Provider
    return this.scimProvider.checkEligibility(cleanEmail);
  }

  /**
   * Get employee directory identity by email
   */
  async getEmployeeByEmail(email: string): Promise<DirectoryEmployee | null> {
    return this.googleProvider.lookupByEmail(email);
  }

  /**
   * Get employee directory identity by external ID
   */
  async getEmployeeById(externalDirectoryId: string): Promise<DirectoryEmployee | null> {
    return this.googleProvider.lookupById(externalDirectoryId);
  }

  /**
   * Get Directory Synchronization Status
   */
  async getDirectoryStatus() {
    const totalIdentities = await this.prisma.employeeIdentity.count();
    const activeIdentities = await this.prisma.employeeIdentity.count({ where: { status: 'ACTIVE' } });
    const suspendedIdentities = await this.prisma.employeeIdentity.count({ where: { status: 'SUSPENDED' } });
    const activatedUsers = await this.prisma.user.count({ where: { status: 'ACTIVE' } });

    const recentSyncs = await this.prisma.employeeIdentity.findMany({
      take: 5,
      orderBy: { lastSyncedAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        primaryEmail: true,
        source: true,
        status: true,
        lastSyncedAt: true,
      }
    });

    return {
      provider: 'GOOGLE_WORKSPACE_AND_SCIM',
      healthy: true,
      metrics: {
        totalDirectoryEmployees: totalIdentities,
        activeEmployees: activeIdentities,
        suspendedEmployees: suspendedIdentities,
        activatedAppUsers: activatedUsers,
      },
      recentSyncs,
      timestamp: new Date().toISOString(),
    };
  }
}
