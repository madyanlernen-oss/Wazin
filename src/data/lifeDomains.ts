import { LifeAreaId } from '../types/lifeBalance';
import { ADVISORS_LIST } from './advisorsData';

export interface LifeDomainItem {
  id: LifeAreaId;
  name: string;
  icon: string;
  color: string;
  strongColor: string;
  description: string;
}

// Canonical single source of truth for colors is ADVISORS_LIST in advisorsData.ts
const advisorColorMap = new Map(
  ADVISORS_LIST.map((adv) => [
    adv.id,
    {
      color: adv.themeColor,
      strongColor: adv.strongColor || adv.themeColor,
    },
  ])
);

const getColors = (id: LifeAreaId, defaultColor: string, defaultStrong: string) => {
  const match = advisorColorMap.get(id);
  return {
    color: match?.color || defaultColor,
    strongColor: match?.strongColor || defaultStrong,
  };
};

export const LIFE_DOMAINS: LifeDomainItem[] = [
  {
    id: 'spiritual',
    name: 'الجانب الروحي والسكينة',
    icon: '🕊️',
    ...getColors('spiritual', '#10b981', '#047857'),
    description: 'السلام الداخلي، السكينة النفسية، استشعار المعنى والغاية في الحياة، والصفاء القلبي والتسامح.',
  },
  {
    id: 'health',
    name: 'الجانب الصحي',
    icon: '🌿',
    ...getColors('health', '#22c55e', '#15803d'),
    description: 'حيوية الجسد، النوم العميق الكافي، الرياضة والحركة المنتظمة، التغذية السليمة، والوقاية الطبية.',
  },
  {
    id: 'career',
    name: 'الجانب المهني',
    icon: '💼',
    ...getColors('career', '#6366f1', '#4338ca'),
    description: 'الشغف بالعمل، التطور القيادي، وضوح المسار الوظيفي والريادي، وصناعة أثر حقيقي وملموس.',
  },
  {
    id: 'financial',
    name: 'الجانب المالي',
    icon: '💎',
    ...getColors('financial', '#f59e0b', '#b45309'),
    description: 'الأمان المالي، التحرر من الديون، بناء صندوق الطوارئ، التخطيط الاستثماري، والإنفاق الواعي.',
  },
  {
    id: 'learning',
    name: 'الجانب التعليمي',
    icon: '📚',
    ...getColors('learning', '#06b6d4', '#0e7490'),
    description: 'التعلم المستمر، الفضول الفكري، قراءة الكتب، اكتساب مهارات المستقبل، والتفكير النقدي.',
  },
  {
    id: 'family',
    name: 'الجانب الأسري',
    icon: '🏡',
    ...getColors('family', '#f43f5e', '#be123c'),
    description: 'دفء المنزل، جودة الوقت مع العائلة بدون ملهيات، بر الوالدين، ولغة الحوار الواعي لحل الخلافات.',
  },
  {
    id: 'social',
    name: 'الجانب الاجتماعي',
    icon: '🤝',
    ...getColors('social', '#14b8a6', '#0f766e'),
    description: 'بناء صداقات داعمة وملهمة، تجنب العلاقات المستنزفة، المشاركة التطوعية، والأثر الإيجابي.',
  },
  {
    id: 'personal',
    name: 'الجانب الشخصي',
    icon: '✨',
    ...getColors('personal', '#8b5cf6', '#6d28d9'),
    description: 'الوعي الذاتي، تقدير الذات، وضع حدود صحية، الانضباط، وتخصيص وقت للاسترخاء والهوايات المغذية.',
  },
];
