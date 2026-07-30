import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kenzo Kore database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.expenseApproval.deleteMany({});
  await prisma.reimbursement.deleteMany({});
  await prisma.expenseItem.deleteMany({});
  await prisma.expenseTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.user.deleteMany({});
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

  // 4. Create Users
  const user1 = await prisma.user.create({
    data: {
      id: 'emp_1',
      email: 'sujal.kumar@kenzo.com',
      password: 'password123',
      name: 'Sujal Kumar',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'EMPLOYEE',
      designation: 'Senior Frontend Engineer',
      departmentId: deptEng.id,
      costCenterId: ccDev.id,
      gstNumber: '29ABCDE1234F1Z5'
    }
  });

  const mgr = await prisma.user.create({
    data: {
      id: 'mgr_1',
      email: 'vikram.aditya@kenzo.com',
      password: 'password123',
      name: 'Vikram Aditya',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'ADMIN',
      designation: 'Engineering Manager',
      departmentId: deptEng.id,
      costCenterId: ccDev.id,
      gstNumber: '29ABCDE1234F1Z5'
    }
  });

  const finance = await prisma.user.create({
    data: {
      id: 'admin_1',
      email: 'finance.admin@kenzo.com',
      password: 'password123',
      name: 'Kenzo HR & Admin',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'ADMIN',
      designation: 'VP of Finance & Ops',
      departmentId: deptOps.id,
      costCenterId: ccCorp.id,
      gstNumber: '29ABCDE1234F1Z5'
    }
  });

  const superAdmin = await prisma.user.create({
    data: {
      id: 'super_1',
      email: 'pradeep@kenzo.com',
      password: 'password123',
      name: 'Pradeep Kenzo',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
      role: 'SUPER_ADMIN',
      designation: 'CEO & Founder',
      departmentId: deptExec.id,
      costCenterId: ccCorp.id,
      gstNumber: '29ABCDE1234F1Z5'
    }
  });

  // Link Sujal's manager to Vikram
  await prisma.user.update({
    where: { id: user1.id },
    data: { managerId: mgr.id }
  });

  // 5. Create Policies
  await prisma.policy.createMany({
    data: [
      { name: 'Meals Policy Limit', category: 'Meals', limitAmount: 100, description: 'Daily maximum meals reimbursement limit' },
      { name: 'Flight Travel Policy', category: 'Flight', limitAmount: 1500, description: 'Flight reimbursement limits' },
      { name: 'Hotel & Accommodation Limit', category: 'Accommodation', limitAmount: 300, description: 'Nightly hotel rate limits' }
    ]
  });

  // 6. Create Budgets
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
