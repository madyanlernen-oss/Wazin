import { LifeAreaId, DayPlanTask, DailyGoalItem, ThirtyDayPlanState } from '../types/lifeBalance';
import {
  DOMAIN_ARABIC_NAMES,
  getDomainArabicName,
  localizeDomainText,
} from './arabicDomainLabels';

const PLAN_STORAGE_KEY = 'wazan_30day_plan_v1';
const CUSTOM_FOCUS_STORAGE_KEY = 'wazan_30day_custom_focus_v1';
export const MAX_DAILY_GOALS = 4;

/**
 * Resolve 1 to MAX_DAILY_GOALS (4) active goals/tasks for a plan day,
 * with backwards compatibility for legacy single-selectedTask plans.
 */
export function resolveDayGoals(day?: DayPlanTask | null): DailyGoalItem[] {
  if (!day) return [];
  if (Array.isArray(day.dailyGoals) && day.dailyGoals.length > 0) {
    return day.dailyGoals
      .filter((g) => g && typeof g.text === 'string' && g.text.trim().length > 0)
      .slice(0, MAX_DAILY_GOALS)
      .map((g, idx) => ({
        id: g.id || `goal_${day.dayNumber}_${idx + 1}`,
        text: g.text.trim(),
        isCompleted: Boolean(g.isCompleted),
        isCustom: Boolean(g.isCustom),
        completedAt: g.completedAt,
      }));
  }

  const fallbackText =
    (day.selectedTask && day.selectedTask.trim()) ||
    (Array.isArray(day.defaultSuggestions) && day.defaultSuggestions[0]) ||
    'خطوة يومية متوازنة';

  return [
    {
      id: `goal_${day.dayNumber}_1`,
      text: fallbackText.trim(),
      isCompleted: Boolean(day.isCompleted),
      isCustom: Boolean(day.isCustomSelected),
      completedAt: day.completedAt,
    },
  ];
}

// أسماء وأيقونات المجالات (مرتبطة بالقاموس العربي الموحد لضمان عدم تسرب أي مفتاح إنجليزي)
export const DOMAIN_META: Record<LifeAreaId, { title: string; icon: string; color: string }> = {
  health: { title: DOMAIN_ARABIC_NAMES.health, icon: '🌿', color: 'emerald' },
  financial: { title: DOMAIN_ARABIC_NAMES.financial, icon: '💰', color: 'amber' },
  career: { title: DOMAIN_ARABIC_NAMES.career, icon: '💼', color: 'blue' },
  spiritual: { title: DOMAIN_ARABIC_NAMES.spiritual, icon: '🕊️', color: 'teal' },
  personal: { title: DOMAIN_ARABIC_NAMES.personal, icon: '🧠', color: 'purple' },
  family: { title: DOMAIN_ARABIC_NAMES.family, icon: '🏡', color: 'rose' },
  social: { title: DOMAIN_ARABIC_NAMES.social, icon: '🤝', color: 'cyan' },
  learning: { title: DOMAIN_ARABIC_NAMES.learning, icon: '📚', color: 'indigo' },
};

export const WEEK_INFO: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: 'ابدأ بخطوة صغيرة',
    subtitle: 'الأسبوع الأول: اكتشف وقتاً مناسباً للعادة الجديدة وابدأ دون ضغط.',
  },
  2: {
    title: 'تثبيت الروتين',
    subtitle: 'الأسبوع الثاني: بناء الاتساق اليومي وربط العادة بروتين قائم.',
  },
  3: {
    title: 'تعميق الأثر',
    subtitle: 'الأسبوع الثالث: رفع جودة الممارسة وتذليل العقبات الواقعية.',
  },
  4: {
    title: 'تجاوز التحديات',
    subtitle: 'الأسبوع الرابع: اختبار الاستدامة وحماية وقت الممارسة من الطوارئ.',
  },
  5: {
    title: 'الختام والتكامل',
    subtitle: 'مراجعة ختامية واحتفال بالنقلة وتثبيت العادات في أسلوب حياتك المستمر.',
  },
};

// بنك الاقتراحات الذكية الثلاثة لكل مجال ولكل أسبوع
const DOMAIN_WEEKLY_SUGGESTIONS: Record<LifeAreaId, Record<number, [string, string, string]>> = {
  health: {
    1: [
      'امشِ لمدة 10 دقائق بالوتيرة التي تناسب قدراتك.',
      'اشرب كوبين من الماء فور الاستيقاظ لإنعاش جسدك.',
      'أوقف الشاشات الزرقاء قبل موعد نومك المعتاد بـ 30 دقيقة.',
    ],
    2: [
      'امشِ 15 دقيقة بنشاط في الهواء الطلق صباحاً أو عصراً.',
      'تناول وجبة إفطار متوازنة غنية بالبروتين والخضار وتجنب السكريات السريعة.',
      'مارس تمارين إطالة وتنفس عميق لمدة 7 دقائق بعد ساعات العمل.',
    ],
    3: [
      'أتمم 20 دقيقة نشاط بدني مستمر (مشي سريع أو تمارين مقاومة خفيفة).',
      'استبدل المشروبات الغازية بالماء المنعش طوال اليوم.',
      'ثبّت موعد نومك واستيقاظك بفارق لا يتجاوز 30 دقيقة.',
    ],
    4: [
      'مارس تمريناً بدنياً حيوياً لمدة 25 دقيقة لرفع طاقتك ونشاط دورتك الدموية.',
      'حضّر وجباتك الصحية لليومين القادمين مسبقاً لحمايتها من الوجبات السريعة.',
      'قم بجلسة تأمل وتنفس استرخائي كامل لمدة 10 دقائق في غرفة مظلمة وباردة.',
    ],
    5: [
      'دوّن الفارق في مستوى طاقتك البدنية ونشاطك منذ بداية الشهر.',
      'حدد العادة الصحية الأسهل والأكثر أثراً لتستمر عليها كنمط حياة دائم.',
      'احتفل بالتزامك الصحي بمكافأة طيبة وممتعة تجدد رغبتك في الاستمرار.',
    ],
  },
  financial: {
    1: [
      'دوّن كل ريال تنفقه اليوم دون أي استثناء لرصد نمط الإنفاق الحقيقي.',
      'راجع اشتراكاتك الرقمية وألغِ تطبيقاً أو خدمة واحدة لا تستخدمها.',
      'جمّد بطاقتك الائتمانية ليوم كامل واعتمد فقط على ميزانية كاش محددة.',
    ],
    2: [
      'حوّل مبلغاً رمزياً (حتى لو 50 ريالاً) إلى حساب ادخار طوارئ منفصل.',
      'حدد بنداً واحداً من مصاريفك غير الأساسية واقتطع 20% منه هذا الأسبوع.',
      'طبّق قاعدة الـ 24 ساعة: لا تشترِ أي كمالية ترغب بها إلا بعد مضي يوم كامل.',
    ],
    3: [
      'احصر إجمالي التزاماتك وفواتيرك القادمة ورتبها في ورقة واحدة حسب الأولوية.',
      'ابحث عن خيار بديل أوفر لبند متكرر في مشترياتك الأسبوعية.',
      'استثمر 15 دقيقة في قراءة ملخص مالي أو بودكاست عن بناء الأصول واستثمار الدخل.',
    ],
    4: [
      'ضع ميزانية واضحة ومسبقة لمصاريف الأسبوع القادم والتزم بسقفها تماماً.',
      'أتمت التحويل التلقائي للادخار في اليوم الأول لنزول دخلك القادم.',
      'تخلص من أحد الالتزامات المالية الصغيرة بسداده مبكراً لتحقيق انتصار نفسي.',
    ],
    5: [
      'احسب إجمالي ما وفرته أو نظمت مصارفه خلال الـ 30 يوماً الماضية.',
      'ثبّت قاعدة مالية واحدة دائمة (مثل: ادخر أولاً ثم عش بما تبقى).',
      'ارسم خطتك المالية للربع السنوي القادم بثقة ووضوح.',
    ],
  },
  career: {
    1: [
      'طبّق قاعدة العمل العميق: 45 دقيقة إنجاز لمهامك دون فتح الهاتف أو الإيميل.',
      'حدد أهم مهمة في المربع الثاني (مهمة غير عاجلة) وأنجز نصفها اليوم.',
      'نظّف سطح مكتبك وملفاتك الرقمية لاستعادة الوضوح والتركيز المهني.',
    ],
    2: [
      'اقرأ مقالاً متخصصاً أو فصلاً في مجالك ودون استبصاراً قابلاً للتطبيق العملي.',
      'قل "لا" بلباقة لطلب أو مقاطعة غير مهمة تسرق وقتك الثمين اليوم.',
      'اكتب قائمة أولوياتك المهنية ليوم غد قبل مغادرة مكتبك اليوم بـ 10 دقائق.',
    ],
    3: [
      'تواصل مهنياً مع زميل أو خبير في مجالك لتبادل الخبرات وتوسيع شبكتك.',
      'استخدم تقنية البومودورو (25 دقيقة تركيز + 5 راحة) لإنجاز ملف مؤجل.',
      'طوّر خطوة جديدة في مهارة نوعية ترفع من قيمتك في سوق العمل.',
    ],
    4: [
      'راجع إنتاجيتك في الشهر وركز على المهام التي تصنع 80% من نتائجك الفعلية.',
      'أعد صياغة أولوياتك المهنية للربع القادم بالتنسيق مع أهدافك الشخصية.',
      'قدم مقترح تحسين أو حل مبتكر لتحدٍ يواجهه فريقك أو عملك.',
    ],
    5: [
      'دوّن أكبر 3 إنجازات مهنية حققتها بفضل الانضباط اليومي هذا الشهر.',
      'ثبّت عادة حماية وقت التركيز الصباحي كقاعدة مهنية لا تفاوض فيها.',
      'ارسم هدفك المهني القادم واحتفل بتطورك.',
    ],
  },
  spiritual: {
    1: [
      'صلّ صلاة واحدة اليوم ببطء مضاعف مع إطالة السجود وحضور القلب.',
      'جلسة صمت وخلوة وتأمل لمدة 5 دقائق بعد صلاة الفجر لاستعادة السكينة.',
      'اقرأ صفحتين من القرآن الكريم بتأنٍ وتدبر لأثر الآيات في يومك.',
    ],
    2: [
      'حافظ على أذكار الصباح والمساء بقلب حاضر وغير مستعجل.',
      'خصص 10 دقائق خلوة مساءً للدعاء والفضفضة الصادقة مع الخالق.',
      'قدم صدقة خفية أو تصرفاً إحسانياً بسيطاً يسعد قلباً دون ضجيج.',
    ],
    3: [
      'صلّ ركعتي الضحى أو ركعتين في جوف الليل بسكينة وطمأنينة.',
      'دوّن 5 نعم يومية تستشعر فيها الامتنان العميق لفضل الله عليك.',
      'سامح شخصاً أساء إليك في داخلك لتفرغ صدرك من أي ثقل أو مرارة.',
    ],
    4: [
      'جلسة تدبر وتفكر في الطبيعة أو السماء لمدة 15 دقيقة بعيداً عن صخب الهاتف.',
      'اقرأ سورة أو فصلاً روحياً تحبه بتفكر في معانيه العميقة.',
      'ثبّت خلوة روحية يومية من 10 دقائق كواحة سلام ثابتة في يومك.',
    ],
    5: [
      'تأمل في التغير الذي طرأ على هدوء صدرك وسكينتك مقارنة باليوم الأول.',
      'اختر العمل الروحي الأكثر سكينة لقلبك ليكون وردك الدائم.',
      'استشعر مشاعر الشكر والرضا واختم الشهر بقلب مطمئن.',
    ],
  },
  personal: {
    1: [
      'دوّن 3 أشياء أنت ممتن لوجودها في شخصيتك أو حياتك اليوم.',
      'توقف عن لوم الذات أو المقارنة طوال اليوم وعامل نفسك كصديق تحبه.',
      'تخلّص من فوضى درج أو ركن واحد في غرفتك لتحرير طاقتك الذهنية.',
    ],
    2: [
      'خصص 20 دقيقة لقراءة كتاب في بناء العادات أو الوعي الذاتي.',
      'اكتب مشاعرك وأفكارك بصراحة تامة على ورقة لتفريغ الاحتقان النفسي.',
      'حدد عادة سلبية واحدة ترغب في استبدالها ببديل صحي ميسر.',
    ],
    3: [
      'مارس تمرين الرفق بالذات: اعترف بنقاط ضعفك دون قسوة وضع خطة للنمو.',
      'اقضِ ساعة كاملة في ممارسة هواية شخصية تحبها بعيداً عن الشاشات والعمل.',
      'ضع حدوداً واضحة تحمي راحتك النفسية من الاستنزاف أو الطلبات المرهقة.',
    ],
    4: [
      'راجع إنجازاتك الشخصية ودعواتك التي تحققت لتعزيز ثقتك بنفسك.',
      'تحدّ فكرة سلبية أو خوفاً داخلياً بتجربة خطوة شجاعة صغيرة اليوم.',
      'ثبّت روتين الصباح الهادئ (بدون هاتف لأول نصف ساعة).',
    ],
    5: [
      'اكتب رسالة شكر وتقدير لنفسك على مثابرتك وتطورك خلال الشهر.',
      'حدد القيمة الشخصية الأهم التي سترتكز عليها في المرحلة القادمة.',
      'احتفل بنموك الداخلي واشعر بالسلام مع نفسك.',
    ],
  },
  learning: {
    1: [
      'اقرأ 10 صفحات من كتاب نوعي يضيف لمعرفتك وعقليتك.',
      'استمع إلى حلقة بودكاست ثرية وموثقة أثناء المشي أو التنقل.',
      'دوّن فكرة واحدة ملهمة تعلمتها اليوم ولخصها بأسلوبك الخاص.',
    ],
    2: [
      'خصص 25 دقيقة لتعلم مفهوم جديد أو أداة تقنية تفيدك في مجالك.',
      'اشرح فكرة جديدة تعلمتها لشخص آخر لترسيخ فهمك العميق لها.',
      'نظّم ملاحظاتك وقوائم قراءاتك ورتب أولوياتك المعرفية.',
    ],
    3: [
      'شاهد درساً تدريبياً مكثفاً ودون 3 نقاط إجرائية قابلة للتطبيق.',
      'اقرأ مقالاً فكرياً أو دراسة حالة تناقش زاوية جديدة تختلف عن رأيك المعتاد.',
      'راجع ما قرأته هذا الشهر ودون أهم 3 استبصارات أثرت في قراراتك.',
    ],
    4: [
      'طبق فوراً مفهوماً تعلمته مؤخراً في مشروع أو عادة واقعية.',
      'اقتنِ أو حمّل كتاب الشهر القادم وحدد جدول قراءته الأسبوعي.',
      'ثبّت عادة الـ 20 دقيقة اليومية للتعلم المستمر في جدولك.',
    ],
    5: [
      'راجع بنك المعرفة والملاحظات التي جمعتها طوال الـ 30 يوماً الماضية.',
      'حدد الموضوع المعرفي الأبرز الذي ستركز عليه في الشهر القادم.',
      'احتفل باتساع أفقك المعرفي وحرصك على التعلم الدائم.',
    ],
  },
  family: {
    1: [
      'بادر باتصال أو زيارة دافئة لوالديك مع التفرغ التام للحديث معهم.',
      'جلسة عائلية ممتعة لمدة 20 دقيقة دون أي شاشات أو هواتف ذكية.',
      'عبر عن امتنانك وتقديرك لأحد أفراد أسرتك بكلمة طيبة صادقة.',
    ],
    2: [
      'شارك وجبة طعام واحدة على الأقل مع أسرتك في جو من البهجة والاستماع.',
      'استمع باهتمام لأحد أفراد عائلتك دون مقاطعة أو تقديم نصائح متعجلة.',
      'بادر بالمساعدة في عمل منزلي أو قضاء حاجة عائلية تخفف عنهم.',
    ],
    3: [
      'خطط لنشاط عائلي خفيف وممتع في نهاية هذا الأسبوع.',
      'تحدث مع أطفالك أو إخوتك حول مشاعرهم وما يشغل بالهم بود وحنان.',
      'أصلح أي سوء تفاهم عائلي صغير بكلمة تسامح ومبادرة طيبة.',
    ],
    4: [
      'اصنع لحظة ذكرى مميزة مع أسرتك (جلسة حوار، ألبوم صور، أو نزهة).',
      'خصص وقتاً نوعياً فردياً مع شريك حياتك أو أقرب أفراد أسرتك إليك.',
      'ثبّت جلسة أسبوعية منتظمة للترابط والمودة الأسرية.',
    ],
    5: [
      'تأمل في تحسن دفء وقوة علاقاتك الأسرية بفضل المبادرات البسيطة.',
      'حدد العادة الأسرية الأجمل التي ستستمرون عليها كعائلة.',
      'اشكر أسرتك على وجودهم ودعمهم واحتفل برباطكم المتين.',
    ],
  },
  social: {
    1: [
      'بادر بإرسال رسالة اطمئنان ودية لصديق قديم لم تتحدث معه منذ فترة.',
      'قدم ابتسامة وكلمة شكر وتقدير لشخص يقدم لك خدمة في يومك.',
      'احرص على الحضور الذهني والإصغاء الكامل في أول محادثة تجريها اليوم.',
    ],
    2: [
      'شارك في لقاء أو تواصل هادف مع مجموعة ذات اهتمامات مشتركة.',
      'قدّم خدمة أو مساعدة بسيطة ومخلصة لشخص في محيطك دون انتظار مقابل.',
      'تجنب النميمة والحديث السلبي والمجالس المستنزفة طوال اليوم.',
    ],
    3: [
      'بادر بدعوة صديق مقرب لجلسة قهوة أو حوار عميق ومثمر.',
      'تعرّف على شخص إيجابي جديد في بيئة عملك أو محيطك الاجتماعي.',
      'وسع دائرة الإحسان بمشاركة معلومة نافعة أو دعم معنوي لزميل.',
    ],
    4: [
      'شارك في عمل تطوعي أو مبادرة مجتمعية حتى لو كانت افتراضية أو بسيطة.',
      'راجع دائرة علاقاتك وعزز تواصلك مع الداعمين والملهمين الحقيقيين.',
      'ثبّت عادة التواصل النوعي المنتظم وتفقد الأحبة والأصدقاء.',
    ],
    5: [
      'دوّن الأثر الإيجابي الذي صنعته مبادراتك الاجتماعية في نفسيتك وعلاقاتك.',
      'اختر عادة تواصل واحدة تلتزم بها أسبوعياً لحماية جودة صداقاتك.',
      'احتفل بشبكة علاقاتك الإنسانية الصادقة.',
    ],
  },
};

export const ALL_CANONICAL_DOMAINS: LifeAreaId[] = [
  'spiritual',
  'financial',
  'career',
  'personal',
  'learning',
  'family',
  'social',
  'health',
];

export interface PrioritizedDomainItem {
  id: LifeAreaId;
  score: number;
  title: string;
  icon: string;
}

/**
 * استخراج المجالات الثلاثة الأكثر حاجة للتركيز بناءً على تقييمات عجلة الحياة الفعلية فقط:
 * - استبعاد أي مجال غير مقيّم (null / undefined / NaN / <= 0).
 * - ترتيب المجالات المقيّمة تصاعدياً من الأدنى درجة إلى الأعلى واختيار حتى 3 مجالات.
 * - لا يُدرج أبداً مجال غير مقيّم أو مجال مرتفع الدرجة (مثل 8.5) مع وجود درجات أدنى (مثل 2.5 أو 3.5).
 */
export function extractPriorityDomains(scores: Record<string, number | null | undefined> | null | undefined): LifeAreaId[] {
  if (!scores || typeof scores !== 'object') {
    return [];
  }

  const scored = ALL_CANONICAL_DOMAINS
    .map((id) => {
      const raw = scores[id];
      if (raw === null || raw === undefined) return { id, score: 0 };
      const num = Number(raw);
      return {
        id,
        score: Number.isFinite(num) && num > 0 ? num : 0,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, 3).map((s) => s.id);
}

/**
 * إرجاع قائمة موحدة للمجالات المختارة (بحد أقصى 3 من أدنى الدرجات المقيّمة فعلياً) مع تسميتها العربية المعتمدة،
 * لضمان تطابق بطاقة "مجالات التركيز" وخطة الـ 30 يوماً وقسم "لماذا هذه المجالات؟"
 */
export function getPrioritizedScoredDomains(
  scores: Record<string, number | null | undefined> | null | undefined
): PrioritizedDomainItem[] {
  const priorityIds = extractPriorityDomains(scores);
  return priorityIds.map((id) => {
    const rawScore = Number(scores?.[id]);
    const validScore = Number.isFinite(rawScore) && rawScore > 0 ? rawScore : 0;
    const meta = DOMAIN_META[id];
    return {
      id,
      score: validScore,
      title: meta?.title || getDomainArabicName(id),
      icon: meta?.icon || '🎯',
    };
  });
}

function buildDaysForFocusDomains(
  focusDomains: LifeAreaId[],
  existingDays?: DayPlanTask[]
): DayPlanTask[] {
  const activeDomains: LifeAreaId[] =
    Array.isArray(focusDomains) && focusDomains.length > 0
      ? focusDomains
      : ['health', 'financial', 'spiritual'];
  const days: DayPlanTask[] = [];

  for (let dayNum = 1; dayNum <= 30; dayNum++) {
    let weekNumber = 1;
    if (dayNum <= 7) weekNumber = 1;
    else if (dayNum <= 14) weekNumber = 2;
    else if (dayNum <= 21) weekNumber = 3;
    else if (dayNum <= 28) weekNumber = 4;
    else weekNumber = 5;

    const weekTitle = WEEK_INFO[weekNumber]?.title || 'خطوة جديدة';
    const domainIdx = (dayNum - 1) % activeDomains.length;
    const domainId = activeDomains[domainIdx];
    const meta = DOMAIN_META[domainId];
    const canonicalTitle = meta?.title || getDomainArabicName(domainId);
    const domainIcon = meta?.icon || '🎯';

    const suggestionsPool = DOMAIN_WEEKLY_SUGGESTIONS[domainId]?.[weekNumber] || [
      'خطوة يومية بسيطة تركز على هذا الجانب.',
      'ممارسة واعية لمدة 10 دقائق لتعزيز التوازن.',
      'تدوين ملاحظة سريعة حول ما يمكن تحسينه اليوم.',
    ];

    const prevDay = existingDays?.find((d) => d.dayNumber === dayNum);
    const sameDomain = prevDay && prevDay.domainId === domainId;
    const legacyOrListCustomTasks = sameDomain
      ? (Array.isArray(prevDay.customTasks)
          ? prevDay.customTasks
          : prevDay.customTask?.trim()
            ? [prevDay.customTask.trim()]
            : [])
      : [];

    const preservedMultiGoals =
      sameDomain && Array.isArray(prevDay.dailyGoals) && prevDay.dailyGoals.length > 1
        ? prevDay.dailyGoals.slice(0, MAX_DAILY_GOALS).map((g, idx) => ({
            ...g,
            id: g.id || `goal_${dayNum}_${idx + 1}`,
            text: localizeDomainText(g.text),
          }))
        : undefined;

    const syncedSelectedTask = sameDomain
      ? localizeDomainText(prevDay.selectedTask)
      : suggestionsPool[0];
    const syncedCustomSelected = sameDomain ? Boolean(prevDay.isCustomSelected) : false;
    const syncedCompleted = preservedMultiGoals
      ? preservedMultiGoals.every((g) => g.isCompleted)
      : sameDomain
        ? Boolean(prevDay.isCompleted)
        : false;

    const dailyGoals: DailyGoalItem[] = preservedMultiGoals || [
      {
        id: (sameDomain && prevDay.dailyGoals?.[0]?.id) || `goal_${dayNum}_1`,
        text: syncedSelectedTask,
        isCompleted: syncedCompleted,
        isCustom: syncedCustomSelected,
        completedAt: sameDomain ? prevDay.completedAt : undefined,
      },
    ];

    days.push({
      dayNumber: dayNum,
      domainId,
      domainTitle: canonicalTitle,
      domainIcon,
      weekNumber,
      weekTitle,
      defaultSuggestions: [suggestionsPool[0], suggestionsPool[1], suggestionsPool[2]],
      selectedTask: syncedSelectedTask,
      customTask: sameDomain ? (prevDay.customTask || '') : '',
      customTasks: legacyOrListCustomTasks,
      isCustomSelected: syncedCustomSelected,
      dailyGoals,
      isCompleted: syncedCompleted,
      completedAt: sameDomain ? prevDay.completedAt : undefined,
      estimatedMinutes: 10,
    });
  }

  return days;
}

export function getStoredCustomFocusDomains(): LifeAreaId[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed.filter((id): id is LifeAreaId => ALL_CANONICAL_DOMAINS.includes(id));
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveCustomFocusDomainsToStorage(domains: LifeAreaId[] | null): void {
  try {
    if (!domains || domains.length === 0) {
      localStorage.removeItem(CUSTOM_FOCUS_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOM_FOCUS_STORAGE_KEY, JSON.stringify(domains.slice(0, 3)));
    }
  } catch {
    // ignore
  }
}

/**
 * تطبيق مجالات التركيز المخصصة (أو استعادة أضعف 3 مجالات) على الخطة مع الحفاظ على المهام وحالة الإنجاز
 */
export function applyFocusDomainsToPlan(
  existingPlan: ThirtyDayPlanState,
  selectedDomains: LifeAreaId[],
  isCustomFocus: boolean
): ThirtyDayPlanState {
  const normalizedFocus = selectedDomains.slice(0, 3);
  saveCustomFocusDomainsToStorage(isCustomFocus ? normalizedFocus : null);
  const updatedDays = buildDaysForFocusDomains(normalizedFocus, existingPlan.days);
  const nextPlan: ThirtyDayPlanState = {
    ...existingPlan,
    focusDomains: normalizedFocus,
    isCustomFocus,
    days: updatedDays,
  };
  saveThirtyDayPlanToStorage(nextPlan);
  return nextPlan;
}

/**
 * توليد خطة ذكية متكاملة لـ 30 يوماً من أدنى المجالات المقيّمة فعلياً
 */
export function generateThirtyDayPlan(
  scores: Record<string, number | null | undefined>,
  overrideFocusDomains?: LifeAreaId[]
): ThirtyDayPlanState {
  const evaluatedFocus = extractPriorityDomains(scores);
  const hasOverride = Array.isArray(overrideFocusDomains) && overrideFocusDomains.length === 3;
  const focusDomains: LifeAreaId[] = hasOverride
    ? overrideFocusDomains
    : evaluatedFocus.length > 0
      ? evaluatedFocus
      : ['health', 'financial', 'spiritual'];
  const days = buildDaysForFocusDomains(focusDomains);

  // تاريخ اليوم بتنسيق عربي جميل
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const startDateStr = new Intl.DateTimeFormat('ar-EG', options).format(now);

  const newPlan: ThirtyDayPlanState = {
    createdAt: Date.now(),
    startDateStr,
    focusDomains,
    isCustomFocus: hasOverride,
    days,
    currentDay: 1,
  };

  if (!hasOverride) {
    saveCustomFocusDomainsToStorage(null);
  }
  saveThirtyDayPlanToStorage(newPlan);
  return newPlan;
}

/**
 * تحديد اليوم النشط الفعلي والأسبوع الموافق له بناءً على حالة الإنجاز:
 * يختار أول يوم غير مكتمل (أو اليوم الأخير عند اكتمال الخطة بالكامل)،
 * لمنع عرض "اليوم 1" كأنه اليوم النشط عندما تكون الأيام أو الأسابيع السابقة منجزة.
 */
export function resolveActivePlanDayAndWeek(
  plan: ThirtyDayPlanState | null | undefined
): { dayNumber: number; weekNumber: number } {
  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
    return { dayNumber: 1, weekNumber: 1 };
  }

  const firstIncomplete = plan.days.find((d) => !d.isCompleted);
  if (firstIncomplete) {
    return {
      dayNumber: firstIncomplete.dayNumber,
      weekNumber: firstIncomplete.weekNumber,
    };
  }

  const lastDay = plan.days[plan.days.length - 1];
  return {
    dayNumber: lastDay.dayNumber,
    weekNumber: lastDay.weekNumber,
  };
}

/**
 * مزامنة خطة الـ 30 يوماً مع أحدث درجات عجلة الحياة لمنع أي بيانات قديمة (Stale State)
 */
export function syncThirtyDayPlanWithScores(
  existingPlan: ThirtyDayPlanState,
  scores: Record<string, number>
): { plan: ThirtyDayPlanState; didUpdate: boolean } {
  const hasAnyEvaluatedScore = ALL_CANONICAL_DOMAINS.some((id) => {
    const num = Number(scores?.[id]);
    return Number.isFinite(num) && num > 0;
  });
  if (!hasAnyEvaluatedScore) {
    return { plan: existingPlan, didUpdate: false };
  }

  const storedCustom = getStoredCustomFocusDomains();
  const isCustomActive =
    Boolean(existingPlan.isCustomFocus) ||
    (Array.isArray(storedCustom) && storedCustom.length === 3);

  const liveFocusDomains = isCustomActive
    ? (Array.isArray(storedCustom) && storedCustom.length === 3
        ? storedCustom
        : existingPlan.focusDomains)
    : extractPriorityDomains(scores);
  const currentFocus = Array.isArray(existingPlan.focusDomains) ? existingPlan.focusDomains : [];

  const isFocusSame =
    currentFocus.length === liveFocusDomains.length &&
    currentFocus.every((id, idx) => id === liveFocusDomains[idx]) &&
    Boolean(existingPlan.isCustomFocus) === isCustomActive;

  const areDaysSynced =
    Array.isArray(existingPlan.days) &&
    existingPlan.days.length === 30 &&
    existingPlan.days.every((d) => {
      const expectedDomain = liveFocusDomains[(d.dayNumber - 1) % liveFocusDomains.length];
      return d.domainId === expectedDomain && d.domainTitle === getDomainArabicName(expectedDomain);
    });

  if (isFocusSame && areDaysSynced) {
    return { plan: existingPlan, didUpdate: false };
  }

  const updatedDays = buildDaysForFocusDomains(liveFocusDomains, existingPlan.days);
  const syncedPlan: ThirtyDayPlanState = {
    ...existingPlan,
    focusDomains: liveFocusDomains,
    isCustomFocus: isCustomActive,
    days: updatedDays,
  };

  saveThirtyDayPlanToStorage(syncedPlan);
  return { plan: syncedPlan, didUpdate: true };
}

/**
 * مسح الخطة المخزنة من localStorage عند بدء دورة تقييم أسبوعي جديدة
 */
export function clearThirtyDayPlanFromStorage(): void {
  try {
    localStorage.removeItem(PLAN_STORAGE_KEY);
    localStorage.removeItem(CUSTOM_FOCUS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * حفظ الخطة في localStorage
 */
export function saveThirtyDayPlanToStorage(plan: ThirtyDayPlanState): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch (e) {
    console.error('Failed to save 30-day plan:', e);
  }
}

/**
 * جلب الخطة المخزنة
 */
export function getStoredThirtyDayPlan(): ThirtyDayPlanState | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export interface AddThirtyDayPlanGoalResult {
  added: boolean;
  dayNumber?: number;
  alreadyExists?: boolean;
  planFull?: boolean;
  updatedPlan?: ThirtyDayPlanState;
}

/**
 * إضافة مهمة أو عادة مقترحة من الاستشارة الحرة مباشرة إلى خطة الـ 30 يوماً في localStorage
 * مع الالتزام بالحد الأقصى (MAX_DAILY_GOALS = 4) أهداف لكل يوم.
 */
export function addGoalToThirtyDayPlanStorage(
  goalText: string,
  _areaId: LifeAreaId,
  scores: Record<LifeAreaId, number>
): AddThirtyDayPlanGoalResult {
  const trimmed = goalText.trim();
  if (!trimmed) {
    return { added: false };
  }

  let plan = getStoredThirtyDayPlan();
  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
    plan = generateThirtyDayPlan(scores);
  }

  const activeDayNum = Math.min(30, Math.max(1, Number(plan.currentDay) || 1));

  // تحقق أولاً إن كانت المهمة موجودة مسبقاً في أي يوم من أيام الخطة كهدف مخصص
  const duplicateDay = plan.days.find((d) =>
    resolveDayGoals(d).some((g) => g.text.trim() === trimmed)
  );
  if (duplicateDay) {
    saveThirtyDayPlanToStorage(plan);
    return {
      added: true,
      alreadyExists: true,
      dayNumber: duplicateDay.dayNumber,
      updatedPlan: plan,
    };
  }

  // ترتيب البحث عن أول يوم متاح بسعة أقل من 4 أهداف: اليوم الحالي أولاً، ثم الأيام التالية، ثم السابقة
  const orderedDays = [
    ...plan.days.filter((d) => d.dayNumber >= activeDayNum),
    ...plan.days.filter((d) => d.dayNumber < activeDayNum),
  ];

  const targetDay = orderedDays.find((d) => resolveDayGoals(d).length < MAX_DAILY_GOALS);
  if (!targetDay) {
    return {
      added: false,
      planFull: true,
      updatedPlan: plan,
    };
  }

  const currentGoals = resolveDayGoals(targetDay);
  const newGoal: DailyGoalItem = {
    id: `consult_${targetDay.dayNumber}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: trimmed,
    isCompleted: false,
    isCustom: true,
  };

  const nextGoals = [newGoal, ...currentGoals].slice(0, MAX_DAILY_GOALS);
  const customList = nextGoals.filter((g) => g.isCustom).map((g) => g.text);
  const primaryGoal = nextGoals[0];
  const allDone = nextGoals.every((g) => g.isCompleted);

  const updatedDays = plan.days.map((d) => {
    if (d.dayNumber !== targetDay.dayNumber) return d;
    return {
      ...d,
      dailyGoals: nextGoals,
      customTasks: customList,
      customTask: customList[0] || '',
      selectedTask: primaryGoal.text,
      isCustomSelected: Boolean(primaryGoal.isCustom),
      isCompleted: allDone,
      completedAt: allDone ? d.completedAt : undefined,
    };
  });

  const updatedPlan: ThirtyDayPlanState = {
    ...plan,
    days: updatedDays,
  };

  saveThirtyDayPlanToStorage(updatedPlan);
  return {
    added: true,
    dayNumber: targetDay.dayNumber,
    updatedPlan,
  };
}

/**
 * تصدير الخطة كنص كامل للمشاركة أو النسخ بتسميات عربية موحدة بدون مفاتيح إنجليزية
 */
export function exportPlanAsText(plan: ThirtyDayPlanState): string {
  const completedCount = plan.days.filter((d) => d.isCompleted).length;
  const pct = Math.round((completedCount / 30) * 100);
  let text = `🌟 خطتي الذكية لـ \u206630\u2069 يوماً من منصة وزان\n`;
  text += `📅 موعد البدء: \u2066${plan.startDateStr}\u2069\n`;
  text += `🎯 مجالات التركيز: ${plan.focusDomains.map((id) => getDomainArabicName(id)).join('، ')}\n`;
  text += `📊 نسبة الإنجاز: \u2066${completedCount} / 30\u2069 (\u2066${pct}%\u2069)\n`;
  text += `=====================================\n\n`;

  plan.days.forEach((day) => {
    const status = day.isCompleted ? '✅ منجز' : '⏳ قيد الانتظار';
    const domainArabicTitle = getDomainArabicName(day.domainId || day.domainTitle);
    const goals = resolveDayGoals(day);
    const isolateNums = (str: string) =>
      str.replace(
        /(\d+(?:\.\d+)?\s*[\/–—-]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?)/g,
        (m) => `\u2066${m}\u2069`
      );
    text += `[اليوم \u2066${day.dayNumber} / 30\u2069] (${domainArabicTitle}) - ${status}\n`;
    if (goals.length <= 1) {
      const cleanTask = localizeDomainText(goals[0]?.text || day.selectedTask);
      text += `📌 المهمة: ${isolateNums(cleanTask)}\n\n`;
    } else {
      const doneGoals = goals.filter((g) => g.isCompleted).length;
      text += `📌 أهداف اليوم (\u2066${doneGoals} / ${goals.length}\u2069):\n`;
      goals.forEach((g, idx) => {
        const gMark = g.isCompleted ? '✅' : '⏳';
        text += `   ${idx + 1}. ${gMark} ${isolateNums(localizeDomainText(g.text))}\n`;
      });
      text += `\n`;
    }
  });

  return text;
}
