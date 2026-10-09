import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

export interface UserPermissions {
  crmDashboard: boolean;
  treasuryAndLedger: boolean;
  inquiryRateSettings: boolean;
  cmsContentEditing: boolean;
  backupSystem: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (permissionName: keyof UserPermissions | string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage for persisted session
    const storedUser = localStorage.getItem('ashk_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('ashk_user');
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('ashk_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ashk_user');
  };

  const hasPermission = (permissionName: keyof UserPermissions | string): boolean => {
    if (!user) return false;
    
    const userPerms = (user as any).permissions as UserPermissions | undefined;
    
    // If precise permission is defined for this specific user or admin, respect it explicitly
    if (userPerms && typeof userPerms[permissionName as keyof UserPermissions] === 'boolean') {
      return userPerms[permissionName as keyof UserPermissions];
    }
    
    // Default fallback based on roles if no granular overrides are found
    if (user.role === UserRole.ADMIN) {
      return true; // Super admins bypass checks if no restrictions are specified
    }
    
    // Specific business role rules
    if (user.role === UserRole.ACCOUNTANT) {
      return permissionName === 'treasuryAndLedger' || permissionName === 'crmDashboard';
    }
    if (user.role === UserRole.LITHO_OPERATOR) {
      return permissionName === 'crmDashboard';
    }
    
    if (user.role === UserRole.SMB || user.role === UserRole.ENTERPRISE || user.role === UserRole.PARTNER) {
      return permissionName === 'crmDashboard';
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
