import { LifeAreaId } from '../types/lifeBalance';

export interface LifeDomainItem {
  id: LifeAreaId;
  name: string;
  icon: string;
  color: string;
  strongColor: string;
  description: string;
}

export const LIFE_DOMAINS: LifeDomainItem[] = [
  {
    id: 'spiritual',
    name: 'الجانب الروحي',
    icon: '🕌',
    color: '#10b981',
    strongColor: '#047857',
    description: 'السلام الداخلي، الصلة بالخالق، استشعار المعنى والرسالة في الحياة، والصفاء القلبي والتسامح.',
  },
  {
    id: 'health',
    name: 'الجانب الصحي',
    icon: '🌿',
    color: '#22c55e',
    strongColor: '#15803d',
    description: 'حيوية الجسد، النوم العميق الكافي، الرياضة والحركة المنتظمة، التغذية السليمة، والوقاية الطبية.',
  },
  {
    id: 'career',
    name: 'الجانب المهني',
    icon: '💼',
    color: '#8b5cf6',
    strongColor: '#6d28d9',
    description: 'الشغف بالعمل، التطور القيادي، وضوح المسار الوظيفي والريادي، وصناعة أثر حقيقي وملموس.',
  },
  {
    id: 'financial',
    name: 'الجانب المالي',
    icon: '💎',
    color: '#0ea5e9',
    strongColor: '#0369a1',
    description: 'الأمان المالي، التحرر من الديون، بناء صندوق الطوارئ، التخطيط الاستثماري، والإنفاق الواعي.',
  },
  {
    id: 'learning',
    name: 'الجانب التعليمي',
    icon: '📚',
    color: '#f59e0b',
    strongColor: '#b45309',
    description: 'التعلم المستمر، الفضول الفكري، قراءة الكتب، اكتساب مهارات المستقبل، والتفكير النقدي.',
  },
  {
    id: 'family',
    name: 'الجانب الأسري',
    icon: '🏡',
    color: '#f97316',
    strongColor: '#c2410c',
    description: 'دفء المنزل، جودة الوقت مع العائلة بدون ملهيات، بر الوالدين، ولغة الحوار الواعي لحل الخلافات.',
  },
  {
    id: 'social',
    name: 'الجانب الاجتماعي',
    icon: '🤝',
    color: '#14b8a6',
    strongColor: '#0f766e',
    description: 'بناء صداقات داعمة وملهمة، تجنب العلاقات المستنزفة، المشاركة التطوعية، والأثر الإيجابي.',
  },
  {
    id: 'personal',
    name: 'الجانب الشخصي',
    icon: '✨',
    color: '#ec4899',
    strongColor: '#be185d',
    description: 'الوعي الذاتي، تقدير الذات، وضع حدود صحية، الانضباط، وتخصيص وقت للاسترخاء والهوايات المغذية.',
  },
];
