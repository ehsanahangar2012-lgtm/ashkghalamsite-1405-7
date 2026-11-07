import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, role?: UserRole, onSuccess?: (user: User) => void) => boolean;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission?: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => false,
  updateUser: () => {},
  hasPermission: () => false,
  logout: () => {},
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

  const login = (username: string, role: UserRole = UserRole.ADMIN, onSuccess?: (user: User) => void) => {
    const newUser: User = {
      id: 'admin-1',
      name: username || 'مدیر سیستم',
      username,
      role,
      tokens: 1000,
      walletBalance: 5000000,
      companyName: 'صنایع کارتن و چاپ اشک قلم',
      joinDate: '۱۴۰۳/۰۱/۰۱',
    };
    setUser(newUser);
    onSuccess?.(newUser);
    try {
      localStorage.setItem('ashk_auth_user', JSON.stringify(newUser));
    } catch {}
    return true;
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(current => {
      if (!current) return current;
      const updated = { ...current, ...updates };
      try {
        localStorage.setItem('ashk_auth_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const hasPermission = (_permission?: string) => user?.role === UserRole.ADMIN;

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('ashk_auth_user');
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, updateUser, hasPermission, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
