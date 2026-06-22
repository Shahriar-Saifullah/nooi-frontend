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