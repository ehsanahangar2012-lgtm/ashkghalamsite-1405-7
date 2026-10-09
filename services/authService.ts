
import { User, UserRole } from '../types';

const initializeDB = () => {
  if (typeof window !== 'undefined' && !localStorage.getItem('users_db')) {
    const initialUsers = [
      {
        id: 'admin-1',
        name: 'مدیر سیستم',
        username: 'admin',
        password: 'admin123',
        role: UserRole.ADMIN,
        tokens: 9999,
        avatar: 'https://i.pravatar.cc/150?u=admin',
        companyName: 'اشک قلم'
      },
      {
        id: 'user-1',
        name: 'علی رضایی',
        username: 'ali',
        password: '123456',
        role: UserRole.SMB,
        tokens: 150,
        walletBalance: 2500000,
        orderHistory: [
          { id: 'ORD-1001', title: 'چاپ کاتالوگ', amount: 1500000, date: '1403/02/10', status: 'delivered' },
          { id: 'ORD-1002', title: 'کارت ویزیت', amount: 1000000, date: '1403/02/15', status: 'printing' }
        ],
        avatar: 'https://i.pravatar.cc/150?u=ali',
        companyName: 'استارتاپ نوین'
      }
    ];
    localStorage.setItem('users_db', JSON.stringify(initialUsers));
  }
};

initializeDB();

const getUsers = (): any[] => {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem('users_db') || '[]');
  }
  return [];
};

const saveUsers = (users: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('users_db', JSON.stringify(users));
  }
};

export const loginUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    const { password, ...userWithoutPassword } = user;
    return { success: true, user: userWithoutPassword as User };
  }

  return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است.' };
};

export const registerUser = async (data: any): Promise<{ success: boolean; user?: User; error?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const users = getUsers();
  if (users.some(u => u.username === data.username)) {
    return { success: false, error: 'این نام کاربری قبلا ثبت شده است.' };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name: data.name,
    username: data.username,
    password: data.password,
    role: UserRole.SMB,
    tokens: 50,
    companyName: data.companyName,
    joinDate: new Date().toLocaleDateString('fa-IR'),
    avatar: data.avatar || `https://i.pravatar.cc/150?u=${data.username}`,
    permissions: data.permissions || {
      crmDashboard: true,
      treasuryAndLedger: true,
      inquiryRateSettings: true,
      cmsContentEditing: true,
      backupSystem: true
    }
  };
  
  users.push(newUser);
  saveUsers(users);

  const { password, ...userWithoutPassword } = newUser;
  return { success: true, user: userWithoutPassword as User };
};

export const loginGuest = async (): Promise<User> => {
  return {
    id: `guest-${Date.now()}`,
    name: 'کاربر مهمان',
    username: 'guest',
    role: UserRole.GUEST,
    tokens: 0,
    companyName: '---'
  };
};

// --- Advanced Team Accounts & Profile Services ---

export interface UserPermissions {
  crmDashboard: boolean;
  treasuryAndLedger: boolean;
  inquiryRateSettings: boolean;
  cmsContentEditing: boolean;
  backupSystem: boolean;
}

export const getAllUsersExcludingPassword = (): any[] => {
  return getUsers();
};

export const createTeamAccount = async (accountData: {
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  phone?: string;
  email?: string;
  companyName?: string;
  avatar?: string;
  permissions: UserPermissions;
}): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === accountData.username.toLowerCase())) {
    return { success: false, error: 'این نام کاربری از پیش رزرو شده است.' };
  }

  const newAcc = {
    id: `user-${Date.now()}`,
    ...accountData,
    password: accountData.password || '123456',
    tokens: accountData.role === UserRole.ADMIN ? 9999 : 200,
    joinDate: new Date().toLocaleDateString('fa-IR')
  };

  users.push(newAcc);
  saveUsers(users);
  return { success: true };
};

export const updateAccount = async (
  userId: string,
  updatedFields: Partial<any>
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'حساب یافت نشد.' };
  }

  // Update
  users[index] = { ...users[index], ...updatedFields };
  saveUsers(users);

  // Sync with current session if we are modifying the logged-in user
  if (typeof window !== 'undefined') {
    const active = localStorage.getItem('ashk_user');
    if (active) {
      const activeObj = JSON.parse(active);
      if (activeObj.id === userId) {
        const { password, ...withoutPassword } = users[index];
        localStorage.setItem('ashk_user', JSON.stringify(withoutPassword));
      }
    }
  }

  return { success: true };
};

export const deleteAccount = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const active = localStorage.getItem('ashk_user');
  if (active) {
    const activeObj = JSON.parse(active);
    if (activeObj.id === userId) {
      return { success: false, error: 'شما نمی‌توانید حساب جاری خودتان را حذف نمایید.' };
    }
  }

  const filtered = users.filter(u => u.id !== userId);
  saveUsers(filtered);
  return { success: true };
};

