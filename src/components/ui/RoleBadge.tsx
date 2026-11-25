import React from 'react';
import { UserRole } from '../../types';
import { ShieldCheck, GraduationCap, BookOpen, User } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showIcon = true, size = 'sm' }) => {
  const roleConfig = {
    registrar: {
      label: 'Registrar (Admin)',
      bg: 'bg-white text-navy border-navy',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#142D59]" />,
    },
    program_chair: {
      label: 'Program Chair',
      bg: 'bg-white text-navy border-navy',
      icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" />,
    },
    teacher: {
      label: 'Faculty / Teacher',
      bg: 'bg-white text-navy border-navy',
      icon: <GraduationCap className="w-3.5 h-3.5 text-blue-600" />,
    },
    student: {
      label: 'Student',
      bg: 'bg-white text-royal border-royal',
      icon: <User className="w-3.5 h-3.5 text-royal" />,
    },
  };

  const config = roleConfig[role] || roleConfig.student;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-semibold rounded-full ${
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'
      } ${config.bg}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
