import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Expense, Budget, Policy, AuditLog, ExpenseStatus, ExpenseCategory, PaymentMethod, ExpenseItem, ApprovedPopup } from './types';
import { mockBudgets, mockPolicies, mockAuditLogs } from './mockData';
import { api } from './api/axiosInstance';

interface AppContextProps {
  currentUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  users: User[];
  expenses: Expense[];
  budgets: Budget[];
  policies: Policy[];
  auditLogs: AuditLog[];
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  switchUser: (userId: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  // Account Activation API Methods
  checkActivationEligibility: (email: string) => Promise<{ eligible: boolean; status: string; message: string; employee?: any }>;
  sendActivationOtp: (email: string) => Promise<{ success: boolean; message: string; expiresInSeconds?: number }>;
  verifyActivationOtp: (email: string, otp: string) => Promise<{ success: boolean; token?: string; message?: string }>;
  completeActivation: (email: string, verificationToken: string, password: string) => Promise<{ success: boolean; message?: string }>;
  // Password Recovery Methods
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  fetchDirectoryStatus: () => Promise<any>;
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
  approvedPopups: ApprovedPopup[];
  dismissApprovedPopup: (id: string) => void;
  isPasswordModalOpen: boolean;
  openPasswordModal: () => void;
  closePasswordModal: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [userList, setUserList] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  const previousExpensesRef = React.useRef<Record<string, string>>({});
  const currentUserRef = React.useRef<User | null>(currentUser);

  React.useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const notifyRealtimeSync = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('kenzo_kore_realtime_sync');
        bc.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}
    }
  };

  // Load active lists from Neon PostgreSQL & run real-time approval detection
  const refreshData = async () => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      if (!token) {
        return;
      }
      const authHeaders = { Authorization: `Bearer ${token}` };

      const usersRes = await fetch(`${API_BASE_URL}/auth/users`, { headers: authHeaders });
      if (usersRes.ok) {
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
      }

      const expensesRes = await fetch(`${API_BASE_URL}/expenses`, { headers: authHeaders });
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        if (Array.isArray(expensesData)) {
          const prevStatuses = previousExpensesRef.current;
          const updatedStatuses: Record<string, string> = {};

          const mappedExpenses: Expense[] = expensesData.map((e: any): Expense => {
            const statusMapped: ExpenseStatus = e.status === 'DRAFT' ? 'Draft' 
              : e.status === 'SUBMITTED' ? 'Submitted' 
              : e.status === 'PENDING_MANAGER' ? 'Pending Manager' 
              : e.status === 'PENDING_FINANCE' ? 'Pending Finance' 
              : e.status === 'APPROVED' ? 'Approved' 
              : e.status === 'REJECTED' ? 'Rejected' 
              : e.status === 'REIMBURSED' ? 'Reimbursed' 
              : e.status === 'RETURNED' ? 'Returned' : 'Draft';

            updatedStatuses[e.id] = statusMapped;

            // REAL-TIME AUTO APPROVAL DETECTION:
            const prevStatus = prevStatuses[e.id];
            const activeUser = currentUserRef.current;

            if (
              prevStatus && 
              prevStatus !== 'Approved' && 
              prevStatus !== 'Reimbursed' && 
              (statusMapped === 'Approved' || statusMapped === 'Reimbursed')
            ) {
              const empId = e.employeeId;
              const empName = e.employee ? e.employee.name : (e.employeeName || '');

              if (
                activeUser && 
                (empId === activeUser.id || (empName && activeUser.name && empName.toLowerCase() === activeUser.name.toLowerCase()))
              ) {
                const lastApproval = e.approvals && e.approvals.length > 0 ? e.approvals[e.approvals.length - 1] : null;
                const comment = lastApproval?.comment || 'Verified & Approved';

                const newPopup: ApprovedPopup = {
                  id: e.id + '_' + Date.now(),
                  expenseId: e.id,
                  employeeId: empId,
                  employeeName: empName || activeUser.name,
                  title: e.title,
                  description: e.businessPurpose || e.description || 'Expense claim verified and approved by Admin.',
                  category: e.category,
                  amount: e.amount,
                  comment: comment,
                  approvedAt: new Date().toISOString()
                };

                setApprovedPopups(prev => {
                  if (prev.some(p => p.expenseId === e.id)) return prev;
                  const updated = [newPopup, ...prev];
                  localStorage.setItem('kenzo_approved_popups', JSON.stringify(updated));
                  return updated;
                });
              }
            }

            return {
              id: e.id,
              title: e.title,
              employeeId: e.employeeId,
              employeeName: e.employee ? e.employee.name : (e.employeeName || 'Corporate Staff'),
              departmentId: e.departmentId,
              costCenterId: e.costCenterId,
              category: e.category || 'Other',
              amount: e.amount,
              currency: e.currency || 'USD',
              date: e.date ? e.date.split('T')[0] : '',
              paymentMethod: e.paymentMethod || 'UPI',
              status: statusMapped,
              merchant: e.merchant || '',
              businessPurpose: e.businessPurpose || '',
              billable: e.billable || false,
              location: e.location || '',
              description: e.description || '',
              receiptUrl: e.receiptUrl,
              taxAmount: e.taxAmount || 0,
              referenceNumber: e.referenceNumber,
              tags: e.tags || [],
              items: e.items || [],
              policyViolations: [],
              duplicateDetected: false,
              history: e.approvals?.map((a: any) => ({
                id: a.id,
                status: (a.status === 'APPROVED' ? 'Approved' : a.status === 'REJECTED' ? 'Rejected' : a.status === 'RETURNED' ? 'Returned' : 'Submitted') as ExpenseStatus,
                updatedBy: 'Auditor',
                updatedAt: a.createdAt,
                comment: a.comment
              })) || []
            };
          });

          previousExpensesRef.current = updatedStatuses;
          setExpenses(mappedExpenses);
        }
      }
    } catch (err) {
      console.error('Failed fetching data from Postgres: ', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('kenzo_kore_jwt');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data) {
            setCurrentUser(res.data);
            setIsAuthenticated(true);
            await refreshData();
          }
        } catch (err) {
          console.warn('Session token verification failed:', err);
          localStorage.removeItem('kenzo_kore_jwt');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      }
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  // Real-time automatic background syncing interval + cross-tab BroadcastChannel listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncInterval = setInterval(() => {
      refreshData();
    }, 3000);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('kenzo_kore_realtime_sync');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'DATA_UPDATED') {
            refreshData();
          }
        };
      } catch {}
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kenzo_approved_popups' && e.newValue) {
        try {
          setApprovedPopups(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated]);

  // ==========================================
  // AUTHENTICATION: LOGIN & LOGOUT
  // ==========================================

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, message: data?.message || 'Access denied. Please check your credentials or activate your account.' };
      }
      if (data && data.user && data.accessToken) {
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
          details: `Authenticated user session with signed JWT token. Bcrypt verification successful.`,
          ipAddress: '127.0.0.1'
        };
        setAuditLogs(prev => [newLog, ...prev]);
        await refreshData();
        return { success: true };
      }
    } catch (err) {
      console.error('Login error: ', err);
      return { success: false, message: 'Connection to corporate authentication service failed. Please check backend server.' };
    }
    return { success: false, message: 'Invalid email or password credentials.' };
  };

  const logout = () => {
    localStorage.removeItem('kenzo_kore_jwt');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // ==========================================
  // ACCOUNT ACTIVATION PIPELINE
  // ==========================================

  const checkActivationEligibility = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/activation/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          eligible: false,
          status: 'ERROR',
          message: data?.message || 'This email is not eligible to activate an account.',
        };
      }
      return data;
    } catch (err) {
      return {
        eligible: false,
        status: 'NETWORK_ERROR',
        message: 'Could not connect to directory verification service. Please try again.',
      };
    }
  };

  const sendActivationOtp = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/activation/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message: data?.message || 'Failed to dispatch verification code.',
        };
      }
      return {
        success: true,
        message: data.message,
        expiresInSeconds: data.expiresInSeconds,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to send verification code. Please check your connection.',
      };
    }
  };

  const verifyActivationOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/activation/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message: data?.message || 'Invalid or expired verification code.',
        };
      }
      return {
        success: true,
        token: data.verificationToken,
        message: data.message,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Verification failed. Please check network connection.',
      };
    }
  };

  const completeActivation = async (email: string, verificationToken: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/activation/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verificationToken, password })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          success: false,
          message: data?.message || 'Failed to activate account with new credentials.',
        };
      }

      if (data.accessToken && data.user) {
        localStorage.setItem('kenzo_kore_jwt', data.accessToken);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        await refreshData();
      }

      return {
        success: true,
        message: data.message || 'Account activated successfully!',
      };
    } catch (err) {
      return {
        success: false,
        message: 'Account activation failed. Please try again.',
      };
    }
  };

  // ==========================================
  // PASSWORD RECOVERY
  // ==========================================

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => null);
      return {
        success: res.ok,
        message: data?.message || 'Password reset request processed.',
      };
    } catch {
      return { success: false, message: 'Password reset request failed. Please check connection.' };
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json().catch(() => null);
      return {
        success: res.ok,
        message: data?.message || (res.ok ? 'Password reset successfully' : 'Reset failed'),
      };
    } catch {
      return { success: false, message: 'Password reset failed. Please check connection.' };
    }
  };

  const fetchDirectoryStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/directory-status`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch directory status:', err);
    }
    return null;
  };

  const deleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      await refreshData();
    } catch (err) {
      console.error('Delete user error: ', err);
    }
  };

  const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        addAuditLog('USER_PASSWORD_UPDATED', `Updated security credentials for user ID ${userId}`);
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
      const token = localStorage.getItem('kenzo_kore_jwt');
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ avatar: avatarUrl })
      });
      if (res.ok) {
        addAuditLog('USER_AVATAR_UPDATED', `Updated profile picture for user ID ${userId}`);
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
      const token = localStorage.getItem('kenzo_kore_jwt');
      const payload = {
        ...expenseData,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        departmentId: currentUser.departmentId,
        costCenterId: currentUser.costCenterId
      };

      await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      notifyRealtimeSync();
      await refreshData();
    } catch (err) {
      console.error('Create expense error: ', err);
    }
  };

  const [approvedPopups, setApprovedPopups] = useState<ApprovedPopup[]>(() => {
    try {
      const saved = localStorage.getItem('kenzo_approved_popups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissApprovedPopup = (id: string) => {
    setApprovedPopups(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('kenzo_approved_popups', JSON.stringify(updated));
      return updated;
    });
  };

  const updateExpenseStatus = async (expenseId: string, status: ExpenseStatus, comment?: string) => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      let endpoint = 'approve';
      if (status === 'Returned') endpoint = 'return';
      if (status === 'Rejected') endpoint = 'reject';

      await fetch(`${API_BASE_URL}/approvals/${expenseId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ comment })
      });

      notifyRealtimeSync();
      await refreshData();
    } catch (err) {
      console.error('Update status error: ', err);
    }
  };

  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(expenseData)
      });
      notifyRealtimeSync();
      await refreshData();
    } catch (err) {
      console.error('Update expense error: ', err);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const token = localStorage.getItem('kenzo_kore_jwt');
      await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      notifyRealtimeSync();
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

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const openPasswordModal = () => setIsPasswordModalOpen(true);
  const closePasswordModal = () => setIsPasswordModalOpen(false);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('kenzo_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('kenzo_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        authLoading,
        users: userList,
        expenses,
        budgets,
        policies,
        auditLogs,
        currentTab,
        setCurrentTab,
        switchUser,
        login,
        logout,
        checkActivationEligibility,
        sendActivationOtp,
        verifyActivationOtp,
        completeActivation,
        forgotPassword,
        resetPassword,
        fetchDirectoryStatus,
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
        updatePolicy,
        approvedPopups,
        dismissApprovedPopup,
        isPasswordModalOpen,
        openPasswordModal,
        closePasswordModal,
        theme,
        toggleTheme
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
