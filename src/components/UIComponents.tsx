import React from 'react';
import { 
  Grid, Phone, CheckCircle, Box, Sparkles, ShieldCheck, 
  Settings, Award, Layers, type LucideIcon 
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Grid,
  Phone,
  CheckCircle,
  Box,
  Sparkles,
  ShieldCheck,
  Settings,
  Award,
  Layers,
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md hover:shadow-amber-500/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
    outline: 'border border-slate-700 hover:bg-slate-800 text-slate-200',
    ghost: 'hover:bg-slate-800/60 text-slate-300',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  iconName?: string;
  iconColor?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ 
  className = '', 
  children, 
  iconName, 
  iconColor = 'amber', 
  title, 
  ...props 
}) => {
  const IconComponent = iconName ? iconMap[iconName] : null;
  const colorClass = colorMap[iconColor] || colorMap.amber;

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl ${className}`}
      {...props}
    >
      {(IconComponent || title) && (
        <div className="flex flex-col items-center justify-center mb-3">
          {IconComponent && (
            <div className={`p-3 rounded-2xl border mb-2.5 ${colorClass}`}>
              <IconComponent className="w-6 h-6" />
            </div>
          )}
          {title && <h3 className="font-bold text-slate-100 text-base mb-1">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  className = '',
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
