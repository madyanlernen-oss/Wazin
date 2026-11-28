import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Compass,
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
    label: 'خطة 30 يوم',
    shortLabel: 'خطة 30 يوم',
    inTopBar: true,
  },
  {
    screen: 'onboarding',
    icon: ClipboardList,
    label: 'التقييم والاستشارة',
    shortLabel: 'التقييم',
    inTopBar: true,
  },
  {
    screen: 'director_summary',
    icon: Compass,
    label: 'رؤية المنسق العام',
    shortLabel: 'المنسق',
    inTopBar: true,
  },
];
