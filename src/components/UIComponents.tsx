import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, Phone, CheckCircle, Box, Sparkles, ShieldCheck, 
  Settings, Award, Layers, ArrowRight, type LucideIcon 
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
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

interface BackButtonProps {
  label?: string;
  to?: string;
  fallbackPath?: string;
  onClick?: () => void;
  variant?: 'auto' | 'dark' | 'light' | 'danger';
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = 'بازگشت',
  to,
  fallbackPath = '/',
  onClick,
  variant = 'auto',
  className = '',
}) => {
  const navigate = useNavigate();

  const handlePress = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  const variantClasses: Record<NonNullable<BackButtonProps['variant']>, string> = {
    auto: 'bg-white/95 hover:bg-amber-50 text-slate-900 border border-slate-300 shadow-sm dark:bg-slate-800/95 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600',
    dark: 'bg-slate-800/95 hover:bg-slate-700 text-white border border-slate-600 shadow-lg',
    light: 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-sm',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 shadow-md',
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      className={`inline-flex items-center justify-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl text-xs md:text-sm font-black whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer active:scale-95 ${variantClasses[variant]} ${className}`}
    >
      <ArrowRight className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
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
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700',
    outline: 'border border-slate-300 hover:bg-slate-100 text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200',
    ghost: 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800/60 dark:text-slate-300',
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
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm dark:shadow-xl ${className}`}
      {...props}
    >
      {(IconComponent || title) && (
        <div className="flex flex-col items-center justify-center mb-3">
          {IconComponent && (
            <div className={`p-3 rounded-2xl border mb-2.5 ${colorClass}`}>
              <IconComponent className="w-6 h-6" />
            </div>
          )}
          {title && <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  color?: 'blue' | 'green' | 'gold' | 'red' | 'gray' | 'yellow' | 'purple';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  color,
  className = '',
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
  };

  const colorMapClasses: Record<string, string> = {
    blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
    green: variants.success,
    gold: variants.primary,
    yellow: variants.warning,
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
    red: variants.danger,
    gray: variants.secondary,
  };

  const chosenStyle = color ? (colorMapClasses[color] || variants[variant]) : (variants[variant] || variants.primary);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${chosenStyle} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
