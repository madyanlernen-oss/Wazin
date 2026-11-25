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
    /(?:بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|ما\s*عندي\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(
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
