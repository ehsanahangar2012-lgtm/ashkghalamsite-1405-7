import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (usernameOrUser: any, role?: UserRole) => boolean;
  logout: () => void;
  hasPermission?: (perm: string) => boolean;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
  hasPermission: () => true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('ashk_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!user;

  const login = (usernameOrUser: any, role: UserRole = UserRole.ADMIN) => {
    const newUser: User = typeof usernameOrUser === 'object' && usernameOrUser !== null
      ? { ...usernameOrUser }
      : {
          id: 'admin-1',
          name: usernameOrUser || 'مدیر سیستم',
          username: usernameOrUser,
          role,
          tokens: 1000,
          walletBalance: 5000000,
          companyName: 'صنایع کارتن و چاپ اشک قلم',
          joinDate: '۱۴۰۳/۰۱/۰۱',
        };
    setUser(newUser);
    try {
      localStorage.setItem('ashk_auth_user', JSON.stringify(newUser));
    } catch {}
    return true;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('ashk_auth_user');
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, hasPermission: () => true }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
