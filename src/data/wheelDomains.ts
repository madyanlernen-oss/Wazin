import { LifeAreaId } from '../types/lifeBalance';
import { ADVISORS_LIST } from './advisorsData';
import { LIFE_DOMAINS } from './lifeDomains';

export interface InteractiveWheelDomain {
  id: LifeAreaId;
  name: string; // Crisp Arabic label for wheel segment
  title: string; // Full Arabic domain title
  advisorName: string;
  advisorRole: string;
  avatarSvg: string;
  themeColor: string;
  strongColor: string; // Tailwind-700 values for WCAG 2.2 AA contrast (4.5:1+)
  gradientColors: [string, string];
  glowColor: string;
  description: string;
  keystoneHabit: string;
}

const WHEEL_EXTRAS: Record<
  LifeAreaId,
  {
    gradientColors: [string, string];
    glowColor: string;
    keystoneHabit: string;
    advisorRole?: string;
  }
> = {
  spiritual: {
    gradientColors: ['#047857', '#065f46'],
    glowColor: 'rgba(16, 185, 129, 0.45)',
    keystoneHabit: 'المحافظة على ورد يومي من الصلاة والذكر بتدبر',
    advisorRole: 'مستشار الصفاء الإيماني والسلام الداخلي',
  },
  health: {
    gradientColors: ['#15803d', '#166534'],
    glowColor: 'rgba(34, 197, 94, 0.45)',
    keystoneHabit: 'نوم منتظم 7-8 ساعات و20 دقيقة حركة يومية',
    advisorRole: 'أخصائي الطاقة الحيوية والطب الوقائي',
  },
  career: {
    gradientColors: ['#7c3aed', '#6d28d9'],
    glowColor: 'rgba(139, 92, 246, 0.45)',
    keystoneHabit: 'تخصيص ساعتين يومياً للمهام العميقة وتطوير المهارات',
    advisorRole: 'مستشار التطور الوظيفي والإنتاجية',
  },
  financial: {
    gradientColors: ['#0369a1', '#075985'],
    glowColor: 'rgba(14, 165, 233, 0.45)',
    keystoneHabit: 'ادخار 15% من الدخل وضبط النفقات العاطفية',
    advisorRole: 'مستشار التخطيط المالي وتنمية الأصول',
  },
  learning: {
    gradientColors: ['#b45309', '#92400e'],
    glowColor: 'rgba(245, 158, 11, 0.45)',
    keystoneHabit: 'قراءة 20 صفحة يومياً من كتاب نوعي ومفيد',
    advisorRole: 'مستشار التعلم المستمر وإدارة المعرفة',
  },
  family: {
    gradientColors: ['#c2410c', '#9a3412'],
    glowColor: 'rgba(249, 115, 22, 0.45)',
    keystoneHabit: 'جلسة عائلية يومية دافئة بدون شاشات ومشتتات',
    advisorRole: 'استشارية الترابط الأسري والذكاء العاطفي',
  },
  social: {
    gradientColors: ['#0f766e', '#115e59'],
    glowColor: 'rgba(20, 184, 166, 0.45)',
    keystoneHabit: 'التواصل الأسبوعي مع صديق ملهم وصادق',
    advisorRole: 'مستشار الذكاء الاجتماعي وبناء العلاقات',
  },
  personal: {
    gradientColors: ['#be185d', '#9d174d'],
    glowColor: 'rgba(236, 72, 153, 0.45)',
    keystoneHabit: 'خلوة يومية 15 دقيقة للتأمل وتفريغ الذهن',
    advisorRole: 'أخصائية التوازن النفسي وبناء العادات',
  },
};

const advisorMap = new Map(ADVISORS_LIST.map((adv) => [adv.id, adv]));

export const WHEEL_DOMAINS: InteractiveWheelDomain[] = LIFE_DOMAINS.map((base) => {
  const advisor = advisorMap.get(base.id);
  const extra = WHEEL_EXTRAS[base.id];
  return {
    id: base.id,
    name: base.name,
    title: advisor?.title || base.name,
    advisorName: advisor?.name || '',
    advisorRole: extra?.advisorRole || advisor?.role || '',
    avatarSvg: advisor?.avatarSvg || base.icon,
    themeColor: base.color,
    strongColor: base.strongColor,
    gradientColors: extra?.gradientColors || ['#047857', '#065f46'],
    glowColor: extra?.glowColor || 'rgba(16, 185, 129, 0.45)',
    description: base.description,
    keystoneHabit: extra?.keystoneHabit || advisor?.defaultGoals?.[0] || '',
  };
});
