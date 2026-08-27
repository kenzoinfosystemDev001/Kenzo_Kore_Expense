import { PrismaService } from './src/database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { GoogleDirectoryProvider } from './src/modules/identity/providers/google-directory.provider';
import { ScimProvider } from './src/modules/identity/providers/scim.provider';
import { IdentityService } from './src/modules/identity/identity.service';
import { VerificationService } from './src/modules/auth/services/verification.service';
import { PasswordService } from './src/modules/auth/services/password.service';
import { EmailService } from './src/modules/auth/services/email.service';

const prisma = new PrismaService();
const jwtService = new JwtService({ secret: 'kenzo_kore_expense_secret_key_2026_production' });

async function runVerificationTests() {
  console.log('====================================================');
  console.log('KENZO KORE EXPENSE — IDENTITY & ACTIVATION TEST SUITE');
  console.log('====================================================\n');

  const googleProvider = new GoogleDirectoryProvider(prisma);
  const scimProvider = new ScimProvider(prisma);
  const identityService = new IdentityService(prisma, googleProvider, scimProvider);
  const emailService = new EmailService();
  const verificationService = new VerificationService(prisma, jwtService, emailService);
  const passwordService = new PasswordService();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // TEST 1: Identity Eligibility Checks
    // -----------------------------------------------------------------
    console.log('--- Phase 1: Master Directory Eligibility ---');
    
    // Non-existent email
    const nonExistent = await identityService.verifyEmployeeEligibility('unknown.employee@kenzoinfosystems.com');
    assert(!nonExistent.isEligible && nonExistent.status === 'NOT_FOUND', 'Non-existent employee rejected with NOT_FOUND');

    // Suspended employee
    const suspended = await identityService.verifyEmployeeEligibility('vikas.mehta@kenzoinfosystems.com');
    assert(!suspended.isEligible && suspended.status === 'SUSPENDED', 'Suspended employee rejected with SUSPENDED status');

    // Already activated employee
    const alreadyActivated = await identityService.verifyEmployeeEligibility('sujal.kumar@kenzoinfosystems.com');
    assert(!alreadyActivated.isEligible && alreadyActivated.status === 'ALREADY_ACTIVATED', 'Active user recognized as ALREADY_ACTIVATED');

    // Eligible unactivated employee
    const eligible = await identityService.verifyEmployeeEligibility('priya.sharma@kenzoinfosystems.com');
    assert(eligible.isEligible && eligible.status === 'ELIGIBLE' && eligible.employee?.displayName === 'Priya Sharma', 'New directory employee identified as ELIGIBLE');

    // -----------------------------------------------------------------
    // TEST 2: Verification Challenge & Hashing
    // -----------------------------------------------------------------
    console.log('\n--- Phase 2: Challenge Generation & Verification ---');
    
    // Invalidate existing for test email
    await prisma.verificationChallenge.deleteMany({ where: { email: 'priya.sharma@kenzoinfosystems.com' } });

    // Generate challenge
    const challengeRes = await verificationService.createChallenge('priya.sharma@kenzoinfosystems.com', 'ACTIVATION');
    assert(challengeRes.success && challengeRes.expiresInSeconds === 600, 'Verification challenge created with 10m expiry');

    // Check DB stores hashed code, NOT plaintext
    const dbChallenge = await prisma.verificationChallenge.findFirst({
      where: { email: 'priya.sharma@kenzoinfosystems.com', usedAt: null }
    });
    assert(!!dbChallenge && dbChallenge.codeHash.length === 64, 'Challenge stored as SHA-256 hash in database');

    // Test invalid OTP
    let failedAsExpected = false;
    try {
      await verificationService.verifyChallenge('priya.sharma@kenzoinfosystems.com', '000000', 'ACTIVATION');
    } catch {
      failedAsExpected = true;
    }
    assert(failedAsExpected, 'Invalid OTP code correctly rejected');

    // Simulate getting raw OTP from generation and verifying correctly
    // We update challenge with a known test hash
    const testOtp = '789123';
    const testHash = crypto.createHash('sha256').update(testOtp).digest('hex');
    await prisma.verificationChallenge.update({
      where: { id: dbChallenge!.id },
      data: { codeHash: testHash, attempts: 0 }
    });

    const verifyResult = await verificationService.verifyChallenge('priya.sharma@kenzoinfosystems.com', testOtp, 'ACTIVATION');
    assert(verifyResult.valid && !!verifyResult.token, 'Valid OTP verified and returned stage token');

    const tokenValid = verificationService.validateStageToken(verifyResult.token, 'priya.sharma@kenzoinfosystems.com', 'ACTIVATION');
    assert(tokenValid, 'Stage verification token cryptographic validation passed');

    // -----------------------------------------------------------------
    // TEST 3: Password Policy & Hashing
    // -----------------------------------------------------------------
    console.log('\n--- Phase 3: Password Security & Policy Enforcement ---');

    let weakRejected = false;
    try {
      await passwordService.hashPassword('weakpass');
    } catch {
      weakRejected = true;
    }
    assert(weakRejected, 'Weak password rejected by security policy validator');

    const validPassword = 'Priya@KenzoCloud2026!';
    const hashedPassword = await passwordService.hashPassword(validPassword);
    assert(hashedPassword.startsWith('$2b$12$') || hashedPassword.startsWith('$2a$12$'), 'Password securely hashed with Bcrypt 12 salt rounds');

    const matchSuccess = await passwordService.comparePassword(validPassword, hashedPassword);
    assert(matchSuccess, 'Bcrypt compare verifies valid password');

    const matchFail = await passwordService.comparePassword('WrongPassword123!', hashedPassword);
    assert(!matchFail, 'Bcrypt compare rejects invalid password');

    // -----------------------------------------------------------------
    // TEST 4: SCIM 2.0 Provisioning Engine
    // -----------------------------------------------------------------
    console.log('\n--- Phase 4: SCIM 2.0 Identity Lifecycle ---');

    const scimPayload = {
      userName: 'scim.test.employee@kenzoinfosystems.com',
      name: { formatted: 'SCIM Test User', givenName: 'SCIM', familyName: 'User' },
      title: 'DevOps Lead',
      department: 'Infrastructure',
      active: true,
      externalId: 'scim_ext_4412',
    };

    const provisioned = await scimProvider.provisionUser(scimPayload);
    assert(provisioned.primaryEmail === 'scim.test.employee@kenzoinfosystems.com' && provisioned.source === 'SCIM', 'SCIM 2.0 user provisioned directly into EmployeeIdentity');

    const scimCheck = await identityService.verifyEmployeeEligibility('scim.test.employee@kenzoinfosystems.com');
    assert(scimCheck.isEligible && scimCheck.status === 'ELIGIBLE', 'SCIM provisioned employee immediately eligible for activation without manual entry');

    // Deprovision SCIM user
    const deprovisionPayload = { ...scimPayload, active: false };
    await scimProvider.provisionUser(deprovisionPayload);
    const deprovisionCheck = await identityService.verifyEmployeeEligibility('scim.test.employee@kenzoinfosystems.com');
    assert(!deprovisionCheck.isEligible && deprovisionCheck.status === 'SUSPENDED', 'Deprovisioned SCIM employee immediately blocked from activation');

    // Clean up test SCIM user
    await prisma.employeeIdentity.deleteMany({ where: { primaryEmail: 'scim.test.employee@kenzoinfosystems.com' } });

    // -----------------------------------------------------------------
    // TEST 5: Directory Synchronization Status
    // -----------------------------------------------------------------
    console.log('\n--- Phase 5: Directory Status & Metrics ---');
    const dirStatus = await identityService.getDirectoryStatus();
    assert(dirStatus.healthy && dirStatus.metrics.totalDirectoryEmployees > 0, 'Directory status health check and employee metrics verified');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationTests();
