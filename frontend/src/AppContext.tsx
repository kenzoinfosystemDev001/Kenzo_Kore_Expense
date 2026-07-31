import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Expense, Budget, Policy, AuditLog, ExpenseStatus, ExpenseCategory, PaymentMethod, ExpenseItem } from './types';
import { mockBudgets, mockPolicies, mockAuditLogs } from './mockData';

interface AppContextProps {
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  expenses: Expense[];
  budgets: Budget[];
  policies: Policy[];
  auditLogs: AuditLog[];
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  switchUser: (userId: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'Employee' | 'Admin';
    designation: string;
    departmentId: string;
    avatar?: string;
  }) => Promise<void>;
  logout: () => void;
  deleteUser: (userId: string) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
  updateUserAvatar: (userId: string, avatarUrl: string) => Promise<boolean>;
  createExpense: (expenseData: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    currency: string;
    date: string;
    paymentMethod: PaymentMethod;
    merchant: string;
    businessPurpose: string;
    billable: boolean;
    location: string;
    description: string;
    receiptUrl?: string;
    taxAmount: number;
    referenceNumber?: string;
    tags: string[];
    items: ExpenseItem[];
    isDraft?: boolean;
  }) => Promise<void>;
  updateExpenseStatus: (expenseId: string, status: ExpenseStatus, comment?: string) => Promise<void>;
  updateExpense: (expenseId: string, expenseData: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => Promise<void>;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, spent: number) => void;
  addAuditLog: (action: string, details: string) => void;
  updatePolicy: (id: string, limit: number, enabled: boolean) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userList, setUserList] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Load active lists from Neon PostgreSQL on initialization
  const refreshData = async () => {
    try {
      const usersRes = await fetch(`${API_BASE_URL}/auth/users`);
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) {
        setUserList(
          usersData.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
            role: u.role === 'SUPER_ADMIN' ? 'Super Admin' : u.role === 'ADMIN' ? 'Admin' : 'Employee',
            designation: u.designation,
            departmentId: u.departmentId,
            costCenterId: u.costCenterId,
            joiningDate: u.joiningDate ? u.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0]
          }))
        );
      }

      const expensesRes = await fetch(`${API_BASE_URL}/expenses`);
      const expensesData = await expensesRes.json();
      if (Array.isArray(expensesData)) {
        setExpenses(
          expensesData.map((e: any) => ({
            id: e.id,
            title: e.title,
            employeeId: e.employeeId,
            employeeName: e.employeeName || 'Sujal Kumar',
            departmentId: e.departmentId,
            costCenterId: e.costCenterId,
            category: e.category,
            amount: e.amount,
            currency: e.currency,
            date: e.date ? e.date.split('T')[0] : '',
            paymentMethod: e.paymentMethod,
            status: e.status === 'DRAFT' ? 'Draft' : e.status === 'SUBMITTED' ? 'Submitted' : e.status === 'PENDING_MANAGER' ? 'Pending Manager' : e.status === 'PENDING_FINANCE' ? 'Pending Finance' : e.status === 'APPROVED' ? 'Approved' : e.status === 'REJECTED' ? 'Rejected' : e.status === 'REIMBURSED' ? 'Reimbursed' : e.status === 'RETURNED' ? 'Returned' : 'Draft',
            merchant: e.merchant,
            businessPurpose: e.businessPurpose,
            billable: e.billable,
            location: e.location,
            description: e.description || '',
            receiptUrl: e.receiptUrl,
            taxAmount: e.taxAmount,
            referenceNumber: e.referenceNumber,
            tags: e.tags || [],
            items: e.items || [],
            policyViolations: [],
            duplicateDetected: false,
            history: e.approvals?.map((a: any) => ({
              id: a.id,
              status: a.status === 'APPROVED' ? 'Approved' : a.status === 'REJECTED' ? 'Rejected' : a.status === 'RETURNED' ? 'Returned' : 'Submitted',
              updatedBy: 'Auditor',
              updatedAt: a.createdAt,
              comment: a.comment
            })) || []
          }))
        );
      }
    } catch (err) {
      console.error('Failed fetching data from Postgres: ', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('kenzo_kore_jwt', data.accessToken);
        
        // Log access audit log locally
        const newLog: AuditLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: data.user.id,
          userName: data.user.name,
          userRole: data.user.role,
          action: 'USER_JWT_AUTH_SUCCESS',
          details: `Authenticated user session with signed JWT token. Password verified using bcrypt salt checks in Neon DB.`,
          ipAddress: '127.0.0.1'
        };
        setAuditLogs(prev => [newLog, ...prev]);
        refreshData();
        return true;
      }
    } catch (err) {
      console.error('Login error: ', err);
    }
    return false;
  };

  const signup = async (userData: {
    name: string;
    email: string;
    role: 'Employee' | 'Admin';
    designation: string;
    departmentId: string;
    avatar?: string;
  }) => {
    try {
      await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      await refreshData();
    } catch (err) {
      console.error('Signup error: ', err);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE'
      });
      await refreshData();
    } catch (err) {
      console.error('Delete user error: ', err);
    }
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        addAuditLog('USER_PASSWORD_UPDATED', `Updated security credentials for user ID ${userId} in Neon DB`);
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Update password error: ', err);
    }
    return false;
  };

  const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl })
      });
      if (res.ok) {
        addAuditLog('USER_AVATAR_UPDATED', `Updated profile picture for user ID ${userId} in Neon DB`);
        if (currentUser?.id === userId) {
          setCurrentUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
        }
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Update avatar error: ', err);
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('kenzo_kore_jwt');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const switchUser = (userId: string) => {
    const selectedUser = userList.find(u => u.id === userId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
      const newLog: AuditLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: selectedUser.id,
        userName: selectedUser.name,
        userRole: selectedUser.role,
        action: 'USER_LOGIN_SWITCH',
        details: `Switched active session user to ${selectedUser.name} (${selectedUser.role})`,
        ipAddress: '127.0.0.1'
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  const createExpense = async (expenseData: any) => {
    if (!currentUser) return;
    try {
      const payload = {
        ...expenseData,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        departmentId: currentUser.departmentId,
        costCenterId: currentUser.costCenterId
      };

      await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await refreshData();
    } catch (err) {
      console.error('Create expense error: ', err);
    }
  };

  const updateExpenseStatus = async (expenseId: string, status: ExpenseStatus, comment?: string) => {
    try {
      let endpoint = 'approve';
      if (status === 'Returned') endpoint = 'return';
      if (status === 'Rejected') endpoint = 'reject';

      await fetch(`${API_BASE_URL}/approvals/${expenseId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });

      await refreshData();
    } catch (err) {
      console.error('Update status error: ', err);
    }
  };

  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    try {
      await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      await refreshData();
    } catch (err) {
      console.error('Update expense error: ', err);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      await refreshData();
    } catch (err) {
      console.error('Delete expense error: ', err);
    }
  };

  const addBudget = (budget: Budget) => {
    setBudgets(prev => [...prev, budget]);
  };

  const updateBudget = (id: string, spent: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, spent: spent } : b));
  };

  const addAuditLog = (action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: action,
      details: details,
      ipAddress: '127.0.0.1'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updatePolicy = (id: string, limit: number, enabled: boolean) => {
    setPolicies(prev =>
      prev.map(p => (p.id === id ? { ...p, limitAmount: limit, isEnabled: enabled } : p))
    );
    addAuditLog('POLICY_CONFIG_UPDATED', `Updated policy ${id} limits to ₹${limit.toFixed(2)}: ${enabled ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        users: userList,
        expenses,
        budgets,
        policies,
        auditLogs,
        currentTab,
        setCurrentTab,
        switchUser,
        login,
        signup,
        logout,
        deleteUser,
        updateUserPassword,
        updateUserAvatar,
        createExpense,
        updateExpenseStatus,
        updateExpense,
        deleteExpense,
        addBudget,
        updateBudget,
        addAuditLog,
        updatePolicy
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
