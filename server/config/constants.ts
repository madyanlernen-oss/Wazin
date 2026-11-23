export const REQUEST_TIMEOUT_MS = 25_000;
export const MAX_CACHED_PROMPTS = 20;

export const AGENT_FILE_MAP: Record<string, string> = {
  financial: '01-financial.md',
  health: '02-health.md',
  spiritual: '03-spiritual.md',
  career: '04-career.md',
  personal: '05-personal.md',
  learning: '06-learning.md',
  family: '07-family.md',
  social: '08-social.md',
  aggregator: '09-aggregator.md',
  advisor: '10-advisor.md',
};

export const AGENT_INFO_MAP: Record<string, { name: string; role: string }> = {
  financial: { name: 'أ. كمال المالي', role: 'مستشار التخطيط المالي وتنمية الأصول' },
  health: { name: 'د. ريان الصحي', role: 'مستشار الصحة البدنية والطاقة الحيوية' },
  spiritual: { name: 'د. سفيان الروحي', role: 'مستشار السكينة والسلام الداخلي والمعنى' },
  career: { name: 'م. طارق المهني', role: 'مستشار التطور الوظيفي والإنتاجية' },
  personal: { name: 'د. ليلى الذاتية', role: 'أخصائية التوازن النفسي وبناء العادات' },
  learning: { name: 'بروفيسور زياد المعرفي', role: 'مستشار التعلم المستمر وإدارة المعرفة' },
  family: { name: 'د. مريم الأسرية', role: 'استشارية الترابط الأسري والذكاء العاطفي' },
  social: { name: 'أ. سامي الاجتماعي', role: 'مستشار العلاقات والتواصل الإنساني' },
  aggregator: { name: 'م. معتز التكاملي', role: 'وكيل التجميع والتكامل الشامل ومحلل النظم الحياتية' },
  advisor: { name: 'د. هاني الموجه', role: 'المستشار التوجيهي العام ورئيس الداشبورد' },
};

export const ADVISOR_NAME_TO_DOMAIN: Record<string, string> = {
  spiritual: 'الجانب الروحي',
  financial: 'الجانب المالي',
  health: 'الجانب الصحي',
  career: 'الجانب المهني',
  personal: 'الجانب الشخصي',
  learning: 'الجانب المعرفي والتعليمي',
  family: 'الجانب الأسري',
  social: 'الجانب الاجتماعي',
};
