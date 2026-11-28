/**
 * Shared Dialogue Deduplication & Edit/Resend Utilities
 * Prevents repeated opening greetings, misclassified tentative answers (e.g. "ممكن الاكل في المطاعم"),
 * and re-asking questions already answered or asked in the current conversation history.
 */

export type HistoryEntryLike =
  | string
  | {
      role?: string;
      sender?: string;
      content?: string;
      text?: string;
      parts?: Array<string | { text?: string }>;
    };

const ARABIC_STOPWORDS = new Set([
  'هل',
  'ما',
  'ماذا',
  'كيف',
  'لماذا',
  'متى',
  'اين',
  'أين',
  'من',
  'في',
  'على',
  'الى',
  'إلى',
  'عن',
  'مع',
  'او',
  'أو',
  'ثم',
  'هذه',
  'هذا',
  'ذلك',
  'التي',
  'الذي',
  'التى',
  'ان',
  'أن',
  'لا',
  'نعم',
  'ام',
  'أم',
  'قبل',
  'بعد',
  'حاليا',
  'حالياً',
  'الان',
  'الآن',
  'لديك',
  'عليك',
  'انت',
  'أنت',
  'هي',
  'هو',
  'كان',
  'تكون',
  'يكون',
  'اكثر',
  'أكثر',
  'بشكل',
  'خلال',
  'عند',
]);

export function normalizeArabicDialogueText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[؟?!.,،:;()\[\]{}«»"'\-–—_\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenizeNormalizedArabic(text: string): Set<string> {
  const norm = normalizeArabicDialogueText(text);
  const tokens = norm.split(' ').filter((tok) => tok.length >= 3 && !ARABIC_STOPWORDS.has(tok));
  return new Set(tokens);
}

/**
 * Strips greeting prefixes like "أهلاً دكتور" to inspect the real core intent of a user message.
 */
function stripLeadingUserSalutation(text: string): string {
  return text
    .trim()
    .replace(
      /^(?:أهلاً|اهلا|هلا|مرحبا|مرحباً|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|حيّاك|أهلين)\s*(?:دكتور|يا دكتور|دكتورة|يا دكتورة|استاذ|أستاذ|يا استاذ|يا أستاذ|باشمهندس|يا باشمهندس|بروفيسور|يا بروفيسور|صديقي|يا غالي|كمال|سفيان|ريان|طارق|ليلى|زياد|مريم|سامي|معتز|هاني)?\s*/i,
      ''
    )
    .trim();
}

/**
 * Distinguishes genuine user questions/inquiries from tentative dialect answers
 * such as "ممكن الاكل في المطاعم" ("maybe eating at restaurants") or "ممكن السهر".
 */
export function isGenuineUserQuestion(text: string): boolean {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  if (/[؟?]/.test(trimmed)) return true;

  const core = stripLeadingUserSalutation(trimmed);
  const isNegatedStatement = /^(?:ما\s+(?:عندي|ألاقي|الاقي|أشعر|اشعر|أصلي|اصلي|أقدر|اقدر|أعرف|اعرف|في|أحب|احب|أجد|اجد|يوجد))/i.test(
    core
  );
  if (isNegatedStatement) return false;

  if (
    /^(?:هل|كيف|لماذا|ليه|ماذا|ايش|وش|من هو|من هي|من هم|من أنت|من انت|مين|متى|أين|اين|كم|شو|شلون|شنو|جاوب|جاوبني|أنا أسألك|انا اسالك|ما رأيك|برأيك|ينفع|تنصحني)(?:\s|$)/i.test(
      core
    )
  ) {
    return true;
  }

  // Only treat "ممكن" without "?" as a question when explicitly asking the advisor to do something
  if (
    /\bممكن\s+(?:توضح|تشرح|تساعد|تساعدني|تعطيني|تقول|تقترح|تفسر|تفصل|نصيحة|خطة|مثال|أسألك|اسألك)/i.test(
      core
    )
  ) {
    return true;
  }

  return false;
}

function extractEntryText(entry: HistoryEntryLike): { role: 'user' | 'model' | 'unknown'; text: string } {
  if (typeof entry === 'string') {
    return { role: 'unknown', text: entry.trim() };
  }
  if (!entry || typeof entry !== 'object') {
    return { role: 'unknown', text: '' };
  }
  const rawRole = (entry.role || entry.sender || '').toLowerCase();
  const role: 'user' | 'model' | 'unknown' =
    rawRole === 'model' || rawRole === 'advisor'
      ? 'model'
      : rawRole === 'user'
      ? 'user'
      : 'unknown';

  let text = '';
  if (typeof entry.content === 'string') text = entry.content;
  else if (typeof entry.text === 'string') text = entry.text;
  else if (Array.isArray(entry.parts)) {
    text = entry.parts
      .map((p) => (typeof p === 'string' ? p : p?.text || ''))
      .filter(Boolean)
      .join('\n');
  }

  return { role, text: text.trim() };
}

/**
 * Extracts previously asked advisor questions (sentences ending with ؟ or ?) from conversation history.
 */
export function extractAskedQuestionsFromHistory(history: HistoryEntryLike[]): string[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  const questions: string[] = [];

  for (const item of history) {
    const { role, text } = extractEntryText(item);
    if (!text) continue;
    if (role === 'user') continue; // skip pure user utterances when role is known

    const matches = text.match(/[^.!؟?\n]+[؟?]/g) || [];
    for (const q of matches) {
      const cleaned = q.trim();
      if (cleaned.length >= 8) {
        questions.push(cleaned);
      }
    }
  }

  return questions;
}

/**
 * Checks whether a candidate question matches or heavily overlaps any question
 * or advisor prompt already present in the current conversation history.
 */
export function isQuestionAlreadyAsked(
  candidateQuestion: string,
  history: HistoryEntryLike[]
): boolean {
  const normCandidate = normalizeArabicDialogueText(candidateQuestion);
  if (!normCandidate || normCandidate.length < 6) return false;

  const candidateTokens = tokenizeNormalizedArabic(candidateQuestion);
  const priorAdvisorQuestions = extractAskedQuestionsFromHistory(history);

  // Also compare against raw non-user entries when history is string[]
  const comparisonTargets = [...priorAdvisorQuestions];
  for (const item of history || []) {
    const { role, text } = extractEntryText(item);
    if (text && role !== 'user') {
      comparisonTargets.push(text);
    }
  }

  for (const prior of comparisonTargets) {
    const normPrior = normalizeArabicDialogueText(prior);
    if (!normPrior) continue;

    if (normPrior.includes(normCandidate) || normCandidate.includes(normPrior)) {
      return true;
    }

    if (candidateTokens.size >= 3) {
      const priorTokens = tokenizeNormalizedArabic(prior);
      if (priorTokens.size >= 3) {
        let overlap = 0;
        for (const tok of candidateTokens) {
          if (priorTokens.has(tok)) overlap++;
        }
        const ratio = overlap / Math.min(candidateTokens.size, priorTokens.size);
        if (ratio >= 0.62) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Detects explicit acute isolation, rejection of sitting with family/others,
 * or ongoing mistreatment in user statements across the station conversation.
 */
export function hasAcuteIsolationOrRejection(texts: HistoryEntryLike[]): boolean {
  if (!Array.isArray(texts) || texts.length === 0) return false;
  const userUtterances: string[] = [];
  for (const item of texts) {
    const { role, text } = extractEntryText(item);
    if (!text) continue;
    if (role === 'model') continue;
    if (role === 'unknown' && /(?:أهلاً بك|أقيّم وضعك|التقييم المستحق|بصفتي مستشارك)/.test(text)) continue;
    userUtterances.push(text);
  }
  const combined = userUtterances.join(' ').toLowerCase();
  if (!combined) return false;

  return /(?:لا\s*(?:أجلس|اجلس|أقعد|اقعد|أريد\s*الجلوس|اريد\s*الجلوس|أحب\s*الجلوس|احب\s*الجلوس|أحتمل\s*(?:الجلوس|وجودهم))|لا\s*(?:أشعر|اشعر)\s*ب(?:أي\s*)?فائدة\s*من\s*وجودهم|لا\s*فائدة\s*من\s*وجودهم|أرفض\s*وجود|ارفض\s*وجود|عزلة\s*تامة|العزلة\s*التامة|أفضل\s*(?:العزلة|أن\s*أبقى\s*وحدي|البقاء\s*وحدي)|افضل\s*(?:العزلة|ان\s*ابقى\s*وحدي|البقاء\s*وحدي)|وحدة\s*تامة|وحيد\s*تماماً|سوء\s*(?:ال)?معاملة|يعاملونني\s*بسوء|إساءة\s*مستمرة|اساءة\s*مستمرة|أذى\s*نفسي|اذى\s*نفسي|لا\s*(?:أطيق|اطيق)|أكره\s*(?:الجلوس|وجودهم)|اكره\s*(?:الجلوس|وجودهم)|قطيعة\s*تامة|منعزل\s*تماماً|متجنب\s*الجميع)/i.test(
    combined
  );
}

/**
 * Checks whether a candidate question contradicts facts explicitly affirmed by the user
 * (e.g., asking what prevents them from spending time with family after they stated they already give plenty of time).
 */
export function isQuestionContradictingHistory(
  candidateQuestion: string,
  history: HistoryEntryLike[]
): boolean {
  if (!candidateQuestion || !Array.isArray(history) || history.length === 0) return false;
  const userUtterances: string[] = [];
  for (const item of history) {
    const { role, text } = extractEntryText(item);
    if (!text) continue;
    // If role is explicitly model, skip; if unknown (string[]), skip obvious advisor messages
    if (role === 'model') continue;
    if (role === 'unknown' && /(?:أهلاً بك|أقيّم وضعك|التقييم المستحق|بصفتي مستشارك)/.test(text)) continue;
    userUtterances.push(text);
  }
  if (userUtterances.length === 0) return false;

  const userText = userUtterances.join(' ').toLowerCase();
  const qLower = candidateQuestion.toLowerCase();

  // 1. User affirmed ample time with family -> reject questions implying lack of family time
  const affirmedFamilyTime =
    /(?:الكثير\s+من\s+الوقت|وقت(?:اً)?\s+(?:كبيراً|طويلاً|وافراً|كافياً|جيداً)|أمنحهم|امنتحهم|أعطيهم|اعطيهم|أقضي\s+معهم\s+وقت|نجلس\s+معاً|دائماً\s+مع\s*(?:العائلة|الأهل|الأسرة|أهلي|عائلتي))/i.test(
      userText
    );
  if (
    affirmedFamilyTime &&
    /(?:يمنعك.*تخصيص\s*وقت\s*أطول|تخصيص\s*وقت\s*أطول.*عائلتك|صعوبة\s+في\s+الموازنة.*الزيارة|لماذا\s+لا\s+تجد\s+وقتاً)/i.test(
      qLower
    )
  ) {
    return true;
  }

  // 2. User explicitly affirmed no debts -> reject questions asking if they have debts
  const affirmedNoDebt =
    /(?:بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:علي[ّ]?\s*|لدي\s*)?(?:أي\s*)?(?:ديون|أقساط)|ليس(?:ت)?\s*(?:لدي|عندي|علي[ّ]?)\s*(?:أي\s*)?(?:ديون|أقساط)|ما\s*(?:عندي|علي[ّ]?)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون|خلو\s*سجلي\s*من\s*الديون)/i.test(
      userText
    );
  if (
    affirmedNoDebt &&
    /(?:هل\s+(?:توجد|تقتطع|لديك).*(?:ديون|أقساط)|كم\s+(?:قسط|دين))/i.test(qLower)
  ) {
    return true;
  }

  // 3. User affirmed strong supportive friends -> reject questions assuming isolation/no friends
  const affirmedGoodFriends =
    /(?:لدي\s*أصدقاء|أصدقائي\s*(?:مقربون|أوفياء|إيجابيون|داعمون)|أصحابي\s*(?:مقربون|طيبون)|دائرة\s*أصدقاء\s*(?:طيبة|داعمة|ممتازة))/i.test(
      userText
    );
  if (
    affirmedGoodFriends &&
    /(?:تشعر\s+بالوحدة|العزلة\s+الاجتماعية|صعوبة\s+في\s+إيجاد\s+صحبة)/i.test(qLower)
  ) {
    return true;
  }

  // 3b. User explicitly stated they have NO friends -> reject questions assuming active friend circle
  const affirmedNoFriends =
    /(?:لا\s*(?:يوجد|توجد)\s*(?:لدي|عندي)\s*أصدقاء|ما\s*(?:عندي|لدي)\s*أصدقاء|ليس\s*(?:لدي|عندي)\s*أصدقاء|بدون\s*أصدقاء|أفتقد\s*(?:ال)?أصدقاء|لا\s*أملك\s*أصدقاء|عدم\s*وجود\s*أصدقاء)/i.test(
      userText
    );
  if (
    affirmedNoFriends &&
    /(?:دائرة\s*(?:أصدقائك|علاقاتك)\s*الحالية|لقاءات\s*الأصدقاء|مع\s*أصدقائك\s*المقربين)/i.test(qLower)
  ) {
    return true;
  }

  // 4. User affirmed good regular sleep -> reject questions assuming insomnia/deprivation
  const affirmedGoodSleep =
    /(?:نوم\s*(?:منتظم|كافٍ|عميق|مريح|ممتاز)|أنام\s*(?:7|8)\s*ساعات\s*بانتظام)/i.test(userText);
  if (affirmedGoodSleep && /(?:سهر\s*مفرط|قلة\s*النوم|لا\s*تنام)/i.test(qLower)) {
    return true;
  }

  // 5. User rejects sitting with others/family or reports mistreatment/acute isolation
  // -> reject questions assuming guilt ("التقصير تجاه معاليك") or assuming desire to sit/bond with them
  if (hasAcuteIsolationOrRejection(userUtterances)) {
    if (
      /(?:التقصير\s*تجاه\s*معاليك|تجاه\s*معاليك|تأنيب\s*ضمير|تقصير.*(?:أسرتك|عائلتك|أهلك|معاليك)|(?:الجلوس|تجلس|تقضي\s*وقت(?:اً)?|تواصل(?:اً)?)\s*مع(?:هم|\s+(?:أسرتك|عائلتك|أهلك|الآخرين|معاليك|من\s*حولك))|تخصيص\s*وقت\s*(?:أطول|كافٍ)\s*(?:للتقارب|مع\s*(?:عائلتك|أسرتك))|جلسة\s*(?:عائلية|حوار\s*مع\s*أسرتك)|تريد\s*الجلوس|تشاركهم\s*الوقت)/i.test(
        qLower
      )
    ) {
      return true;
    }
  }

  // 6. User already answered fixed diagnostic questions (emergency fund, debts, main expense leak, sleep, account separation)
  if (isDiagnosticTopicAlreadyAnswered(candidateQuestion, history)) {
    return true;
  }

  return false;
}

/**
 * Extracts whether the user has already answered regarding their emergency fund / reserve
 * (including whether they have one and how many months it covers).
 */
export function extractEmergencyFundStatus(
  history: HistoryEntryLike[],
  currentMessage?: string
): { answered: boolean; hasFund: boolean | null; monthsCovered: number | null } {
  const userTexts: string[] = [];
  for (const item of history || []) {
    const { role, text } = extractEntryText(item);
    if (!text || role === 'model') continue;
    if (
      role === 'unknown' &&
      /(?:أهلاً بك|أقيّم وضعك|التقييم المستحق|بصفتي مستشارك|توصية|القاعدة الذهبية|المستشار المالي)/.test(
        text
      )
    ) {
      continue;
    }
    userTexts.push(text);
  }
  if (currentMessage && currentMessage.trim()) {
    userTexts.push(currentMessage.trim());
  }

  const combined = userTexts.join(' ').trim();
  if (!combined) {
    return { answered: false, hasFund: null, monthsCovered: null };
  }

  const mentionsFundTerm =
    /(?:صندوق\s*(?:ال)?طوارئ|احتياطي\s*(?:ال)?طوارئ|احتياطي\s*(?:مالي|نقدي)|صمام\s*(?:ال)?أمان|مبلغ\s*طوارئ|رصيد\s*طوارئ|مدخرات\s*الطوارئ)/i.test(
      combined
    );
  const mentionsCoverageMonths =
    /(?:يغطي|تغطي|يكفي|تكفي|يكفيني)\s*(?:مصاريف|نفقات|حاجتي)?\s*(?:لـ?\s*)?(\d+|ثلاثة|ثلاث|أربعة|أربع|خمسة|خمس|ستة|ست|سبعة|سبع|ثمانية|ثماني|شهرين|شهراً|شهر)\s*(?:أشهر|شهور|اشهر|شهر)?/i.test(
      combined
    ) ||
    /(\d+|ثلاثة|ثلاث|أربعة|أربع|خمسة|خمس|ستة|ست)\s*(?:أشهر|شهور|اشهر)\s*(?:من\s*(?:المصاريف|النفقات|الراتب|الطوارئ)|طوارئ|احتياطي|نفقات)/i.test(
      combined
    );

  if (!mentionsFundTerm && !mentionsCoverageMonths) {
    return { answered: false, hasFund: null, monthsCovered: null };
  }

  let monthsCovered: number | null = null;
  const digitMonthMatch = combined.match(/(\d+)\s*(?:أشهر|شهور|اشهر|شهر)/i);
  if (digitMonthMatch) {
    const parsed = parseInt(digitMonthMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 36) {
      monthsCovered = parsed;
    }
  } else if (/(?:ستة|ست)\s*(?:أشهر|شهور|اشهر)/i.test(combined)) {
    monthsCovered = 6;
  } else if (/(?:خمسة|خمس)\s*(?:أشهر|شهور|اشهر)/i.test(combined)) {
    monthsCovered = 5;
  } else if (/(?:أربعة|أربع|اربعة|اربع)\s*(?:أشهر|شهور|اشهر)/i.test(combined)) {
    monthsCovered = 4;
  } else if (/(?:ثلاثة|ثلاث)\s*(?:أشهر|شهور|اشهر)/i.test(combined)) {
    monthsCovered = 3;
  } else if (/شهرين/.test(combined)) {
    monthsCovered = 2;
  }

  const negatedFund =
    /(?:ليس\s*(?:لدي|عندي)|لا\s*(?:يوجد|أملك|املك|لدي|عندي)|ما\s*(?:عندي|أملك|املك)|بدون\s*(?:صندوق|احتياطي|صمام)|لا\s*أملك\s*أمان|لم\s*(?:أؤسس|أبدأ|أكوّن))\s*(?:صندوق|احتياطي|صمام|أمان)?/i.test(
      combined
    ) && monthsCovered === null;

  if (negatedFund) {
    return { answered: true, hasFund: false, monthsCovered: 0 };
  }

  const affirmedFund =
    monthsCovered !== null && monthsCovered > 0 ||
    /(?:لدي|عندي|أملك|املك|أسست|اسست|وفرت|جمعت|موجود|متوفر|أحتفظ\s*بـ?\s*صندوق|يوجد\s*(?:لدي|عندي)?\s*(?:صندوق|احتياطي)|اكتمل\s*صندوق)/i.test(
      combined
    );

  if (affirmedFund || mentionsFundTerm) {
    return {
      answered: true,
      hasFund: affirmedFund ? true : null,
      monthsCovered,
    };
  }

  return { answered: false, hasFund: null, monthsCovered: null };
}

export function hasEmergencyFundAnswered(
  history: HistoryEntryLike[],
  currentMessage?: string
): boolean {
  return extractEmergencyFundStatus(history, currentMessage).answered;
}

/**
 * Checks if a candidate question repeats a fixed diagnostic topic that the user
 * has already answered in their prior messages (e.g., emergency fund, debt status,
 * main expense leak, business account separation, sleep duration).
 */
export function isDiagnosticTopicAlreadyAnswered(
  candidateQuestion: string,
  history: HistoryEntryLike[]
): boolean {
  if (!candidateQuestion || !Array.isArray(history) || history.length === 0) return false;

  const userUtterances: string[] = [];
  for (const item of history) {
    const { role, text } = extractEntryText(item);
    if (!text || role === 'model') continue;
    if (role === 'unknown' && /(?:أهلاً بك|أقيّم وضعك|التقييم المستحق|بصفتي مستشارك)/.test(text)) continue;
    userUtterances.push(text);
  }
  if (userUtterances.length === 0) return false;

  const userText = userUtterances.join(' ').toLowerCase();
  const qLower = candidateQuestion.toLowerCase();

  // A. Emergency fund diagnostic / existence / starter question already answered
  const efStatus = extractEmergencyFundStatus(userUtterances);
  if (efStatus.answered) {
    const asksExistenceOrCoverageOrStarterFund =
      /(?:هل\s*(?:لديك|عندك|تملك|يوجد\s*لديك|يكفي|تؤمّن|تستطيع\s*تأمين).*?(?:صندوق|احتياطي|طوارئ|صمام)|كم\s*(?:شهراً|شهر)\s*(?:يكفي|يغطي).*?(?:احتياط|طوارئ|رصيد)|ما\s*مدى\s*شعورك\s*بالأمان\s*تجاه\s*صندوق\s*الطوارئ|هل\s*جربت\s*سابقاً\s*اقتطاع\s*مبلغ\s*رمزي.*?صمام\s*أمان|تأمين\s*احتياطي\s*للطوارئ\s*(?:الأسرية|أم\s*تتآكل)|ما\s*العائق\s*الأبرز\s*أمام.*?(?:بناء\s*صمام\s*أمان|صندوق)|مراجعة\s*معاً\s*خطة\s*بناء\s*صندوق\s*الطوارئ)/i.test(
        qLower
      ) ||
      (efStatus.hasFund === true &&
        /(?:تأسيس\s*(?:أول\s*)?صندوق\s*طوارئ|بناء\s*(?:أول\s*)?صمام\s*أمان|كيف\s*تؤمّن\s*جانباً\s*احتياطياً)/i.test(qLower));

    if (asksExistenceOrCoverageOrStarterFund) {
      return true;
    }
  }

  // B. Debt / installments status already answered (either with debt OR without debt)
  if (hasDebtStatusAnswered(userUtterances, '')) {
    if (
      /(?:هل\s*(?:توجد|يوجد|لديك|عليك|تقتطع|يقتطع\s*من\s*راتبك).*?(?:ديون|قرض|قروض|أقساط|التزامات)|كم\s*نسبة\s*(?:الأقساط|الديون)|أم\s*يخلو\s*سجلك\s*منها|هل\s*تخلو\s*التزاماتك\s*من\s*الديون)/i.test(
        qLower
      )
    ) {
      return true;
    }
  }

  // C. Main expense leak already specified by user
  const alreadyNamedExpense =
    userUtterances.some((u) => extractExpenseCategoryFromAnswer(u) !== null) ||
    /(?:أكثر\s*(?:شيء|بند)\s*(?:أصرف|يصرف|يستهلك)|يصرف\s*على\s*(?:المطاعم|الإيجار|التسوق|المقاهي|الفواتير|السفر))/i.test(
      userText
    );
  if (
    alreadyNamedExpense &&
    /(?:ما\s*(?:هو\s*)?البند\s*(?:الشهري|الأسبوعي|الجامعي|المالي)?\s*(?:الذي\s*)?(?:تلاحظ\s*أنه\s*)?(?:يستهلك|يلتهم|يقتطع|يشكل)|أي\s*بند\s*يستهلك\s*دخلك)/i.test(
      qLower
    )
  ) {
    return true;
  }

  // D. Business / variable income separation already answered
  if (
    /(?:أفصل\s*(?:الحسابات|حساب\s*العمل)|لا\s*أفصل\s*الحسابات|تداخل\s*في\s*الحسابات|لدي\s*حساب\s*منفصل\s*للعمل)/i.test(
      userText
    ) &&
    /(?:هل\s*تفصل\s*(?:حالياً\s*)?بين\s*حساب\s*العمل\s*وحسابك)/i.test(qLower)
  ) {
    return true;
  }

  // E. Sleep hours/rhythm already answered
  if (
    /(?:أنام\s*\d+\s*ساع|ساعات\s*نوم|نومي\s*(?:منتظم|متقطع|ممتاز|سيئ|عميق)|أعاني\s*من\s*(?:الأرق|قلة\s*النوم))/i.test(
      userText
    ) &&
    /(?:كيف\s*يبدو\s*إيقاع\s*نومك\s*واستيقاظك)/i.test(qLower)
  ) {
    return true;
  }

  return false;
}

/**
 * Detects when the user explicitly asks the advisor to suggest concrete actions
 * (e.g. "لا أدري أعطيني اقتراحاتك").
 */
export function isRequestingAdvisorSuggestions(text: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  return /(?:أعطيني|اعطيني|أعطني|اعطني|اقترح|اقترحي|وش\s*تقترح|ماذا\s*تقترح|أحتاج\s*اقتراحات|احتاج\s*اقتراحات|ما\s*عندي\s*فكرة|لا\s*(?:أدري|ادري|أعرف|اعرف).*(?:اقتراح|تقترح|أبدأ|ابدا|أعمل|اعمل)|ساعدني\s*باقتراح)/i.test(
    t
  );
}

/**
 * Extracts an earlier self-rating anchor (1-10) from user history, ignoring advisor-stated score offers.
 */
export function extractAnchorSelfRatingFromHistory(history: HistoryEntryLike[]): number | null {
  if (!Array.isArray(history) || history.length === 0) return null;

  for (const item of history) {
    const { role, text } = extractEntryText(item);
    if (!text || role === 'model') continue;
    if (
      role === 'unknown' &&
      /(?:أقيّم\s+وضعك|التقييم\s+المستحق|التقييم\s+التقديري|التقييم\s+المبدئي|رصدنا\s+درجتك|تم\s+اعتماد\s+تقييمك)/i.test(
        text
      )
    ) {
      continue;
    }

    const explicitMatch =
      text.match(
        /(?:تقييمي|أقيّم\s*نفسي|اقيم\s*نفسي|درجتي|أعطيه|اعطيه)\s*[:=]?\s*(?:هو\s*)?(?:بـ?|ب)?\s*(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i
      ) || text.match(/\b(\d+(?:\.\d+)?)\s*(?:من|\/)\s*10\b/i);

    if (explicitMatch) {
      const val = parseFloat(explicitMatch[1]);
      if (!isNaN(val) && val >= 1 && val <= 10) {
        return Number(val.toFixed(1));
      }
    }
  }

  return null;
}

/**
 * Picks the next question from a candidate pool that has NOT already been asked in history
 * and does not contradict facts affirmed by the user.
 */
export function pickNextUnaskedQuestion(
  pool: string[],
  history: HistoryEntryLike[],
  preferredStartIdx: number = 0
): { question: string | null; index: number } {
  if (!Array.isArray(pool) || pool.length === 0) {
    return { question: null, index: -1 };
  }
  const len = pool.length;
  const start = ((preferredStartIdx % len) + len) % len;

  for (let offset = 0; offset < len; offset++) {
    const idx = (start + offset) % len;
    const candidate = pool[idx];
    if (
      !isQuestionAlreadyAsked(candidate, history) &&
      !isQuestionContradictingHistory(candidate, history)
    ) {
      return { question: candidate, index: idx };
    }
  }

  return { question: null, index: -1 };
}

/**
 * Removes repeated opening salutations ("أهلاً بك...", "مرحباً بك...") and advisor self-reintroductions
 * when continuing an ongoing dialogue or handling an edit/resend ("تراجع / تعديل").
 */
export function stripRepeatedOpeningGreeting(
  reply: string,
  shouldSuppressGreeting: boolean
): string {
  if (!reply || !shouldSuppressGreeting) return reply;

  let cleaned = reply.trim();
  const greetingPattern =
    /^(?:أهلاً(?:\s+وسهلاً)?(?:\s+ومرحباً)?(?:\s+بك)?|مرحباً(?:\s+بك)?|حياك\s*الله|السلام\s+عليكم(?:\s+ورحمة\s+الله(?:\s+وبركاته)?)?)\s*(?:العزيز\s*)?(?:يا\s+[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)?)?[!.،:\s]*(?:\n+)?/i;

  const stripped = cleaned.replace(greetingPattern, '').trim();
  if (stripped.length >= 15) {
    cleaned = stripped;
  }

  // Also strip repeated self-introduction sentence if it begins the remaining reply
  const selfIntroPattern =
    /^(?:أنا|معك)\s+(?:د\.|أ\.|م\.|بروفيسور)?\s*[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+){0,3}[^.\n]*[.\n]+\s*/i;
  const withoutIntro = cleaned.replace(selfIntroPattern, '').trim();
  if (withoutIntro.length >= 15) {
    cleaned = withoutIntro;
  }

  return cleaned || reply;
}

/**
 * Checks if the user has already clarified debt/installment status in history or latest message.
 */
export function hasDebtStatusAnswered(
  history: HistoryEntryLike[],
  currentMessage: string
): boolean {
  const userTexts: string[] = [];
  for (const item of history || []) {
    const { role, text } = extractEntryText(item);
    if (text && role !== 'model') userTexts.push(text);
  }
  if (currentMessage) userTexts.push(currentMessage);
  const combined = userTexts.join(' ');
  return /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط|التزامات)|ما\s*عندي\s*(?:ديون|أقساط)|خالي\s*من\s*الديون|قرض|قروض|دين|ديون|أقساط|اقساط|تمويل|التزامات\s*شهرية)/i.test(
    combined
  );
}

/**
 * Detects concrete spending/leak answers such as "ممكن الاكل في المطاعم".
 */
export function extractExpenseCategoryFromAnswer(text: string): string | null {
  const t = (text || '').trim();
  if (!t) return null;
  if (/(مطاعم|مطعم|اكل\s*برا|أكل\s*برا|الاكل\s*في\s*المطاعم|الأكل\s*في\s*المطاعم|توصيل|طلبات|هنقرستيشن|جاهز)/i.test(t)) {
    return 'الأكل في المطاعم وطلبات التوصيل';
  }
  if (/(مقاهي|كافيهات|كوفي|قهوة)/i.test(t)) {
    return 'المقاهي والقهوة اليومية';
  }
  if (/(تسوق|مشتريات|كماليات|اونلاين|أونلاين|عروض)/i.test(t)) {
    return 'المشتريات والكماليات غير المخططة';
  }
  if (/(اشتراكات|تطبيقات|باقات)/i.test(t)) {
    return 'الاشتراكات والباقات المتكررة';
  }
  if (/(سيارة|بنزين|مشاوير|اوبر|أوبر|كريم)/i.test(t)) {
    return 'المواصلات ومصاريف التنقل';
  }
  if (/(فواتير|كهرباء|نت|جوال|إيجار|ايجار)/i.test(t)) {
    return 'الفواتير والالتزامات السكنية';
  }
  return null;
}

export const MEANINGLESS_INPUT_PROMPT_AR =
  'أود أن أفهم وضعك بدقة حتى أتمكن من مساعدتك؛ يبدو أن رسالتك غير واضحة أو غير مكتملة. هل يمكنك كتابة بضع كلمات واضحة عما يدور في بالك الآن لنبدأ الحوار معاً؟';

/**
 * Corrects common Arabic morphological and spelling slips in advisor replies
 * (e.g., «بكل هادئ» -> «بكل هدوء») while preserving warm tone.
 */
export function sanitizeArabicGrammarAndMorphology(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/بكل\s+هادئ(?:ة|ٍ)?/g, 'بكل هدوء')
    .replace(/بكل\s+دافئ(?:ة|ٍ)?/g, 'بكل دفء')
    .replace(/بكل\s+صادق(?:ة|ٍ)?/g, 'بكل صدق')
    .replace(/بكل\s+واضح(?:ة|ٍ)?/g, 'بكل وضوح')
    .replace(/بكل\s+مريح(?:ة|ٍ)?/g, 'بكل راحة')
    .replace(/بكل\s+لطيف(?:ة|ٍ)?/g, 'بكل لطف')
    .replace(/بكل\s+عميق(?:ة|ٍ)?/g, 'بكل عمق')
    .replace(/بكل\s+صبور(?:ة|ٍ)?/g, 'بكل صبر')
    .replace(/بكل\s+متزن(?:ة|ٍ)?/g, 'بكل اتزان')
    .replace(/بكل\s+متوازن(?:ة|ٍ)?/g, 'بكل توازن');
}

function isSingleTokenMeaninglessNoise(rawToken: string): boolean {
  const token = rawToken.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  if (!token) return true; // pure punctuation or emoji token

  // Valid short Arabic responses that might be paired or standalone
  const validShortWords =
    /^(?:نعم|لا|ايه|أيوة|ايوه|تمام|جيد|عادي|متعب|تعبان|ممتاز|سيء|صعب|سهل|قليل|كثير|أكيد|ممكن|أبداً|ابدا|شكراً|شكرا|أهلاً|اهلا|مرحبا|مرحباً|سلام|هلا|حسناً|حسنا|تعب|قلق|نوم|مال|دين|عمل|شغل|صفر|أريد|اريد|مدري|أدري|ادري)$/i;
  if (validShortWords.test(token)) return false;

  // Single character (other than 1..9 handled separately)
  if (token.length < 2) return true;

  // Repeated identical character (e.g. "ههههه", "اااا", "xxxx", "1111")
  if (/^(.)\1+$/u.test(token)) return true;

  // Repeated 2-3 char syllable noise (e.g. "شسيشسي", "ههاهاها", "abcabc")
  if (token.length >= 4 && /^(.{2,3})\1+$/iu.test(token)) return true;

  // Arabic & Latin laughter / nonsense filler tokens (e.g. "ههه", "هعع", "ككك", "haha", "hehe", "lol", "hhhh")
  if (
    /^(?:ه+[عاخ]*ه*|ه+ع+|ك{2,}|خ{2,}|ا+ه+ا+|(?:ha)+h?|(?:he)+h?|lo+l+|lma+o+|h{2,})$/iu.test(
      token
    )
  ) {
    return true;
  }

  // Keyboard mash sequences (exact 3-char mash tokens or any 4+ char keyboard row sequence)
  const exact3CharMash = /^(?:ضصث|صثق|ثقف|قفغ|شسي|ئءؤ|asd|qwe|zxc)$/i;
  const keyboardMashPattern =
    /(ضصثق|ثقفغ|فغعه|غعهخ|شسيب|سيبل|يبلات|بلاتن|ئءؤر|ءؤرلا|رلاى|asdf|qwer|zxcv|hjkl|fghj|tyui|uiop|asdfgh|qwerty)/i;
  if (exact3CharMash.test(token) || keyboardMashPattern.test(token)) return true;

  // Pure digit noise (e.g. "123456", "654321", sequential or long numeric strings)
  if (/^\d+$/.test(token)) {
    const numVal = Number(token);
    if (
      token.length >= 4 &&
      ('01234567890'.includes(token) ||
        '9876543210'.includes(token) ||
        /^(.)\1+$/.test(token) ||
        numVal > 10)
    ) {
      return true;
    }
  }

  // Non-Arabic Latin gibberish token
  const hasArabicChar = /[\u0600-\u06FF]/.test(token);
  if (!hasArabicChar && !/^\d+$/.test(token)) {
    const knownShortLatin =
      /^(?:ok|okay|hi|hello|hey|yes|no|good|bad|fine|test|help|thanks|thx|done|skip|next|work|sleep|money|family|friends)$/i;
    if (!knownShortLatin.test(token)) {
      if (
        /[bcdfghjklmnpqrstvwxz]{4,}/i.test(token) ||
        !/[aeiouy]/i.test(token) ||
        /(.)\1{2,}/i.test(token)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detects empty, whitespace-only, punctuation/emoji-only ("...", "😂😂"), repeated-char/laughter,
 * mixed random laughter+numbers ("ههههه 123456"), or keyboard-mash/gibberish messages
 * without falsely rejecting brief valid Arabic replies (e.g., "نعم", "لا", "تمام", "متعب", "8/10", "5 ساعات").
 */
export function isEmptyOrMeaninglessInput(text: string): boolean {
  if (typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Explicit rating syntax or standalone 1-10 number is valid
  if (
    /\b(?:[1-9]|10)(?:\.\d+)?\s*(?:من|\/)\s*10\b/i.test(trimmed) ||
    /^(?:[1-9]|10)$/.test(trimmed)
  ) {
    return false;
  }

  // Strip punctuation, emojis, symbols, and whitespace (keep Unicode letters & numbers)
  const stripped = trimmed.replace(/[^\p{L}\p{N}]/gu, '');
  if (stripped.length < 2) {
    return true;
  }

  // Check whole-string repeats or sequential numbers
  if (/^(.)\1+$/u.test(stripped)) {
    return true;
  }
  if (stripped.length >= 4 && /^(.{2,3})\1+$/iu.test(stripped)) {
    return true;
  }
  if (/^\d+$/.test(stripped) && Number(stripped) > 10) {
    return true;
  }

  // Token-level evaluation: if every token is gibberish/noise/emoji/meaningless digits (e.g. "ههههه 123456")
  const rawTokens = trimmed.split(/\s+/).filter(Boolean);
  if (rawTokens.length > 0) {
    const tokenResults = rawTokens.map((tok) => isSingleTokenMeaninglessNoise(tok));
    if (tokenResults.every(Boolean)) {
      return true;
    }
  }

  const lower = stripped.toLowerCase();
  const hasArabic = /[\u0600-\u06FF]/.test(trimmed);

  // Keyboard mash sequences (Arabic or Latin keyboard rows)
  const keyboardMashPattern =
    /(ضصثق|ثقفغ|فغعه|غعهخ|شسيب|سيبل|يبلات|بلاتن|ئءؤر|ءؤرلا|رلاى|asdf|qwer|zxcv|hjkl|fghj|tyui|uiop|asdfgh|qwerty)/i;
  if (keyboardMashPattern.test(lower) && rawTokens.length <= 3) {
    return true;
  }

  // Long random consonant clusters in Latin without vowels or any Arabic words
  if (!hasArabic && /[bcdfghjklmnpqrstvwxz]{5,}/i.test(lower)) {
    return true;
  }

  // Short Latin gibberish with no Arabic letters and not a known short word/number
  if (!hasArabic && !/^\d+$/.test(stripped)) {
    const knownShortLatin = /^(?:ok|okay|hi|hello|hey|yes|no|good|bad|fine|test|help|thanks|thx|done|skip|next)$/i;
    const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.every((w) => !knownShortLatin.test(w)) && words.length <= 2 && stripped.length <= 12) {
      if (!/[aeiouy]/i.test(lower) || /(.)\1{2,}/i.test(lower)) {
        return true;
      }
    }
  }

  return false;
}

export interface ComplaintAnchoredFollowUp {
  complaintType: 'no_friends' | 'no_hobbies_or_emptiness' | 'long_work_hours';
  reflection: string;
  followUpQuestion: string;
  summary: string;
  advice: string;
  actionSteps: string[];
}

/**
 * Anchors follow-up questions directly to the user's explicitly stated complaint
 * in their latest message without premature pivoting to unmentioned life domains
 * (e.g., never linking work burnout to "compensatory spending" unless mentioned).
 */
export function buildComplaintAnchoredReply(
  agentKey: string,
  latestMessage: string,
  historyTexts: string[] = []
): ComplaintAnchoredFollowUp | null {
  const msg = (latestMessage || '').trim();
  if (!msg) return null;

  const isNoFriends =
    /(?:لا\s*(?:يوجد|توجد)\s*(?:لدي|عندي)\s*أصدقاء|ما\s*(?:عندي|لدي)\s*أصدقاء|ليس\s*(?:لدي|عندي)\s*أصدقاء|بدون\s*أصدقاء|أفتقد\s*(?:ال)?أصدقاء|لا\s*أملك\s*أصدقاء|عدم\s*وجود\s*أصدقاء|قلة\s*الأصدقاء)/i.test(
      msg
    );
  const isNoHobbiesOrEmptiness =
    /(?:لا\s*(?:توجد|يوجد)\s*(?:لدي|عندي)\s*هوايات|ما\s*(?:عندي|لدي)\s*هوايات|ليس\s*(?:لدي|عندي)\s*هوايات|بدون\s*هوايات|أشعر\s*ب(?:ال)?فراغ|عندي\s*فراغ|فراغ\s*(?:شخصي|كبير|داخلي|في\s*حياتي)|حياتي\s*فارغة|روتين\s*فارغ|أشعر\s*بملل\s*وفراغ)/i.test(
      msg
    );
  const isLongWorkHours =
    /(?:ساعات\s*(?:عمل|دوام)\s*طويلة|أعمل\s*(?:ل)?ساعات\s*طويلة|ساعات\s*طويلة\s*(?:في|بال)?(?:العمل|الدوام)?|دوام\s*طويل|دوامي\s*طويل|أشتغل\s*ساعات\s*طويلة|ساعات\s*العمل\s*الطويلة|احتراق\s*وظيفي|إنهاك\s*(?:من\s*)?العمل)/i.test(
      msg
    );

  if (isNoFriends && (agentKey === 'social' || agentKey === 'personal')) {
    const q = 'من خلال تجربتك، هل يعود عدم وجود أصدقاء حالياً إلى صعوبة إيجاد أشخاص يشاركونك اهتماماتك، أم إلى قلة الفرص والانشغال عن بناء علاقات جديدة؟';
    if (!isQuestionAlreadyAsked(q, historyTexts)) {
      return {
        complaintType: 'no_friends',
        reflection: 'أقدّر صراحتك في مشاركة شعورك بعدم وجود أصدقاء في هذه المرحلة، ومن الطبيعي أن يؤثر ذلك على إحساسك بالونس والدعم.',
        followUpQuestion: q,
        summary: 'الاستماع الصادق لشكوى غياب الأصدقاء واستكشاف سببها المباشر دون افتراضات.',
        advice: 'ابدأ بخطوة اجتماعية خفيفة وغير مرهقة في بيئة تشاركك نفس الاهتمام أو القيم.',
        actionSteps: [
          'تحديد مساحة أو نشاط واحد يجمعك بأشخاص يشاركونك اهتمامات مشابهة',
          'البدء بتبادل حديث بسيط ومريح دون الضغط على نفسك لتكوين صداقة فورية',
        ],
      };
    }
  }

  if (isNoHobbiesOrEmptiness && (agentKey === 'personal' || agentKey === 'learning' || agentKey === 'social')) {
    const q = 'بعيداً عن أي ضغوط، ما النشاط أو الاهتمام البسيط الذي كان يجذب انتباهك سابقاً، أو في أي أوقات من يومك يشتد عليك هذا الشعور بالفراغ؟';
    if (!isQuestionAlreadyAsked(q, historyTexts)) {
      return {
        complaintType: 'no_hobbies_or_emptiness',
        reflection: 'أسمعك بكل هدوء؛ الشعور بالفراغ أو غياب الهوايات إشارة واضحة إلى أن وقتك الحالي يحتاج مساحة تشعر فيها بالمتعة والتجدد الشخصي.',
        followUpQuestion: q,
        summary: 'معالجة شكوى الفراغ الشخصي وغياب الهوايات بالارتباط المباشر بتفاصيل اليوم.',
        advice: 'خصص 15 دقيقة لتجربة نشاط شخصي خفيف تستكشف فيه فضولك دون اشتراط الاحتراف.',
        actionSteps: [
          'تخصيص 15 دقيقة في وقت الفراغ لتجربة نشاط جديد أو هواية قديمة هادئة',
          'تقليل التصفح العشوائي في أوقات الملل واستبداله بنشاط عملي ملموس',
        ],
      };
    }
  }

  if (isLongWorkHours && (agentKey === 'career' || agentKey === 'personal' || agentKey === 'health')) {
    const q = 'عندما تمتد ساعات عملك لهذه المدة الطويلة، ما السبب الأبرز وراءها: حجم المهام اليومية نفسها أم صعوبة التوقف ووضع حد واضح بعد انتهاء وقت الدوام؟';
    if (!isQuestionAlreadyAsked(q, historyTexts)) {
      return {
        complaintType: 'long_work_hours',
        reflection: 'أفهم تماماً حجم الضغط الناتج عن العمل لساعات طويلة متواصلة؛ استمرار هذا الإيقاع يستنزف طاقتك وتركيزك المهني والبدني.',
        followUpQuestion: q,
        summary: 'التركيز المباشر على أسباب طول ساعات العمل وحماية الطاقة الوظيفية دون استنتاجات خارجية.',
        advice: 'ابدأ بتحديد ساعة إغلاق واضحة ليوم العمل وحصر المهام التي تسبب امتداد الدوام.',
        actionSteps: [
          'تحديد وقت واضح لإنهاء مهام العمل اليومية وحماية وقت الراحة',
          'فرز المهام المتراكمة وتحديد ما يمكن تأجيله أو تفويضه',
        ],
      };
    }
  }

  return null;
}
