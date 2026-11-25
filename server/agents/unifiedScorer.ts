import {
  extractAnchorSelfRatingFromHistory,
  hasAcuteIsolationOrRejection,
} from '../../src/utils/dialogueDeduplication';
import { extractExplicitRating } from '../middleware/validation';

export interface UnifiedScoringMetrics {
  /** الانتظام والعادة (0-10) — الوزن 35% */
  consistency: number;
  /** أثر الجانب على الطاقة والسكينة مقابل الاستنزاف (0-10) — الوزن 35% */
  energyImpact: number;
  /** السيطرة ووضوح الحدود والفاعلية الشخصية (0-10) — الوزن 30% */
  controlBoundaries: number;
}

const METRIC_WEIGHTS = {
  consistency: 0.35,
  energyImpact: 0.35,
  controlBoundaries: 0.30,
} as const;

function clampMetric(value: unknown, fallback: number = 5): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(10, num));
}

/**
 * Computes the official Wazan domain score programmatically from 3 structured metrics:
 * - consistency (habits & regularity): 35%
 * - energyImpact (energy gain vs. burnout/drain): 35%
 * - controlBoundaries (agency & clear boundaries): 30%
 *
 * Rounds the weighted result to the nearest 0.5 and clamps strictly within [1.5, 9.5].
 */
export function calculateUnifiedScore(metrics: UnifiedScoringMetrics): number {
  const consistency = clampMetric(metrics?.consistency, 5);
  const energyImpact = clampMetric(metrics?.energyImpact, 5);
  const controlBoundaries = clampMetric(metrics?.controlBoundaries, 5);

  const raw =
    consistency * METRIC_WEIGHTS.consistency +
    energyImpact * METRIC_WEIGHTS.energyImpact +
    controlBoundaries * METRIC_WEIGHTS.controlBoundaries;

  const rounded = Math.round(raw * 2) / 2;
  const clamped = Math.min(9.5, Math.max(1.5, rounded));
  return Number(clamped.toFixed(1));
}

/**
 * Strictly validates and extracts the 3 evaluation metrics from a parsed JSON object.
 * Returns null if any required metric is missing or non-numeric.
 */
export function parseUnifiedMetricsPayload(raw: any): UnifiedScoringMetrics | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const hasC = raw.consistency !== undefined && raw.consistency !== null && raw.consistency !== '';
  const hasE = raw.energyImpact !== undefined && raw.energyImpact !== null && raw.energyImpact !== '';
  const hasB =
    raw.controlBoundaries !== undefined &&
    raw.controlBoundaries !== null &&
    raw.controlBoundaries !== '';

  if (!hasC || !hasE || !hasB) {
    return null;
  }

  const c = Number(raw.consistency);
  const e = Number(raw.energyImpact);
  const b = Number(raw.controlBoundaries);

  if (!Number.isFinite(c) || !Number.isFinite(e) || !Number.isFinite(b)) {
    return null;
  }

  return {
    consistency: clampMetric(c),
    energyImpact: clampMetric(e),
    controlBoundaries: clampMetric(b),
  };
}

/**
 * Formats the standardized confirmation prompt displayed from User Turn 3 onward.
 */
export function formatUnifiedScoreConfirmationMessage(score: number): string {
  const displayScore = clampMetric(score, 5).toFixed(1);
  return `بعد ما شاركتني به عبر حوارنا حتى الآن، أقيّم وضعك الحالي بدرجة (${displayScore}/10). هذا تقييم مبدئي مبني على المعلومات التي ذكرتها، وقد يتغير إذا واصلنا الاستكشاف.\n\nهل ترغب في اعتماد التقييم الحالي وإنهاء الاستشارة، أم تفضل مواصلة الحوار للحصول على فهم وتقييم أكثر دقة؟`;
}

/**
 * Extracts the 3 unified scoring metrics exclusively from the current session's user messages.
 * Never inherits prior completed scores or unrelated session state.
 */
export function extractUnifiedMetricsFromSession(
  userTexts: string[],
  _domainKey?: string
): UnifiedScoringMetrics {
  const cleanTexts = (Array.isArray(userTexts) ? userTexts : [])
    .map((t) => String(t || '').trim())
    .filter(
      (t) =>
        t.length > 0 &&
        !/^(?:اعتمد\s*التقييم(?:\s*بدرجة.*)?|نعم\s*اعتمد|اعتماد|نكتفي|خلاص|انتهينا|أرغب في الاستمرار|حسناً?\s*نكمل)/i.test(
          t
        )
    );

  if (cleanTexts.length === 0) {
    return { consistency: 5, energyImpact: 5, controlBoundaries: 5 };
  }

  const latestMsg = cleanTexts[cleanTexts.length - 1];
  const explicitLatest = extractExplicitRating(latestMsg);
  const anchorRating = extractAnchorSelfRatingFromHistory(cleanTexts);
  const allText = cleanTexts.join(' ').toLowerCase();

  const cleanedForNegativeCheck = allText.replace(
    /(?:بعيد[اً ]*عن|البعد\s*عن|إبعاد|ابعد|تجنب|دون|بدون|بلا|تخلصت\s*من|تجاوزت|لا\s*(?:أشعر|اشعر|يوجد|توجد)\s*(?:ب|ل)?)\s*(?:الشاشات|الهاتف|الجوال|التوتر|الضغط|القلق|الإرهاق|الارهاق|التشتت|السهر|اللوم|المقاطعات)/gi,
    ' '
  );

  const hasAcuteIsolation = hasAcuteIsolationOrRejection(cleanTexts);

  const severeNegativePattern =
    /(مدمر|محطم|كارثي|كارثة|صفر|ضياع تام|ضائع كليا|لا املك شيء|مفلس تماما|غارق ديون|غرقان ديون|لا اصلي ابدا|تارك الصلاة|ما اصلي نهائيا|انعدام|طاقتي صفر|نومي مدمر|ما انام ابدا|فاشل جدا|اكره حياتي|مكتئب جدا|منهار|مخنوق تماما|مفيش امل|منعدم|مديونية خانقة|صفر ريال)/i;

  const strongNegativePattern =
    /(سيء جدا|سلبي جدا|غير راض ابدا|ضياع|يضيع بسرعة|الوقت يضيع|ما في فايدة|ما اقدر|عاجز|مستنزف|قلق دائم|خوف مستمر|توتر شديد|سهر مستمر|ارق شديد|خمول مستمر|كسل شديد|تراكم|تسويف دائم|ديون كثيرة|راتب لا يكفي|ما اقدر اوفر|عزلة تامة|وحيد تماما|فجوة كبيرة|مشاكل مستمرة|نزاع دائم|تعبت من الوضع|مخنوق|تعبان كثير|فاقد السيطرة|بدون هدف|ما اصلي|اقصر بالصلاة|سلبي تماما|سلبي جدا|لا أجلس مع|لا اجلس مع|لا أريد الجلوس|لا اريد الجلوس|سوء معاملة|سوء المعاملة|لا أشعر بأي فائدة|لا فائدة من وجودهم)/i;

  const moderateNegativePattern =
    /(تشتت|يشتت|تشتيت|تسويف|تأجيل|مشتت|فتور|تراجع|تذبذب|متذبذب|متقلب|تقلب|غير مستقر|غير منتظم|صعوبة|ضغط|مضغوط|مرهق|تعبان|متعب|إرهاق|ارهاق|استنزاف|مشغول|انشغال|قلق|توتر|تقصير|أقصر|اقصر|روتين|ملل|ما عندي وقت|سطحية|خمول|سهر|ضيق وقت|خجل|يوم .* ويوم|أحيانا ألتزم|مرة ألتزم|أغرق في الهاتف|انقطاع|لا أدخر|لا ادخر|لا أقرأ|لا اقرا)/i;

  const moderatePositivePattern =
    /(مقبول|جيد نوعا ما|احاول|أحاول|اتحسن|أتحسن|خطوة طيبة|وعي|راض نسبيا|ماشي الحال|استقرار متوسط|احيانا ملتزم|بديت اتعلم|علاقة طيبة|احسن من قبل|تطور بسيط|في تحسن|جيدة|مرتاح|قريب|نتفاهم)/i;

  const strongPositivePattern =
    /(ممتاز|جيد جدا|سكينة|طمأنينة|ورد يومي|صلاة في وقتها|خشوع|انضباط مالي|ادخار منتظم|صندوق طوارئ|فائض شهري|راتبي مستقر|انجاز عالي|شغف|تطور مستمر|تصالح مع الذات|قراءة مستمرة|قراءة يومية|تعلم دائم|ترابط اسري|حوار دافئ|اصدقاء اوفياء|علاقات داعمة|نوم عميق|نوم منتظم|نوم مريح|نشاط وحيوية|رياضة مستمرة|رياضة يومية|راحة بال|كثير من الوقت|الكثير من الوقت|وقت كبير|أمنحهم|أعطيهم وقت|دائماً معهم|نجلس معاً كثيراً|تواصل دافئ|وقت\s*(?:يومي\s*)?ثابت|تخصيص\s*وقت|البعد\s*عن\s*الشاشات|بعيد[اً ]*عن\s*الشاشات|بدون\s*(?:هاتف|شاشات)|صفاء\s*(?:ذهني|الذهن|البال)|هدوء\s*(?:نفسي|داخلي|ذهني)|اتزان\s*(?:نفسي|داخلي)|توازن\s*(?:نفسي|داخلي|جيد|ممتاز)|راحة\s*ذهنية|مستقر\s*(?:نفسياً|داخلياً|ذهنياً)|استقرار\s*(?:نفسي|داخلي)|حضور\s*(?:أعمق|اعمق|ذهني|كامل|دافئ)|عمل\s*عميق|روتين\s*صحي|ألتزم\s*(?:يومياً|بانتظام)|بانتظام\s*يومياً|بدون\s*ديون|لا\s*(?:توجد|يوجد)\s*(?:عليّ\s*)?ديون)/i;

  const outstandingPositivePattern =
    /(مثالي|استثنائي|فوق الممتاز|شغف عالي جدا|سلام داخلي عميق|استقلال مالي|حرية مالية|انتاجية استثنائية|ثقة مطلقة|عطاء ملهم|صحة حديدية|انجاز عظيم)/i;

  const hasSevere = severeNegativePattern.test(cleanedForNegativeCheck);
  const hasStrongNeg = strongNegativePattern.test(cleanedForNegativeCheck);
  const hasModerateNeg = moderateNegativePattern.test(cleanedForNegativeCheck);
  const hasStrongPos = strongPositivePattern.test(allText);
  const hasOutstandingPos = outstandingPositivePattern.test(allText);
  const hasModeratePos = moderatePositivePattern.test(allText);

  if (hasAcuteIsolation) {
    return {
      consistency: 3.0,
      energyImpact: 2.5,
      controlBoundaries: 3.5,
    };
  }

  if (hasSevere) {
    return {
      consistency: 2.0,
      energyImpact: 2.0,
      controlBoundaries: 2.5,
    };
  }

  if (explicitLatest !== null && !hasStrongNeg) {
    const base = clampMetric(explicitLatest);
    return hasModerateNeg && base >= 7.0
      ? {
          consistency: clampMetric(base - 0.5),
          energyImpact: clampMetric(base - 0.8),
          controlBoundaries: clampMetric(base - 1.0),
        }
      : {
          consistency: base,
          energyImpact: base,
          controlBoundaries: base,
        };
  }

  if (anchorRating !== null && anchorRating >= 6.8 && !hasStrongNeg) {
    if (hasModerateNeg) {
      return {
        consistency: Math.max(6.5, Math.min(8.0, anchorRating - 0.5)),
        energyImpact: Math.max(6.5, Math.min(7.5, anchorRating - 0.9)),
        controlBoundaries: Math.max(6.0, Math.min(7.5, anchorRating - 1.2)),
      };
    }
    return {
      consistency: Math.min(9.0, anchorRating),
      energyImpact: Math.min(9.0, anchorRating),
      controlBoundaries: Math.min(9.0, anchorRating),
    };
  }

  if (hasStrongNeg) {
    return {
      consistency: 3.0,
      energyImpact: 3.0,
      controlBoundaries: 3.5,
    };
  }

  if ((hasStrongPos || hasOutstandingPos) && hasModerateNeg) {
    return {
      consistency: 7.5,
      energyImpact: 7.0,
      controlBoundaries: 6.5,
    };
  }

  if (hasModerateNeg) {
    const hasInconsistency = /(تذبذب|متذبذب|متقلب|تسويف|أحياناً|احيانا|تأجيل|انقطاع|لا أدخر|لا ادخر|لا أقرأ|لا اقرا)/i.test(
      cleanedForNegativeCheck
    );
    const hasDrain = /(إرهاق|ارهاق|مرهق|تعب|تعبان|أرق|ارق|سهر|استنزاف|قلق|توتر)/i.test(
      cleanedForNegativeCheck
    );
    const hasBoundaryStrain = /(ضغط|مضغوط|تشتت|هاتف|شاشات|ديون|أقساط|اقساط|مسؤوليات|انشغال)/i.test(
      cleanedForNegativeCheck
    );

    return {
      consistency: hasInconsistency ? 4.5 : 5.0,
      energyImpact: hasDrain ? 4.0 : 4.5,
      controlBoundaries: hasBoundaryStrain ? 4.5 : 5.0,
    };
  }

  if (hasOutstandingPos) {
    return {
      consistency: 9.0,
      energyImpact: 9.5,
      controlBoundaries: 9.0,
    };
  }

  if (hasStrongPos) {
    return {
      consistency: 8.5,
      energyImpact: 8.5,
      controlBoundaries: 8.0,
    };
  }

  if (hasModeratePos) {
    return {
      consistency: 6.5,
      energyImpact: 6.5,
      controlBoundaries: 6.5,
    };
  }

  return {
    consistency: 5.5,
    energyImpact: 5.5,
    controlBoundaries: 5.5,
  };
}
