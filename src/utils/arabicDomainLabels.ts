export const DOMAIN_ARABIC_NAMES: Record<string, string> = {
  spiritual: 'الجانب الروحي والسكينة',
  financial: 'الجانب المالي والاستقلال',
  career: 'الجانب المهني والوظيفي',
  personal: 'الجانب الشخصي والوعي بالذات',
  learning: 'الجانب التعليمي والمعرفي',
  family: 'الجانب الأسري والعائلي',
  social: 'الجانب الاجتماعي والعلاقات',
  health: 'الجانب الصحي والبدني',
};

const ENGLISH_JARGON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\(\s*Interactive\s+Life\s+Wheel\s*\)/gi, ''],
  [/\(\s*Critical\s+Bottleneck\s*\)/gi, ''],
  [/\(\s*Keystone\s+Habits?\s*\)/gi, ''],
  [/\(\s*Deep\s+Work\s*\)/gi, ''],
  [/(?:العمل\s+العميق|المذاكرة\s+العميقة|جلسة\s+العمل\s+والمذاكرة\s+العميقة)\s*\(\s*Deep\s+Study\s*(?:-\s*([^)]*))?\)/gi, 'جلسة العمل والمذاكرة العميقة$1'],
  [/جلسة\s*\(\s*Deep\s+Study\s*\)/gi, 'جلسة العمل والمذاكرة العميقة'],
  [/\(\s*Deep\s+Study\s*(?:-\s*)?([^)]+)\)/gi, '$1'],
  [/\(\s*Deep\s+Study\s*\)/gi, 'جلسة العمل والمذاكرة العميقة'],
  [/\(\s*Demo\s+Mode\s*\)/gi, '(وضع المحكّمين)'],
  [/\(\s*Bottlenecks?\s*\)/gi, ''],
  [/\(\s*Super\s+Catalyst\s*\)/gi, ''],
  [/\(\s*Micro-?habit\s*\)/gi, ''],
  [/\(\s*Micro-?learning\s*\)/gi, ''],
  [/\(\s*Leverage\s+Point\s*\)/gi, ''],
  [/\(\s*Life\s+Wheel\s*\)/gi, ''],
  [/\(\s*Pomodoro\s*\)/gi, '(جلسات التركيز المتقطعة)'],
  [/\bKeystone\s+Habits?\b/gi, 'العادات المحورية'],
  [/\bCritical\s+Bottleneck\b/gi, 'عنق الزجاجة الحياتي'],
  [/\bBottlenecks?\b/gi, 'عنق الزجاجة'],
  [/\bDemo\s+Mode\b/gi, 'وضع المحكّمين'],
  [/\bLife\s+Wheel\b/gi, 'عجلة الحياة'],
  [/\bDeep\s+Work\b/gi, 'العمل العميق'],
  [/\bDeep\s+Study\b/gi, 'المذاكرة العميقة'],
  [/\bMicro-?learning\b/gi, 'التعلم المصغّر'],
  [/\bMicro-?habit\b/gi, 'عادة صغرى'],
  [/\bLeverage\s+Point\b/gi, 'نقطة الارتكاز'],
  [/الـ\s*AI\b/gi, 'الذكاء الاصطناعي'],
];

const AR_WORD_START = '(^|[\\s(\\[«"\'])';
const AR_HAMZA_PREFIX_START = '(^|[\\s(\\[«"\']|[وفبك])';
const AR_WORD_END = '(?=[\\s.,،:;!?)\\]»"\']|$)';

const ARABIC_SPELLING_REPLACEMENTS: Array<[RegExp, string]> = [
  [new RegExp(`${AR_WORD_START}الأسرى${AR_WORD_END}`, 'g'), '$1الأسري'],
  [new RegExp(`${AR_WORD_START}الاسري${AR_WORD_END}`, 'g'), '$1الأسري'],
  [new RegExp(`${AR_WORD_START}الإجتماعي(ة)?${AR_WORD_END}`, 'g'), '$1الاجتماعي$2'],
  [new RegExp(`${AR_WORD_START}الإستقلال${AR_WORD_END}`, 'g'), '$1الاستقلال'],
  [new RegExp(`${AR_WORD_START}الإستراتيجي(ة)?${AR_WORD_END}`, 'g'), '$1الاستراتيجي$2'],
  [new RegExp(`${AR_WORD_START}الإدخار${AR_WORD_END}`, 'g'), '$1الادخار'],
  [new RegExp(`${AR_WORD_START}الإستثمار(ي|ية)?${AR_WORD_END}`, 'g'), '$1الاستثمار$2'],
  [new RegExp(`${AR_WORD_START}الإستقرار${AR_WORD_END}`, 'g'), '$1الاستقرار'],
  [new RegExp(`${AR_WORD_START}الإستمرار(ية)?${AR_WORD_END}`, 'g'), '$1الاستمرار$2'],
  [new RegExp(`${AR_WORD_START}الإلتزام(ات)?${AR_WORD_END}`, 'g'), '$1الالتزام$2'],
  [new RegExp(`${AR_WORD_START}الإستنزاف${AR_WORD_END}`, 'g'), '$1الاستنزاف'],
  [new RegExp(`${AR_WORD_START}الإنتباه${AR_WORD_END}`, 'g'), '$1الانتباه'],
  [new RegExp(`${AR_WORD_START}الاهداف${AR_WORD_END}`, 'g'), '$1الأهداف'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اهداف(ك|ه|ها|نا)?${AR_WORD_END}`, 'g'), '$1أهداف$2'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اولوية${AR_WORD_END}`, 'g'), '$1أولوية'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اولويات(ك|ه|ها|نا)?${AR_WORD_END}`, 'g'), '$1أولويات$2'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}افضل${AR_WORD_END}`, 'g'), '$1أفضل'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اكثر${AR_WORD_END}`, 'g'), '$1أكثر'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اقل${AR_WORD_END}`, 'g'), '$1أقل'],
  [new RegExp(`${AR_HAMZA_PREFIX_START}اهم${AR_WORD_END}`, 'g'), '$1أهم'],
  [new RegExp(`${AR_WORD_START}يوميا${AR_WORD_END}`, 'g'), '$1يومياً'],
  [new RegExp(`${AR_WORD_START}[اأ]سبوعيا${AR_WORD_END}`, 'g'), '$1أسبوعياً'],
  [new RegExp(`${AR_WORD_START}غير مقيم(ة)?${AR_WORD_END}`, 'g'), '$1غير مقيّم$2'],
];

/**
 * Attaches Arabic preposition 'لـ' cleanly to a noun phrase (e.g. 'الجانب الصحي' -> 'للجانب الصحي').
 */
export function prefixLamArabic(phrase: string): string {
  const trimmed = (phrase || '').trim();
  if (!trimmed) return 'لهذا الجانب';
  if (trimmed.startsWith('ال') && trimmed.length > 2) {
    return `لل${trimmed.slice(2)}`;
  }
  return `لـ ${trimmed}`;
}

/**
 * Normalizes Arabic prepositions, common spelling slips, and unbalanced or redundant parentheses.
 */
export function normalizeArabicText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let result = text;

  // 1. Attach detached "لـ ال..." into "لل..."
  result = result.replace(/(^|[\s(\[«"'])لـ\s+ال([\u0621-\u064A])/g, '$1لل$2');

  // 2. Fix common LLM spelling & hamza slips
  for (const [pattern, replacement] of ARABIC_SPELLING_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // 3. Remove parentheses wrapping a standalone number like "(10) دقائق" or "المربع (2)"
  result = result.replace(/\(\s*(\d+(?:\.\d+)?)\s*\)/g, '$1');

  // 4. Collapse doubled parentheses "((" or "))"
  result = result.replace(/\(\s*\(/g, '(').replace(/\)\s*\)/g, ')');

  // 5. Balance any unmatched '(' or ')' cleanly so titles/exports never end with stray parens
  const chars = Array.from(result);
  const openStack: number[] = [];
  const dropIndices = new Set<number>();

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '(') {
      openStack.push(i);
    } else if (chars[i] === ')') {
      if (openStack.length === 0) {
        dropIndices.add(i);
      } else {
        openStack.pop();
      }
    }
  }
  for (const unclosedIdx of openStack) {
    dropIndices.add(unclosedIdx);
  }

  if (dropIndices.size > 0) {
    result = chars.filter((_, idx) => !dropIndices.has(idx)).join('');
  }

  return result
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Converts a canonical domain key (e.g. 'career', 'health') into its approved Arabic display title.
 */
export function getDomainArabicName(keyOrName: string): string {
  if (!keyOrName || typeof keyOrName !== 'string') return 'الجانب الحياتي';
  const normalized = keyOrName.trim().toLowerCase();
  if (DOMAIN_ARABIC_NAMES[normalized]) {
    return DOMAIN_ARABIC_NAMES[normalized];
  }
  return localizeDomainText(keyOrName.trim());
}

/**
 * Replaces leaked English domain keys and jargon phrases inside Arabic prose with natural Arabic equivalents.
 */
export function localizeDomainText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let result = text;

  // Strip redundant parenthetical English keys that immediately follow an Arabic domain phrase
  // e.g. "الجانب المالي (financial)" or "الجانب الصحي والبدني (health)" -> Arabic display name
  for (const [key, arabicName] of Object.entries(DOMAIN_ARABIC_NAMES)) {
    const shortRoot = arabicName.replace(/\s+و.*$/, '');
    const duplicateAfterArabic = new RegExp(
      `(?:${arabicName}|${shortRoot})\\s*\\(\\s*${key}\\s*\\)`,
      'gi'
    );
    result = result.replace(duplicateAfterArabic, arabicName);
  }

  for (const [pattern, replacement] of ENGLISH_JARGON_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  for (const [key, arabicName] of Object.entries(DOMAIN_ARABIC_NAMES)) {
    const parenKeyRegex = new RegExp(`\\(\\s*${key}\\s*\\)`, 'gi');
    result = result.replace(parenKeyRegex, arabicName);
    const keyRegex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(keyRegex, arabicName);
  }

  return normalizeArabicText(result);
}

const SHORT_TO_CANONICAL_ID: Array<[RegExp, string]> = [
  [/الروحي|السكينة|spiritual/i, 'spiritual'],
  [/المالي|الاستقلال|financial/i, 'financial'],
  [/المهني|الوظيفي|الأكاديمي|career/i, 'career'],
  [/الشخصي|الذات|personal/i, 'personal'],
  [/التعليمي|المعرفي|learning/i, 'learning'],
  [/الأسري|الاسري|العائلي|family/i, 'family'],
  [/الاجتماعي|العلاقات|social/i, 'social'],
  [/الصحي|البدني|health/i, 'health'],
];

function inferDomainIdFromLabel(label?: string): string | null {
  if (!label || typeof label !== 'string') return null;
  for (const [regex, id] of SHORT_TO_CANONICAL_ID) {
    if (regex.test(label)) return id;
  }
  return null;
}

function toneDownExaggeratedStrength(text: string): string {
  if (!text) return '';
  const wbStart = '(?<![\\u0621-\\u064A])';
  const wbEnd = '(?![\\u0621-\\u064A\\u064B-\\u0652])';
  const rules: Array<[RegExp, string]> = [
    [new RegExp(`${wbStart}استثناءً\\s*مطلقاً${wbEnd}`, 'g'), 'متقدمة نسبياً'],
    [new RegExp(`${wbStart}استثنائية\\s*مطلقة${wbEnd}`, 'g'), 'مستقرة نسبياً'],
    [new RegExp(`${wbStart}الاستثنائية\\s*المطلقة${wbEnd}`, 'g'), 'المتزنة نسبياً'],
    [new RegExp(`${wbStart}قوية\\s*جداً${wbEnd}`, 'g'), 'مستقرة نسبياً'],
    [new RegExp(`${wbStart}قوة\\s*مطلقة${wbEnd}`, 'g'), 'نقطة استقرار نسبية'],
    [new RegExp(`${wbStart}الاستثنائية${wbEnd}`, 'g'), 'النسبية'],
    [new RegExp(`${wbStart}استثنائياً${wbEnd}`, 'g'), 'متوازناً نسبياً'],
    [new RegExp(`${wbStart}استثنائية${wbEnd}`, 'g'), 'واضحة نسبياً'],
    [new RegExp(`${wbStart}استثنائي${wbEnd}`, 'g'), 'متزن نسبياً'],
    [new RegExp(`${wbStart}مطلقاً${wbEnd}`, 'g'), 'نسبياً'],
    [new RegExp(`${wbStart}فائقاً${wbEnd}`, 'g'), 'واضحاً'],
    [new RegExp(`${wbStart}خارقة${wbEnd}`, 'g'), 'مشجعة'],
  ];
  let out = text;
  for (const [pattern, repl] of rules) {
    out = out.replace(pattern, repl);
  }
  return out;
}

/**
 * Sanitizes every field in a Director Summary report into natural Arabic AND reconciles
 * strongestSynergy & criticalBottleneck with actual evaluated Life Wheel scores so
 * moderate scores (e.g. 6.5/10) are never labeled "استثناءً مطلقاً" and real bottlenecks match scores.
 */
export function reconcileDirectorReportWithScores<T extends Record<string, any>>(
  report: T,
  scores?: Record<string, number> | null
): T {
  const cleaned = sanitizeDirectorReportArabic(report);
  if (!cleaned || typeof cleaned !== 'object' || !scores || typeof scores !== 'object') {
    return cleaned;
  }

  const evaluatedEntries = Object.entries(scores)
    .map(([id, val]) => [id, Number(val)] as [string, number])
    .filter(([id, val]) => Boolean(DOMAIN_ARABIC_NAMES[id]) && Number.isFinite(val) && val > 0);

  if (evaluatedEntries.length === 0) {
    return cleaned;
  }

  const sortedAsc = [...evaluatedEntries].sort((a, b) => a[1] - b[1]);
  const [worstId, worstScore] = sortedAsc[0];
  const [bestId, bestScore] = sortedAsc[sortedAsc.length - 1];
  const bestLabel = DOMAIN_ARABIC_NAMES[bestId];
  const worstLabel = DOMAIN_ARABIC_NAMES[worstId];
  const avg = Number(
    (evaluatedEntries.reduce((acc, [, v]) => acc + v, 0) / evaluatedEntries.length).toFixed(1)
  );

  const next: Record<string, any> = { ...cleaned };

  // Never exaggerate moderate top scores (< 7.8, e.g. 6.5) as exceptional/absolute strength
  if (bestScore < 7.8) {
    if (typeof next.overallDiagnosis === 'string') {
      next.overallDiagnosis = toneDownExaggeratedStrength(next.overallDiagnosis);
    }
    if (typeof next.balanceIndexLabel === 'string') {
      next.balanceIndexLabel = toneDownExaggeratedStrength(next.balanceIndexLabel);
    }
    if (next.strongestSynergy && typeof next.strongestSynergy === 'object') {
      next.strongestSynergy = {
        ...next.strongestSynergy,
        title: toneDownExaggeratedStrength(next.strongestSynergy.title || ''),
        description: toneDownExaggeratedStrength(next.strongestSynergy.description || ''),
      };
    }
  }

  // Verify strongestSynergy aligns with actual top score if its involved domain is significantly weaker
  if (next.strongestSynergy && typeof next.strongestSynergy === 'object') {
    const involved = Array.isArray(next.strongestSynergy.domainsInvolved)
      ? next.strongestSynergy.domainsInvolved
      : [];
    const primarySynergyId =
      inferDomainIdFromLabel(involved[0]) ||
      inferDomainIdFromLabel(next.strongestSynergy.title);
    const primarySynergyScore = primarySynergyId ? Number(scores[primarySynergyId] || 0) : 0;

    if (!primarySynergyId || (primarySynergyScore > 0 && bestScore - primarySynergyScore > 0.05)) {
      next.strongestSynergy = {
        title:
          bestScore >= 7.8
            ? `قوة ${bestLabel} كرافعة للتوازن`
            : `استقرار ${bestLabel} كنقطة انطلاق`,
        description:
          bestScore >= 7.8
            ? `تقدّمك في ${bestLabel} بدرجة ${bestScore.toFixed(1)}/10 يمنحك قاعدة إيجابية لدعم بقية الجوانب.`
            : `يمثل ${bestLabel} أعلى درجاتك الحالية في عجلة الحياة بدرجة ${bestScore.toFixed(1)}/10، ويمكن البناء على هذا الاستقرار النسبي لرفع باقي المجالات.`,
        domainsInvolved: [bestLabel, 'التوازن الشخصي'],
      };
    }
  }

  // Verify criticalBottleneck aligns with actual lowest score in Life Wheel
  if (next.criticalBottleneck && typeof next.criticalBottleneck === 'object') {
    const reportBottleneckId =
      inferDomainIdFromLabel(next.criticalBottleneck.domain) ||
      inferDomainIdFromLabel(next.criticalBottleneck.title);
    const reportBottleneckScore = reportBottleneckId ? Number(scores[reportBottleneckId] || 0) : 0;

    if (
      !reportBottleneckId ||
      reportBottleneckScore <= 0 ||
      reportBottleneckScore - worstScore > 0.05
    ) {
      next.criticalBottleneck = {
        ...next.criticalBottleneck,
        title: `فجوة ${worstLabel} والأولوية العلاجية`,
        impact: `سجّل ${worstLabel} أدنى درجة في عجلة حياتك الحالية (${worstScore.toFixed(1)}/10)، مما يجعله عنق الزجاجة الأبرز مقارنةً بمتوسطك العام (${avg.toFixed(1)}/10).`,
        recommendation:
          next.criticalBottleneck.recommendation && reportBottleneckId === worstId
            ? next.criticalBottleneck.recommendation
            : `خصّص عادة صغيرة يومية لمدة 15 دقيقة ${prefixLamArabic(worstLabel)} وأدرجها في المربع 2 بمصفوفة أيزنهاور.`,
        domain: worstLabel,
      };
    } else {
      next.criticalBottleneck = {
        ...next.criticalBottleneck,
        domain: getDomainArabicName(next.criticalBottleneck.domain || worstLabel),
      };
    }
  }

  return sanitizeDirectorReportArabic(next) as T;
}

/**
 * Ensures every human-facing field in a Director Summary report is written cleanly in Arabic without raw domain keys.
 */
export function sanitizeDirectorReportArabic<T extends Record<string, any>>(report: T): T {
  if (!report || typeof report !== 'object') return report;

  const mapList = (arr: any) =>
    Array.isArray(arr) ? arr.map((item) => localizeDomainText(String(item || ''))) : [];

  return {
    ...report,
    ...(typeof report.overallDiagnosis === 'string'
      ? { overallDiagnosis: localizeDomainText(report.overallDiagnosis) }
      : {}),
    ...(typeof report.balanceIndexLabel === 'string'
      ? { balanceIndexLabel: localizeDomainText(report.balanceIndexLabel) }
      : {}),
    ...(typeof report.directorGoldenRule === 'string'
      ? { directorGoldenRule: localizeDomainText(report.directorGoldenRule) }
      : {}),
    ...(report.strongestSynergy && typeof report.strongestSynergy === 'object'
      ? {
          strongestSynergy: {
            ...report.strongestSynergy,
            title: localizeDomainText(report.strongestSynergy.title || ''),
            description: localizeDomainText(report.strongestSynergy.description || ''),
            domainsInvolved: mapList(report.strongestSynergy.domainsInvolved),
          },
        }
      : {}),
    ...(report.criticalBottleneck && typeof report.criticalBottleneck === 'object'
      ? {
          criticalBottleneck: {
            ...report.criticalBottleneck,
            title: localizeDomainText(report.criticalBottleneck.title || ''),
            impact: localizeDomainText(report.criticalBottleneck.impact || ''),
            recommendation: localizeDomainText(report.criticalBottleneck.recommendation || ''),
            domain: getDomainArabicName(report.criticalBottleneck.domain || ''),
          },
        }
      : {}),
    ...(Array.isArray(report.keystoneHabits)
      ? {
          keystoneHabits: report.keystoneHabits.map((h: any) => ({
            ...h,
            name: localizeDomainText(h?.name || ''),
            triggerTime: localizeDomainText(h?.triggerTime || ''),
            targetDomains: mapList(h?.targetDomains),
            expectedImpact: localizeDomainText(h?.expectedImpact || ''),
          })),
        }
      : {}),
    ...(Array.isArray(report.thirtyDayRoadmap)
      ? {
          thirtyDayRoadmap: report.thirtyDayRoadmap.map((w: any) => ({
            ...w,
            weekTitle: localizeDomainText(w?.weekTitle || ''),
            coreFocus: localizeDomainText(w?.coreFocus || ''),
            actions: mapList(w?.actions),
          })),
        }
      : {}),
  };
}
