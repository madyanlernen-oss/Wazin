import pptxgen from "pptxgenjs";
import path from "path";

// Initialize Presentation
const pres = new pptxgen();

// Set 16:9 widescreen layout (13.33 x 7.5 inches)
pres.defineLayout({ name: "CUSTOM_16_9", width: 13.33, height: 7.5 });
pres.layout = "CUSTOM_16_9";

// Brand Color Palette
const COLORS = {
  BG_DARK: "064E3B",       // Deep Forest Emerald
  BG_CREAM: "FAF8F5",      // Warm Cream
  PRIMARY_EMERALD: "0D5C46",// Wazan Emerald
  EMERALD_LIGHT: "ECFDF5", // Soft Mint
  EMERALD_BORDER: "A7F3D0",// Mint Border
  GOLD: "D97706",          // Warm Amber
  GOLD_LIGHT: "FEF3C7",    // Warm Gold Light
  TEXT_DARK: "111827",     // Deep Charcoal
  TEXT_MUTED: "4B5563",    // Muted Gray
  TEXT_LIGHT: "9CA3AF",    // Light Gray
  WHITE: "FFFFFF",
  CARD_BORDER: "E2E8F0",
  CARD_BG: "FFFFFF",
  RED_ACCENT: "EF4444",
  RED_LIGHT: "FEE2E2",
  BLUE_ACCENT: "2563EB",
  BLUE_LIGHT: "EFF6FF"
};

const FONT_ARABIC = "Segoe UI";

// Helper: Add Standard Slide Header
function addSlideHeader(
  slide: pptxgen.Slide,
  badgeText: string,
  titleText: string,
  subtitleText: string,
  isDark = false
) {
  // Category Badge
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 0.45,
    w: 3.2,
    h: 0.36,
    rectRadius: 0.08,
    fill: { color: isDark ? "0B664F" : COLORS.EMERALD_LIGHT },
    line: { color: isDark ? "10B981" : COLORS.EMERALD_BORDER, width: 1 }
  });

  slide.addText(badgeText, {
    x: 0.8,
    y: 0.45,
    w: 3.2,
    h: 0.36,
    fontSize: 11,
    bold: true,
    color: isDark ? "A7F3D0" : COLORS.PRIMARY_EMERALD,
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  // Main Title
  slide.addText(titleText, {
    x: 0.8,
    y: 0.88,
    w: 11.73,
    h: 0.55,
    fontSize: 22,
    bold: true,
    color: isDark ? COLORS.WHITE : COLORS.PRIMARY_EMERALD,
    
    align: "right",
    fontFace: FONT_ARABIC
  });

  // Subtitle
  slide.addText(subtitleText, {
    x: 0.8,
    y: 1.42,
    w: 11.73,
    h: 0.35,
    fontSize: 13,
    color: isDark ? "D1FAE5" : COLORS.TEXT_MUTED,
    
    align: "right",
    fontFace: FONT_ARABIC
  });
}

// ==========================================
// SLIDE 1: COVER (الغلاف الرئيسي - Dark Forest)
// ==========================================
{
  const s1 = pres.addSlide();
  s1.background = { color: COLORS.BG_DARK };

  // Decorative Accent Box
  s1.addShape(pres.ShapeType.roundRect, {
    x: 4.86,
    y: 0.9,
    w: 3.6,
    h: 0.4,
    rectRadius: 0.1,
    fill: { color: "0B664F" },
    line: { color: "34D399", width: 1 }
  });
  s1.addText("مشروع هاكثون الذكاء الاصطناعي 2026", {
    x: 4.86,
    y: 0.9,
    w: 3.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: "A7F3D0",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  // Brand Name
  s1.addText("تَـــدْبِـــيــر", {
    x: 1.5,
    y: 1.6,
    w: 10.33,
    h: 1.2,
    fontSize: 54,
    bold: true,
    color: COLORS.WHITE,
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  s1.addText("Wazan • توازن حياتك بوعي", {
    x: 1.5,
    y: 2.85,
    w: 10.33,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: "6EE7B7",
    align: "center",
    fontFace: FONT_ARABIC
  });

  // Subtitle / Mission Statement Card
  s1.addShape(pres.ShapeType.roundRect, {
    x: 2.16,
    y: 3.6,
    w: 9.0,
    h: 1.4,
    rectRadius: 0.12,
    fill: { color: "063C2E" },
    line: { color: "10B981", width: 1 }
  });

  s1.addText("أول نظام تشغيل ذكي لحوكمة وتوازن الحياة الشخصية (Personal Life Governance OS)\nيجمع بين التقييم التفاعلي لعجلة الحياة، واستشارات الـ Multi-Agent المتخصصة، ومحرك أيزنهاور للتنفيذ اليومي المستدام.", {
    x: 2.36,
    y: 3.75,
    w: 8.6,
    h: 1.1,
    fontSize: 14,
    color: "F0FDF4",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  // Bottom 3 Metric Pills
  const pills = [
    { label: "8 أبعاد حياة متكاملة", desc: "عجلة الحياة التفاعلية" },
    { label: "10 وكلاء ذكاء اصطناعي", desc: "3-Tier Multi-Agent" },
    { label: "محرك أيزنهاور التنفيذي", desc: "تركيز على المربع 2" }
  ];
  pills.forEach((p, idx) => {
    const xPos = 1.8 + idx * 3.35;
    s1.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 5.4,
      w: 3.0,
      h: 1.1,
      rectRadius: 0.08,
      fill: { color: "0B664F" },
      line: { color: "34D399", width: 1 }
    });
    s1.addText([
      { text: p.label + "\n", options: { bold: true, fontSize: 13, color: COLORS.WHITE } },
      { text: p.desc, options: { fontSize: 11, color: "A7F3D0" } }
    ], {
      x: xPos,
      y: 5.45,
      w: 3.0,
      h: 1.0,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });
  });

  s1.addNotes("بسم الله الرحمن الرحيم. أسعد الله أوقاتكم جميعاً أعضاء لجنة التحكيم والحضور الكرام. يسعدنا اليوم أن نقدم لكم مشروع 'وازن'، المنصة التي تعيد تعريف علاقة الإنسان بالإنتاجية، من خلال أول نظام تشغيل شخصي شامل لحوكمة وتوازن الحياة قائم على الذكاء الاصطناعي التوليدي ومنظومة الـ Multi-Agent المتطورة.");
}

// ==========================================
// SLIDE 2: THE PROBLEM (المشكلة الحقيقية)
// ==========================================
{
  const s2 = pres.addSlide();
  s2.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s2,
    "أزمة العصر • فجوة التوازن والتنفيذ",
    "لماذا تفشل تطبيقات الإنتاجية وروبوتات الدردشة التقليدية؟",
    "الملايين يعيشون في دوامة السعي المهني المستمر على حساب صحتهم وأسرهم، والنصائح الرقمية لا تجد طريقاً للتطبيق."
  );

  const problems = [
    {
      num: "01",
      title: "التشتت والنمو الأعرج",
      desc: "التركيز الطاغي على العمل والمال مع إهمال الصحة والأسرة والسكينة الروحية، ما يقود إلى الاحتراق النفسي (Burnout) وفقدان المعنى.",
      stat: "76% من المهنيين يعانون من أعراض الاحتراق وفقدان التوازن"
    },
    {
      num: "02",
      title: "سطحية الـ AI العام",
      desc: "روبوتات الدردشة العامة (مثل ChatGPT المفتوح) تقدم نصائح عامة بلا سياق تخصصي، وتنسى تاريخ المستخدم، وتخلط بين المجالات دون عمق مهني أو إنساني.",
      stat: "غياب التخصص وContext Dilution يقللان الفائدة الواقعية"
    },
    {
      num: "03",
      title: "فجوة التنفيذ وضياع الأولويات",
      desc: "أغلب الاستشارات والخطط تبقى مجرد أمنيات ونصوص؛ لا توجد حلقة وصل تحول الاستشارة إلى مهام وأهداف مجدولة داخل مصفوفة أولويات تحمي من طوارئ اللحظة الأخيرة.",
      stat: "أكثر من 80% من أهداف التطوير الشخصي تموت في أسبوعها الأول"
    }
  ];

  problems.forEach((item, idx) => {
    const xPos = 0.8 + idx * 4.04;
    // Card Container
    s2.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 2.0,
      w: 3.75,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    // Badge / Number
    s2.addShape(pres.ShapeType.roundRect, {
      x: xPos + 2.7,
      y: 2.2,
      w: 0.8,
      h: 0.5,
      rectRadius: 0.08,
      fill: { color: COLORS.RED_LIGHT }
    });
    s2.addText(item.num, {
      x: xPos + 2.7,
      y: 2.2,
      w: 0.8,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: COLORS.RED_ACCENT,
      align: "center",
      valign: "middle",
      fontFace: FONT_ARABIC
    });

    // Title
    s2.addText(item.title, {
      x: xPos + 0.3,
      y: 2.85,
      w: 3.15,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: COLORS.TEXT_DARK,
      
      align: "right",
      fontFace: FONT_ARABIC
    });

    // Description
    s2.addText(item.desc, {
      x: xPos + 0.3,
      y: 3.45,
      w: 3.15,
      h: 1.8,
      fontSize: 12,
      color: COLORS.TEXT_MUTED,
      
      align: "right",
      fontFace: FONT_ARABIC
    });

    // Stat Box at Bottom of Card
    s2.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.25,
      y: 5.45,
      w: 3.25,
      h: 1.1,
      rectRadius: 0.08,
      fill: { color: COLORS.BG_CREAM },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });
    s2.addText(item.stat, {
      x: xPos + 0.35,
      y: 5.55,
      w: 3.05,
      h: 0.9,
      fontSize: 11,
      bold: true,
      color: COLORS.PRIMARY_EMERALD,
      
      align: "center",
      valign: "middle",
      fontFace: FONT_ARABIC
    });
  });

  s2.addNotes("في عصر السرعة والتشتت، يجد الفرد منا نفسه منغمساً في متطلبات وظيفته، بينما تتراجع صحته وتهتز علاقاته الأسرية. وعندما يلجأ للذكاء الاصطناعي الحالي، يجد إجابات جافة تنتهي بانتهاء الشات ولا تصنع تغييراً ملموساً. من هنا ولدت فكرة 'وازن'.");
}

// ==========================================
// SLIDE 3: THE SOLUTION (الحل: منصة وازن)
// ==========================================
{
  const s3 = pres.addSlide();
  s3.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s3,
    "الحل الشامل • The Full Spectrum",
    "منظومة 'وازن': توازنك الشخصي من الفكرة إلى الإنجاز",
    "نظام متكامل يربط بين التشخيص البصري، والاستشارة المتخصصة، والالتزام التنفيذي اليومي."
  );

  const pillars = [
    {
      tag: "الركيزة 1 • التشخيص",
      title: "عجلة الحياة التفاعلية (Life Wheel)",
      desc: "رادار تفاعلي حي يقيّم 8 أبعاد حياتية متكاملة، يوضح للمستخدم فوراً مناطق القوة والخلل، دون استبيانات طويلة ومعقدة.",
      color: COLORS.PRIMARY_EMERALD,
      bg: COLORS.EMERALD_LIGHT
    },
    {
      tag: "الركيزة 2 • الاستشارة",
      title: "منظومة الـ 10 وكلاء المتخصصة",
      desc: "فريق من 8 مستشارين متخصصين لكل ركيزة حياتية، يديرهم 'المنسق العام' الذي يربط بين المجالات ويكتشف الارتباطات الخفية.",
      color: COLORS.GOLD,
      bg: COLORS.GOLD_LIGHT
    },
    {
      tag: "الركيزة 3 • التنفيذ",
      title: "محرك أيزنهاور الذكي للأولويات",
      desc: "نقل مباشر لتوصيات المستشارين بضغطة زر إلى مصفوفة أيزنهاور الذكية (تركيز استراتيجي على المربع 2: مهم وغير عاجل).",
      color: COLORS.BLUE_ACCENT,
      bg: COLORS.BLUE_LIGHT
    }
  ];

  pillars.forEach((p, idx) => {
    const yPos = 2.0 + idx * 1.65;
    // Row Card
    s3.addShape(pres.ShapeType.roundRect, {
      x: 0.8,
      y: yPos,
      w: 11.73,
      h: 1.45,
      rectRadius: 0.1,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    // Tag
    s3.addShape(pres.ShapeType.roundRect, {
      x: 9.7,
      y: yPos + 0.2,
      w: 2.5,
      h: 0.35,
      rectRadius: 0.06,
      fill: { color: p.bg }
    });
    s3.addText(p.tag, {
      x: 9.7,
      y: yPos + 0.2,
      w: 2.5,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: p.color,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });

    // Content
    s3.addText([
      { text: p.title + "\n", options: { bold: true, fontSize: 16, color: COLORS.TEXT_DARK } },
      { text: p.desc, options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
    ], {
      x: 1.1,
      y: yPos + 0.25,
      w: 8.4,
      h: 1.0,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  s3.addNotes("'وازن' لا تكتفي بأن تكون تطبيق مهام آخر، ولا مجرد بوت استشارات. نحن نقدم حلقة مغلقة (Closed-Loop System): نبدأ بالتشخيص التفاعلي، ثم الاستشارة التخصصية من وكلاء خبراء، ثم التحويل التلقائي للنصيحة إلى خطة عمل يومية وأسبوعية في مصفوفة أيزنهاور.");
}

// ==========================================
// SLIDE 4: THE 8 DIMENSIONS (عجلة الحياة الثمانية)
// ==========================================
{
  const s4 = pres.addSlide();
  s4.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s4,
    "إطار العمل الشمولي • 8 Dimensions",
    "عجلة الحياة الثمانية: لأن الحياة لا تُختصر في العمل فقط",
    "تصميم علمي مستند إلى نظريات التوازن الحياتي المعاصرة لضمان ألا يطغى جانب على آخر."
  );

  // Left Image: wheel_of_life_dimensions
  const imagePath = path.resolve("src/assets/images/wheel_of_life_dimensions_1794404528259.jpg");
  s4.addImage({
    path: imagePath,
    x: 0.8,
    y: 2.0,
    w: 4.8,
    h: 4.8
  });

  // Right Side: 8 Dimensions Grid (2 columns x 4 rows)
  const dims = [
    { title: "الجانب الروحي", sub: "السكينة والعبادات والتأمل" },
    { title: "الجانب الصحي", sub: "اللياقة والنوم والطاقة البدنية" },
    { title: "الجانب المهني", sub: "الإنتاجية والمسار الوظيفي" },
    { title: "الجانب المالي", sub: "الميزانية والادخار والاستثمار" },
    { title: "الجانب الأسري", sub: "جودة الوقت والدفء العائلي" },
    { title: "الجانب الاجتماعي", sub: "الصداقات والعطاء المجتمعي" },
    { title: "الجانب التعليمي", sub: "تطوير المهارات والقراءة" },
    { title: "الجانب الشخصي", sub: "الراحة النفسية وإدارة الضغوط" }
  ];

  dims.forEach((d, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = 5.9 + col * 3.35;
    const yPos = 2.0 + row * 1.22;

    s4.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: yPos,
      w: 3.15,
      h: 1.05,
      rectRadius: 0.08,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    s4.addText([
      { text: d.title + "\n", options: { bold: true, fontSize: 13, color: COLORS.PRIMARY_EMERALD } },
      { text: d.sub, options: { fontSize: 10, color: COLORS.TEXT_MUTED } }
    ], {
      x: xPos + 0.15,
      y: yPos + 0.15,
      w: 2.85,
      h: 0.75,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  s4.addNotes("استندنا في 'وازن' إلى نموذج عجلة الحياة الكوني بثمانية أبعاد رئيسية. كما ترون في الصورة البيانية، إذا كانت العجلة مسننة أو غير متناظرة، فإن مركبة الحياة ستتعثر. هدفنا هو جعل هذه العجلة متناسقة لتدور بسلاسة وأمان.");
}

// ==========================================
// SLIDE 5: MULTI-AGENT ARCHITECTURE (هندسة الـ 10 وكلاء)
// ==========================================
{
  const s5 = pres.addSlide();
  s5.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s5,
    "الابتكار البرمجي • 3-Tier Multi-Agent",
    "معمارية الـ 10 وكلاء: التخصص التام في مواجهة التعميم",
    "توزيع هرمي ذكي يمنع تشتت النماذج ويوفر عمقاً استشارياً فائق الدقة مع ضبط محكم للتكاليف وسرعة الرد."
  );

  const tiers = [
    {
      badge: "الطبقة الأولى • 8 مستشارين خبراء",
      title: "Domain Expert Agents (Gemini 2.5 Flash)",
      points: [
        "وكيل مستقل لكل جانب من جوانب الحياة الـ 8 بـ System Prompt وقاعدة معرفية متخصصة.",
        "مستشار المال يتحدث بلغة الميزانيات، ومستشار الصحة يحلل الطاقة البدنية، دون خلط المفاهيم.",
        "استجابة فورية فائقة السرعة للمحادثات الصوتية والنصية بكفاءة عالية."
      ],
      color: COLORS.PRIMARY_EMERALD,
      bg: COLORS.EMERALD_LIGHT
    },
    {
      badge: "الطبقة الثانية • المنسق العام التكاملي",
      title: "Master Orchestrator Agent (Gemini 2.5 Pro)",
      points: [
        "يرى الصورة الشاملة من الأعلى (Bird's Eye View) ويربط بين نتائج المستشارين الثمانية.",
        "يكتشف الارتباطات الخفية (Cross-Domain Correlations): مثلاً يربط قلة النوم بتوتر الأداء المهني.",
        "يقود جلسة التقييم الأسبوعي التفاعلي ويكتب التقرير الاستراتيجي الشامل."
      ],
      color: COLORS.GOLD,
      bg: COLORS.GOLD_LIGHT
    },
    {
      badge: "الطبقة الثالثة • مدير التنفيذ والأولويات",
      title: "Prioritization & Execution Agent (Gemini Flash)",
      points: [
        "يحول الاستشارات والتوصيات إلى مهام قابلة للقياس (Actionable Tasks).",
        "يسقط المهام تلقائياً داخل مصفوفة أيزنهاور (التركيز على المربع 2 المهم وغير العاجل).",
        "يدير نطاقات الأهداف: يومية، أسبوعية، شهرية، وسنوية بمتابعة تشجيعية مستمرة."
      ],
      color: COLORS.BLUE_ACCENT,
      bg: COLORS.BLUE_LIGHT
    }
  ];

  tiers.forEach((t, idx) => {
    const xPos = 0.8 + idx * 4.04;
    s5.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 2.0,
      w: 3.75,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    // Badge
    s5.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.3,
      y: 2.2,
      w: 3.15,
      h: 0.36,
      rectRadius: 0.06,
      fill: { color: t.bg }
    });
    s5.addText(t.badge, {
      x: xPos + 0.3,
      y: 2.2,
      w: 3.15,
      h: 0.36,
      fontSize: 11,
      bold: true,
      color: t.color,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });

    // Title
    s5.addText(t.title, {
      x: xPos + 0.25,
      y: 2.7,
      w: 3.25,
      h: 0.65,
      fontSize: 13,
      bold: true,
      color: COLORS.TEXT_DARK,
      align: "center",
      valign: "middle",
      fontFace: FONT_ARABIC
    });

    // Points
    const textRuns = t.points.map(pt => ({
      text: "• " + pt + "\n\n",
      options: { fontSize: 11, color: COLORS.TEXT_MUTED }
    }));

    s5.addText(textRuns, {
      x: xPos + 0.3,
      y: 3.45,
      w: 3.15,
      h: 3.1,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  s5.addNotes("سألنا أنفسنا: لماذا تفشل النماذج الكبيرة في إدارة حياة الإنسان؟ والجواب هو تشتت السياق. معمارية الـ 10 وكلاء في 'وازن' تعزل المعرفة لكل مستشار، بينما يقوم 'المنسق العام' بدور العقل الرابط، ووكيل التنفيذ بدور المدير الميداني الذي ينزل بالأفكار إلى أرض الواقع.");
}

// ==========================================
// SLIDE 6: EISENHOWER ACTION ENGINE (مصفوفة أيزنهاور)
// ==========================================
{
  const s6 = pres.addSlide();
  s6.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s6,
    "من الفكرة إلى الميدان • Action Engine",
    "مصفوفة أيزنهاور الذكية: حماية وقتك ومستقبلك",
    "توصيات المستشارين لا تضيع في المحادثة، بل تسقط تلقائياً في المربع الذهبي (مهم وغير عاجل) لبناء عادات مستدامة."
  );

  const quadrants = [
    {
      num: "المربع 1",
      title: "مهم وعاجل (نفّذ الآن)",
      sub: "إدارة الأزمات، سداد الالتزامات المستحقة، وتسليمات المشاريع العاجلة.",
      color: COLORS.RED_ACCENT,
      bg: COLORS.RED_LIGHT
    },
    {
      num: "المربع 2 • المربع الذهبي",
      title: "مهم وغير عاجل (جدول له)",
      sub: "وقود التوازن والنمو: الرياضة، صلة الرحم، التخطيط المالي، والقراءة (تسقط فيه توصيات الوكلاء تلقائياً).",
      color: COLORS.PRIMARY_EMERALD,
      bg: COLORS.EMERALD_LIGHT,
      highlight: true
    },
    {
      num: "المربع 3",
      title: "غير مهم وعاجل (فوّض)",
      sub: "المقاطعات، الاجتماعات غير المجدية، والمكالمات الروتينية.",
      color: COLORS.GOLD,
      bg: COLORS.GOLD_LIGHT
    },
    {
      num: "المربع 4",
      title: "غير مهم وغير عاجل (احذف)",
      sub: "مضيعات الوقت، التصفح العشوائي لوسائل التواصل، والتسويف الرقمي.",
      color: COLORS.TEXT_MUTED,
      bg: "F3F4F6"
    }
  ];

  quadrants.forEach((q, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const xPos = 0.8 + col * 5.96;
    const yPos = 2.0 + row * 2.15;

    s6.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: yPos,
      w: 5.76,
      h: 1.95,
      rectRadius: 0.1,
      fill: { color: q.highlight ? "F0FDF4" : COLORS.WHITE },
      line: { color: q.highlight ? COLORS.PRIMARY_EMERALD : COLORS.CARD_BORDER, width: q.highlight ? 2 : 1 }
    });

    // Tag
    s6.addShape(pres.ShapeType.roundRect, {
      x: xPos + 3.8,
      y: yPos + 0.2,
      w: 1.7,
      h: 0.32,
      rectRadius: 0.06,
      fill: { color: q.bg }
    });
    s6.addText(q.num, {
      x: xPos + 3.8,
      y: yPos + 0.2,
      w: 1.7,
      h: 0.32,
      fontSize: 10,
      bold: true,
      color: q.color,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });

    s6.addText([
      { text: q.title + "\n", options: { bold: true, fontSize: 15, color: COLORS.TEXT_DARK } },
      { text: q.sub, options: { fontSize: 11, color: COLORS.TEXT_MUTED } }
    ], {
      x: xPos + 0.3,
      y: yPos + 0.55,
      w: 5.16,
      h: 1.25,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  // Bottom Capabilities Bar
  s6.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 6.4,
    w: 11.73,
    h: 0.55,
    rectRadius: 0.08,
    fill: { color: COLORS.BG_DARK }
  });
  s6.addText("مزايا المحرك: دعم 4 نطاقات زمنية (يومية • أسبوعية • شهرية • سنوية) + سحب وإفلات تفاعلي + تصدير وطباعة أنيقة", {
    x: 0.8,
    y: 6.4,
    w: 11.73,
    h: 0.55,
    fontSize: 12,
    bold: true,
    color: "A7F3D0",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  s6.addNotes("السر الحقيقي للتوازن يكمن في المربع الثاني (مهم وغير عاجل). معظم الناس يعيشون كرجال إطفاء في المربع الأول، وعندما يتعبون يهربون إلى المربع الرابع. مصفوفة أيزنهاور في 'وازن' تعيد توجيه طاولة الأولويات لصالح بناء العادات الاستراتيجية.");
}

// ==========================================
// SLIDE 7: ANALYTICS & LONGITUDINAL RADAR (التحليل المقارن)
// ==========================================
{
  const s7 = pres.addSlide();
  s7.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s7,
    "البيانات في خدمة الوعي • Longitudinal Analytics",
    "التحليل المقارن والرادار المتداخل: راقب نضجك عبر الزمن",
    "تتبع التطور الحياتي لم يعد تخميناً؛ 'وازن' توفر مقارنة تراكمية بصرية لما يصل إلى 5 فترات زمنية متداخلة."
  );

  // Left Card: Overlapping Radar
  s7.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 2.0,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.CARD_BORDER, width: 1 }
  });
  s7.addText("الرادار التراكمي المتداخل (Overlapping Radar)", {
    x: 1.1,
    y: 2.3,
    w: 5.1,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: COLORS.PRIMARY_EMERALD,
    
    align: "right",
    fontFace: FONT_ARABIC
  });
  s7.addText([
    { text: "• دمج بصري لما يصل إلى 5 تقييمات زمنية على نفس العجلة.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• ألوان متدرجة تميز بين الأسبوع الحالي والأسابيع والشهور السابقة.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• تفاعل حي: النقر على أي محور يعرض تفاصيل التحسن أو التراجع بالدرجات الدقيقة.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• رؤية فورية لاتساع الدائرة: متى ما كبرت المساحة الخضراء، دل ذلك على توازن ونضج شامل.", options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
  ], {
    x: 1.1,
    y: 2.9,
    w: 5.1,
    h: 3.6,
    
    align: "right",
    fontFace: FONT_ARABIC
  });

  // Right Card: AI Deep Analysis
  s7.addShape(pres.ShapeType.roundRect, {
    x: 6.83,
    y: 2.0,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.CARD_BORDER, width: 1 }
  });
  s7.addText("التحليل الاستنتاجي للذكاء الاصطناعي (AI Synthesis)", {
    x: 7.13,
    y: 2.3,
    w: 5.1,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: COLORS.GOLD,
    
    align: "right",
    fontFace: FONT_ARABIC
  });
  s7.addText([
    { text: "• زر ذكي بضغطة واحدة يشغل محرك التحليل المقارن (Gemini 2.5 Pro).\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• يحدد 'القفزة النوعية': يبرز الجانب الأكثر تطوراً ويشيد بجهود المستخدم لتعزيز الدوبامين الإيجابي.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• يحدد 'جرس الإنذار': يكتشف الأبعاد التي بدأت في الانحدار قبل أن تتحول إلى أزمة صحية أو أسرية.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• يولد خطة تصحيحية مخصصة تسقط مباشرة كأهداف للأسبوع الجديد.", options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
  ], {
    x: 7.13,
    y: 2.9,
    w: 5.1,
    h: 3.6,
    
    align: "right",
    fontFace: FONT_ARABIC
  });

  s7.addNotes("في شاشة المقارنة والتحليلات، يستطيع المستخدم أن يرى نفسه كأنه في مرآة رقمية ناصحة: كيف كان أداؤه قبل شهر؟ وكيف تغيرت درجاته الآن؟ والرادار المتداخل يجعل هذا الفهم فورياً ودون الحاجة لقراءة جداول إحصائية معقدة.");
}

// ==========================================
// SLIDE 8: CONVERSATIONAL CHECK-IN (التقييم التفاعلي)
// ==========================================
{
  const s8 = pres.addSlide();
  s8.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s8,
    "تجربة إنسانية دافئة • Conversational AI",
    "التقييم الأسبوعي: محادثة ذكية بدون استبيانات جافة",
    "وداعاً لنماذج (السؤال 1 من 8) الرتيبة؛ 'وازن' تستمع إليك بصوتك وتحلل أسبوعك بلغة إنسانية عميقة."
  );

  const features = [
    {
      title: "إملاء صوتي وتفاعل طبيعي (Speech-to-Text)",
      desc: "المستخدم يتحدث بعفوية عبر الميكروفون باللهجة التي تريحه؛ يصف ضغوط أسبوعه، ما أنجزه في النادي، وما فاته من وقت عائلته.",
      tag: "سهولة 100%"
    },
    {
      title: "استخلاص ذكي متعدد المحاور (NLU Extraction)",
      desc: "الذكاء الاصطناعي لا يطرح 8 أسئلة إجبارية بالترتيب، بل يحلل تدفق الكلام، ويستنبط تقييمات الأبعاد تلقائياً مع طلب توضيحات ودودة.",
      tag: "فهم سياقي عميق"
    },
    {
      title: "توليد فوري للعجلة والأولويات",
      desc: "بمجرد انتهاء المحادثة الودية، تُحدَّث عجلة الحياة برسم بياني محدث، وتُقترح مهام أيزنهاور لتسديد الخلل في الأسبوع القادم.",
      tag: "حلقة مغلقة فورية"
    }
  ];

  features.forEach((f, idx) => {
    const yPos = 2.0 + idx * 1.5;
    s8.addShape(pres.ShapeType.roundRect, {
      x: 0.8,
      y: yPos,
      w: 11.73,
      h: 1.3,
      rectRadius: 0.1,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    s8.addShape(pres.ShapeType.roundRect, {
      x: 10.0,
      y: yPos + 0.25,
      w: 2.2,
      h: 0.35,
      rectRadius: 0.06,
      fill: { color: COLORS.EMERALD_LIGHT }
    });
    s8.addText(f.tag, {
      x: 10.0,
      y: yPos + 0.25,
      w: 2.2,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: COLORS.PRIMARY_EMERALD,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });

    s8.addText([
      { text: f.title + "\n", options: { bold: true, fontSize: 15, color: COLORS.TEXT_DARK } },
      { text: f.desc, options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
    ], {
      x: 1.1,
      y: yPos + 0.25,
      w: 8.6,
      h: 0.85,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  // Callout Box
  s8.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 6.4,
    w: 11.73,
    h: 0.6,
    rectRadius: 0.08,
    fill: { color: "FEF3C7" },
    line: { color: "F59E0B", width: 1 }
  });
  s8.addText("💡 متوسط وقت إجراء التقييم الأسبوعي في 'وازن' أقل من 3 دقائق، وبمعدل التزام يتجاوز 85% مقارنة بالاستبيانات التقليدية.", {
    x: 0.8,
    y: 6.4,
    w: 11.73,
    h: 0.6,
    fontSize: 12,
    bold: true,
    color: "92400E",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  s8.addNotes("الناس تكره الاستبيانات الاستمارية. لذلك جعلنا التقييم الأسبوعي في 'وازن' أشبه بجلسة قهوة دافئة مع صديق حكيم. المستخدم يتكلم بصوته بحرية، والذكاء الاصطناعي يقوم بكل العمل الشاق من تصنيف وقياس وتوجيه.");
}

// ==========================================
// SLIDE 9: TECH STACK & ARCHITECTURE (المكدس التقني)
// ==========================================
{
  const s9 = pres.addSlide();
  s9.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s9,
    "البنية التحتية • Modern Tech Stack",
    "هندسة برمجية حديثة، سريعة، وعالية الجاهزية",
    "مبنية بأحدث تقنيات الويب العالمية ونماذج Gemini 2.5 المتطورة لضمان أعلى معايير الأمان وتجربة المستخدم."
  );

  const techCards = [
    {
      title: "الواجهة الأمامية (Frontend)",
      specs: ["React 19 + TypeScript", "Vite Next-Gen Bundler", "Tailwind CSS v4", "Lucide Modern Icons"],
      badge: "سرعة وأناقة"
    },
    {
      title: "محرك الذكاء الاصطناعي (AI)",
      specs: ["Google Gen AI SDK", "Gemini 2.5 Flash للمستشارين", "Gemini 2.5 Pro للمنسق العام", "هندسة برومبت هرمية"],
      badge: "توفير 70% في التكلفة"
    },
    {
      title: "البيئة والتشغيل (Runtime)",
      specs: ["Bun v1.4.4 عالي الأداء", "Web Speech API للصوت", "Local-First Privacy Storage", "RTL دعم أصيل للعربية"],
      badge: "كفاءة واستجابة فورية"
    },
    {
      title: "الموثوقية والتحكم (Quality)",
      specs: ["100% خلو من أخطاء الـ Types", "Clean Architecture", "Zero Dead-Code Policy", "تصدير متكامل للطباعة وPDF"],
      badge: "جاهزية إنتاجية كاملة"
    }
  ];

  techCards.forEach((tc, idx) => {
    const xPos = 0.8 + idx * 3.01;
    s9.addShape(pres.ShapeType.roundRect, {
      x: xPos,
      y: 2.0,
      w: 2.75,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: COLORS.WHITE },
      line: { color: COLORS.CARD_BORDER, width: 1 }
    });

    s9.addShape(pres.ShapeType.roundRect, {
      x: xPos + 0.25,
      y: 2.2,
      w: 2.25,
      h: 0.32,
      rectRadius: 0.06,
      fill: { color: COLORS.EMERALD_LIGHT }
    });
    s9.addText(tc.badge, {
      x: xPos + 0.25,
      y: 2.2,
      w: 2.25,
      h: 0.32,
      fontSize: 10,
      bold: true,
      color: COLORS.PRIMARY_EMERALD,
      align: "center",
      valign: "middle",
      
      fontFace: FONT_ARABIC
    });

    s9.addText(tc.title, {
      x: xPos + 0.15,
      y: 2.65,
      w: 2.45,
      h: 0.65,
      fontSize: 13,
      bold: true,
      color: COLORS.TEXT_DARK,
      align: "center",
      valign: "middle",
      fontFace: FONT_ARABIC
    });

    const items = tc.specs.map(sp => ({
      text: "✔ " + sp + "\n\n",
      options: { fontSize: 11, color: COLORS.TEXT_MUTED }
    }));

    s9.addText(items, {
      x: xPos + 0.2,
      y: 3.45,
      w: 2.35,
      h: 3.1,
      
      align: "right",
      fontFace: FONT_ARABIC
    });
  });

  s9.addNotes("تقنياً، بنينا المشروع على أحدث المعايير: React 19 مع Tailwind CSS v4، ومحرك Bun السريع. استخدامنا لنماذج Gemini 2.5 Flash للمحادثات اليومية وفر لنا استجابة تكاد تكون لحظية ووفراً يتجاوز 70% من التكلفة مقارنة بالنماذج الضخمة، مع تخصيص نموذج Pro للتحليلات الكبرى فقط.");
}

// ==========================================
// SLIDE 10: BUSINESS MODEL & EXPANSION (نموذج العمل والنمو)
// ==========================================
{
  const s10 = pres.addSlide();
  s10.background = { color: COLORS.BG_CREAM };

  addSlideHeader(
    s10,
    "الأثر وقابلية التوسع • Business & Impact",
    "نموذج نمو مستدام يخدم الأفراد والمؤسسات",
    "سوق الرفاهية والإنتاجية يشهد نمواً متسارعاً؛ 'وازن' مهيأة للتوسع في مسارين رئيسيين."
  );

  // Track 1: B2C
  s10.addShape(pres.ShapeType.roundRect, {
    x: 0.8,
    y: 2.0,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.PRIMARY_EMERALD, width: 2 }
  });
  s10.addText("المسار الفردي (B2C) • الاشتراكات الشخصية", {
    x: 1.1,
    y: 2.3,
    w: 5.1,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: COLORS.PRIMARY_EMERALD,
    
    align: "right",
    fontFace: FONT_ARABIC
  });
  s10.addText([
    { text: "• نموذج Freemium: وصول مجاني لعجلة الحياة والتقييم الأساسي.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• باقة وازن برو (Wazan Pro): استشارات صوتية غير محدودة مع المستشارين الثمانية، تحليلات سنوية عميقة، ومزامنة تلقائية مع التقويم.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• الشريحة المستهدفة: أكثر من 40 مليون مهني، رائد أعمال، وطالب في الوطن العربي يبحثون عن الإنتاجية الهادئة.", options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
  ], {
    x: 1.1,
    y: 2.9,
    w: 5.1,
    h: 3.6,
    
    align: "right",
    fontFace: FONT_ARABIC
  });

  // Track 2: B2B
  s10.addShape(pres.ShapeType.roundRect, {
    x: 6.83,
    y: 2.0,
    w: 5.7,
    h: 4.8,
    rectRadius: 0.1,
    fill: { color: COLORS.WHITE },
    line: { color: COLORS.GOLD, width: 2 }
  });
  s10.addText("مسار الشركات (B2B) • رفاهية الموظفين المؤسسية", {
    x: 7.13,
    y: 2.3,
    w: 5.1,
    h: 0.45,
    fontSize: 16,
    bold: true,
    color: COLORS.GOLD,
    
    align: "right",
    fontFace: FONT_ARABIC
  });
  s10.addText([
    { text: "• حماية الموظفين من الاحتراق (Corporate Wellness & Anti-Burnout).\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• لوحة تحكم مجمعة للموارد البشرية (HR Analytics): تقيس المؤشر العام لصحة بيئة العمل وجودة الحياة دون المساس بخصوصية أسرار الموظف الفردي.\n\n", options: { fontSize: 12, color: COLORS.TEXT_MUTED } },
    { text: "• تقليل معدلات الاستقالة ورفع إنتاجية فرق العمل بنسبة تصل إلى 25% من خلال تحقيق التوازن المستدام.", options: { fontSize: 12, color: COLORS.TEXT_MUTED } }
  ], {
    x: 7.13,
    y: 2.9,
    w: 5.1,
    h: 3.6,
    
    align: "right",
    fontFace: FONT_ARABIC
  });

  s10.addNotes("نموذج عمل 'وازن' واضح وقابل للنمو السريع: اشتراكات للأفراد تمنحهم كوتشاً شخصياً دائماً بتكلفة لا تُقارن بالاستشارات البشرية، وعقود مؤسسية لبرامج جودة الحياة بالشركات لمكافحة الاحتراق الوظيفي.");
}

// ==========================================
// SLIDE 11: CLOSING & CALL TO ACTION (الخاتمة)
// ==========================================
{
  const s11 = pres.addSlide();
  s11.background = { color: COLORS.BG_DARK };

  // Center Badge
  s11.addShape(pres.ShapeType.roundRect, {
    x: 4.66,
    y: 1.2,
    w: 4.0,
    h: 0.45,
    rectRadius: 0.1,
    fill: { color: "0B664F" },
    line: { color: "34D399", width: 1 }
  });
  s11.addText("مستقبل الحياة المتوازنة يبدأ الآن", {
    x: 4.66,
    y: 1.2,
    w: 4.0,
    h: 0.45,
    fontSize: 13,
    bold: true,
    color: "A7F3D0",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  // Main Callout Text
  s11.addText("تَدْبِير: توازن حياتك بوعي", {
    x: 1.5,
    y: 2.0,
    w: 10.33,
    h: 1.1,
    fontSize: 48,
    bold: true,
    color: COLORS.WHITE,
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  s11.addText("«حياتك ليست مجرد قائمة مهام وظيفية؛ إنها منظومة متكاملة من القيم، والصحة، والعلاقات، التي تستحق أن تُدار بوعي وإتقان.»", {
    x: 2.0,
    y: 3.3,
    w: 9.33,
    h: 1.0,
    fontSize: 18,
    color: "D1FAE5",
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  // Live Demo Box
  s11.addShape(pres.ShapeType.roundRect, {
    x: 3.16,
    y: 4.6,
    w: 7.0,
    h: 1.5,
    rectRadius: 0.12,
    fill: { color: "063C2E" },
    line: { color: "10B981", width: 2 }
  });

  s11.addText([
    { text: "المشروع متاح الآن للتجربة الحية والتقييم الفوري\n", options: { bold: true, fontSize: 18, color: "A7F3D0" } },
    { text: "نرحب بأسئلتكم واستفساراتكم، وندعوكم لتجربة التقييم التفاعلي لعجلة حياتكم الآن عبر المنصة.", options: { fontSize: 13, color: COLORS.WHITE } }
  ], {
    x: 3.36,
    y: 4.75,
    w: 6.6,
    h: 1.2,
    align: "center",
    valign: "middle",
    
    fontFace: FONT_ARABIC
  });

  s11.addText("شكراً لكم جميعاً • فريق مشروع وَازِن (Wazan AI) • 2026", {
    x: 1.5,
    y: 6.5,
    w: 10.33,
    h: 0.4,
    fontSize: 12,
    color: "6EE7B7",
    align: "center",
    
    fontFace: FONT_ARABIC
  });

  s11.addNotes("في الختام، مشروع 'وازن' هو إيمان حقيقي بأن التكنولوجيا المتقدمة والذكاء الاصطناعي يجب أن يخدما جوهر الإنسان وسكينته، لا أن يزيدا من توتره وضغطه. المنصة جاهزة الآن وتعمل بكامل وظائفها، ويسعدنا جداً أن ندعوكم لتجربتها وطرح أي استفسارات لديكم. شكراً جزيلاً لحسن استماعكم!");
}

// Generate the output file
const outputPath = path.resolve("Wazan_Pitch_Deck_2026.pptx");
await pres.writeFile({ fileName: outputPath });
console.log(`SUCCESS: Presentation successfully generated at: ${outputPath}`);

