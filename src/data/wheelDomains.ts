import { LifeAreaId } from '../types/lifeBalance';
import { ADVISORS_LIST } from './advisorsData';

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

interface RawWheelDomainConfig {
  id: LifeAreaId;
  name: string;
  title?: string;
  advisorName?: string;
  advisorRole?: string;
  avatarSvg?: string;
  themeColor: string;
  strongColor: string;
  gradientColors: [string, string];
  glowColor: string;
  description: string;
  keystoneHabit?: string;
}

const RAW_DOMAINS_CONFIG: RawWheelDomainConfig[] = [
  {
    id: 'spiritual',
    name: 'الجانب الروحي',
    title: 'الجانب الروحي والسكينة',
    advisorName: 'د. سفيان الروحي',
    advisorRole: 'مستشار الصفاء الإيماني والسلام الداخلي',
    avatarSvg: '🕌',
    themeColor: '#10b981',
    strongColor: '#047857',
    gradientColors: ['#047857', '#065f46'],
    glowColor: 'rgba(16, 185, 129, 0.45)',
    description: 'يرسخ السلام الداخلي وصفاء القلب ويعيد بوصلتك إلى السكينة وحضور القلب وسط صخب وتحديات الحياة.',
    keystoneHabit: 'المحافظة على ورد يومي من الصلاة والذكر بتدبر',
  },
  {
    id: 'health',
    name: 'الجانب الصحي',
    title: 'الجانب الصحي والبدني',
    advisorName: 'د. ريان الصحي',
    advisorRole: 'أخصائي الطاقة الحيوية والطب الوقائي',
    avatarSvg: '🌿',
    themeColor: '#22c55e',
    strongColor: '#15803d',
    gradientColors: ['#15803d', '#166534'],
    glowColor: 'rgba(34, 197, 94, 0.45)',
    description: 'يمنحك الحيوية اليومية، النوم العميق، والتغذية السليمة لحماية جسدك ليكون قادراً على تحقيق كل طموحاتك.',
    keystoneHabit: 'نوم منتظم 7-8 ساعات و20 دقيقة حركة يومية',
  },
  {
    id: 'career',
    name: 'الجانب المهني',
    title: 'الجانب المهني والوظيفي',
    advisorName: 'م. طارق المهني',
    advisorRole: 'مستشار التطور الوظيفي والإنتاجية',
    avatarSvg: '💼',
    themeColor: '#8b5cf6',
    strongColor: '#6d28d9',
    gradientColors: ['#7c3aed', '#6d28d9'],
    glowColor: 'rgba(139, 92, 246, 0.45)',
    description: 'يوجه نموك المهني نحو صناعة أثر ملموس وزيادة قيمتك في سوق العمل بإنتاجية نوعية دون احتراق.',
    keystoneHabit: 'تخصيص ساعتين يومياً للمهام العميقة وتطوير المهارات',
  },
  {
    id: 'financial',
    name: 'الجانب المالي',
    title: 'الجانب المالي والاستقلال',
    advisorName: 'أ. كمال المالي',
    advisorRole: 'مستشار التخطيط المالي وتنمية الأصول',
    avatarSvg: '💎',
    themeColor: '#0ea5e9',
    strongColor: '#0369a1',
    gradientColors: ['#0369a1', '#075985'],
    glowColor: 'rgba(14, 165, 233, 0.45)',
    description: 'يبني استقلالك المالي وصندوق أمانك، ويحول الإنفاق العشوائي إلى استثمار واعٍ ومستقبل مستقر.',
    keystoneHabit: 'ادخار 15% من الدخل وضبط النفقات العاطفية',
  },
  {
    id: 'learning',
    name: 'الجانب التعليمي',
    title: 'الجانب التعليمي والمعرفي',
    advisorName: 'بروفيسور زياد المعرفي',
    advisorRole: 'مستشار التعلم المستمر وإدارة المعرفة',
    avatarSvg: '📚',
    themeColor: '#f59e0b',
    strongColor: '#b45309',
    gradientColors: ['#b45309', '#92400e'],
    glowColor: 'rgba(245, 158, 11, 0.45)',
    description: 'يغذي عقلك بالقراءة واكتساب المهارات الاستراتيجية ليواكب تغيرات العصر بوعي متجدد مستمر.',
    keystoneHabit: 'قراءة 20 صفحة يومياً من كتاب نوعي ومفيد',
  },
  {
    id: 'family',
    name: 'الجانب الأسري',
    title: 'الجانب الأسري والعائلي',
    advisorName: 'د. مريم الأسرية',
    advisorRole: 'استشارية الترابط الأسري والذكاء العاطفي',
    avatarSvg: '🏡',
    themeColor: '#f97316',
    strongColor: '#c2410c',
    gradientColors: ['#c2410c', '#9a3412'],
    glowColor: 'rgba(249, 115, 22, 0.45)',
    description: 'يصنع دفء البيت والملاذ الآمن، ويعمق الحوار والإنصات الحقيقي بين أفراد الأسرة دون هواتف.',
    keystoneHabit: 'جلسة عائلية يومية دافئة بدون شاشات ومشتتات',
  },
  {
    id: 'social',
    name: 'الجانب الاجتماعي',
    title: 'الجانب الاجتماعي والعلاقات',
    advisorName: 'أ. سامي الاجتماعي',
    advisorRole: 'مستشار الذكاء الاجتماعي وبناء العلاقات',
    avatarSvg: '🤝',
    themeColor: '#14b8a6',
    strongColor: '#0f766e',
    gradientColors: ['#0f766e', '#115e59'],
    glowColor: 'rgba(20, 184, 166, 0.45)',
    description: 'ينتقي لك علاقات داعمة ومحفزة تنمّي إنسانيتك وتبعدك عن العلاقات المستنزفة لطاقتك ووقتك.',
    keystoneHabit: 'التواصل الأسبوعي مع صديق ملهم وصادق',
  },
  {
    id: 'personal',
    name: 'الجانب الشخصي',
    title: 'الجانب الشخصي والوعي بالذات',
    advisorName: 'د. ليلى الذاتية',
    advisorRole: 'أخصائية التوازن النفسي وبناء العادات',
    avatarSvg: '✨',
    themeColor: '#ec4899',
    strongColor: '#be185d',
    gradientColors: ['#be185d', '#9d174d'],
    glowColor: 'rgba(236, 72, 153, 0.45)',
    description: 'يعزز تقديرك لذاتك وفهمك لمشاعرك، ويمنحك مساحة خاصة للاسترخاء وبناء العادات الصغيرة الراسخة.',
    keystoneHabit: 'خلوة يومية 15 دقيقة للتأمل وتفريغ الذهن',
  },
];

// Derive advisor names/roles from ADVISORS_LIST to prevent duplication
const advisorMap = new Map(ADVISORS_LIST.map((adv) => [adv.id, adv]));

export const WHEEL_DOMAINS: InteractiveWheelDomain[] = RAW_DOMAINS_CONFIG.map((cfg) => {
  const advisor = advisorMap.get(cfg.id);
  return {
    id: cfg.id,
    name: cfg.name,
    title: advisor?.title || cfg.title || cfg.name,
    advisorName: advisor?.name || cfg.advisorName || '',
    advisorRole: cfg.advisorRole || advisor?.role || '',
    avatarSvg: advisor?.avatarSvg || cfg.avatarSvg || '✨',
    themeColor: cfg.themeColor,
    strongColor: cfg.strongColor,
    gradientColors: cfg.gradientColors,
    glowColor: cfg.glowColor,
    description: cfg.description,
    keystoneHabit: cfg.keystoneHabit || advisor?.defaultGoals?.[0] || '',
  };
});
