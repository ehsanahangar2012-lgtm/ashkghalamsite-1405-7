import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, role?: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => false,
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

  const login = (username: string, role: UserRole = UserRole.ADMIN) => {
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
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
