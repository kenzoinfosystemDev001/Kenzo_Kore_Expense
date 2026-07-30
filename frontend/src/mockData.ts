import { User, Department, CostCenter, Project, Expense, Budget, Policy, AuditLog } from './types';

export const mockUsers: User[] = [
  {
    id: 'emp_1',
    name: 'Sujal Kumar',
    email: 'sujal.kumar@kenzo.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Employee',
    designation: 'Senior Frontend Engineer',
    departmentId: 'dept_eng',
    managerId: 'mgr_1',
    costCenterId: 'cc_dev',
    joiningDate: '2023-03-15',
    gstNumber: '29ABCDE1234F1Z5'
  },
  {
    id: 'mgr_1',
    name: 'Vikram Aditya',
    email: 'vikram.aditya@kenzo.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Admin', // Acts as manager/admin
    designation: 'Engineering Manager',
    departmentId: 'dept_eng',
    managerId: 'admin_1',
    costCenterId: 'cc_dev',
    joiningDate: '2021-06-10',
    gstNumber: '29ABCDE1234F1Z5'
  },
  {
    id: 'admin_1',
    name: 'Kenzo HR & Admin',
    email: 'finance.admin@kenzo.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Admin',
    designation: 'VP of Finance & Ops',
    departmentId: 'dept_ops',
    costCenterId: 'cc_corp',
    joiningDate: '2019-01-05',
    gstNumber: '29ABCDE1234F1Z5'
  },
  {
    id: 'super_1',
    name: 'Pradeep Kenzo',
    email: 'pradeep@kenzo.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    role: 'Super Admin',
    designation: 'CEO & Founder',
    departmentId: 'dept_exec',
    costCenterId: 'cc_corp',
    joiningDate: '2018-09-01',
    gstNumber: '29ABCDE1234F1Z5'
  }
];

export const mockDepartments: Department[] = [
  { id: 'dept_eng', name: 'Engineering', code: 'ENG', budgetLimit: 120000, spentAmount: 48500 },
  { id: 'dept_sal', name: 'Sales & BD', code: 'SLS', budgetLimit: 95000, spentAmount: 62100 },
  { id: 'dept_mkt', name: 'Marketing', code: 'MKT', budgetLimit: 60000, spentAmount: 18400 },
  { id: 'dept_ops', name: 'Operations & Finance', code: 'OPS', budgetLimit: 40000, spentAmount: 12300 },
  { id: 'dept_exec', name: 'Executive Suite', code: 'EXE', budgetLimit: 50000, spentAmount: 9800 }
];

export const mockCostCenters: CostCenter[] = [
  { id: 'cc_dev', name: 'R&D Development', code: 'CC-001' },
  { id: 'cc_sales', name: 'Domestic Sales', code: 'CC-002' },
  { id: 'cc_corp', name: 'Corporate Headquarter', code: 'CC-003' },
  { id: 'cc_mkt', name: 'Digital Marketing Campaign', code: 'CC-004' }
];

export const mockProjects: Project[] = [
  { id: 'proj_kore', name: 'Kenzo Kore Framework', code: 'KRF-2026', budget: 85000, spent: 34500 },
  { id: 'proj_saas', name: 'Next-Gen SaaS Platform', code: 'SaaS-09', budget: 150000, spent: 92400 },
  { id: 'proj_client', name: 'Enterprise Client Portal', code: 'ECP-01', budget: 40000, spent: 12100 },
  { id: 'proj_general', name: 'General Administrative', code: 'GEN-ADM', budget: 1000000, spent: 120300 }
];

export const mockBudgets: Budget[] = [
  { id: 'b_travel_q3', name: 'Q3 Global Travel & Conferences', allocated: 50000, spent: 22400, period: 'Quarterly' },
  { id: 'b_meals_q3', name: 'Q3 Client Entertainment & Meals', allocated: 15000, spent: 9150, period: 'Quarterly' },
  { id: 'b_cloud_q3', name: 'Q3 AWS & Cloud Infrastructure', allocated: 80000, spent: 61400, period: 'Quarterly' },
  { id: 'b_office_q3', name: 'Q3 Office Supplies & Consumables', allocated: 8000, spent: 3100, period: 'Quarterly' }
];

export const mockPolicies: Policy[] = [
  {
    id: 'pol_meals',
    name: 'Meals Policy Limit',
    category: 'Meals',
    limitAmount: 100,
    roleLimit: { 'Employee': 75, 'Admin': 150, 'Super Admin': 250 },
    description: 'Daily maximum reimbursement limit for meals and dining.',
    isEnabled: true
  },
  {
    id: 'pol_flight',
    name: 'Flight Travel Policy',
    category: 'Flight',
    limitAmount: 1500,
    roleLimit: { 'Employee': 1000, 'Admin': 2000 },
    description: 'Domestic & International flight limits. Require business class approval for non-execs.',
    isEnabled: true
  },
  {
    id: 'pol_software',
    name: 'Software Subscription Approval',
    category: 'Software Subscription',
    limitAmount: 500,
    roleLimit: { 'Employee': 100, 'Admin': 1000 },
    description: 'Software subscriptions must be pre-cleared if exceeding employee threshold.',
    isEnabled: true
  },
  {
    id: 'pol_hotel',
    name: 'Hotel & Accommodation Limit',
    category: 'Accommodation',
    limitAmount: 300,
    roleLimit: { 'Employee': 200, 'Admin': 400 },
    description: 'Nightly hotel rate limit rules.',
    isEnabled: true
  }
];

export const mockExpenses: Expense[] = [
  {
    id: 'exp_101',
    title: 'AWS Cloud Hosting - July 2026',
    employeeId: 'emp_1',
    employeeName: 'Sujal Kumar',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_saas',
    category: 'Cloud Services',
    amount: 1450.50,
    currency: 'USD',
    date: '2026-07-28',
    paymentMethod: 'Corporate Card',
    status: 'Pending Finance',
    merchant: 'Amazon Web Services Inc.',
    businessPurpose: 'Production environment cloud resources and data warehouse clusters.',
    billable: true,
    location: 'Bengaluru, India',
    description: 'Monthly cloud infrastructure invoice. Includes standard EC2 instance sizes, RDS PostgreSQL instances, S3 receipt storage buckets, and ElastiCache Redis.',
    receiptUrl: 'aws-invoice-july.pdf',
    gstNumber: '29ABCDE1234F1Z5',
    taxAmount: 261.09,
    referenceNumber: 'INV-AWS-74892',
    tags: ['Cloud', 'Production', 'SaaS'],
    items: [
      { id: 'item_1', description: 'EC2 Instances & Load Balancers', amount: 850.00, taxAmount: 153.00, category: 'Cloud Services' },
      { id: 'item_2', description: 'RDS Database Cluster Hosting', amount: 450.50, taxAmount: 81.09, category: 'Cloud Services' },
      { id: 'item_3', description: 'S3 Storage & Data Transfers', amount: 150.00, taxAmount: 27.00, category: 'Cloud Services' }
    ],
    policyViolations: [],
    duplicateDetected: false,
    history: [
      { id: 'h_1', status: 'Draft', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-28T10:15:00Z' },
      { id: 'h_2', status: 'Submitted', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-28T10:30:00Z', comment: 'Uploading official monthly billing statement.' },
      { id: 'h_3', status: 'Approved', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-28T14:45:00Z', comment: 'Approved for Engineering budget clearance. Routing to Finance.' }
    ]
  },
  {
    id: 'exp_102',
    title: 'Client Business Lunch - Marriott',
    employeeId: 'emp_1',
    employeeName: 'Sujal Kumar',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_kore',
    category: 'Meals',
    amount: 120.00,
    currency: 'USD',
    date: '2026-07-25',
    paymentMethod: 'UPI',
    status: 'Pending Manager',
    merchant: 'JW Marriott Dining Room',
    businessPurpose: 'Lunch meeting with client representatives to discuss Next-Gen platform requirements.',
    billable: true,
    location: 'Mumbai, India',
    description: 'Detailed discussion regarding integration metrics and budget allocations. Attended by Sujal Kumar and 2 clients.',
    receiptUrl: 'marriott-lunch-rec.jpg',
    taxAmount: 18.00,
    referenceNumber: 'MAR-874921',
    tags: ['Client-Visit', 'Lunch'],
    items: [
      { id: 'item_4', description: 'Lunch buffet and refreshments', amount: 120.00, taxAmount: 18.00, category: 'Meals' }
    ],
    policyViolations: ['Meals limit exceeded for Role: Employee (Threshold: $75.00)'],
    duplicateDetected: false,
    history: [
      { id: 'h_4', status: 'Draft', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-25T14:00:00Z' },
      { id: 'h_5', status: 'Submitted', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-25T15:20:00Z', comment: 'Met with lead architect from partner company.' }
    ]
  },
  {
    id: 'exp_103',
    title: 'Flight Ticket - TechConf Delhi',
    employeeId: 'emp_1',
    employeeName: 'Sujal Kumar',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_general',
    category: 'Flight',
    amount: 345.00,
    currency: 'USD',
    date: '2026-07-12',
    paymentMethod: 'Bank Transfer',
    status: 'Reimbursed',
    merchant: 'Air India',
    businessPurpose: 'Travel to Delhi for the Annual Technology Innovations Conference.',
    billable: false,
    location: 'New Delhi, India',
    description: 'Round-trip economy flight tickets Bengaluru to Delhi. Attending DevCon2026.',
    receiptUrl: 'airindia-flight-tkt.pdf',
    taxAmount: 45.20,
    referenceNumber: 'AI-2026-7842',
    tags: ['Conference', 'Travel'],
    items: [
      { id: 'item_5', description: 'Economy Class Flight ticket roundtrip', amount: 345.00, taxAmount: 45.20, category: 'Flight' }
    ],
    policyViolations: [],
    duplicateDetected: false,
    history: [
      { id: 'h_6', status: 'Draft', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-12T08:00:00Z' },
      { id: 'h_7', status: 'Submitted', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-12T08:30:00Z' },
      { id: 'h_8', status: 'Approved', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-12T11:00:00Z' },
      { id: 'h_9', status: 'Approved', updatedBy: 'Kenzo HR & Admin', updatedAt: '2026-07-13T10:00:00Z', comment: 'Audit matched receipt files.' },
      { id: 'h_10', status: 'Reimbursed', updatedBy: 'Kenzo HR & Admin', updatedAt: '2026-07-15T16:00:00Z', comment: 'Processed via Bank Transfer transaction #8749219' }
    ]
  },
  {
    id: 'exp_104',
    title: 'Office Stationery & Notebooks',
    employeeId: 'emp_1',
    employeeName: 'Sujal Kumar',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_general',
    category: 'Office Supplies',
    amount: 45.90,
    currency: 'USD',
    date: '2026-07-02',
    paymentMethod: 'Cash',
    status: 'Reimbursed',
    merchant: 'Staples Inc.',
    businessPurpose: 'Procurement of sticky notes, whiteboards markers, and official meeting diaries.',
    billable: false,
    location: 'Bengaluru, India',
    description: 'Purchased emergency office supplies for layout planning session.',
    receiptUrl: 'staples-receipt.png',
    taxAmount: 3.50,
    referenceNumber: 'ST-9281',
    tags: ['Office', 'Supplies'],
    items: [
      { id: 'item_6', description: 'Markers & Notebooks', amount: 45.90, taxAmount: 3.50, category: 'Office Supplies' }
    ],
    policyViolations: [],
    duplicateDetected: false,
    history: [
      { id: 'h_11', status: 'Draft', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-02T10:00:00Z' },
      { id: 'h_12', status: 'Submitted', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-02T11:00:00Z' },
      { id: 'h_13', status: 'Approved', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-02T15:00:00Z' },
      { id: 'h_14', status: 'Approved', updatedBy: 'Kenzo HR & Admin', updatedAt: '2026-07-03T09:00:00Z' },
      { id: 'h_15', status: 'Reimbursed', updatedBy: 'Kenzo HR & Admin', updatedAt: '2026-07-05T12:00:00Z', comment: 'Cash reimbursement approved.' }
    ]
  },
  {
    id: 'exp_105',
    title: 'Github Copilot Seats - Q3',
    employeeId: 'mgr_1',
    employeeName: 'Vikram Aditya',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_saas',
    category: 'Software Subscription',
    amount: 1500.00,
    currency: 'USD',
    date: '2026-07-29',
    paymentMethod: 'Corporate Card',
    status: 'Pending Finance',
    merchant: 'GitHub Inc.',
    businessPurpose: 'Github Copilot Enterprise license renewals for the core engineering engineering teams.',
    billable: false,
    location: 'San Francisco, USA',
    description: 'Renewing 50 seats for 3 months. Essential for coding speedups and development quality enhancement.',
    receiptUrl: 'github-copilot-invoice.pdf',
    taxAmount: 270.00,
    referenceNumber: 'INV-GH-827419',
    tags: ['Sub', 'AI-Tools'],
    items: [
      { id: 'item_7', description: '50 GitHub Copilot Seats renewal', amount: 1500.00, taxAmount: 270.00, category: 'Software Subscription' }
    ],
    policyViolations: ['Software subscription threshold exceeded (Threshold: $500.00)'],
    duplicateDetected: false,
    history: [
      { id: 'h_16', status: 'Draft', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-29T09:00:00Z' },
      { id: 'h_17', status: 'Submitted', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-29T10:00:00Z', comment: 'Approved on manager stage automatically since I am the EM. Rerouting to Admin/Finance.' }
    ]
  },
  {
    id: 'exp_106',
    title: 'Double Booking Test Expense',
    employeeId: 'emp_1',
    employeeName: 'Sujal Kumar',
    departmentId: 'dept_eng',
    costCenterId: 'cc_dev',
    projectId: 'proj_general',
    category: 'Meals',
    amount: 120.00,
    currency: 'USD',
    date: '2026-07-25',
    paymentMethod: 'UPI',
    status: 'Returned',
    merchant: 'JW Marriott Dining Room',
    businessPurpose: 'Lunch meeting with client representatives.',
    billable: true,
    location: 'Mumbai, India',
    description: 'Double check detection. This matches JW Marriott lunch exactly.',
    receiptUrl: 'marriott-lunch-rec.jpg',
    taxAmount: 18.00,
    referenceNumber: 'MAR-874921',
    tags: ['Duplicate', 'Meals'],
    items: [
      { id: 'item_8', description: 'JW buffet dining', amount: 120.00, taxAmount: 18.00, category: 'Meals' }
    ],
    policyViolations: ['Duplicate expense detected (matches expense ID exp_102)'],
    duplicateDetected: true,
    history: [
      { id: 'h_18', status: 'Draft', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-26T08:00:00Z' },
      { id: 'h_19', status: 'Submitted', updatedBy: 'Sujal Kumar', updatedAt: '2026-07-26T08:30:00Z' },
      { id: 'h_20', status: 'Returned', updatedBy: 'Vikram Aditya', updatedAt: '2026-07-26T14:00:00Z', comment: 'Hi Sujal, this looks like a duplicate of the invoice you already submitted. Please review.' }
    ]
  }
];

export const mockAuditLogs: AuditLog[] = [];
