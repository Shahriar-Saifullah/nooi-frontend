// Translation dictionary, sourced from the client-provided
// NOOI_English_Arabic__Translation.docx (Page 1 — Home).
//
// Scope note: only the Home (/) page is translated so far. The other pages
// covered in the client's docx (About, Marketplace, Home Planner, Design
// Studio) and the authenticated app screens (dashboard, canvas) are not yet
// wired up — see lib/i18n/README.md for how to extend this.

export type Language = "en" | "ar";

export const homeTranslations = {
  nav: {
    products: { en: "Products", ar: "المنتجات" },
    about:    { en: "About",    ar: "من نحن" },
    pricing:  { en: "Pricing",  ar: "الأسعار" },
    login:    { en: "Log in",   ar: "تسجيل الدخول" },
    startFree:{ en: "Start for free", ar: "ابدأ مجانًا" },
  },

  hero: {
    badge: {
      en: "New: Drag & drop workflow builder",
      ar: "جديد: منشئ سير عمل بالسحب والإفلات",
    },
    headlineLine1: { en: "Design, Plan, Furniture get", ar: "صمّم وخطّط واحصل على الأثاث" },
    headlineLine2: { en: "All in One Platform.", ar: "كل ذلك في منصة واحدة." },
    subtext: {
      en: "NOOI makes stunning 2D/3D visuals, accurate floor plans, and seamless logistics simple for architects, designers, and developers.",
      ar: "تجعل NOOI إنشاء تصوّرات ثنائية وثلاثية الأبعاد مذهلة، ومخططات أرضية دقيقة، وخدمات لوجستية سلسة أمرًا بسيطًا للمهندسين المعماريين والمصممين والمطورين.",
    },
    promptPlaceholder: {
      en: "Describe the room or design you want to create",
      ar: "صِف الغرفة أو التصميم الذي تريد إنشاءه",
    },
    buildNow: { en: "Build Now", ar: "ابدأ البناء الآن" },
  },

  productFeatures: {
    sectionLabel: { en: "Our Product Features", ar: "مزايا منتجاتنا" },
    description: {
      en: "From sketch to furniture delivery, Nooi's AI tools help you design, visualize, and build dream spaces—effortlessly turning ideas into reality with simplicity.",
      ar: "من الرسم الأولي إلى تسليم الأثاث، تساعدك أدوات Nooi المدعومة بالذكاء الاصطناعي على تصميم مساحات الأحلام وتصوّرها وبنائها، وتحويل الأفكار إلى واقع بسهولة وبساطة.",
    },
    cards: {
      roomPlanner:    { en: "Room Planner",     ar: "مخطط الغرف" },
      aiHomePlanner:  { en: "AI Home Planner",  ar: "مخطط المنزل بالذكاء الاصطناعي" },
      kitchenPlanner: { en: "Kitchen Planner",  ar: "مخطط المطبخ" },
    },
    viewAllDesign: { en: "View All Design", ar: "عرض كل التصاميم" },
  },

  keyFeatures: {
    badge: {
      en: "New: Drag & drop workflow builder",
      ar: "جديد: منشئ سير عمل بالسحب والإفلات",
    },
    sectionLabel: { en: "Key Features", ar: "المزايا الرئيسية" },
    description: {
      en: "Drag and drop furniture, décor, and finishes. Instantly adjust lighting, colors, and textures with a real-time interface that makes interior design feel truly effortless.",
      ar: "اسحب وأفلت الأثاث والديكور والتشطيبات. عدّل الإضاءة والألوان والخامات فورًا من خلال واجهة تعمل في الوقت الفعلي وتجعل التصميم الداخلي سهلًا حقًا.",
    },
    items: {
      aiFloorPlanner: {
        heading: { en: "AI Floor and Home Planner", ar: "مخطط الأرضيات والمنازل بالذكاء الاصطناعي" },
        copy: {
          en: "Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D.",
          ar: "ارفع صورة، أو ارسم من البداية، أو دع الذكاء الاصطناعي لدينا يتولى العمل الشاق. حوّل الفكرة الأولية فورًا إلى مخططات أرضية نظيفة وقابلة للتحرير ثنائية أو ثلاثية الأبعاد.",
        },
      },
      realTimeDesign: {
        heading: { en: "Real-Time Interior Design", ar: "تصميم داخلي في الوقت الفعلي" },
        copy: {
          en: "Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D.",
          ar: "ارفع صورة، أو ارسم من البداية، أو دع الذكاء الاصطناعي لدينا يتولى العمل الشاق. حوّل الفكرة الأولية فورًا إلى مخططات أرضية نظيفة وقابلة للتحرير ثنائية أو ثلاثية الأبعاد.",
        },
      },
      orderFromDesign: {
        heading: { en: "Order from Design", ar: "الطلب من التصميم" },
        copy: {
          en: "Upload an image, sketch from scratch, or let our AI do the heavy lifting. Instantly turn a rough idea into clean, editable floor plans in 2D or 3D.",
          ar: "ارفع صورة، أو ارسم من البداية، أو دع الذكاء الاصطناعي لدينا يتولى العمل الشاق. حوّل الفكرة الأولية فورًا إلى مخططات أرضية نظيفة وقابلة للتحرير ثنائية أو ثلاثية الأبعاد.",
        },
      },
    },
  },

  howItWorks: {
    sectionLabel: { en: "How it Works", ar: "آلية العمل" },
    description: {
      en: "Automated floor plan generation with AI with Realistic 3D rendering & design visualization.",
      ar: "إنشاء مخططات أرضية تلقائيًا بالذكاء الاصطناعي مع تصيير ثلاثي الأبعاد واقعي وتصور للتصميم.",
    },
    stepLabel: { en: "Step", ar: "الخطوة" }, // used as "Step 1", "Step 2", etc.
    steps: {
      step1: {
        title: { en: "Start with your space", ar: "ابدأ بمساحتك" },
        description: {
          en: "Bring in your own floor plan or sketch it quickly online no complex tools, just a clean starting point. Bring in your own floor plan or sketch it quickly online no complex tools, just a clean starting point.",
          ar: "أضف مخططك الأرضي الخاص أو ارسمه بسرعة عبر الإنترنت؛ من دون أدوات معقدة، فقط نقطة بداية واضحة.",
        },
        miniTitle: { en: "Upload or Sketch", ar: "ارفع مخططًا أو ارسمه" },
        miniDesc: {
          en: "Turn rough ideas into editable 2D/3D layouts instantly. Our AI cleans up drawings and prepares them for design.",
          ar: "حوّل الأفكار الأولية فورًا إلى تخطيطات ثنائية وثلاثية الأبعاد قابلة للتحرير. ينظّف الذكاء الاصطناعي لدينا الرسومات ويجهّزها للتصميم.",
        },
        btnText: { en: "View All Step", ar: "عرض كل الخطوات" },
      },
      // Steps 2-4 weren't individually itemized in the client's docx beyond
      // step 1 — reuse the same "View All Step"-style CTA pattern but keep
      // English copy for these until the client provides translations.
      step2: {
        title: { en: "Style in seconds", ar: "نسّق المساحة في ثوانٍ" },
        description: {
          en: "Let AI suggest layouts, furniture placement, and flow so you never start with a blank canvas.",
          ar: "دع الذكاء الاصطناعي يقترح التخطيطات وترتيب الأثاث وتدفق الحركة حتى لا تبدأ أبدًا من لوحة فارغة.",
        },
        miniTitle: { en: "Smart AI Design", ar: "تصميم ذكي بالذكاء الاصطناعي" },
        miniDesc: {
          en: "Generate layouts that fit your space and style in just a click. Edit and customize until it feels like home.",
          ar: "أنشئ تخطيطات تناسب مساحتك وأسلوبك بنقرة واحدة. عدّل وخصّص حتى تشعر وكأنها منزلك.",
        },
        btnText: { en: "Try AI Design", ar: "جرّب التصميم بالذكاء الاصطناعي" },
      },
      step3: {
        title: { en: "Shop the look you create", ar: "تسوّق المظهر الذي صممته" },
        description: {
          en: "Drag in real furniture and décor, then order the exact items—straight from your design.",
          ar: "اسحب قطع أثاث وديكور حقيقية، ثم اطلب القطع نفسها مباشرة من تصميمك.",
        },
        miniTitle: { en: "Furnish With Confidence", ar: "أثّث بثقة" },
        miniDesc: {
          en: "Everything you see is a real product. No mismatches, no guesswork—just one click to bring it home.",
          ar: "كل ما تراه منتج حقيقي. لا تعارض ولا تخمين، فقط نقرة واحدة لإحضاره إلى منزلك.",
        },
        btnText: { en: "Browse Furnitures", ar: "تصفّح الأثاث" },
      },
      step4: {
        title: { en: "From screen to doorstep", ar: "من الشاشة إلى باب منزلك" },
        description: {
          en: "Your design isn't just virtual—we deliver every piece straight to you",
          ar: "تصميمك ليس افتراضيًا فقط — نوصل كل قطعة إليك مباشرة",
        },
        miniTitle: { en: "Track Your Order", ar: "تتبّع طلبك" },
        miniDesc: {
          en: "Follow your delivery in real-time, from checkout to doorstep. Designed, ordered, and received—without hassle.",
          ar: "تابع توصيل طلبك في الوقت الفعلي، من إتمام الشراء إلى باب منزلك. صُمم، طُلب، واستُلم دون أي عناء.",
        },
        btnText: { en: "Order from Design", ar: "اطلب من التصميم" },
      },
    },
  },

  gallery: {
    sectionLabel: { en: "Explore Our Gallery", ar: "استكشف معرضنا" },
    description: {
      en: "Automated floor plan generation with AI with Realistic 3D rendering & design visualization.",
      ar: "إنشاء مخططات أرضية تلقائيًا بالذكاء الاصطناعي مع تصيير ثلاثي الأبعاد واقعي وتصور للتصميم.",
    },
    filters: {
      all:         { en: "All",          ar: "الكل" },
      livingRoom:  { en: "Living room",  ar: "غرفة المعيشة" },
      diningRoom:  { en: "Dining Room",  ar: "غرفة الطعام" },
      kitchen:     { en: "Kitchen",      ar: "المطبخ" },
      furniture:   { en: "Furniture",    ar: "الأثاث" },
      others:      { en: "Others",       ar: "أخرى" },
    },
    viewMore: { en: "View more", ar: "عرض المزيد" }, // used as "View more [4]"
  },

  whyChoose: {
    sectionLabel: { en: "Why Choose NOOI", ar: "لماذا تختار NOOI" },
    description: {
      en: "Automated floor plan generation with AI with Realistic 3D rendering & design visualization.",
      ar: "إنشاء مخططات أرضية تلقائيًا بالذكاء الاصطناعي مع تصيير ثلاثي الأبعاد واقعي وتصور للتصميم.",
    },
    reasons: {
      expertTools: {
        title: { en: "Expert-Level Tools, Beginner-Friendly Interface", ar: "أدوات بمستوى الخبراء وواجهة مناسبة للمبتدئين" },
        desc: {
          en: "Powerful enough for professionals, intuitive enough for beginners. Nooi's clean interface makes advanced design tools easy to use from day one.",
          ar: "قوية بما يكفي للمحترفين وبديهية بما يكفي للمبتدئين. تجعل واجهة Nooi النظيفة أدوات التصميم المتقدمة سهلة الاستخدام منذ اليوم الأول.",
        },
      },
      allInOne:       { title: { en: "All-in-One Platform",      ar: "منصة شاملة في مكان واحد" } },
      realWorld:      { title: { en: "Real-World Integration",   ar: "تكامل مع الواقع العملي" } },
      trusted:        { title: { en: "Trusted by Professionals", ar: "موثوق من المحترفين" } },
      accuracySpeed:  { title: { en: "Accuracy & Speed",         ar: "الدقة والسرعة" } },
    },
  },

  unlockCta: {
    headlineLine1: { en: "Unlock Your Dream", ar: "أطلق العنان لمنزل" },
    headlineLine2: { en: "Home Today!",       ar: "أحلامك اليوم!" },
    subtext: {
      en: "Now design, visualize, and build your dream home/rooms with just few clicks.",
      ar: "صمّم منزل أحلامك أو غرفك الآن، وتخيّلها وابنِها ببضع نقرات فقط.",
    },
    startTrial: { en: "Start Free Trial", ar: "ابدأ التجربة المجانية" },
    bookDemo:   { en: "Book a Demo",      ar: "احجز عرضًا توضيحيًا" },
  },

  footer: {
    tagline: {
      en: "Empowering the next generation of interior designers with AI-driven tools for visionaries.",
      ar: "نمكّن الجيل القادم من مصممي التصميم الداخلي بأدوات مدعومة بالذكاء الاصطناعي لأصحاب الرؤى.",
    },
    emailPlaceholder: { en: "Enter your email", ar: "أدخل بريدك الإلكتروني" },
    subscribe:        { en: "Subscribe", ar: "اشترك" },
    productHeading:   { en: "Product", ar: "المنتج" },
    productLinks: {
      roomPlanner:    { en: "Room Planner",    ar: "مخطط الغرف" },
      aiHomePlanner:  { en: "AI Home Planner", ar: "مخطط المنزل بالذكاء الاصطناعي" },
      kitchenPlanner: { en: "Kitchen Planner", ar: "مخطط المطبخ" },
      pricing:        { en: "Pricing",         ar: "الأسعار" },
    },
    companyHeading: { en: "Company", ar: "الشركة" },
    companyLinks: {
      aboutUs:  { en: "About Us", ar: "من نحن" },
      blog:     { en: "Blog",     ar: "المدونة" },
      careers:  { en: "Careers",  ar: "الوظائف" },
      privacy:  { en: "Privacy",  ar: "الخصوصية" },
    },
    resourcesHeading: { en: "Resources", ar: "الموارد" },
    resourcesLinks: {
      documentation: { en: "Documentation", ar: "الوثائق" },
      community:     { en: "Community",     ar: "المجتمع" },
      support:       { en: "Support",       ar: "الدعم" },
      blog:          { en: "Blog",          ar: "المدونة" },
    },
    legal:    { en: "© 2026 NOOI Inc. All rights reserved.", ar: "© 2026 شركة NOOI. جميع الحقوق محفوظة." },
    language: { en: "English", ar: "العربية" },
  },
} as const;

// ─── Design Studio page (/design-studio) ──────────────────────────────────
export const designStudioTranslations = {
  hero: {
    badge:        { en: "New Feature · Intelligent 3D Rendering Engine", ar: "ميزة جديدة · محرك تصيير ثلاثي الأبعاد ذكي" },
    headlineLine1:{ en: "Your Professional",                             ar: "استوديو التصميم الداخلي" },
    headlineLine2:{ en: "Interior Design Studio",                        ar: "الاحترافي الخاص بك" },
    subtext:      { en: "From rough sketch to photorealistic render in minutes. Nooi Studio combines precise 2D planning with immersive 3D visualization.", ar: "من رسم أولي إلى تصيير واقعي خلال دقائق. يجمع Nooi Studio بين التخطيط ثنائي الأبعاد الدقيق والتصوّر ثلاثي الأبعاد الغامر." },
    openStudio:   { en: "Open Studio",      ar: "افتح الاستوديو" },
    watchWorkflow:{ en: "Watch Workflow",   ar: "شاهد سير العمل" },
  },

  workflow: {
    label:   { en: "Premium Workflow",    ar: "سير عمل احترافي" },
    heading: { en: "From Concept to Reality", ar: "من الفكرة إلى الواقع" },
    body:    { en: "Our unified platform handles every stage of the design process, ensuring your vision is preserved from the first line to the final render.", ar: "تتولى منصتنا الموحّدة كل مرحلة من مراحل عملية التصميم لضمان الحفاظ على رؤيتك من أول خط إلى آخر تصيير." },

    phase1: {
      tag:     { en: "Phase 01",              ar: "المرحلة 01" },
      badge:   { en: "Auto-Dimension",        ar: "أبعاد تلقائية" },
      badgeSub:{ en: "Precise to 1mm",        ar: "دقة حتى 1 مم" },
      heading: { en: "Precision 2D Planning", ar: "تخطيط ثنائي الأبعاد دقيق" },
      body:    { en: "Start with an intelligent 2D canvas. Import existing blueprints or sketch freely. Our smart wall detection automatically closes loops and suggests room types.", ar: "ابدأ بلوحة ثنائية الأبعاد ذكية. استورد المخططات الحالية أو ارسم بحرية. يكتشف نظام الجدران الذكي لدينا الحلقات ويغلقها تلقائيًا ويقترح أنواع الغرف." },
      feat1:   { en: "Import PDF/CAD files instantly",   ar: "استورد ملفات PDF/CAD فورًا" },
      feat2:   { en: "Smart snapping & auto-alignment",  ar: "التقاط ذكي ومحاذاة تلقائية" },
      feat3:   { en: "Real-time area calculation",       ar: "حساب المساحة في الوقت الفعلي" },
      cta:     { en: "Explore 2D Tools",                 ar: "استكشف الأدوات ثنائية الأبعاد" },
    },

    phase2: {
      tag:     { en: "Phase 02",                   ar: "المرحلة 02" },
      badge:   { en: "AI Lighting",                ar: "إضاءة بالذكاء الاصطناعي" },
      badgeSub:{ en: "Auto-generated ambiance",    ar: "أجواء مولدة تلقائيًا" },
      heading: { en: "Immersive 3D Visualization", ar: "تصور ثلاثي الأبعاد غامر" },
      body:    { en: "Switch to 3D with a single click. Walk through your design in real-time. Apply textures, change lighting, and see how sunlight interacts with your space throughout the day.", ar: "انتقل إلى العرض ثلاثي الأبعاد بنقرة واحدة. تجوّل في تصميمك في الوقت الفعلي. طبّق الخامات، وغيّر الإضاءة، وشاهد كيف يتفاعل ضوء الشمس مع مساحتك طوال اليوم." },
      feat1:   { en: "One-click 2D to 3D conversion", ar: "تحويل من ثنائي الأبعاد إلى ثلاثي الأبعاد بنقرة واحدة" },
      feat2:   { en: "4K Photorealistic Rendering",    ar: "تصيير واقعي بدقة 4K" },
      feat3:   { en: "VR Headset Compatible",          ar: "متوافق مع نظارات الواقع الافتراضي" },
      cta:     { en: "Explore 3D Engine",              ar: "استكشف محرك العرض ثلاثي الأبعاد" },
    },
  },

  ai: {
    label:        { en: "Nooi AI Assistant",  ar: "مساعد Nooi الذكي" },
    headlineLine1:{ en: "Stuck on layout?",   ar: "علقت في التخطيط؟" },
    headlineLine2:{ en: "Ask the AI.",         ar: "اسأل الذكاء الاصطناعي." },
    body:         { en: "Our AI understands design principles and can populate empty rooms with curated furniture sets in seconds.", ar: "يفهم الذكاء الاصطناعي لدينا مبادئ التصميم ويمكنه ملء الغرف الفارغة بمجموعات أثاث منتقاة خلال ثوانٍ." },
    styleTransfer:{ en: "Style Transfer",     ar: "نقل الأسلوب" },
    styleDesc:    { en: "Upload an inspiration photo and let AI apply the style to your room.", ar: "ارفع صورة إلهام ودع الذكاء الاصطناعي يطبّق الأسلوب على غرفتك." },
    optimized:    { en: "Optimized Layouts",  ar: "تخطيطات محسّنة" },
    optimizedDesc:{ en: "AI suggests furniture arrangements based on flow and usage.", ar: "يقترح الذكاء الاصطناعي ترتيبات أثاث بناءً على الحركة والاستخدام." },
    suggestionLabel: { en: "Nooi AI Suggestion", ar: "اقتراح Nooi الذكي" },
    suggestionText:  { en: "Based on your room dimensions (24m²), here are 3 optimal layouts for a home office + guest room hybrid.", ar: "بناءً على أبعاد غرفتك (24 م²)، إليك 3 تخطيطات مثالية لمساحة هجينة تجمع بين مكتب منزلي وغرفة ضيوف." },
    layoutA:      { en: "Layout A: Corner Desk",   ar: "التخطيط أ: مكتب زاوي" },
    layoutB:      { en: "Layout B: Center Focus",  ar: "التخطيط ب: تركيز مركزي" },
    applyLayout:  { en: "Apply Layout A",          ar: "طبّق التخطيط أ" },
  },

  library: {
    heading:      { en: "Unlimited Furniture Library", ar: "مكتبة أثاث غير محدودة" },
    body:         { en: "Access over 50,000+ real-world furniture items, textures, and materials. Drag, drop, and customize.", ar: "احصل على أكثر من 50,000 عنصر أثاث واقعي وخامة ومواد. اسحب وأفلت وخصّص." },
    cta:          { en: "Browse Catalog",              ar: "تصفّح الكتالوج" },
  },

  export: {
    heading:      { en: "Export to Reality",    ar: "التصدير إلى الواقع" },
    body:         { en: "Generate shopping lists, cut sheets, and contractor blueprints automatically.", ar: "أنشئ قوائم تسوق، وجداول قص، ومخططات للمقاولين تلقائيًا." },
    cta:          { en: "View Sample Output",   ar: "عرض نموذج للمخرجات" },
  },

  cta: {
    heading:    { en: "Ready to design your dream space?", ar: "هل أنت مستعد لتصميم مساحة أحلامك؟" },
    body:       { en: "Join thousands of architects, Interior designers, and homeowners using Nooi Studio today.", ar: "انضم إلى آلاف المهندسين المعماريين ومصممي التصميم الداخلي وأصحاب المنازل الذين يستخدمون Nooi Studio اليوم." },
    startTrial: { en: "Start Free Trial",   ar: "ابدأ التجربة المجانية" },
    bookDemo:   { en: "Book a Demo",        ar: "احجز عرضًا توضيحيًا" },
  },

  footer: {
    tagline:      { en: "Subscribe to the Nooi weekly and enjoy the latest interior design styles in one newsletter, with worldwide delivery.", ar: "اشترك في نشرة Nooi الأسبوعية واستمتع بأحدث أنماط التصميم الداخلي في رسالة إخبارية واحدة، مع توصيل عالمي." },
    emailPlaceholder: { en: "Enter your email", ar: "أدخل بريدك الإلكتروني" },
    subscribe:    { en: "Subscribe",            ar: "اشترك" },
    windowsApp:   { en: "Get Nooi Windows App", ar: "احصل على تطبيق Nooi لويندوز" },
    macApp:       { en: "Nooi Mac App",         ar: "تطبيق Nooi لماك" },
    productHeading: { en: "Product",            ar: "المنتج" },
    productLinks: {
      floorPlanner:  { en: "Floor Planner",           ar: "مخطط الأرضيات" },
      interiorDesign:{ en: "Interior Design",         ar: "التصميم الداخلي" },
      kitchenCloset: { en: "Kitchen & Closet Design", ar: "تصميم المطابخ والخزائن" },
      viewer3d:      { en: "3D Viewer",               ar: "عارض ثلاثي الأبعاد" },
      customFurniture:{ en: "Custom Furniture",       ar: "أثاث مخصص" },
    },
    companyHeading: { en: "Company",            ar: "الشركة" },
    companyLinks: {
      aboutUs:   { en: "About us",         ar: "من نحن" },
      contact:   { en: "Contact us",       ar: "اتصل بنا" },
      affiliate: { en: "Affiliate program",ar: "برنامج الشركاء" },
      careers:   { en: "Careers",          ar: "الوظائف" },
    },
    resourcesHeading: { en: "Resources",        ar: "الموارد" },
    resourcesLinks: {
      designIdeas:{ en: "Home Design Ideas", ar: "أفكار تصميم المنزل" },
      tutorial:   { en: "Tutorial",          ar: "الدروس التعليمية" },
      helpCenter: { en: "Help center",       ar: "مركز المساعدة" },
      app:        { en: "Nooi app",          ar: "تطبيق Nooi" },
    },
    legal:    { en: "© 2026 Nooi, Inc. All rights reserved.", ar: "© 2026 شركة Nooi. جميع الحقوق محفوظة." },
    terms:    { en: "Terms & Conditions", ar: "الشروط والأحكام" },
    privacy:  { en: "Privacy Policy",    ar: "سياسة الخصوصية" },
    language: { en: "English",           ar: "العربية" },
  },
} as const;
export const homePlannerTranslations = {
  hero: {
    badge:        { en: "New: AI-Powered Layout Engine",  ar: "جديد: محرك تخطيط مدعوم بالذكاء الاصطناعي" },
    title:        { en: "AI Home Planner",                ar: "مخطط المنزل بالذكاء الاصطناعي" },
    headline:     { en: "Reimagine your living space.",   ar: "أعد تخيّل مساحة معيشتك." },
    subtext:      { en: "Create professional-grade floor plans in minutes. From conceptual sketches to detailed 3D walkthroughs, bring your vision to life with our intuitive planner.", ar: "أنشئ مخططات أرضية بمستوى احترافي خلال دقائق. من الرسومات المفاهيمية إلى الجولات التفصيلية ثلاثية الأبعاد، حوّل رؤيتك إلى واقع باستخدام مخططنا البديهي." },
    startDesign:  { en: "Start Design",                  ar: "ابدأ التصميم" },
  },

  tools: {
    heading:  { en: "Powerful Planning Tools",  ar: "أدوات تخطيط قوية" },
    subtext:  { en: "Everything you need to plan, design, and visualize your dream project.", ar: "كل ما تحتاج إليه لتخطيط مشروع أحلامك وتصميمه وتصوّره." },
    tool1: {
      title: { en: "2D to 3D Conversion", ar: "التحويل من ثنائي الأبعاد إلى ثلاثي الأبعاد" },
      desc:  { en: "Upload a blueprint or sketch and watch as our AI converts it into a fully navigable 3D model in seconds.", ar: "ارفع مخططًا أو رسمًا أوليًا وشاهد الذكاء الاصطناعي لدينا يحوّله خلال ثوانٍ إلى نموذج ثلاثي الأبعاد قابل للتنقل بالكامل." },
    },
    tool2: {
      title: { en: "Smart Furnishing", ar: "تأثيث ذكي" },
      desc:  { en: "Automatically populate your space with curated furniture collections based on your style preferences and budget.", ar: "املأ مساحتك تلقائيًا بمجموعات أثاث منتقاة بناءً على تفضيلات أسلوبك وميزانيتك." },
    },
    tool3: {
      title: { en: "AR Walkthrough", ar: "جولة بالواقع المعزز" },
      desc:  { en: "Experience your future home before building. Use augmented reality to walk through your space on any device.", ar: "اختبر منزلك المستقبلي قبل بنائه. استخدم الواقع المعزز للتجوّل داخل مساحتك على أي جهاز." },
    },
  },

  workflow: {
    badge:    { en: "Complete Workflow",  ar: "سير عمل متكامل" },
    heading:  { en: "From Blueprint to Reality", ar: "من المخطط إلى الواقع" },
    body:     { en: "Nooi isn't just a planner; it's an end-to-end platform. We connect your digital design directly to logistics, making sure what you see is exactly what you get delivered.", ar: "Nooi ليست مجرد مخطِّط؛ إنها منصة متكاملة من البداية إلى النهاية. نربط تصميمك الرقمي مباشرة بالخدمات اللوجستية لضمان أن ما تراه هو بالضبط ما يتم تسليمه إليك." },
    step1: {
      title: { en: "Design & Visualize", ar: "صمّم واستعرض" },
      desc:  { en: "Create your layout and visualize it with photorealistic rendering.", ar: "أنشئ تخطيطك واستعرضه بتصيير واقعي." },
    },
    step2: {
      title: { en: "Select Furniture", ar: "اختر الأثاث" },
      desc:  { en: "Browse our catalog of real products that fit your specific dimensions.", ar: "تصفّح كتالوجنا للمنتجات الحقيقية التي تناسب أبعادك المحددة." },
    },
    step3: {
      title: { en: "Order & Install", ar: "اطلب وركّب" },
      desc:  { en: "One-click ordering for your entire room. We handle the shipping and setup.", ar: "اطلب غرفتك بالكامل بنقرة واحدة. نحن نتولى الشحن والتركيب." },
    },
    startProject: { en: "Start Your Project", ar: "ابدأ مشروعك" },
    productName:  { en: "Modular Sofa",        ar: "أريكة معيارية" },
    inStock:      { en: "In Stock",            ar: "متوفر في المخزون" },
    fitsPerfectly:{ en: "Fits Perfectly",      ar: "يناسب تمامًا" },
    addToCart:    { en: "Add to Cart",         ar: "أضف إلى السلة" },
  },

  layouts: {
    heading:       { en: "Popular Layouts",                     ar: "التخطيطات الشائعة" },
    subtext:       { en: "Start with a template or explore what others have created.", ar: "ابدأ بقالب أو استكشف ما أنشأه الآخرون." },
    viewAll:       { en: "View all templates",                  ar: "عرض كل القوالب" },
    useTemplate:   { en: "Use Template",                        ar: "استخدم القالب" },
    layout1: {
      title: { en: "Urban Studio Apartment", ar: "شقة استوديو حضرية" },
      tag:   { en: "Studio",   ar: "استوديو" },
      meta:  { en: "450 sq ft • Open Concept", ar: "450 قدم² • مخطط مفتوح" },
    },
    layout2: {
      title: { en: "Modern Island Kitchen", ar: "مطبخ حديث بجزيرة" },
      tag:   { en: "Kitchen",  ar: "مطبخ" },
      meta:  { en: "250 sq ft • Minimalist", ar: "250 قدم² • أسلوب بسيط" },
    },
    layout3: {
      title: { en: "Master Suite",  ar: "جناح رئيسي" },
      tag:   { en: "Bedroom", ar: "غرفة نوم" },
      meta:  { en: "350 sq ft • Contemporary", ar: "350 قدم² • معاصر" },
    },
  },

  cta: {
    heading:    { en: "Ready to redesign your space?",   ar: "هل أنت مستعد لإعادة تصميم مساحتك؟" },
    body:       { en: "Join thousands of homeowners and designers who are creating beautiful homes with Nooi.", ar: "انضم إلى آلاف أصحاب المنازل والمصممين الذين ينشئون منازل جميلة باستخدام Nooi." },
    startTrial: { en: "Start Free Trial", ar: "ابدأ التجربة المجانية" },
    bookDemo:   { en: "Book a Demo",      ar: "احجز عرضًا توضيحيًا" },
  },
} as const;
export const marketplaceTranslations = {
  hero: {
    badge:        { en: "New: Global Sourcing",    ar: "جديد: توريد عالمي" },
    headlineLine1:{ en: "Source Real Furniture directly", ar: "احصل على أثاث حقيقي مباشرة" },
    headlineLine2:{ en: "from your designs.",      ar: "من تصاميمك." },
    subtext:      { en: "Connect your 3D floor plans to a global marketplace. Access millions of real-world items, compare prices instantly, and order everything in one click.", ar: "اربط مخططاتك الأرضية ثلاثية الأبعاد بسوق عالمية. احصل على ملايين العناصر الواقعية، وقارن الأسعار فورًا، واطلب كل شيء بنقرة واحدة." },
    searchPlaceholder: { en: "Search items...",    ar: "ابحث عن عناصر..." },
    browseCatalog:{ en: "Browse Catalog",          ar: "تصفّح الكتالوج" },
    itemsAvailable:{ en: "Items available",        ar: "العناصر المتاحة" },
  },

  catalog: {
    badge:        { en: "Internal Catalog",        ar: "كتالوج داخلي" },
    heading:      { en: "One massive library. Endless possibilities.", ar: "مكتبة ضخمة واحدة. إمكانات لا تنتهي." },
    body:         { en: "Don't limit your creativity to generic assets. Browse our extensive internal catalog of high-fidelity 3D models that are linked directly to real SKUs. What you see is exactly what you get.", ar: "لا تقيّد إبداعك بعناصر عامة. تصفّح كتالوجنا الداخلي الواسع من النماذج ثلاثية الأبعاد عالية الدقة المرتبطة مباشرة بمعرّفات منتجات حقيقية. ما تراه هو بالضبط ما ستحصل عليه." },
    feature1Title:{ en: "High-Fidelity 3D Models",ar: "نماذج ثلاثية الأبعاد عالية الدقة" },
    feature1Desc: { en: "Drag and drop models that match real-world dimensions perfectly.", ar: "اسحب وأفلت نماذج تطابق الأبعاد الواقعية بدقة." },
    feature2Title:{ en: "Smart Filtering",         ar: "تصفية ذكية" },
    feature2Desc: { en: "Filter by brand, material, color, price range, and availability.", ar: "صفِّ حسب العلامة التجارية والخامة واللون ونطاق السعر والتوفر." },
    cta:          { en: "Explore the Catalog",     ar: "استكشف الكتالوج" },
  },

  pricing: {
    badge:        { en: "Pricing Visibility",      ar: "وضوح الأسعار" },
    heading:      { en: "Compare prices across dozens of providers.", ar: "قارن الأسعار بين عشرات المزوّدين." },
    body:         { en: "Never overpay for design. Our engine scans major retailers and trade-only suppliers to bring you the best prices and lead times, updated in real-time.", ar: "لا تدفع أكثر من اللازم مقابل التصميم. يفحص محركنا كبار تجار التجزئة والمورّدين التجاريين ليقدّم لك أفضل الأسعار ومواعيد التسليم، مع تحديثات في الوقت الفعلي." },
    guarantee:    { en: "Best Price Guarantee",    ar: "ضمان أفضل سعر" },
    guaranteeDesc:{ en: "We automatically highlight the lowest price option.", ar: "نُبرز تلقائيًا خيار السعر الأدنى." },
    leadTime:     { en: "Lead Time Estimates",     ar: "تقديرات مدة التسليم" },
    leadTimeDesc: { en: "Know exactly when items will arrive on site.", ar: "اعرف بدقة متى ستصل العناصر إلى الموقع." },
    inStock:      { en: "In Stock",                ar: "متوفر في المخزون" },
  },

  checkout: {
    heading:      { en: "Multi-Vendor Checkout",   ar: "الدفع عبر عدة مورّدين" },
    body:         { en: "Consolidate orders from 50+ suppliers into a single invoice. We handle the logistics, tracking, and returns.", ar: "اجمع طلباتك من أكثر من 50 مورّدًا في فاتورة واحدة. نتولى الخدمات اللوجستية والتتبع والمرتجعات." },
    cartLabel:    { en: "Your Unified Cart",       ar: "سلتك الموحّدة" },
    invoice:      { en: "One Invoice",             ar: "فاتورة واحدة" },
    invoiceDesc:  { en: "No more chasing receipts. Get a single consolidated invoice for your entire project.", ar: "لا مزيد من ملاحقة الإيصالات. احصل على فاتورة موحّدة واحدة لمشروعك بالكامل." },
    concierge:    { en: "Concierge Support",       ar: "دعم مخصص" },
    conciergeDesc:{ en: "Our team coordinates delivery times and handles any damages or returns.", ar: "ينسّق فريقنا مواعيد التسليم ويتعامل مع أي أضرار أو مرتجعات." },
    startSourcing:{ en: "Start Sourcing Now",      ar: "ابدأ التوريد الآن" },
    cartTitle:    { en: "Shopping Cart",           ar: "سلة التسوق" },
    cartItems:    { en: "2 Items",                 ar: "عنصران" },
    vendor:       { en: "Vendor",                  ar: "المورّد" },
    total:        { en: "Total",                   ar: "الإجمالي" },
    proceedCheckout: { en: "Proceed to Checkout",  ar: "المتابعة إلى الدفع" },
  },

  categories: {
    heading:  { en: "Popular Categories", ar: "الفئات الشائعة" },
    seating:  { en: "Seating",   ar: "المقاعد" },
    lighting: { en: "Lighting",  ar: "الإضاءة" },
    tables:   { en: "Tables",    ar: "الطاولات" },
    storage:  { en: "Storage",   ar: "التخزين" },
    decor:    { en: "Decor",     ar: "الديكور" },
    outdoor:  { en: "Outdoor",   ar: "الأماكن الخارجية" },
  },

  footer: {
    tagline:      { en: "Subscribe to the nooi weekly and enjoy seven days of interior design news in one newsletter, with worldwide delivery.", ar: "اشترك في نشرة Nooi الأسبوعية واستمتع بسبعة أيام من أخبار التصميم الداخلي في رسالة واحدة، مع توصيل عالمي." },
    emailPlaceholder: { en: "Enter your email",   ar: "أدخل بريدك الإلكتروني" },
    subscribe:    { en: "Subscribe",              ar: "اشترك" },
    windowsApp:   { en: "Nooi Windows App",       ar: "تطبيق Nooi لويندوز" },
    macApp:       { en: "Nooi Mac App",           ar: "تطبيق Nooi لماك" },
    productHeading: { en: "Product",              ar: "المنتج" },
    productLinks: {
      floorPlanner:  { en: "Floor planner",           ar: "مخطط الأرضيات" },
      interiorDesign:{ en: "Interior design",         ar: "التصميم الداخلي" },
      kitchenCloset: { en: "Kitchen & Closet Design", ar: "تصميم المطابخ والخزائن" },
      viewer3d:      { en: "3D Viewer",               ar: "عارض ثلاثي الأبعاد" },
      customFurniture:{ en: "Custom Furniture",       ar: "أثاث مخصص" },
    },
    companyHeading: { en: "Company",              ar: "الشركة" },
    companyLinks: {
      aboutUs:    { en: "About Us",          ar: "من نحن" },
      contact:    { en: "Contact us",        ar: "اتصل بنا" },
      affiliate:  { en: "Affiliate program", ar: "برنامج الشركاء" },
      careers:    { en: "Careers",           ar: "الوظائف" },
    },
    resourcesHeading: { en: "Resources",          ar: "الموارد" },
    resourcesLinks: {
      designIdeas:{ en: "Home Design Ideas", ar: "أفكار تصميم المنزل" },
      tutorial:   { en: "Tutorial",          ar: "الدروس التعليمية" },
      helpCenter: { en: "Help center",       ar: "مركز المساعدة" },
      app:        { en: "Nooi app",          ar: "تطبيق Nooi" },
    },
    legal:        { en: "2026 Nooi, Inc. All Rights Reserved.", ar: "© 2026 شركة Nooi. جميع الحقوق محفوظة." },
    terms:        { en: "Terms & Conditions", ar: "الشروط والأحكام" },
    privacy:      { en: "Privacy Policy",    ar: "سياسة الخصوصية" },
    language:     { en: "English",           ar: "العربية" },
  },
} as const;
export const aboutTranslations = {
  hero: {
    eyebrow:      { en: "Our Story",                    ar: "قصتنا" },
    headlineLine1:{ en: "Redefining Interior",          ar: "إعادة تعريف التصميم الداخلي" },
    headlineLine2:{ en: "Design & Logistics.",          ar: "والخدمات اللوجستية." },
    subtext:      { en: "We bridge the gap between imagination and reality. Nooi is the all-in-one platform connecting architects, designers, and developers with seamless execution tools.", ar: "نردم الفجوة بين الخيال والواقع. Nooi منصة شاملة تربط المهندسين المعماريين والمصممين والمطورين بأدوات تنفيذ سلسة." },
    hqLabel:      { en: "Our HQ",                      ar: "مقرنا الرئيسي" },
    hqName:       { en: "Design Innovation Center",    ar: "مركز ابتكار التصميم" },
  },

  founding: {
    heading:      { en: "From Sketch to Sanctuary.",   ar: "من رسم أولي إلى ملاذ متكامل." },
    body1:        { en: "Founded in 2020, Nooi started with a simple question: Why is the distance between a beautiful rendering and a finished room so vast? We noticed that designers spent more time wrestling with logistics than creating beauty.", ar: "تأسست Nooi عام 2020 انطلاقًا من سؤال بسيط: لماذا تبدو المسافة بين التصيير الجميل والغرفة المنجزة كبيرة إلى هذا الحد؟ لاحظنا أن المصممين يقضون وقتًا أطول في التعامل مع الخدمات اللوجستية بدلًا من صناعة الجمال." },
    body2:        { en: "Our platform empowers creators to move from rough sketch to fully furnished reality—with precision tools and AI-powered logistics every step of the way.", ar: "تمكّن منصتنا المبدعين من الانتقال من رسم أولي إلى واقع مؤثث بالكامل، من خلال أدوات دقيقة وخدمات لوجستية مدعومة بالذكاء الاصطناعي في كل خطوة." },
    missionLabel: { en: "Our Mission",                 ar: "رسالتنا" },
    missionDesc:  { en: "A world where any space can be transformed from a digital dream to physical reality in days, not months.", ar: "عالم يمكن فيه تحويل أي مساحة من حلم رقمي إلى واقع ملموس خلال أيام، لا أشهر." },
    visionLabel:  { en: "Our Vision",                  ar: "رؤيتنا" },
    visionDesc:   { en: "To become the global infrastructure for interior design, bridging the gap between imagination and execution.", ar: "أن نصبح البنية التحتية العالمية للتصميم الداخلي، وأن نردم الفجوة بين الخيال والتنفيذ." },
  },

  stats: {
    projects:     { en: "Projects Served",    ar: "مشروع مُنجز" },
    countries:    { en: "Countries Served",   ar: "دولة" },
    delivery:     { en: "Active Delivery",    ar: "عملية تسليم نشطة" },
    satisfaction: { en: "Client Satisfaction",ar: "رضا العملاء" },
  },

  team: {
    eyebrow:  { en: "The Team Behind",      ar: "الفريق القائم خلف المنصة" },
    heading:  { en: "Meet the Innovators.", ar: "تعرّف إلى المبتكرين." },
    members: {
      alex: {
        name: { en: "Alex Throne",   ar: "أليكس ثرون" },
        role: { en: "Co-Founder & CEO", ar: "الشريك المؤسس والرئيس التنفيذي" },
        desc: { en: "Former architect turned tech entrepreneur. Passionate about solving the fragmentation in design workflows", ar: "معماري سابق أصبح رائد أعمال تقنيًا. شغوف بحل مشكلة تشتت سير عمل التصميم." },
      },
      sarah: {
        name: { en: "Sarah Jenkins",         ar: "سارة جينكينز" },
        role: { en: "Chief Technology Officer", ar: "الرئيسة التقنية" },
        desc: { en: "AI specialist with a background in 3D rendering engines. Leads our engineering team to push boundaries.", ar: "متخصصة في الذكاء الاصطناعي بخلفية في محركات التصيير ثلاثي الأبعاد. تقود فريق الهندسة لدينا لدفع الحدود إلى الأمام." },
      },
      marcus: {
        name: { en: "Marcus Chen",    ar: "ماركوس تشين" },
        role: { en: "Head of Design", ar: "رئيس التصميم" },
        desc: { en: "Award-winning interior designer. Ensures our platform serves the creative needs of real professionals.", ar: "مصمم داخلي حائز على جوائز. يضمن أن تخدم منصتنا الاحتياجات الإبداعية للمحترفين الحقيقيين." },
      },
    },
  },

  values: {
    heading: { en: "Built on Trust & Precision", ar: "مبني على الثقة والدقة" },
    subtext: { en: "Our principles guide every product decision. These are the pillars on which NOOI is built.", ar: "توجّه مبادئنا كل قرار يتعلق بالمنتج. هذه هي الركائز التي تقوم عليها NOOI." },
    items: {
      innovation: {
        title: { en: "Innovation First",      ar: "الابتكار أولًا" },
        desc:  { en: "We push the boundaries of what AI can do for interior design—constantly iterating, improving, and building tools that didn't exist before.", ar: "نوسّع حدود ما يمكن للذكاء الاصطناعي فعله في التصميم الداخلي، مع التطوير والتحسين المستمر وبناء أدوات لم تكن موجودة من قبل." },
      },
      userCentric: {
        title: { en: "User-Centric Design",   ar: "تصميم يركّز على المستخدم" },
        desc:  { en: "Every feature is built around real user needs. We listen, learn, and design products that feel natural and effortless to use.", ar: "تُبنى كل ميزة حول احتياجات المستخدمين الحقيقية. نستمع ونتعلّم ونصمّم منتجات تبدو طبيعية وسهلة الاستخدام." },
      },
      sustainability: {
        title: { en: "Sustainability",         ar: "الاستدامة" },
        desc:  { en: "We believe great design and responsible choices go hand in hand—partnering with brands committed to a greener future.", ar: "نؤمن بأن التصميم الرائع والاختيارات المسؤولة يسيران جنبًا إلى جنب، ونتعاون مع علامات تجارية ملتزمة بمستقبل أكثر خضرة." },
      },
    },
  },

  cta: {
    heading: { en: "Ready to transform your Workflow?", ar: "هل أنت مستعد لتحويل سير عملك؟" },
    subtext: { en: "Join thousands of designers and architects already building their dream spaces with NOOI.", ar: "انضم إلى آلاف المصممين والمهندسين المعماريين الذين يبنون بالفعل مساحات أحلامهم باستخدام NOOI." },
    getFree: { en: "Get For Free",  ar: "احصل عليه مجانًا" },
    demo:    { en: "Book a Demo",   ar: "احجز عرضًا توضيحيًا" },
  },
} as const;