import { sanitizeArabicGrammarAndMorphology } from './dialogueDeduplication';

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

const DOMAIN_KEY_ALIASES: Record<string, string> = {
  spiritual: DOMAIN_ARABIC_NAMES.spiritual,
  spirituality: DOMAIN_ARABIC_NAMES.spiritual,
  financial: DOMAIN_ARABIC_NAMES.financial,
  finance: DOMAIN_ARABIC_NAMES.financial,
  money: DOMAIN_ARABIC_NAMES.financial,
  career: DOMAIN_ARABIC_NAMES.career,
  work: DOMAIN_ARABIC_NAMES.career,
  academic: DOMAIN_ARABIC_NAMES.career,
  personal: DOMAIN_ARABIC_NAMES.personal,
  self: DOMAIN_ARABIC_NAMES.personal,
  learning: DOMAIN_ARABIC_NAMES.learning,
  education: DOMAIN_ARABIC_NAMES.learning,
  knowledge: DOMAIN_ARABIC_NAMES.learning,
  family: DOMAIN_ARABIC_NAMES.family,
  social: DOMAIN_ARABIC_NAMES.social,
  relationships: DOMAIN_ARABIC_NAMES.social,
  health: DOMAIN_ARABIC_NAMES.health,
  physical: DOMAIN_ARABIC_NAMES.health,
  wellness: DOMAIN_ARABIC_NAMES.health,
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
 * Converts a canonical domain key (e.g. 'career', 'health', 'financial_score') into its approved Arabic display title.
 * Guarantees no raw English internal identifiers or unknown keys leak into UI or PDF exports.
 */
export function getDomainArabicName(keyOrName: string): string {
  if (!keyOrName || typeof keyOrName !== 'string') return 'الجانب الحياتي';
  const trimmed = keyOrName.trim();
  if (!trimmed) return 'الجانب الحياتي';

  const normalized = trimmed
    .toLowerCase()
    .replace(/[-_](?:domain|area|score|rating|level)$/i, '')
    .trim();

  if (DOMAIN_ARABIC_NAMES[normalized]) {
    return DOMAIN_ARABIC_NAMES[normalized];
  }
  if (DOMAIN_KEY_ALIASES[normalized]) {
    return DOMAIN_KEY_ALIASES[normalized];
  }

  const localized = localizeDomainText(trimmed);
  if (localized && /[\u0600-\u06FF]/.test(localized)) {
    return localized;
  }

  return 'الجانب الحياتي';
}

function enforceSecondPersonDirectorVoice(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/صرّح\s+المستفيد\s+بواقع\s*:/g, 'ذكرتَ في هذه المحطة:')
    .replace(/صرّح\s+المستفيد/g, 'ذكرتَ')
    .replace(/أوضح\s+المستفيد/g, 'أوضحتَ')
    .replace(/ما\s+ذكره\s+المستفيد/g, 'ما ذكرتَه')
    .replace(/ذكر\s+المستفيد/g, 'ذكرتَ')
    .replace(/للمستفيد/g, 'لك')
    .replace(/\bالمستفيد\b/g, 'أنت');
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
      `(?:${arabicName}|${shortRoot})\\s*\\(\\s*${key}(?:[-_](?:domain|area|score))?\\s*\\)`,
      'gi'
    );
    result = result.replace(duplicateAfterArabic, arabicName);
  }

  for (const [pattern, replacement] of ENGLISH_JARGON_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  for (const [key, arabicName] of Object.entries(DOMAIN_ARABIC_NAMES)) {
    const parenKeyRegex = new RegExp(`\\(\\s*${key}(?:[-_](?:domain|area|score))?\\s*\\)`, 'gi');
    result = result.replace(parenKeyRegex, arabicName);
    const keyRegex = new RegExp(`(?<![A-Za-z])${key}(?:[-_](?:domain|area|score|level))?(?![A-Za-z])`, 'gi');
    result = result.replace(keyRegex, arabicName);
  }

  for (const [alias, arabicName] of Object.entries(DOMAIN_KEY_ALIASES)) {
    if (DOMAIN_ARABIC_NAMES[alias]) continue;
    const aliasRegex = new RegExp(`(?<![A-Za-z])${alias}(?:[-_](?:domain|area|score|level))?(?![A-Za-z])`, 'gi');
    result = result.replace(aliasRegex, arabicName);
  }

  return sanitizeArabicGrammarAndMorphology(normalizeArabicText(result));
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
            : `خصّص خطوة عملية واقعية ومحددة ${prefixLamArabic(worstLabel)} وأدرجها في المربع 2 بمصفوفة أيزنهاور.`,
        domain: worstLabel,
      };
    } else {
      next.criticalBottleneck = {
        ...next.criticalBottleneck,
        domain: getDomainArabicName(next.criticalBottleneck.domain || worstLabel),
      };
    }
  }

  // Enforce Single Source of Truth scores across domainBreakdown & overallBalanceScore
  if (Array.isArray(next.domainBreakdown)) {
    next.domainBreakdown = next.domainBreakdown.map((d: any) => {
      const domId = inferDomainIdFromLabel(d?.domainTitle);
      const canonical = domId && Number(scores[domId] || 0) > 0 ? Number(scores[domId]) : Number(d?.score || 0);
      return {
        ...d,
        score: Number(canonical.toFixed(1)),
      };
    });
  }
  next.overallBalanceScore = avg;

  return sanitizeDirectorReportArabic(next) as T;
}

/**
 * Ensures every human-facing field in a Director Summary report is written cleanly in Arabic without raw domain keys.
 */
export function sanitizeDirectorReportArabic<T extends Record<string, any>>(report: T): T {
  if (!report || typeof report !== 'object') return report;

  const cleanText = (val: any) => enforceSecondPersonDirectorVoice(localizeDomainText(String(val || '')));
  const mapList = (arr: any) =>
    Array.isArray(arr) ? arr.map((item) => cleanText(item)) : [];

  return {
    ...report,
    ...(typeof report.overallDiagnosis === 'string'
      ? { overallDiagnosis: cleanText(report.overallDiagnosis) }
      : {}),
    ...(typeof report.balanceIndexLabel === 'string'
      ? { balanceIndexLabel: cleanText(report.balanceIndexLabel) }
      : {}),
    ...(typeof report.rootCauseChain === 'string'
      ? { rootCauseChain: cleanText(report.rootCauseChain) }
      : {}),
    ...(typeof report.directorGoldenRule === 'string'
      ? { directorGoldenRule: cleanText(report.directorGoldenRule) }
      : {}),
    ...(report.strongestSynergy && typeof report.strongestSynergy === 'object'
      ? {
          strongestSynergy: {
            ...report.strongestSynergy,
            title: cleanText(report.strongestSynergy.title || ''),
            description: cleanText(report.strongestSynergy.description || ''),
            domainsInvolved: mapList(report.strongestSynergy.domainsInvolved),
          },
        }
      : {}),
    ...(report.criticalBottleneck && typeof report.criticalBottleneck === 'object'
      ? {
          criticalBottleneck: {
            ...report.criticalBottleneck,
            title: cleanText(report.criticalBottleneck.title || ''),
            impact: cleanText(report.criticalBottleneck.impact || ''),
            recommendation: cleanText(report.criticalBottleneck.recommendation || ''),
            domain: getDomainArabicName(report.criticalBottleneck.domain || ''),
          },
        }
      : {}),
    ...(Array.isArray(report.domainBreakdown)
      ? {
          domainBreakdown: report.domainBreakdown.map((d: any) => ({
            ...d,
            domainTitle: getDomainArabicName(d?.domainTitle || ''),
            groundedReality: cleanText(d?.groundedReality || ''),
            crossDomainImpact: cleanText(d?.crossDomainImpact || ''),
            actionableTask: cleanText(d?.actionableTask || ''),
            eisenhowerQuadrant: cleanText(d?.eisenhowerQuadrant || ''),
            planFrequency: d?.planFrequency === 'أسبوعي' ? 'أسبوعي' : 'يومي',
          })),
        }
      : {}),
    ...(Array.isArray(report.keystoneHabits)
      ? {
          keystoneHabits: report.keystoneHabits.map((h: any) => ({
            ...h,
            name: cleanText(h?.name || ''),
            triggerTime: cleanText(h?.triggerTime || ''),
            ...(typeof h?.exactStep === 'string'
              ? { exactStep: cleanText(h.exactStep) }
              : {}),
            targetDomains: mapList(h?.targetDomains),
            expectedImpact: cleanText(h?.expectedImpact || ''),
          })),
        }
      : {}),
    ...(Array.isArray(report.thirtyDayRoadmap)
      ? {
          thirtyDayRoadmap: report.thirtyDayRoadmap.map((w: any) => ({
            ...w,
            weekTitle: cleanText(w?.weekTitle || ''),
            coreFocus: cleanText(w?.coreFocus || ''),
            actions: mapList(w?.actions),
          })),
        }
      : {}),
    ...(Array.isArray(report.readyToPromoteQueue)
      ? {
          readyToPromoteQueue: report.readyToPromoteQueue.map((item: any) => ({
            ...item,
            title: cleanText(item?.title || ''),
            domainTitle: getDomainArabicName(item?.domainTitle || ''),
            quadrant: item?.quadrant === 'Q1' ? 'Q1' : 'Q2',
            frequency: item?.frequency === 'أسبوعي' ? 'أسبوعي' : 'يومي',
            milestone: cleanText(item?.milestone || ''),
          })),
        }
      : {}),
  };
}

export interface ArabicPdfDirectorPayload {
  userName: string;
  generatedDateAr: string;
  domainScores: Array<{ id: string; label: string; score: number }>;
  report: Record<string, any>;
}

/**
 * Formats the holistic Director Summary report and all 8 Life Wheel scores into a clean,
 * RTL-safe Arabic payload ready for PDF/print export with zero raw English domain keys.
 */
export function formatDirectorReportForArabicPdf<T extends Record<string, any>>(
  report: T,
  scores: Record<string, number> | null | undefined,
  userName?: string
): ArabicPdfDirectorPayload {
  const reconciled = reconcileDirectorReportWithScores(report, scores);
  const safeScores = scores || {};
  const domainScores = Object.keys(DOMAIN_ARABIC_NAMES).map((id) => {
    const num = Number(safeScores[id]);
    return {
      id,
      label: getDomainArabicName(id),
      score: Number.isFinite(num) && num > 0 ? Number(num.toFixed(1)) : 0,
    };
  });

  const cleanTargetDomains = (list: any) =>
    (Array.isArray(list) ? list : []).map((d) => getDomainArabicName(String(d || '')));

  const cleanReport = {
    ...reconciled,
    strongestSynergy: reconciled?.strongestSynergy
      ? {
          ...reconciled.strongestSynergy,
          domainsInvolved: cleanTargetDomains(reconciled.strongestSynergy.domainsInvolved),
        }
      : reconciled?.strongestSynergy,
    criticalBottleneck: reconciled?.criticalBottleneck
      ? {
          ...reconciled.criticalBottleneck,
          domain: getDomainArabicName(reconciled.criticalBottleneck.domain || ''),
        }
      : reconciled?.criticalBottleneck,
    keystoneHabits: Array.isArray(reconciled?.keystoneHabits)
      ? reconciled.keystoneHabits.map((h: any) => ({
          ...h,
          targetDomains: cleanTargetDomains(h?.targetDomains),
        }))
      : [],
  };

  return {
    userName: (userName || '').trim() || 'المستفيد',
    generatedDateAr: new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date()),
    domainScores,
    report: cleanReport,
  };
}

export interface ArabicPdfThirtyDayPayload {
  startDateStr: string;
  completedCount: number;
  progressPercent: number;
  focusDomains: Array<{ id: string; label: string; score: number }>;
  days: Array<{
    dayNumber: number;
    weekNumber: number;
    domainLabel: string;
    taskText: string;
    isCompleted: boolean;
  }>;
}

/**
 * Formats a 30-day plan into canonical Arabic RTL data for PDF/print export with zero raw English keys.
 */
export function formatThirtyDayPlanForArabicPdf(
  plan: {
    startDateStr: string;
    focusDomains: string[];
    days: Array<{
      dayNumber: number;
      weekNumber: number;
      domainId: string;
      domainTitle?: string;
      selectedTask: string;
      dailyGoals?: Array<{ text: string; isCompleted?: boolean; status?: 'pending' | 'completed' | 'missed' }>;
      isCompleted: boolean;
    }>;
  },
  scores?: Record<string, number> | null
): ArabicPdfThirtyDayPayload {
  const daysList = Array.isArray(plan?.days) ? plan.days : [];
  const completedCount = daysList.filter((d) => d.isCompleted).length;
  const progressPercent = daysList.length > 0 ? Math.round((completedCount / daysList.length) * 100) : 0;

  const focusDomains = (Array.isArray(plan?.focusDomains) ? plan.focusDomains : [])
    .map((id) => {
      const val = Number(scores?.[id]);
      return {
        id,
        label: getDomainArabicName(id),
        score: Number.isFinite(val) && val > 0 ? Number(val.toFixed(1)) : 0,
      };
    })
    .filter((item) => item.score > 0 || !scores || Object.values(scores).every((v) => !v || v <= 0))
    .sort((a, b) => a.score - b.score);

  return {
    startDateStr: localizeDomainText(plan?.startDateStr || ''),
    completedCount,
    progressPercent,
    focusDomains,
    days: daysList.map((d) => {
      const activeGoals =
        Array.isArray(d.dailyGoals) && d.dailyGoals.length > 0
          ? d.dailyGoals.slice(0, 4).filter((g) => g && g.text?.trim())
          : [];
      const formattedTaskText =
        activeGoals.length > 1
          ? activeGoals
              .map((g, idx) => {
                const isDone = g.status === 'completed' || (!g.status && g.isCompleted);
                const isMissed = g.status === 'missed';
                const mark = isDone ? ' ✓' : isMissed ? ' ✕' : '';
                return `${idx + 1}) ${localizeDomainText(g.text)}${mark}`;
              })
              .join(' • ')
          : localizeDomainText(activeGoals[0]?.text || d.selectedTask || '');

      return {
        dayNumber: d.dayNumber,
        weekNumber: d.weekNumber,
        domainLabel: getDomainArabicName(d.domainId || d.domainTitle || ''),
        taskText: formattedTaskText,
        isCompleted: Boolean(d.isCompleted),
      };
    }),
  };
}
