import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  ClipboardList,
  MessageSquare,
  Compass,
  GitCompare,
} from 'lucide-react';
import { Screen } from '../types/lifeBalance';

export interface NavItemConfig {
  screen: Screen;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  shortLabel: string;
  inTopBar: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    screen: 'dashboard',
    icon: LayoutDashboard,
    label: 'لوحة التحكم وعجلة الحياة',
    shortLabel: 'العجلة',
    inTopBar: true,
  },
  {
    screen: 'thirty_day_plan',
    icon: CalendarDays,
    label: 'خطتي الذكية لـ 30 يوماً',
    shortLabel: 'خطة 30 يوم',
    inTopBar: true,
  },
  {
    screen: 'goals_matrix',
    icon: Target,
    label: 'أهدافي (مصفوفة أيزنهاور)',
    shortLabel: 'أهدافي',
    inTopBar: true,
  },
  {
    screen: 'onboarding',
    icon: ClipboardList,
    label: 'قيّم أسبوعك الآن',
    shortLabel: 'التقييم',
    inTopBar: true,
  },
  {
    screen: 'advisor_chat',
    icon: MessageSquare,
    label: 'استشارة المستشارين',
    shortLabel: 'المستشارون',
    inTopBar: true,
  },
  {
    screen: 'director_summary',
    icon: Compass,
    label: 'رؤية المنسق العام',
    shortLabel: 'المنسق',
    inTopBar: true,
  },
  {
    screen: 'comparison',
    icon: GitCompare,
    label: 'المقارنة والتحليلات',
    shortLabel: 'المقارنة',
    inTopBar: true,
  },
];
