import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kenzo Kore database with Google Master Identity & SCIM records...');

  // 1. Clean existing records in correct foreign key order
  await prisma.verificationChallenge.deleteMany({});
  await prisma.userSession.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.expenseApproval.deleteMany({});
  await prisma.reimbursement.deleteMany({});
  await prisma.expenseItem.deleteMany({});
  await prisma.expenseTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employeeIdentity.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.costCenter.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.budget.deleteMany({});

  console.log('Cleaned old records.');

  // 2. Create Cost Centers
  const ccDev = await prisma.costCenter.create({
    data: { id: 'cc_dev', name: 'R&D Development', code: 'CC-001' }
  });
  const ccSales = await prisma.costCenter.create({
    data: { id: 'cc_sales', name: 'Domestic Sales', code: 'CC-002' }
  });
  const ccCorp = await prisma.costCenter.create({
    data: { id: 'cc_corp', name: 'Corporate Headquarter', code: 'CC-003' }
  });

  // 3. Create Departments
  const deptEng = await prisma.department.create({
    data: { id: 'dept_eng', name: 'Engineering', code: 'ENG', budgetLimit: 120000.0 }
  });
  const deptSales = await prisma.department.create({
    data: { id: 'dept_sal', name: 'Sales & BD', code: 'SLS', budgetLimit: 95000.0 }
  });
  const deptOps = await prisma.department.create({
    data: { id: 'dept_ops', name: 'Operations & Finance', code: 'OPS', budgetLimit: 40000.0 }
  });
  const deptExec = await prisma.department.create({
    data: { id: 'dept_exec', name: 'Executive Suite', code: 'EXE', budgetLimit: 50000.0 }
  });

  // 4. Create Master Employee Identities (Simulating Google Workspace Directory / SCIM Synced Source)
  const idSujal = await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_sujal_01',
      externalDirectoryId: 'goog_dir_sujal_101',
      employeeId: 'KZ-ENG-101',
      primaryEmail: 'sujal.kumar@kenzoinfosystems.com',
      firstName: 'Sujal',
      lastName: 'Kumar',
      displayName: 'Sujal Kumar',
      jobTitle: 'Full-Stack Engineer',
      department: 'Engineering',
      costCenter: 'R&D Development',
      status: 'ACTIVE',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Engineering/Frontend', googleWorkspaceStatus: 'ACTIVE' }),
    }
  });

  const idChanchalani = await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_chanchalani_02',
      externalDirectoryId: 'goog_dir_chanchalani_102',
      employeeId: 'KZ-DIR-102',
      primaryEmail: 'chanchalini.saini@kenzoinfosystems.com',
      firstName: 'Chanchalani',
      lastName: 'Saini',
      displayName: 'Chanchalani saini',
      jobTitle: 'Managing Director',
      department: 'Engineering',
      costCenter: 'R&D Development',
      status: 'ACTIVE',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Executive', googleWorkspaceStatus: 'ACTIVE' }),
    }
  });

  const idAnkit = await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_ankit_03',
      externalDirectoryId: 'goog_dir_ankit_103',
      employeeId: 'KZ-SALES-103',
      primaryEmail: 'ankit.sethi@kenzoinfosystems.com',
      firstName: 'Ankit',
      lastName: 'Sethi',
      displayName: 'Ankit Sethi',
      jobTitle: 'Head of Sales & Business',
      department: 'Operations & Finance',
      costCenter: 'Corporate Headquarter',
      status: 'ACTIVE',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Sales', googleWorkspaceStatus: 'ACTIVE' }),
    }
  });

  const idJitender = await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_jitender_04',
      externalDirectoryId: 'goog_dir_jitender_104',
      employeeId: 'KZ-EXEC-104',
      primaryEmail: 'jitender.saini@kenzoinfosystems.com',
      firstName: 'Jitender',
      lastName: 'Saini',
      displayName: 'Jitender saini',
      jobTitle: 'CEO & Founder',
      department: 'Executive Suite',
      costCenter: 'Corporate Headquarter',
      status: 'ACTIVE',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Executive', googleWorkspaceStatus: 'ACTIVE' }),
    }
  });

  // Additional Eligible Company Directory Employees (Ready for Account Activation flow)
  await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_priya_05',
      externalDirectoryId: 'goog_dir_priya_105',
      employeeId: 'KZ-ENG-105',
      primaryEmail: 'priya.sharma@kenzoinfosystems.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      displayName: 'Priya Sharma',
      jobTitle: 'Senior Cloud Architect',
      department: 'Engineering',
      costCenter: 'R&D Development',
      status: 'ACTIVE',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Engineering/Cloud', googleWorkspaceStatus: 'ACTIVE' }),
    }
  });

  await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_rahul_06',
      externalDirectoryId: 'goog_dir_rahul_106',
      employeeId: 'KZ-MKT-106',
      primaryEmail: 'rahul.verma@kenzoinfosystems.com',
      firstName: 'Rahul',
      lastName: 'Verma',
      displayName: 'Rahul Verma',
      jobTitle: 'Product Marketing Lead',
      department: 'Sales & BD',
      costCenter: 'Domestic Sales',
      status: 'ACTIVE',
      source: 'SCIM',
      metadata: JSON.stringify({ scimProvisioned: true, externalId: 'scim_usr_9981' }),
    }
  });

  // Suspended Employee in Company Directory (Should be blocked from Activation and Login)
  await prisma.employeeIdentity.create({
    data: {
      id: 'emp_id_vikas_07',
      externalDirectoryId: 'goog_dir_vikas_107',
      employeeId: 'KZ-OPS-107',
      primaryEmail: 'vikas.mehta@kenzoinfosystems.com',
      firstName: 'Vikas',
      lastName: 'Mehta',
      displayName: 'Vikas Mehta',
      jobTitle: 'Operations Associate',
      department: 'Operations & Finance',
      costCenter: 'Corporate Headquarter',
      status: 'SUSPENDED',
      source: 'GOOGLE_WORKSPACE',
      metadata: JSON.stringify({ orgUnit: '/Operations', googleWorkspaceStatus: 'SUSPENDED', suspensionReason: 'Policy Investigation' }),
    }
  });

  // 5. Seed Initial Active Application Users with secure Bcrypt Salt 12 Password Hash
  const defaultPasswordHash = await bcrypt.hash('KenzoSecure@2026!', 12);

  const user1 = await prisma.user.create({
    data: {
      id: 'emp_1',
      email: 'sujal.kumar@kenzoinfosystems.com',
      passwordHash: defaultPasswordHash,
      name: 'Sujal Kumar',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Full-Stack Engineer',
      departmentId: deptEng.id,
      costCenterId: ccDev.id,
      gstNumber: '29ABCDE1234F1Z5',
      employeeIdentityId: idSujal.id,
      emailVerifiedAt: new Date(),
      activatedAt: new Date()
    }
  });

  const mgr = await prisma.user.create({
    data: {
      id: 'mgr_1',
      email: 'chanchalini.saini@kenzoinfosystems.com',
      passwordHash: defaultPasswordHash,
      name: 'Chanchalani saini',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Managing Director',
      departmentId: deptEng.id,
      costCenterId: ccDev.id,
      gstNumber: '29ABCDE1234F1Z5',
      employeeIdentityId: idChanchalani.id,
      emailVerifiedAt: new Date(),
      activatedAt: new Date()
    }
  });

  const finance = await prisma.user.create({
    data: {
      id: 'admin_1',
      email: 'ankit.sethi@kenzoinfosystems.com',
      passwordHash: defaultPasswordHash,
      name: 'Ankit Sethi',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'Head of sales & busssiness',
      departmentId: deptOps.id,
      costCenterId: ccCorp.id,
      gstNumber: '29ABCDE1234F1Z5',
      employeeIdentityId: idAnkit.id,
      emailVerifiedAt: new Date(),
      activatedAt: new Date()
    }
  });

  const superAdmin = await prisma.user.create({
    data: {
      id: 'super_1',
      email: 'jitender.saini@kenzoinfosystems.com',
      passwordHash: defaultPasswordHash,
      name: 'Jitender saini',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      designation: 'CEO & Founder',
      departmentId: deptExec.id,
      costCenterId: ccCorp.id,
      gstNumber: '29ABCDE1234F1Z5',
      employeeIdentityId: idJitender.id,
      emailVerifiedAt: new Date(),
      activatedAt: new Date()
    }
  });

  // Link Sujal's manager to Chanchalani
  await prisma.user.update({
    where: { id: user1.id },
    data: { managerId: mgr.id }
  });

  // 6. Create Policies
  await prisma.policy.createMany({
    data: [
      { name: 'Meals Policy Limit', category: 'Meals', limitAmount: 100, description: 'Daily maximum meals reimbursement limit' },
      { name: 'Flight Travel Policy', category: 'Flight', limitAmount: 1500, description: 'Flight reimbursement limits' },
      { name: 'Hotel & Accommodation Limit', category: 'Accommodation', limitAmount: 300, description: 'Nightly hotel rate limits' }
    ]
  });

  // 7. Create Budgets
  await prisma.budget.createMany({
    data: [
      { name: 'Q3 Global Travel & Conferences', allocated: 50000, spent: 22400, period: 'QUARTERLY' },
      { name: 'Q3 Client Entertainment & Meals', allocated: 15000, spent: 9150, period: 'QUARTERLY' },
      { name: 'Q3 AWS & Cloud Infrastructure', allocated: 80000, spent: 61400, period: 'QUARTERLY' }
    ]
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

