export type UserRole = 'Super Admin' | 'Admin' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  designation: string;
  departmentId: string;
  managerId?: string;
  costCenterId: string;
  joiningDate: string;
  gstNumber?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  budgetLimit: number;
  spentAmount: number;
}

export interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  budget: number;
  spent: number;
}

export type ExpenseCategory =
  | 'Travel'
  | 'Meals'
  | 'Accommodation'
  | 'Fuel'
  | 'Parking'
  | 'Toll'
  | 'Taxi'
  | 'Flight'
  | 'Train'
  | 'Office Supplies'
  | 'Software Subscription'
  | 'Cloud Services'
  | 'Internet'
  | 'Mobile'
  | 'Laptop Accessories'
  | 'Marketing'
  | 'Recruitment'
  | 'Medical'
  | 'Training'
  | 'Conference'
  | 'Entertainment'
  | 'Utilities'
  | 'Client Meeting'
  | 'Project Expense'
  | 'Courier'
  | 'Printing'
  | 'Office Rent'
  | 'Maintenance'
  | 'Other';

export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque' | 'Corporate Card';

export type ExpenseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Manager'
  | 'Pending Finance'
  | 'Approved'
  | 'Rejected'
  | 'Reimbursed'
  | 'Cancelled'
  | 'Returned';

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  taxAmount: number;
  category: ExpenseCategory;
}

export interface Expense {
  id: string;
  title: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  costCenterId: string;
  projectId?: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  merchant: string;
  businessPurpose: string;
  billable: boolean;
  location: string;
  description: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  gstNumber?: string;
  taxAmount: number;
  referenceNumber?: string;
  tags: string[];
  items: ExpenseItem[];
  policyViolations: string[];
  duplicateDetected: boolean;
  history: {
    id: string;
    status: ExpenseStatus;
    updatedBy: string;
    updatedAt: string;
    comment?: string;
  }[];
}

export interface Budget {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  period: string; // 'Monthly' | 'Quarterly' | 'Yearly'
}

export interface Policy {
  id: string;
  name: string;
  category: ExpenseCategory;
  limitAmount: number;
  roleLimit: { [key in UserRole]?: number };
  description: string;
  isEnabled: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipAddress: string;
}
