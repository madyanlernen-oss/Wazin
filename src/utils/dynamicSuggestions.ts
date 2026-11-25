import { LifeAreaId, UserProfile } from '../types/lifeBalance';
import {
  ParsedUserContext,
  parseUserContext,
  getDomainContextConfig,
} from './contextPersonalization';

export interface DynamicSuggestionInput {
  domainId: LifeAreaId | string;
  roundNumber: number; // 1-indexed (1 = opening, 2 = after 1st answer, 3 = after 2nd answer, 4+ = after 3rd+)
  lastUserMessage?: string;
  advisorReply?: string;
  userProfile?: Partial<UserProfile> | any;
  previousChips?: string[];
  userHistory?: string[];
  aiSuggestedReplies?: string[];
}

/**
 * Normalizes Arabic text for deduplication checks (removes emojis, punctuation, rating suffixes, and extra whitespace).
 */
export function normalizeSuggestionText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:\/|\s*من\s*)\s*10\s*\)/gi, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[.,!؟?،؛:"'()\-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isDuplicateCandidate(
  candidate: string,
  excludedNormalized: string[]
): boolean {
  const norm = normalizeSuggestionText(candidate);
  if (!norm || norm.length < 4) return true;

  for (const ex of excludedNormalized) {
    if (!ex) continue;
    if (norm === ex) return true;
    // Prevent near-exact substring matches when strings are substantive
    if (norm.length >= 12 && ex.length >= 12) {
      if (norm.includes(ex) || ex.includes(norm)) return true;
    }
  }
  return false;
}

function extractNumericScoreHint(lastMsg: string): number | null {
  const m = lastMsg.match(/([1-9](?:\.\d+)?|10(?:\.0+)?)\s*(?:\/|\s*من\s*)\s*10/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
}

function getRound2Candidates(
  domainId: string,
  lastMsg: string,
  ctx: ParsedUserContext
): string[] {
  const combined = lastMsg || '';
  const scoreHint = extractNumericScoreHint(combined);
  const isPositiveTone =
    (scoreHint !== null && scoreHint >= 7.5) ||
    /(ممتاز|مستقر|جيد|راض|مرتاح|مطمئن|أحافظ|احافظ|متوازن)/i.test(combined);

  switch (domainId) {
    case 'financial': {
      const hasDebt =
        /(قرض|قروض|دين|ديون|أقساط|اقساط|بطاقة|فيزا|التزامات|سداد)/i.test(combined) &&
        !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط))/i.test(combined);
      const hasLeakOrDeficit = /(تسرب|كماليات|ينفد|لا أدخر|لا ادخر|عجز|قليل|بسرعة|صعوبة|ما يكفي|يخلص)/i.test(
        combined
      );

      if (hasDebt) {
        return [
          'الأقساط والالتزامات تأخذ أكثر من ثلث دخلي الشهري',
          'أكبر ضغط لدي حالياً هو سداد قرض أو بطاقة ائتمانية',
          'ألتزم بالسداد لكن أي طارئ مالي يربك ميزانيتي فوراً',
          'أحتاج لخطة ترتيب أولويات السداد مع حماية صمام الأمان',
        ];
      }
      if (hasLeakOrDeficit) {
        return [
          'أكبر تسرب يحدث في المصاريف اليومية والطلبات المتكررة',
          'لا أتتبع مصروفاتي أسبوعياً فأفقد السيطرة قبل نهاية الشهر',
          'أنتظر ما يتبقى آخر الشهر للادخار فلا يتبقى شيء عملياً',
          'تطرأ عليّ التزامات ومصاريف مفاجئة في منتصف الشهر',
        ];
      }
      if (ctx.isStudent) {
        return [
          'أكثر بند يستهلك مصروفي هو التنقل أو المستلزمات الدراسية',
          'أستطيع اقتطاع مبلغ رمزي صغير لو عزلتُه فور استلام الدخل',
          'أواجه تذبذباً في المصروف خلال أسابيع الاختبارات والضغط',
          'ينقصني نظام بسيط لمراقبة إنفاقي الأسبوعي كطالب',
        ];
      }
      const confirmsNoDebtR2 = /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(combined);
      if (confirmsNoDebtR2) {
        return [
          'ينقصني فصل حساب الطوارئ عن بطاقة الصرف اليومي',
          'أدخر أحياناً لكن دون نسبة ثابتة ومستمرة كل شهر',
          'أحتاج لتحديد نسبة واضحة لصمام الأمان قبل التوسع في أي استثمار',
          'التسرب في النفقات غير الأساسية يمنعني من تثبيت فائض شهري',
        ];
      }
      return [
        'تقتطع من راتبي أقساط شهرية والتزامات ثابتة أحتاج لترتيبها أولاً',
        'توجد التزامات شهرية دورية ولا أعرف بدقة هل يتبقى فائض فعلي',
        'لا توجد عليّ ديون حالياً لكن ينقصني فصل حساب الطوارئ عن الصرف',
        'أحتاج أولاً لحصر التزاماتي الشهرية ومعرفة صافي التدفق النقدي',
      ];
    }

    case 'spiritual': {
      const hasDistraction = /(هاتف|جوال|شاشات|تشتت|مواقع|ضغط|تسارع|زحمة|وقت)/i.test(
        combined
      );
      if (isPositiveTone && !hasDistraction) {
        return [
          'أريد تعميق حضور القلب والخشوع بدل الاكتفاء بالأداء السريع',
          'أحياناً ينقطع وردي الروحي عند السفر أو تغير جدول الأسبوع',
          'أطمح لتوسيع أثر السكينة في تعاملي مع الضغوط اليومية',
          'ما الطريقة الأنسب للحفاظ على هذه الطمأنينة دون فتور لاحق؟',
        ];
      }
      if (hasDistraction) {
        return [
          'أكثر ما يسرق سكينتي هو تصفح الهاتف قبل النوم مباشرة',
          'تسارع المهام اليومية يدفعني لتأجيل لحظات الهدوء والتأمل',
          'الإشعارات المستمرة تقطع حضور قلبي حتى في وقت الراحة',
          'أفتقد وجود 10 دقائق هادئة لنفسي بعيداً عن أي شاشة',
        ];
      }
      return [
        'أشعر بفتور متقطع وأبحث عن عادة قلبية قريبة وسهلة الثبات',
        'أريد ربط مساحتي الروحية بوقت ثابت كالفجر أو قبل النوم',
        'الضغوط الذهنية تشغل بالي وتمنعني من الاستشعار والهدوء',
        'أحتاج مساحة أسبوعية للمراجعة الذاتية وتجديد النية',
      ];
    }

    case 'health': {
      const hasPositiveSleep = /(نوم(?:ي)?\s*(?:مستقر|جيد|ممتاز|منتظم|كافٍ|مريح|تمام))/i.test(combined);
      const hasSleepOrScreen =
        /(قلة\s*النوم|سهر|أرق|ارق|شاشات|تعب|إرهاق|متقطع)/i.test(combined) ||
        (!hasPositiveSleep && /(نوم|أنام|انام)/i.test(combined));
      const hasActivityNeed = /(رياضة|مشي|أمشي|امشي|حركة|جلوس|خمول|ماء|وزن|لياقة)/i.test(combined);
      if (hasActivityNeed && !hasSleepOrScreen) {
        return [
          'الجلوس الطويل أمام العمل يمنعني من إدراج المشي في يومي',
          'طاقتي تهبط عصراً ولا أجد دافعاً لبدء تمرين بدني خفيف',
          'أبدأ برامج رياضية بحماس ثم أتوقف خلال أسبوعين',
          'أحتاج ربط المشي وشرب الماء بعادة يومية ثابتة لا تتعارض مع وقتي',
        ];
      }
      if (isPositiveTone && !hasSleepOrScreen) {
        return [
          'إيقاع نومي مستقر لكن أريد تحسين جودة تغذيتي ولياقتي أكثر',
          'أتمنى تثبيت روتين حركة بدنية يقي من تيبس الجلوس الطويل',
          'أحياناً يهبط نشاطي آخر الأسبوع وأريد الحفاظ على نفس الإيقاع',
          'كيف أرفع طاقتي البدنية اليومية بمستوى متدرج ومستدام؟',
        ];
      }
      if (hasSleepOrScreen) {
        return [
          'أستخدم الشاشات والهاتف قبل النوم بساعة أو أكثر يومياً',
          'أستيقظ متعباً رغم قضاء ساعات طويلة في الفراش',
          'الجلوس الطويل أمام العمل يسبب لي خمولاً وتيبساً بدنياً',
          'مواعيد نومي تختلف كلياً بين أيام العمل وعطلة نهاية الأسبوع',
        ];
      }
      return [
        'يومي مزدحم ولا أجد وقتاً منتظماً للحركة أو المشي',
        'طاقتي تهبط بشدة في منتصف اليوم بسبب التغذية أو السهر',
        'أنسى شرب كمية كافية من الماء خلال ساعات انشغالي',
        'أبدأ برامج رياضية بحماس ثم أتوقف خلال أسبوعين',
      ];
    }

    case 'career': {
      if (ctx.isStudent) {
        return isPositiveTone
          ? [
              'مساري واضح وأريد التعمق في مشروع تطبيقي يميز ملف أعمالي',
              'أبحث عن أفضل طريقة لتنظيم التدريب الميداني مع ساعات الدراسة',
              'أتمنى استثمار علاقاتي الجامعية لبناء فرص مهنية مبكرة',
              'ما المهارة الأعلى تأثيراً التي أركز عليها قبل التخرج؟',
            ]
          : [
              'أجد صعوبة في الموازنة بين المذاكرة وبناء مهارات عملية',
              'أشعر بحيرة تجاه المسار التخصصي الأنسب لسوق العمل',
              'أؤجل العمل على المشاريع العملية حتى نهاية الفصل الدراسي',
              'ينقصني توجيه عملي لبناء سيرة ذاتية قوية قبل التخرج',
            ];
      }
      if (ctx.isJobSeeker) {
        return [
          'قلة الردود على التقديمات تسبب لي فتور همة أحياناً',
          'أحتاج لتطوير مهارة مطلوبة وتحديث سيرتي الذاتية',
          'بحثي عن العمل عشوائي ويفتقر لجدول أسبوعي منضبط',
          'أشعر بتوتر عند الاستعداد للمقابلات الشخصية',
        ];
      }
      if (isPositiveTone) {
        return [
          'إنتاجيتي جيدة لكن أريد حماية وقتي التخطيطي من المهام العاجلة',
          'أسعى لتعلم مهارة قيادية أو تقنية تنقلني للمرحلة التالية',
          'أريد موازنة طموحي المهني دون التضحية بجودة راحتي بعد الدوام',
          'كيف أستثمر نقاط قوتي الحالية لتسريع نموي المهني؟',
        ];
      }
      return [
        'المقاطعات والمهام العاجلة تسرق وقت التركيز والعمل العميق',
        'أواجه صعوبة في فصل ساعات العمل عن وقت الراحة الشخصي',
        'أشعر بغياب خارطة واضحة للتطور الوظيفي خلال العام القادم',
        'كثرة المسؤوليات المتراكمة تدخلني في دائرة التسويف أحياناً',
      ];
    }

    case 'personal': {
      const hasSelfCriticism = /(جلد|لوم|مقصر|أخطاء|قاسي|توتر|ثقة|حيرة)/i.test(
        combined
      );
      if (hasSelfCriticism) {
        return [
          'أقسو على نفسي بسرعة عند أي تعثر أو تأجيل بسيط',
          'أركز على ما لم أنجزه وأتجاهل خطواتي الإيجابية اليومية',
          'أقارن تقدمي بمسارات الآخرين مما يشتت هدوئي الداخلي',
          'أجد صعوبة في قول لا لالتزامات تستهلك طاقتي النفسية',
        ];
      }
      if (isPositiveTone) {
        return [
          'وعيّي بذاتي جيد وأريد ترسيخ عادة أسبوعية للمراجعة والتأمل',
          'أحياناً تسرق المجاملات مساحتي الشخصية وأحتاج لحدود أوضح',
          'أسعى لتحويل نجاحاتي الصغيرة إلى ثقة مستقرة طويلة المدى',
          'ما الخطوة التي تنمي صلابة نفسي أمام الضغوط المفاجئة؟',
        ];
      }
      return [
        'أفقد استمراريتي بسرعة عندما تتزاحم أهدافي في وقت واحد',
        'أحتاج لتخصيص وقت أسبوعي صريح لمراجعة مشاعري وأهدافي',
        'التشتت الذهني يمنعني من حسم أولوية واحدة والتركيز عليها',
        'أسعى لبناء ثقة متزنة عبر عادات يومية صغيرة ومستمرة',
      ];
    }

    case 'learning': {
      if (ctx.isStudent) {
        return [
          'أؤجل المذاكرة التراكمية حتى تضغطني أيام الاختبارات',
          'أذاكر ساعات طويلة لكن بتشتت قراءة دون فهم عميق',
          'أرغب في القراءة الإثرائية خارج المقررات لكن الوقت لا يسعفني',
          'يصعب عليّ تلخيص المعلومات واسترجاعها بسرعة عند المراجعة',
        ];
      }
      const hasScatter = /(دورات|كتب|تشتت|ما أكمل|لا أكمل|تأجيل|تسويف)/i.test(combined);
      if (hasScatter) {
        return [
          'أنتقل من دورة إلى أخرى قبل تطبيق ما تعلمته عملياً',
          'حماس البداية يبرد بعد الأسبوع الأول بسبب ضخامة المنهج',
          'لا أربط ما أتعلمه بمشروع عملي واضح يثبت المعلومة',
          'كثرة المصادر والمقاطع تجعلني أحتار من أين أبدأ يومياً',
        ];
      }
      return [
        'أبدأ عدة دورات أو كتب في نفس الوقت ولا أكمل أياً منها',
        'ضغط المهام اليومية يجعل التعلم والتطوير آخر أولوياتي',
        'أكتفي بالمشاهدة والقراءة دون تطبيق عملي يرسّخ المهارة',
        'أحتاج لاختيار مهارة تخصصية واحدة ذات عائد مباشر هذا الشهر',
      ];
    }

    case 'family': {
      if (ctx.hasDependents) {
        return isPositiveTone
          ? [
              'العلاقة الأسرية دافئة وأريد ابتكار نشاط أسبوعي يجمعنا بعيداً عن الهواتف',
              'أرغب في تحسين مهارات الإنصات والحوار الهادئ مع أبنائي أكثر',
              'أحياناً يسرق ضغط العمل بعض اللحظات المسائية الثمينة مع البيت',
              'كيف أحافظ على جودة حضورنا الأسري رغم ازدحام الالتزامات؟',
            ]
          : [
              'أكون حاضراً مع الأسرة جسدياً لكن ذهني مشغول بالعمل',
              'روتين الالتزامات يغلب علينا وتقل الجلسات العائلية الدافئة',
              'نحتاج لتنظيم وقت أسبوعي ممتع بعيداً عن الشاشات والضغوط',
              'ضغوط المعيشة والعمل تسبب توتراً أحياناً في الحوار المنزلي',
            ];
      }
      return [
        'انشغالات اليوم تباعد بين زياراتي وجلساتي المطمئنة مع الأهل',
        'أحياناً ينشغل الجميع بالهواتف أثناء الجلسة العائلية',
        'أريد تحويل تواصلي مع والديّ وإخوتي من سريع إلى دافئ وعميق',
        'أحتاج لتثبيت موعد أسبوعي واضح لصلة الرحم دون تأجيل',
      ];
    }

    case 'social':
    default: {
      const hasIsolation = /(انعزال|عزلة|وحيد|فتور|تراجع|قليل|رسائل|انطواء)/i.test(
        combined
      );
      if (hasIsolation) {
        return [
          'أتكاسل عن المبادرة بالاتصال ثم أشعر بالبعد والفتور',
          'تواصلي انحصر في رسائل سريعة بدل اللقاءات الحقيقية',
          'مرّ وقت طويل لم أجلس فيه مع صديق أثق به بعمق',
          'أحتاج لتجديد دائرتي الاجتماعية بأشخاص إيجابيين وداعمين',
        ];
      }
      if (isPositiveTone) {
        return [
          'علاقاتي طيبة لكن أريد تعزيز عمق التواصل مع الدائرة المقربة',
          'أحياناً تأخذني المجاملات الاجتماعية على حساب راحتي ووقتي',
          'أرغب في الموازنة بين لقاءات الأصدقاء ومسؤولياتي الخاصة',
          'كيف أبني علاقات جديدة تشاركني نفس الاهتمامات والقيم؟',
        ];
      }
      return [
        'أستهلك وقتي في مجاملات سطحية تسرق طاقتي بلا عائد معنوي',
        'أجد صعوبة في الموازنة بين احتياجاتي الخاصة وتوقعات الآخرين',
        'أرغب في تعميق علاقتي بصديقين أو ثلاثة مقربين بدلاً من الكثرة',
        'أحتاج لتحديد حدود لطيفة تحمي وقتي دون خسارة العلاقات',
      ];
    }
  }
}

function getRound3Candidates(
  domainId: string,
  lastMsg: string,
  historyText: string,
  ctx: ParsedUserContext
): string[] {
  const combined = `${historyText} ${lastMsg}`;
  const isBusyOrTired = /(ضغط|مزدحم|تعب|إرهاق|ارهاق|وقت|دوام|ساعات|انشغال)/i.test(combined);
  const hasScreenHabits = /(هاتف|جوال|شاشات|سهر|إشعارات|تيك توك|تواصل)/i.test(combined);
  const hasConsistencyIssue = /(أتكاسل|اتكاسل|أتوقف|اتوقف|أؤجل|اؤجل|تسويف|فتور|حماس|انقطع)/i.test(combined);

  switch (domainId) {
    case 'financial': {
      const debtTheme =
        /(قرض|قروض|دين|ديون|أقساط|اقساط|بطاقة|فيزا|التزامات|سداد)/i.test(combined) &&
        !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط))/i.test(combined);
      const explicitNoDebtR3 = /(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط)|خالي\s*من\s*الديون)/i.test(combined);
      if (debtTheme) {
        return [
          'سأبدأ بحصر الأقساط والديون من الأصغر للأكبر هذا الأسبوع',
          'يمكنني توجيه فائض بند ترفيهي واحد لتسريع سداد أصغر قسط',
          'أكبر عائق عندي هو ضبط النفقات عند حدوث طارئ مفاجئ',
          'أفضل إيقاف استخدام البطاقة الائتمانية في المشتريات اليومية',
        ];
      }
      if (explicitNoDebtR3 || ctx.isStudent) {
        return [
          'سأجرب تحويل مبلغ ثابت تلقائياً فور نزول الدخل القادم',
          'سأبدأ بتدوين المصروفات 7 أيام متصلة لكشف التسرب الفعلي',
          'العائق الأكبر عندي هو الالتزام بالميزانية في عطلة نهاية الأسبوع',
          'أريد البدء بفتح حساب فرعي منفصل تماماً لصمام الأمان',
        ];
      }
      return [
        'سأبدأ أولاً بجرد كافة التزاماتي وأقساطي الشهرية ونسبتها من الدخل',
        'سأدوّن مصروفاتي والتزاماتي 7 أيام لمعرفة الفائض الحقيقي المتاح',
        'التحدي الأكبر هو ترتيب الأولوية بين الالتزامات الحتمية وبناء احتياطي',
        'أريد خطة تحمي سيولتي وتمنع اللجوء لأي اقساط أو ديون جديدة',
      ];
    }

    case 'spiritual':
      if (hasScreenHabits) {
        return [
          'سأجرب شحن الهاتف خارج غرفة النوم قبل موعد نومي بـ 20 دقيقة',
          'سأغلق الإشعارات غير الضرورية خلال وردي اليومي لمدة 10 دقائق',
          'أكثر ما يعيدني للهاتف ليلاً هو التعود التلقائي قبل النوم',
          'سأستبدل تصفح الهاتف بصفحة أو دقيقتي تأمل وذكر هادئ',
        ];
      }
      return isBusyOrTired
        ? [
            'أستطيع تثبيت 5 دقائق هادئة بعد صلاة الفجر أو قبل الخروج للعمل',
            'سأربط الذكر والاستغفار بوقت الطريق أو المواصلات دون عبء إضافي',
            'أكبر عائق لدي هو الإرهاق آخر اليوم الذي يمنعني من التركيز',
            'سألتزم بخطوة روحية صغيرة لا تتجاوز 5 دقائق لضمان الاستمرارية',
          ]
        : [
            'أستطيع إبعاد الهاتف 20 دقيقة قبل النوم لحماية سكينتي',
            'الوقت الأنسب لي هو 10 دقائق هادئة بعد صلاة الفجر مباشرة',
            'التحدي الأكبر عندي هو التشتت والعودة للهاتف بدافع العادة',
            'أريد ربط لحظة التأمل والذكر بعادة يومية قائمة أمارسها دائماً',
          ];

    case 'health':
      if (hasScreenHabits || /(نوم|سهر|أرق|متعب)/i.test(lastMsg)) {
        return [
          'سأجرب إطفاء الشاشات قبل النوم بـ 30 دقيقة كخطوة تجريبية',
          'سأثبت موعد استيقاظي صباحاً أولاً لتصحيح إيقاع النوم تدريجياً',
          'العائق الأكبر عندي هو تعويض ضغط اليوم بالسهر المتأخر',
          'سأجهز الغرفة بإضاءة خافتة قبل النوم بنصف ساعة كل ليلة',
        ];
      }
      return [
        'سأبدأ بـ 15 دقيقة مشي بعد العمل أو في نهاية اليوم كبداية واقعية',
        'سأضع زجاجة ماء بجانبي طوال ساعات العمل لضبط الترطيب',
        'العائق عندي هو تعثر الحماس عند انشغال منتصف الأسبوع',
        'سألتزم بتمرين أو مشي خفيف 3 أيام أسبوعياً ثم أتدرج بالزيادة',
      ];

    case 'career':
      if (ctx.isStudent) {
        return [
          'سأخصص 45 دقيقة يومياً للتدريب العملي خارج المذاكرة',
          'سأقلص المشتتات أثناء المذاكرة عبر تقنية 25 دقيقة تركيز',
          'أكبر عائق هو تراكم الواجبات والاختبارات في نفس الأسبوع',
          'أحتاج استشارة أو تواصل مع مختص في مجالي لاختصار الطريق',
        ];
      }
      if (isBusyOrTired || /(حدود|راحة|فصل|احتراق)/i.test(lastMsg)) {
        return [
          'سأحدد ساعة واضحة يومياً لإغلاق بريد العمل وحماية راحتي',
          'سأتدرب على إعادة ترتيب الأولويات أو الاعتذار بلباقة عن المهام الإضافية',
          'العائق الحقيقي هو توقع الاستجابة الفورية حتى بعد ساعات الدوام',
          'سأبدأ بحماية أول 45 دقيقة في الدوام لأهم مهمة استراتيجية',
        ];
      }
      return [
        'سأحجز أول 60 دقيقة صباحاً للمهام الحاسمة دون فتح الإشعارات',
        'سأختصر مهام يومي في 3 أولويات رئيسية فقط لمنع التشتت',
        'التحدي الأكبر هو المقاطعات والاجتماعات غير المخطط لها',
        'سأحدد وقتاً صارماً لإغلاق العمل يومياً وحماية وقت راحتي',
      ];

    case 'personal':
      if (/(لا|حدود|أقارن|مقارنة|لوم|أقسو)/i.test(lastMsg)) {
        return [
          'سأدون إنجازين صغيرين قبل النوم لتقليل قسوتي على نفسي',
          'سأعتذر بلطف عن التزام واحد هذا الأسبوع لاستعادة مساحتي',
          'أكبر عائق هو عودة صوت اللوم الداخلي فور أي تأجيل بسيط',
          'سأقلل متابعة يوميات الآخرين لتخفيف المقارنات المشتتة',
        ];
      }
      return [
        'سأستبدل لوم الذات بتسجيل أصغر خطوة أنجزتها في نهاية اليوم',
        'سأضع حدوداً واضحة برفض التزام واحد غير ضروري هذا الأسبوع',
        'التحدي عندي هو الحفاظ على الوتيرة عند تراجع الحماس الأولي',
        'سأعتمد قاعدة الدقيقتين لكسر جمود البداية في أي عادة جديدة',
      ];

    case 'learning':
      if (hasConsistencyIssue || /(دورات|كتب|ملل|حماس)/i.test(lastMsg)) {
        return [
          'سأختار مصدراً واحداً فقط وأغلق بقية الكورسات مؤقتاً هذا الشهر',
          'سأقلص مدة التعلم لـ 15 دقيقة يومياً حتى لا أثقل على نفسي',
          'أكبر عائق لدي هو غياب التطبيق الفوري لما أقرأه أو أشاهده',
          'سألخص ما أتعلمه في 3 نقاط عملية عقب كل جلسة مباشرة',
        ];
      }
      return [
        'سأركز على كتاب واحد أو دورة واحدة فقط خلال هذا الشهر',
        'سأثبت 20 دقيقة للتعلم اليومي في نفس التوقيت يومياً',
        'أكبر عائق لدي هو الملل من المحتوى النظري دون تطبيق عملي',
        'سأطبق قاعدة كتابة فائدة عملية واحدة بعد كل جلسة تعلم',
      ];

    case 'family':
      if (hasScreenHabits || /(هواتف|شاشات)/i.test(lastMsg)) {
        return [
          'سأطبق وضع الهاتف بعيداً لمدة 30 دقيقة أثناء الجلسة العائلية',
          'سأقترح نشاطاً أو حواراً عائلياً قصيراً دون استخدام الشاشات',
          'العائق عندي هو تسلل رسائل العمل إلى وقت المساء داخل المنزل',
          'سأثبت ساعة أسبوعية مغلقة في جدولي لقضاء وقت نوعي مع الأهل',
        ];
      }
      return [
        'سأطبق قاعدة وضع الهاتف جانباً أثناء الجلوس مع الأسرة',
        'سأثبت موعداً أسبوعياً لنشاط أو لقاء عائلي هادئ بدون شاشات',
        'العائق الأكبر أحياناً هو الإرهاق والانشغال الذهني بعد العودة للبيت',
        'سأبادر غداً بلفتة تقدير أو مكالمة دافئة ومطولة لأحد الوالدين',
      ];

    case 'social':
    default:
      if (/(رسائل|تردد|حرج|فتور|انقطاع)/i.test(lastMsg)) {
        return [
          'سأكسر حاجز التردد برسالة دافئة أو اتصال قصير بصديق مقرب غداً',
          'سأرتب قهوة سريعة مدتها 30 دقيقة مع صديق واحد هذا الأسبوع',
          'العائق الأكبر هو الانشغال والتأجيل رغم رغبتي الصادقة في التواصل',
          'سأخصص مساءً محدداً كل أسبوعين للتواصل الحي مع دائرتي المقربة',
        ];
      }
      return [
        'سأبادر هذا الأسبوع بالاتصال بصديق مقرب لترتيب لقاء هادئ',
        'سأقلص المجاملات المستنزفة لأوفر طاقتي لعلاقات أكثر عمقاً',
        'أكبر عائق هو التردد بعد انقطاع طويل والشعور بالحرج من البداية',
        'سأخصص مساءً واحداً كل أسبوعين للتواصل الاجتماعي النوعي',
      ];
  }
}

function getRound4PlusCandidates(
  domainId: string,
  lastMsg: string,
  historyText: string,
  advisorReply: string,
  roundNumber: number
): string[] {
  const combined = `${historyText} ${lastMsg}`;
  const isAskingMore = /(تعمق|نكمل|نواصل|وضح|أكثر|تفاصيل|كيف)/i.test(lastMsg);
  const isObstacleReport = /(عائق|صعب|مشكلة|انشغال|أنسى|تراجع|تعب|لا أستطيع)/i.test(lastMsg);
  const replyHasScore = /(?:أقيّم|تقييم|بدرجة)\s*[:(]?\s*\d+(?:\.\d+)?\s*(?:\/|من)\s*10/i.test(
    advisorReply
  );

  const hasDebtMention =
    /(قرض|دين|أقساط|التزامات)/i.test(combined) &&
    !/(بدون\s*ديون|لا\s*(?:توجد|يوجد|لدي|عندي)\s*(?:ديون|أقساط))/i.test(combined);

  const domainSpecificAction: Record<string, string> = {
    financial: hasDebtMention
      ? 'سأطبق خطة حصر الأقساط وتوجيه أي فائض لأصغر التزام من الغد'
      : 'سأراجع التزاماتي الثابتة وأثبت خطوة صمام الأمان للأسبوع القادم',
    spiritual: 'سأثبت ورد السكينة والهدوء اليومي لمدة 10 دقائق بعيداً عن الهاتف',
    health: 'سألتزم بموعد النوم الثابت والمشي 20 دقيقة خلال هذا الأسبوع',
    career: 'سأبدأ بتطبيق ساعة التركيز الصباحي وترتيب أهم 3 أولويات غداً',
    personal: 'سأعتمد الخطوة المصغرة اليومية وأراجع تقدمي بهدوء نهاية الأسبوع',
    learning: 'سأخصص 20 دقيقة يومياً للتعلم العملي والتركيز على مسار واحد',
    family: 'سأخصص جلسة أسرية دافئة بدون هواتف هذا الأسبوع',
    social: 'سأتواصل هذا الأسبوع مع صديق مقرب لتحديد لقاء حقيقي هادئ',
  };

  if (roundNumber >= 5) {
    return [
      'أحتاج لآلية أضمن بها الثبات إذا مرّ أسبوع مضغوط دون تراجع',
      'أفضل تقليص الخطوة لنصف المدة في الأيام المزدحمة حتى لا أنقطع',
      'سأراجع نتائج هذه الخطوة معك الأسبوع القادم لقياس التطور',
      replyHasScore
        ? 'أشعر أن الصورة اكتملت الآن ومستعد لتثبيت خطتي والاعتماد'
        : 'أصبحت الخطوة واضحة وقابلة للتنفيذ الفوري ابتداءً من اليوم',
    ];
  }

  if (isObstacleReport) {
    return [
      'لتجاوز هذا العائق سأبدأ بنصف الوقت المحدد خلال أول 3 أيام',
      'سأربط هذه الخطوة بوقت ثابت بعد مهمة يومية لا تتغير',
      domainSpecificAction[domainId] || domainSpecificAction.personal,
      'ما البديل الأخف إذا واجهت يوماً شديد الازدحام؟',
    ];
  }

  if (isAskingMore) {
    return [
      domainSpecificAction[domainId] || domainSpecificAction.personal,
      'ما أصغر خطوة عملية يمكنني تجربتها خلال الـ 24 ساعة القادمة؟',
      'أحتاج لطريقة أضمن بها عدم التراجع بعد الأيام الثلاثة الأولى',
      'الرؤية اتضحت الآن، أستطيع الانتقال لمرحلة التقييم والاعتماد',
    ];
  }

  return [
    domainSpecificAction[domainId] || domainSpecificAction.personal,
    'الفكرة واضحة تماماً وسأبدأ بتنفيذها فعلياً ابتداءً من الغد',
    replyHasScore
      ? 'التقييم واقعي ومقنع، وأود معرفة كيف أرفع الدرجة الشهر القادم'
      : 'أريد التأكد من أصغر خطوة عملية تجعلني أستمر دون انقطاع',
    'هل هناك عائق خفي تنصحني بالانتباه له في الأسبوع الأول؟',
  ];
}

/**
 * Generates 3-4 fresh, round-aware, context-tailored, non-repeating quick suggestions
 * strictly reacting to turn number, last user message, domain, and user profile.
 */
export function generateDynamicQuickSuggestions(
  input: DynamicSuggestionInput
): string[] {
  const {
    domainId,
    roundNumber,
    lastUserMessage = '',
    advisorReply = '',
    userProfile,
    previousChips = [],
    userHistory = [],
    aiSuggestedReplies = [],
  } = input;

  const ctx = parseUserContext(userProfile);
  const domainCfg = getDomainContextConfig(domainId, ctx);
  const combinedUserHistory = userHistory.join(' ');

  // Build exclusion list so we NEVER show previous chips or repeat user's previous answers
  const excludedNormalized = [
    ...previousChips.map(normalizeSuggestionText),
    ...userHistory.map(normalizeSuggestionText),
    normalizeSuggestionText(lastUserMessage),
  ].filter(Boolean);

  let rawCandidates: string[] = [];

  if (roundNumber <= 1) {
    // Round 1: Initial Reality Diagnosis (Domain + UserContext tailored)
    const round1Shortcuts: string[] = [];
    if (domainId === 'financial') {
      if (ctx.isStudent) {
        round1Shortcuts.push(
          'أعتمد على المكافأة/المصروف وبدون ديون لكن أواجه عجزاً نهاية الشهر',
          'أرغب في تجربة اقتطاع مبلغ رمزي كصمام أمان شهري'
        );
      } else {
        round1Shortcuts.push(
          'لدي أقساط أو ديون شهرية تقتطع جزءاً من الراتب وأحتاج لترتيب أولويات السداد',
          'توجد التزامات شهرية ثابتة ولا أعرف هل يتبقى لي فائض فعلي للادخار',
          'لا توجد عليّ ديون حالياً وأريد تنظيم الميزانية وبناء صندوق الطوارئ'
        );
      }
    } else if (domainId === 'spiritual') {
      round1Shortcuts.push(
        'أشعر بالتشتت بسبب الهاتف ومواقع التواصل ولا أجد خلوة هادئة',
        'أرغب في تخصيص نصف ساعة يومياً للتأمل والهدوء بعيداً عن الهاتف'
      );
    } else if (domainId === 'health') {
      round1Shortcuts.push(
        'أعاني من قلة النوم وإجهاد الشاشات وأنام ساعات متقطعة',
        'أرغب في الالتزام بـ 20 دقيقة مشي يومي وشرب لترين ماء'
      );
    }
    rawCandidates = [...round1Shortcuts, ...domainCfg.suggestedResponses];
  } else if (roundNumber === 2) {
    // Round 2: Root Cause / Trigger Deepening based on Round 1 reply
    rawCandidates = getRound2Candidates(domainId, lastUserMessage, ctx);
  } else if (roundNumber === 3) {
    // Round 3: Testing Feasibility & Identifying Obstacles based on Round 2 reply
    rawCandidates = getRound3Candidates(
      domainId,
      lastUserMessage,
      combinedUserHistory,
      ctx
    );
  } else {
    // Round 4+: Micro-commitment & Action locking
    rawCandidates = getRound4PlusCandidates(
      domainId,
      lastUserMessage,
      combinedUserHistory,
      advisorReply,
      roundNumber
    );
  }

  // Merge AI-provided suggestedReplies at the top for Rounds 2+ (if valid, concise, first-person, and non-duplicate)
  const prioritizedPool =
    roundNumber >= 2 && Array.isArray(aiSuggestedReplies) && aiSuggestedReplies.length > 0
      ? [
          ...aiSuggestedReplies
            .map((s) => (typeof s === 'string' ? s.replace(/^[•\-*\d.)]+\s*/, '').trim() : ''))
            .filter((s) => s.length >= 6 && s.length <= 85),
          ...rawCandidates,
        ]
      : rawCandidates;

  const selected: string[] = [];
  const seenLocal = new Set<string>();

  for (const item of prioritizedPool) {
    if (!item || typeof item !== 'string') continue;
    const clean = item.trim();
    const norm = normalizeSuggestionText(clean);
    if (!norm || seenLocal.has(norm)) continue;
    if (isDuplicateCandidate(clean, excludedNormalized)) continue;

    seenLocal.add(norm);
    selected.push(clean);
    if (selected.length >= 4) break;
  }

  // Safety fallback with first-person round-specific user replies (never leaks prior chips or advisor questions)
  if (selected.length < 3) {
    const emergencyPool = roundNumber <= 2
      ? [
          'التحدي الأكبر عندي مرتبط بضغط الوقت وتشتت الأولويات',
          'أواجه صعوبة في الاستمرار رغم رغبتي الصادقة في التحسن',
          'أحتاج لتفكيك السبب الرئيسي قبل وضع خطة يومية',
          'أوضح لي هذه النقطة بمثال عملي بسيط يناسب وضعي',
        ]
      : [
          'أحتاج لخطوة صغيرة أجربها خلال الـ 24 ساعة القادمة',
          'كيف أضمن الاستمرار في هذه الخطوة دون فتور أو انقطاع؟',
          'سأبدأ بالنسخة المخففة من الخطة هذا الأسبوع',
          'ما أصغر مؤشر يثبت لي أنني أتقدم في المسار الصحيح؟',
        ];
    for (const fallbackItem of emergencyPool) {
      const norm = normalizeSuggestionText(fallbackItem);
      if (
        norm &&
        !seenLocal.has(norm) &&
        !isDuplicateCandidate(fallbackItem, excludedNormalized)
      ) {
        seenLocal.add(norm);
        selected.push(fallbackItem);
        if (selected.length >= 3) break;
      }
    }
    if (selected.length < 2) {
      for (const fallbackItem of emergencyPool) {
        const norm = normalizeSuggestionText(fallbackItem);
        if (
          norm &&
          !seenLocal.has(norm) &&
          !isDuplicateCandidate(fallbackItem, [normalizeSuggestionText(lastUserMessage)])
        ) {
          seenLocal.add(norm);
          selected.push(fallbackItem);
          if (selected.length >= 3) break;
        }
      }
    }
  }

  return selected;
}
