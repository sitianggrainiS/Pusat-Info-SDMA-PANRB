import React from 'react';
import {
  Award,
  Briefcase,
  UserCheck,
  TrendingUp,
  Target,
  GraduationCap,
  Sparkles,
  Cpu,
  ShieldCheck,
  FileText,
  BookOpen,
  Users,
  HeartHandshake,
  Scale,
  CheckCircle2,
  Layers,
  Building2,
  UserMinus,
  FileCheck,
  Flame,
  School,
  Landmark,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Award':
      return <Award className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'UserCheck':
      return <UserCheck className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'Target':
      return <Target className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'School':
      return <School className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'HeartHandshake':
      return <HeartHandshake className={className} />;
    case 'Scale':
      return <Scale className={className} />;
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'UserMinus':
      return <UserMinus className={className} />;
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    default:
      return <FileText className={className} />;
  }
};

