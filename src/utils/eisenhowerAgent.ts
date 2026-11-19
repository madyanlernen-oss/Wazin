import { ADVISORS_LIST } from '../data/advisorsData';
import {
  DirectorSummaryReport,
  EisenhowerGoalItem,
  EisenhowerQuadrant,
  GoalTimeframe,
  LifeAreaId,
} from '../types/lifeBalance';

export interface EisenhowerSuggestionItem {
  id: string;
  title: string;
  quadrant: EisenhowerQuadrant;
  quadrantLabel: string;
  timeframe: GoalTimeframe;
  areaId: LifeAreaId;
  domainName: string;
  sourceAgent: 'agent_9_aggregator' | 'agent_10_advisor' | 'agent_11_suggester';
  sourceAgentName: string;
  sourceTypeLabel: string;
  rationale: string;
}

/**
 * Maps domain name (Arabic or English) to LifeAreaId
 */
export function mapDomainNameToAreaId(domainStr?: string): LifeAreaId {
  if (!domainStr) return 'personal';
  const str = domainStr.toLowerCase().trim();

  if (str.includes('صحي') || str.includes('صح') || str.includes('health')) return 'health';
  if (str.includes('مال') || str.includes('نفق') || str.includes('financial')) return 'financial';
  if (str.includes('مهن') || str.includes('عمل') || str.includes('وظي') || str.includes('career')) return 'career';
  if (str.includes('روح') || str.includes('إيمان') || str.includes('سكين') || str.includes('spiritual')) return 'spiritual';
  if (str.includes('شخص') || str.includes('ذات') || str.includes('وعي') || str.includes('personal')) return 'personal';
  if (str.includes('تعل') || str.includes('معرف') || str.includes('فكر') || str.includes('learning')) return 'learning';
  if (str.includes('أسر') || str.includes('عائل') || str.includes('family')) return 'family';
  if (str.includes('اجتماع') || str.includes('علاق') || str.includes('صداق') || str.includes('social')) return 'social';

  return 'personal';
}

/**
 * Normalizes title string for duplicate checking
 */
function normalizeGoalText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]/g, '')
    .trim();
}

/**
 * Generates intelligent suggestions for Eisenhower Matrix powered by Agent 11,
 * extracting deep strategic inputs from Agent 9 (Aggregator) and Agent 10 (Advisor Lead).
 */
export function generateAgent11Suggestions(
  directorReport?: DirectorSummaryReport | null,
  scores?: Record<LifeAreaId, number>,
  existingGoals: EisenhowerGoalItem[] = []
): EisenhowerSuggestionItem[] {
  const suggestions: EisenhowerSuggestionItem[] = [];
  const existingNormalized = new Set(existingGoals.map((g) => normalizeGoalText(g.title)));

  // 1. استخراج توصية علاج "عنق الزجاجة الحياتي" من وكيل 9 (م. معتز التكاملي)
  if (directorReport?.criticalBottleneck) {
    const b = directorReport.criticalBottleneck;
    const areaId = mapDomainNameToAreaId(b.domain || b.title);
    const domainObj = ADVISORS_LIST.find((a) => a.id === areaId);
    const title = b.recommendation || `معالجة ${b.title} كأولوية قصوى`;

    if (!existingNormalized.has(normalizeGoalText(title))) {
      suggestions.push({
        id: `sug_bottleneck_${Date.now()}_1`,
        title,
        quadrant: 'q2_important_not_urgent',
        quadrantLabel: 'المربع 2 (جدول له - وقود التوازن)',
        timeframe: 'weekly',
        areaId,
        domainName: domainObj?.title || 'الجانب الصحي',
        sourceAgent: 'agent_9_aggregator',
        sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
        sourceTypeLabel: 'علاج عنق الزجاجة الحياتي',
        rationale: `رصد م. معتز التكاملي أن ${b.title} يمثل نقطة الاختناق الأساسية؛ معالجته تحدث الرافعة الكبرى وتمنع استنزاف باقي الجوانب.`,
      });
    }
  }

  // 2. استخراج "العادات المحورية التآزرية" من وكيل 9 (م. معتز التكاملي)
  if (directorReport?.keystoneHabits && directorReport.keystoneHabits.length > 0) {
    directorReport.keystoneHabits.slice(0, 2).forEach((habit, idx) => {
      const primaryDomainStr = habit.targetDomains?.[0] || 'health';
      const areaId = mapDomainNameToAreaId(primaryDomainStr);
      const domainObj = ADVISORS_LIST.find((a) => a.id === areaId);
      const title = habit.name;

      if (!existingNormalized.has(normalizeGoalText(title))) {
        suggestions.push({
          id: `sug_keystone_${Date.now()}_${idx + 2}`,
          title,
          quadrant: 'q2_important_not_urgent',
          quadrantLabel: 'المربع 2 (جدول له - وقود التوازن)',
          timeframe: 'daily',
          areaId,
          domainName: domainObj?.title || 'الجانب الصحي',
          sourceAgent: 'agent_9_aggregator',
          sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
          sourceTypeLabel: 'عادة محورية تآزرية',
          rationale: `عادة تآزرية صممها م. معتز تؤثر إيجاباً في (${habit.targetDomains?.join('، ') || 'عدة جوانب'}) في آن واحد. التوقيت المقترح: ${habit.triggerTime}.`,
        });
      }
    });
  }

  // 3. استخراج إجراءات الأسبوع الأول من خارطة طريق الـ 30 يوماً من وكيل 9
  if (directorReport?.thirtyDayRoadmap && directorReport.thirtyDayRoadmap.length > 0) {
    const week1 = directorReport.thirtyDayRoadmap[0];
    if (week1.actions && week1.actions.length > 0) {
      const firstAction = week1.actions[0];
      if (!existingNormalized.has(normalizeGoalText(firstAction))) {
        suggestions.push({
          id: `sug_roadmap_${Date.now()}_4`,
          title: firstAction,
          quadrant: 'q1_urgent_important',
          quadrantLabel: 'المربع 1 (نفّذ الآن - أثر فوري)',
          timeframe: 'weekly',
          areaId: 'personal',
          domainName: 'الجانب الشخصي والوعي بالذات',
          sourceAgent: 'agent_9_aggregator',
          sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
          sourceTypeLabel: 'خارطة طريق الـ 30 يوماً (الأسبوع 1)',
          rationale: `خطوة إجرائية مباشرة ضمن خطة "${week1.weekTitle}" لإيقاف الهدر وضبط التسرب الطاقوي فوراً.`,
        });
      }
    }
  }

  // 4. استخراج توجيه تنفيذي لحماية المربع الثاني من وكيل 10 (د. هاني الموجه)
  // د. هاني يحلل أقل الجوانب أو فجوة التوازن ويقدم خطوة قيادية للمربع الثاني
  let lowestAreaId: LifeAreaId = 'health';
  if (scores) {
    const entries = Object.entries(scores) as [LifeAreaId, number][];
    entries.sort((a, b) => a[1] - b[1]);
    if (entries.length > 0) {
      lowestAreaId = entries[0][0];
    }
  }

  const lowestDomainObj = ADVISORS_LIST.find((a) => a.id === lowestAreaId);
  const drHaniSuggestions: Record<LifeAreaId, { title: string; rationale: string }> = {
    health: {
      title: 'تثبيت موعد النوم في الحادية عشرة مساءً وقطع الشاشات قبلها بـ 45 دقيقة',
      rationale: 'يوصي د. هاني الموجه بحماية طاقة الجسد أولاً؛ لا يمكن إدارة الأولويات أو التركيز في بيئة عمل متطلبة بدون نوم عميق متصل.',
    },
    financial: {
      title: 'جلسة الأحد الأسبوعية (20 دقيقة) لحصر النفقات وحماية الميزانية',
      rationale: 'يوصي د. هاني الموجه بوقف النزيف المالي بجلسة أسبوعية منتظمة في المربع الثاني تمنع تحول الفواتير لأزمات مفاجئة.',
    },
    career: {
      title: 'حجز فترتي عمل عميق (90 دقيقة لكل فترة) أسبوعياً خالية من الاجتماعات',
      rationale: 'يوجه د. هاني لحماية أولويات الإنجاز النوعي من طغيان البريد والاجتماعات العاجلة غير المنتجة.',
    },
    spiritual: {
      title: 'خلوة الصباح الباكر (15 دقيقة) للتأمل والسكينة واستحضار النية',
      rationale: 'يؤكد د. هاني أن السكينة الروحية في الصباح تضبط بوصلة اليوم وتمنحك مناعة ضد التوتر والضغوط.',
    },
    personal: {
      title: 'طقس الإغلاق الرقمي اليومي ومراجعة إنجازات اليوم في 10 دقائق',
      rationale: 'توصية قيادية من د. هاني لحماية السلام الداخلي والحد من التشتت الذهني قبل النوم.',
    },
    learning: {
      title: 'قراءة 15 صفحة يومياً في كتاب تخصصي مع تدوين فائدة عملية واحدة',
      rationale: 'يوصي د. هاني بالنمو المعرفي التراكمي في المربع الثاني لبناء الميزة التنافسية وتوسيع الأفق.',
    },
    family: {
      title: 'تخصيص جلسة حوار ووجبة عائلية يومية بدون أي هواتف أو شاشات',
      rationale: 'يوجه د. هاني لحماية عمق الروابط الأسرية؛ العلاقات الحميمة هي صمام الأمان للاستقرار النفسي.',
    },
    social: {
      title: 'لقاء أو مكالمة تفقدية أسبوعية مع صديق ملهم وصادق لبناء علاقات نوعية',
      rationale: 'يوجه د. هاني باستبدال العلاقات المستنزفة بعلاقات داعمة تعزز النمو والتوازن النفسي.',
    },
  };

  const drHaniItem = drHaniSuggestions[lowestAreaId] || drHaniSuggestions.health;
  if (!existingNormalized.has(normalizeGoalText(drHaniItem.title))) {
    suggestions.push({
      id: `sug_drhani_${Date.now()}_5`,
      title: drHaniItem.title,
      quadrant: 'q2_important_not_urgent',
      quadrantLabel: 'المربع 2 (جدول له - جوهر المنظومة)',
      timeframe: 'weekly',
      areaId: lowestAreaId,
      domainName: lowestDomainObj?.title || 'الجانب الصحي',
      sourceAgent: 'agent_10_advisor',
      sourceAgentName: 'د. هاني الموجه (وكيل 10)',
      sourceTypeLabel: 'أولوية قيادية للمربع الثاني',
      rationale: drHaniItem.rationale,
    });
  }

  // 5. إذا كانت القائمة فارغة أو لا يوجد تقرير بعد، نزود اقتراحات تأسيسية ذكية
  if (suggestions.length === 0) {
    const fallbackDefaults: EisenhowerSuggestionItem[] = [
      {
        id: `sug_def_1_${Date.now()}`,
        title: 'تثبيت موعد النوم عند 11 مساءً وقطع الشاشات قبلها بـ 45 دقيقة',
        quadrant: 'q2_important_not_urgent',
        quadrantLabel: 'المربع 2 (جدول له)',
        timeframe: 'daily',
        areaId: 'health',
        domainName: 'الجانب الصحي والبدني',
        sourceAgent: 'agent_9_aggregator',
        sourceAgentName: 'م. معتز التكاملي (وكيل 9)',
        sourceTypeLabel: 'عادة محورية تآزرية',
        rationale: 'النوم العميق هو المحرك الأول لتنظيم الطاقة وتخفيف التوتر في العمل والأسرة.',
      },
      {
        id: `sug_def_2_${Date.now()}`,
        title: 'جلسة الأحد الأسبوعية (20 دقيقة) لمراجعة الميزانية وتتبع المصاريف',
        quadrant: 'q2_important_not_urgent',
        quadrantLabel: 'المربع 2 (جدول له)',
        timeframe: 'weekly',
        areaId: 'financial',
        domainName: 'الجانب المالي والاستقلال',
        sourceAgent: 'agent_10_advisor',
        sourceAgentName: 'د. هاني الموجه (وكيل 10)',
        sourceTypeLabel: 'أولوية قيادية للمربع الثاني',
        rationale: 'التخطيط المالي الاستباقي يحميك من حرائق الطوارئ والديون المفاجئة في المربع الأول.',
      },
      {
        id: `sug_def_3_${Date.now()}`,
        title: 'إيقاف إشعارات الهاتف ومواقع التواصل أثناء جلسات العمل العميق',
        quadrant: 'q4_not_urgent_not_important',
        quadrantLabel: 'المربع 4 (احذفه أو قلله)',
        timeframe: 'daily',
        areaId: 'personal',
        domainName: 'الجانب الشخصي والوعي بالذات',
        sourceAgent: 'agent_10_advisor',
        sourceAgentName: 'د. هاني الموجه (وكيل 10)',
        sourceTypeLabel: 'تقليص مشتتات المربع الرابع',
        rationale: 'التخلص من المقاطعات العشوائية يستعيد ما يصل إلى ساعتين من التركيز الصافي يومياً.',
      },
    ];

    return fallbackDefaults.filter((f) => !existingNormalized.has(normalizeGoalText(f.title)));
  }

  // الحد الأقصى 3 إلى 5 اقتراحات وفق قاعدة وكيل 11
  return suggestions.slice(0, 5);
}
