
import React from 'react';
import * as Icons from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
    secondary: "bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500",
    outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  iconName?: string;
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', icon, iconName, iconColor = 'blue', title }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };

  // Resolve Icon from Name or Prop
  let IconToRender = icon;
  if (!IconToRender && iconName) {
    // @ts-ignore
    IconToRender = Icons[iconName] || Icons.HelpCircle; 
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      transition={{ duration: 0.2 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {(title || IconToRender) && (
        <div className="p-6 pb-0 flex items-center gap-4 mb-4">
          {IconToRender && (
            <div className={`p-3 rounded-xl ${colors[iconColor]} transition-colors`}>
              {/* @ts-ignore */}
              <IconToRender className="h-6 w-6" />
            </div>
          )}
          {title && <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>}
        </div>
      )}
      <div className={title || IconToRender ? 'px-6 pb-6' : ''}>
        {children}
      </div>
    </motion.div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = 'blue', className = '' }) => {
  const colorClass = color === 'gold' 
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
    : color === 'green'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : color === 'red'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {children}
    </span>
  );
};
