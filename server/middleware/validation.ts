import {
  extractAnchorSelfRatingFromHistory,
  hasAcuteIsolationOrRejection,
  sanitizeArabicGrammarAndMorphology,
} from '../../src/utils/dialogueDeduplication';

/**
 * يستخرج درجة التقييم الصريحة (1-10) فقط عند وجود صيغة تقييم واضحة،
 * ويمنع تماماً التقاط أي رقم عادي داخل الكلام مثل "25 دقيقة" أو "ساعتين" أو "30 ريال".
 */
export function extractExplicitRating(text: string): number | null {
  if (!text || typeof text !== 'string') return null;

  // 1. صيغة تقييم صريحة مع "من 10" أو "/ 10"
  const explicitPhraseMatch = text.match(
    /(?:تقييمي|أقيّم نفسي|اقيم نفسي|درجتي|أعطيه|اعطيه)\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i
  );
  if (explicitPhraseMatch) {
    const val = parseFloat(explicitPhraseMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  // 2. رقم بصيغة صريحة "X من 10" أو "X/10" بحدود كلمات كاملة
  const fromTenMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i);
  if (fromTenMatch) {
    const val = parseFloat(fromTenMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  // 3. صيغة تقييم صريحة بدون "من 10" بشرط ألا تتبعها وحدة قياس زمنية أو مالية
  const labelOnlyMatch = text.match(
    /(?:تقييمي|أقيّم نفسي|اقيم نفسي|درجتي|أعطيه|اعطيه)\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)(?![\d.]|\s*(?:دقيقة|دقائق|ساعة|ساعات|ريال|يوم|أيام|شهر|أشهر|سنة|سنوات|%))/i
  );
  if (labelOnlyMatch) {
    const val = parseFloat(labelOnlyMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 10) return Number(val.toFixed(1));
  }

  return null;
}

// Semantic scoring and sentiment patterns
export function calculateSemanticScore(
  text: string,
  historyTexts: string[] = [],
  explicitScore?: number
): number {
  if (explicitScore !== undefined && explicitScore >= 1 && explicitScore <= 10) {
    return Number(explicitScore.toFixed(1));
  }

  const anchorRating = extractAnchorSelfRatingFromHistory(historyTexts);
  const allText = [text, ...historyTexts].join(' ').toLowerCase();
  const cleanedForNegativeCheck = allText.replace(
    /(?:بعيد[اً ]*عن|البعد\s*عن|إبعاد|ابعد|تجنب|دون|بدون|بلا|تخلصت\s*من|تجاوزت|لا\s*(?:أشعر|اشعر|يوجد|توجد)\s*(?:ب|ل)?)\s*(?:الشاشات|الهاتف|الجوال|التوتر|الضغط|القلق|الإرهاق|الارهاق|التشتت|السهر|اللوم|المقاطعات)/gi,
    ' '
  );
  const hasAcuteIsolation = hasAcuteIsolationOrRejection([text, ...historyTexts]);

  // 1. Severe breakdown & collapse (1.5 - 3.0)
  const severeNegativePatterns = [
    /(مدمر|محطم|كارثي|كارثة|صفر|ضياع تام|ضائع كليا|لا املك شيء|مفلس تماما|غارق ديون|غرقان ديون|لا اصلي ابدا|تارك الصلاة|ما اصلي نهائيا|انعدام|طاقتي صفر|نومي مدمر|ما انام ابدا|فاشل جدا|اكره حياتي|مكتئب جدا|منهار|مخنوق تماما|مفيش امل|منعدم|مديونية خانقة|صفر ريال)/i
  ];

  // 2. Strong negative & high struggle (2.5 - 3.8 for isolation/mistreatment, 2.7 - 3.6 overall)
  const strongNegativePatterns = [
    /(سيء جدا|سلبي جدا|غير راض ابدا|ضياع|يضيع بسرعة|الوقت يضيع|ما في فايدة|ما اقدر|عاجز|مستنزف|قلق دائم|خوف مستمر|توتر شديد|سهر مستمر|ارق شديد|خمول مستمر|كسل شديد|تراكم|تسويف دائم|ديون كثيرة|راتب لا يكفي|ما اقدر اوفر|عزلة تامة|وحيد تماما|فجوة كبيرة|مشاكل مستمرة|نزاع دائم|تعبت من الوضع|مخنوق|تعبان كثير|فاقد السيطرة|بدون هدف|ما اصلي|اقصر بالصلاة|سلبي تماما|سلبي جدا|لا أجلس مع|لا اجلس مع|لا أريد الجلوس|لا اريد الجلوس|سوء معاملة|سوء المعاملة|لا أشعر بأي فائدة|لا فائدة من وجودهم)/i
  ];

  // 3. Moderate negative, fluctuation, & fatigue (4.0 - 5.5 alone, or 6.6-7.3 if paired with strong positive baseline)
  const moderateNegativePatterns = [
    /(تشتت|يشتت|تشتيت|تسويف|تأجيل|مشتت|فتور|تراجع|تذبذب|متذبذب|متقلب|تقلب|غير مستقر|غير منتظم|صعوبة|ضغط|مضغوط|مرهق|تعبان|متعب|إرهاق|ارهاق|استنزاف|مشغول|انشغال|قلق|توتر|تقصير|أقصر|اقصر|روتين|ملل|ما عندي وقت|سطحية|خمول|سهر|ضيق وقت|خجل|يوم .* ويوم|أحيانا ألتزم|مرة ألتزم|أغرق في الهاتف|انقطاع)/i
  ];

  // 4. Moderate positive & improving (6.1 - 7.1)
  const moderatePositivePatterns = [
    /(مقبول|جيد نوعا ما|احاول|أحاول|اتحسن|أتحسن|خطوة طيبة|وعي|راض نسبيا|ماشي الحال|استقرار متوسط|احيانا ملتزم|بديت اتعلم|علاقة طيبة|احسن من قبل|تطور بسيط|في تحسن|جيدة|مرتاح|قريب|نتفاهم)/i
  ];

  // 5. Strong positive & stable across all 8 domains (7.5 - 9.0)
  const strongPositivePatterns = [
    /(ممتاز|جيد جدا|سكينة|طمأنينة|ورد يومي|صلاة في وقتها|خشوع|انضباط مالي|ادخار منتظم|صندوق طوارئ|فائض شهري|راتبي مستقر|انجاز عالي|شغف|تطور مستمر|تصالح مع الذات|قراءة مستمرة|قراءة يومية|تعلم دائم|ترابط اسري|حوار دافئ|اصدقاء اوفياء|علاقات داعمة|نوم عميق|نوم منتظم|نوم مريح|نشاط وحيوية|رياضة مستمرة|رياضة يومية|راحة بال|كثير من الوقت|الكثير من الوقت|وقت كبير|أمنحهم|أعطيهم وقت|دائماً معهم|نجلس معاً كثيراً|تواصل دافئ|وقت\s*(?:يومي\s*)?ثابت|تخصيص\s*وقت|البعد\s*عن\s*الشاشات|بعيد[اً ]*عن\s*الشاشات|بدون\s*(?:هاتف|شاشات)|صفاء\s*(?:ذهني|الذهن|البال)|هدوء\s*(?:نفسي|داخلي|ذهني)|اتزان\s*(?:نفسي|داخلي)|توازن\s*(?:نفسي|داخلي|جيد|ممتاز)|راحة\s*ذهنية|مستقر\s*(?:نفسياً|داخلياً|ذهنياً)|استقرار\s*(?:نفسي|داخلي)|حضور\s*(?:أعمق|اعمق|ذهني|كامل|دافئ)|عمل\s*عميق|روتين\s*صحي|ألتزم\s*(?:يومياً|بانتظام)|بانتظام\s*يومياً)/i
  ];

  // 6. Outstanding (8.6 - 9.0 baseline, up to 9.4 for extraordinary)
  const outstandingPositivePatterns = [
    /(مثالي|استثنائي|فوق الممتاز|شغف عالي جدا|سلام داخلي عميق|استقلال مالي|حرية مالية|انتاجية استثنائية|ثقة مطلقة|عطاء ملهم|صحة حديدية|انجاز عظيم)/i
  ];

  const charHash = allText.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variance = (charHash % 9) * 0.1;

  const hasSevere = severeNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasStrongNeg = strongNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasModerateNeg = moderateNegativePatterns.some((p) => p.test(cleanedForNegativeCheck));
  const hasStrongPos = strongPositivePatterns.some((p) => p.test(allText));
  const hasOutstandingPos = outstandingPositivePatterns.some((p) => p.test(allText));
  const hasModeratePos = moderatePositivePatterns.some((p) => p.test(allText));

  let calculated = 5.2;

  if (hasAcuteIsolation) {
    // Acute isolation, ongoing mistreatment, or explicit rejection of others -> fair low range (2.6 - 3.5)
    // Never inflate toward ~4.8 due to a minor solo coping activity (e.g. walking alone).
    calculated = 2.6 + (charHash % 10) * 0.1;
  } else if (anchorRating !== null && anchorRating >= 6.8 && !hasSevere && !hasStrongNeg) {
    // Preserve high starting anchor with only gentle moderation (6.5 - 7.8) for minor sub-challenges
    calculated = hasModerateNeg
      ? Math.max(6.5, Math.min(7.5, anchorRating - 0.8))
      : Math.max(7.5, Math.min(9.0, anchorRating));
  } else if (hasSevere) {
    calculated = 1.8 + variance * 0.8;
  } else if (hasStrongNeg) {
    calculated = 2.7 + variance * 0.9;
  } else if ((hasStrongPos || hasOutstandingPos) && hasModerateNeg) {
    // Positive foundation + minor sub-challenge (e.g. ample family time + phone distraction) -> balanced 6.6 - 7.3
    calculated = 6.6 + (variance % 8) * 0.1;
  } else if (hasModerateNeg) {
    // Fluctuating, stressed, or exhausted -> 4.0 to 5.4
    calculated = 4.0 + (charHash % 15) * 0.1;
  } else if (hasOutstandingPos) {
    calculated = 8.6 + (charHash % 5) * 0.1;
  } else if (hasStrongPos) {
    // Positive & stable answers -> 7.6 to 9.0
    calculated = 7.6 + (charHash % 15) * 0.1;
  } else if (hasModeratePos) {
    calculated = 6.2 + variance * 0.9;
  }

  return Number(Math.max(1.5, Math.min(9.8, calculated)).toFixed(1));
}

// Reconciles model score with user self-rating and evidence
export function processAndReconcileScore(
  rawModelScore: any,
  userSelfScore: number | undefined,
  message: string,
  historyTexts: string[],
  fallbackScore: number
): number {
  let modelScore = typeof rawModelScore === 'number' && !isNaN(rawModelScore) ? rawModelScore : fallbackScore;
  let finalScore = modelScore;

  if (userSelfScore !== undefined && !isNaN(userSelfScore) && userSelfScore >= 1 && userSelfScore <= 10) {
    const allText = [message, ...historyTexts].join(' ').toLowerCase();

    // فحص أدلة واضحة على ممارسة فعلية مستمرة (تبرر فرقاً أكبر من ±1.0)
    const hasClearPracticeEvidence = /(يومياً|كل يوم|أمارس بانتظام|ملتزم تماماً|أوفر شهرياً|أستثمر شهرياً|رياضة يومية|أقرأ يومياً|منجز باستمرار|أحافظ دائماً)/i.test(allText);

    // فحص أدلة على مشكلة خطيرة واقعية (تبرر خفضاً أكبر من -1.0)
    const hasAcuteIsolation = hasAcuteIsolationOrRejection([message, ...historyTexts]);
    const hasSevereIssueEvidence =
      hasAcuteIsolation ||
      /(ديون متراكمة|إفلاس|لا أنام مطلقاً|أزمة صحية حادة|قطيعة تامة|اكتئاب حاد|انهيار|فقدت وظيفتي|مديونية خانقة|سوء معاملة|عزلة تامة)/i.test(allText);

    // التحقق من النوايا المستقبلية التي لا ينبغي رفع الدرجة بسببها ("سأفعل"، "لن أجلد نفسي")
    const isFutureIntentionOnly = /(سوف|سأبدأ|سأقوم|سأحاول|ناوي|أخطط أن|لن أكرر|لن أجلد نفسي|أتمنى أن|إن شاء الله سـ|ناوي أغير)/i.test(message) && !hasClearPracticeEvidence;

    // في حال اعتماد التقييم الصريح: اعتمد الدرجة المتفق عليها 100% دون أي انحراف (Zero Drift)
    const isAdoption = /(اعتمد\s*التقييم|اعتمد|اعتماد|اعتمدها|نكتفي|كافي|المحطة التالية|خلاص|انتهينا|جاهز للمحطة|نعم اعتمد)/i.test(message);
    if (isAdoption) {
      finalScore = userSelfScore;
    } else if (hasAcuteIsolation && extractExplicitRating(message) === null) {
      // في حالة العزلة الحادة أو سوء المعاملة دون تقييم رقمي صريح، امنع تضخيم الدرجة نحو ~4.8 وحافظ على مدى عادل (2.5 - 3.8)
      finalScore = Math.max(2.5, Math.min(3.8, modelScore > 0 ? Math.min(modelScore, 3.8) : fallbackScore));
    } else if (!hasClearPracticeEvidence && !hasSevereIssueEvidence) {
      // اجعل الدرجة النهائية قريبة من تقييم المستخدم الذاتي، ولا تسمح بهبوط حاد تحت 6.5 إذا كان تقييمه الأول مرتفعاً (>= 7)
      const minAllowed =
        userSelfScore >= 7.0
          ? Math.max(6.5, userSelfScore - 1.5)
          : Math.max(1.0, userSelfScore - 1.0);
      const maxAllowed = Math.min(10.0, userSelfScore + 1.0);
      if (finalScore < minAllowed) {
        finalScore = minAllowed;
      } else if (finalScore > maxAllowed) {
        finalScore = maxAllowed;
      }
    }

    // لا ترفع الدرجة بسبب نوايا أو خطط مستقبلية ('سأفعل'، 'لن أجلد نفسي')؛ الخطط تُذكر كفرصة وليست دليل قدرة
    if (isFutureIntentionOnly && finalScore > userSelfScore) {
      finalScore = userSelfScore;
    }
  }

  finalScore = Math.max(1.0, Math.min(10.0, Number(finalScore.toFixed(1))));

  console.log(`[Advisor Chat Score] التقييم الذاتي: ${userSelfScore !== undefined ? userSelfScore : 'غير محدد'}, درجة النموذج: ${modelScore}, الدرجة النهائية: ${finalScore}`);

  return finalScore;
}

// Sanitizes strengths from exaggeration or self-contradictions
export function sanitizeStrengths(
  strengths: any[],
  userMessage: string,
  historyTexts: string[]
): string[] {
  if (!Array.isArray(strengths)) return [];
  const allText = [userMessage, ...historyTexts].join(' ').toLowerCase();
  const isHarshOnSelf = /(أقسو على نفسي|اقسو على نفسي|أجلد نفسي|اجلد نفسي|جلد الذات|قسوة على الذات|ألوم نفسي دائماً|الوم نفسي)/i.test(allText);
  const isSocialStruggle = /(فتور|انعزال|عزلة|وحيد|وحدة|قطيعة|انقطاع|قلة\s*تواصل|مقص[ّ]?ر\s*مع\s*أصدق|انطواء|تراجع\s*(?:في\s*)?التواصل|صعوبة\s*(?:في\s*)?التواصل)/i.test(allText);
  const hasFinancialStrain = /(عجز|ديون|قرض|قروض|أقساط|اقساط|لا\s*أدخر|لا\s*ادخر|لا\s*أوفر|لا\s*اوفر|صفر\s*ادخار|ضغط\s*مالي)/i.test(allText);
  const hasDebtMention = !/(بدون\s*ديون|لا\s*(?:يوجد\s*)?ديون|خالي\s*من\s*الديون|خلو\s*سجلي\s*من\s*الديون)/i.test(allText) && /(ديون|دين|قرض|قروض|أقساط|اقساط)/i.test(allText);
  const hasHealthStruggle = /(أرق|ارق|قلة\s*(?:ال)?نوم|لا\s*أنام|لا\s*انام|سهر|خمول|إرهاق|ارهاق|تعب|نوم\s*متقطع)/i.test(allText);
  const hasSpiritualStruggle = /(فتور|تشتت|أقصر|اقصر|لا\s*أصلي|ما\s*أصلي|ما\s*اصلي|غياب\s*السكينة|ضيق)/i.test(allText);
  const hasPersonalStruggle = /(تسويف|تأجيل|مشتت|تشتت|ضغط\s*نفسي|قلق|توتر|فوضى|لا\s*ألتزم)/i.test(allText);

  return strengths
    .map((item) => {
      let s = String(item || '').trim();
      if (!s) return '';

      // تجنب التناقض: إذا كان المستخدم يقسو على نفسه
      if (isHarshOnSelf && /(ينتقد ذاته بلطف|رفيق بذاته|وعي ذاتي رفيق|لطيف مع نفسه|سلام داخلي مع أخطائه)/i.test(s)) {
        s = 'الرغبة الصريحة في مراجعة الذات والسعي للتحسين';
      }

      // تجنب التناقض: إذا اشتكى المستخدم من الفتور أو الانعزال الاجتماعي
      if (isSocialStruggle && /(حضور\s*اجتماعي\s*متوازن|شبكة\s*علاقات\s*(?:صحية|متوازنة)|تواصل\s*اجتماعي\s*متوازن|علاقات\s*اجتماعية\s*مستقرة|اندماج\s*اجتماعي|تفاعل\s*اجتماعي\s*قوي)/i.test(s)) {
        s = 'الوعي بأهمية الأصدقاء المقربين والرغبة في تنظيم وقت التواصل';
      }

      // تجنب التناقض: إذا ذكر المستخدم وجود ديون أو عجز ادخاري
      if (hasDebtMention && /(خلو\s*(?:السجل\s*)?من\s*الديون|خالٍ\s*من\s*الديون)/i.test(s)) {
        s = 'الوضوح في حصر الالتزامات والسعي لترتيب الأولويات المالية';
      }
      if (hasFinancialStrain && /(استقرار\s*مالي\s*كبير|ادخار\s*منتظم|موازنة\s*نفقات\s*حكيمة)/i.test(s)) {
        s = 'الشفافية في تشخيص الواقع المالي والرغبة في ضبط الأولويات';
      }

      // تجنب التناقض: إذا اشتكى المستخدم من الأرق أو قلة النوم أو الإرهاق
      if (hasHealthStruggle && /(جودة\s*نوم\s*عميقة|حيوية\s*بدنية\s*ممتازة|نوم\s*منتظم|طاقة\s*جسدية\s*عالية)/i.test(s)) {
        s = 'الوعي بتأثير النوم والراحة على الطاقة والرغبة في تحسينهما';
      }

      // تجنب التناقض: إذا اشتكى المستخدم من فتور أو تشتت روحي
      if (hasSpiritualStruggle && /(حضور\s*قلبي\s*وسكينة|سكينة\s*داخلية\s*متزنة|انتظام\s*(?:كامل\s*)?في\s*العبادات)/i.test(s)) {
        s = 'الوعي بأهمية السكينة القلبية والسعي لبناء لحظات هدوء ثابتة';
      }

      // تجنب التناقض: إذا اشتكى المستخدم من تسويف أو تشتت شخصي
      if (hasPersonalStruggle && /(توازن\s*نفسي\s*ووعي\s*ذاتي\s*متقدم|انضباط\s*شخصي\s*(?:عالٍ|عالي|تام)|خلو\s*من\s*التسويف)/i.test(s)) {
        s = 'الوعي بالتحدي الحالي والرغبة في بناء خطوات عملية تدريجية';
      }

      // إزالة المبالغات مثل "عالية" أو "كامل" وتعديلها لصيغة معتدلة
      s = s.replace(/(?:بدرجة\s+)?عالية\s+جداً/gi, 'ملحوظة')
        .replace(/\bعالية\b/gi, 'طيبة')
        .replace(/\bكاملة\b/gi, 'واضحة')
        .replace(/\bكامل\b/gi, 'واضح')
        .replace(/\bاستثنائية\b/gi, 'ملموسة')
        .replace(/\bمثالية\b/gi, 'إيجابية');

      return s;
    })
    .filter(Boolean);
}

// Sanitizes reply tone, clichés, and ensures small plan on completion
export function sanitizeAdvisorReply(
  reply: string,
  stationCompleted: boolean
): string {
  let cleaned = (reply || '')
    // تنقية الكليشيهات والمصطلحات المكررة والثقيلة
    .replace(/ثقب\s+التسريب/gi, 'موضع الهدر والتشتت')
    .replace(/مفتاح\s+السكينة/gi, 'خطوة الهدوء')
    .replace(/تعهد\s+مقدس/gi, 'التزام ذاتي')
    .replace(/استراتيجية\s+ذهبية/gi, 'خطوة عملية موفقة')
    .replace(/انتصارك\s+اليومي/gi, 'إنجازك اليومي')
    .replace(/أرقى\s+صور[^\s]*/gi, 'صورة طيبة')
    .replace(/أغلب\s+المبدعين[^\s]*/gi, 'كثير من الناس')
    .replace(/ديناميكية/gi, 'تفاعل وحركة')
    .replace(/بروتوكول/gi, 'نهج وخطة')
    .replace(/سيادة\s+الذات/gi, 'التحكم الذاتي');

  // خامساً: إذا اكتملت المحطة، تأكد من ختامها بخطة صغيرة من جملتين بدل مواصلة الأسئلة
  if (stationCompleted) {
    if (/[؟?]/.test(cleaned)) {
      cleaned = cleaned.replace(/[^\n.]*[؟?][^\n]*$/g, '').trim();
      if (!cleaned.includes('خلاصتنا') && !cleaned.includes('خطتك الصغيرة')) {
        cleaned += `\n\n🎯 **خطتك الصغيرة:** ركّز في هذه المرحلة على تثبيت هذه الخطوة البسيطة يومياً بانتظام. استمر عليها بهدوء فهي الركيزة التي ستصنع اتزانك الحقيقي.`;
      }
    }
  }

  return sanitizeArabicGrammarAndMorphology(cleaned).trim();
}

// Validates the advisor chat request payload
export function validateAdvisorChatInput(body: any): { error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'بيانات الطلب غير صالحة، يجب أن تكون كائناً بصيغة JSON.' };
  }

  const {
    advisor,
    agentKey: rawAgentKey,
    userProfile,
    answers,
    goals,
    message,
    history,
    userName,
    userAnswers,
    aiMode,
    isEvaluationSession,
    evaluationStep,
    evaluationQuestionTitle,
    assessmentMode,
    stationTurnCount,
  } = body;

  // 1) التحقق من صحة حقل message (نص بطول بين 1 و 2000 حرف)
  if (typeof message !== 'string' || message.trim().length < 1 || message.length > 2000) {
    return {
      error: 'حقل الرسالة (message) مطلوب ويجب أن يكون نصاً بطول يتراوح بين 1 و2000 حرف.',
    };
  }

  // 2) التحقق من صحة حقل history (مصفوفة أقصاها 40 عنصراً لتشمل سجل المحطة الكامل)
  if (history !== undefined && history !== null) {
    if (!Array.isArray(history) || history.length > 40) {
      return {
        error: 'سجل المحادثة (history) يجب أن يكون مصفوفة لا تتجاوز 40 عنصراً.',
      };
    }
    for (const item of history) {
      if (!item || typeof item !== 'object') {
        return {
          error: 'عناصر سجل المحادثة (history) يجب أن تكون كائنات صالحة.',
        };
      }
    }
  }

  // 3) التحقق من أنواع بقية الحقول ورفض أي نوع غير متوقع برد 400
  if (advisor !== undefined && advisor !== null && typeof advisor !== 'string' && (typeof advisor !== 'object' || Array.isArray(advisor))) {
    return { error: 'نوع حقل advisor غير صالح، يجب أن يكون نصاً أو كائناً.' };
  }
  if (rawAgentKey !== undefined && rawAgentKey !== null && typeof rawAgentKey !== 'string') {
    return { error: 'نوع حقل agentKey غير صالح، يجب أن يكون نصاً.' };
  }
  if (userProfile !== undefined && userProfile !== null && (typeof userProfile !== 'object' || Array.isArray(userProfile))) {
    return { error: 'نوع حقل userProfile غير صالح، يجب أن يكون كائناً.' };
  }
  if (userName !== undefined && userName !== null && typeof userName !== 'string') {
    return { error: 'نوع حقل userName غير صالح، يجب أن يكون نصاً.' };
  }
  if (answers !== undefined && answers !== null && (typeof answers !== 'object' || Array.isArray(answers))) {
    return { error: 'نوع حقل answers غير صالح، يجب أن يكون كائناً.' };
  }
  if (userAnswers !== undefined && userAnswers !== null && (typeof userAnswers !== 'object' || Array.isArray(userAnswers))) {
    return { error: 'نوع حقل userAnswers غير صالح، يجب أن يكون كائناً.' };
  }
  if (goals !== undefined && goals !== null && typeof goals !== 'object') {
    return { error: 'نوع حقل goals غير صالح، يجب أن يكون مصفوفة أو كائناً.' };
  }
  if (aiMode !== undefined && aiMode !== null && typeof aiMode !== 'string') {
    return { error: 'نوع حقل aiMode غير صالح، يجب أن يكون نصاً.' };
  }
  if (isEvaluationSession !== undefined && isEvaluationSession !== null && typeof isEvaluationSession !== 'boolean') {
    return { error: 'نوع حقل isEvaluationSession غير صالح، يجب أن يكون قيمة منطقية (boolean).' };
  }
  if (evaluationStep !== undefined && evaluationStep !== null && typeof evaluationStep !== 'number') {
    return { error: 'نوع حقل evaluationStep غير صالح، يجب أن يكون رقماً.' };
  }
  if (evaluationQuestionTitle !== undefined && evaluationQuestionTitle !== null && typeof evaluationQuestionTitle !== 'string') {
    return { error: 'نوع حقل evaluationQuestionTitle غير صالح، يجب أن يكون نصاً.' };
  }
  if (assessmentMode !== undefined && assessmentMode !== null && typeof assessmentMode !== 'string') {
    return { error: 'نوع حقل assessmentMode غير صالح، يجب أن يكون نصاً.' };
  }
  if (stationTurnCount !== undefined && stationTurnCount !== null && typeof stationTurnCount !== 'number') {
    return { error: 'نوع حقل stationTurnCount غير صالح، يجب أن يكون رقماً.' };
  }

  return {};
}
