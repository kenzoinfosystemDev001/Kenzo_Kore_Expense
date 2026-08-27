export interface DirectoryEmployee {
  externalDirectoryId: string;
  employeeId?: string;
  primaryEmail: string;
  secondaryEmail?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  costCenter?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEPROVISIONED' | 'PENDING';
  source: 'GOOGLE_WORKSPACE' | 'SCIM' | 'MANUAL_SYNC' | 'INTERNAL_DIRECTORY';
  metadata?: Record<string, any>;
}

export interface EligibilityResult {
  isEligible: boolean;
  reason?: string;
  status?: 'NOT_FOUND' | 'SUSPENDED' | 'ALREADY_ACTIVATED' | 'ELIGIBLE';
  employee?: DirectoryEmployee;
  userAlreadyExists?: boolean;
}

export interface IIdentityProvider {
  readonly providerName: string;
  lookupByEmail(email: string): Promise<DirectoryEmployee | null>;
  lookupById(externalDirectoryId: string): Promise<DirectoryEmployee | null>;
  checkEligibility(email: string): Promise<EligibilityResult>;
}
