// Hand-authored interpretive layer (Claude draft, Oct 2026). Event ids must match data/events.json;
// `npm run audit` reports any that no longer do.

export const LANES = [
  {
    id: "ideas",
    name: "Ideas & research",
    short: "Ideas",
    types: ["Theory / question", "Field formation", "Model innovation", "Research source"],
    blurb: "Theories, methods, models and the institutions that made AI a field."
  },
  {
    id: "material",
    name: "Data & compute",
    short: "Data",
    types: ["Data / benchmark", "Infrastructure / compute"],
    blurb: "Datasets, benchmarks, chips, languages and platforms: the material base."
  },
  {
    id: "industry",
    name: "Industry",
    short: "Industry",
    types: ["Corporate release"],
    blurb: "Products, firms, releases and capital."
  },
  {
    id: "state",
    name: "State & courts",
    short: "State",
    types: ["State / policy", "Court / litigation"],
    blurb: "Funding reviews, national programs, regulation and litigation."
  },
  {
    id: "critique",
    name: "Critique",
    short: "Critique",
    types: ["Critique / governance"],
    blurb: "Critics, ethicists, auditors and self-governance bodies."
  }
];

export const ERAS = [
  {
    id: "cybernetics",
    short: "Cybernetics",
    name: "Cybernetics & computing",
    start: 1940,
    end: 1956,
    synopsis: "Wartime computing and cybernetics supply the vocabulary: neurons as logic, feedback as control, the machine as a possible mind. AI does not yet exist as a field; its questions are spread across mathematics, neurophysiology and engineering.",
    boundary: "Starting AI's history in the 1940s is itself an argument. Accounts that start at Dartmouth treat cybernetics as prehistory; others treat it as the road AI chose not to take."
  },
  {
    id: "symbolic",
    short: "Symbolic",
    name: "Symbolic optimism",
    start: 1956,
    end: 1974,
    synopsis: "A funding proposal names the field, and military money (ARPA from 1958, its IPTO office from 1962) sustains a few labs at MIT, Stanford, Carnegie and SRI. Programs that prove theorems, parse blocks-world sentences and plan robot moves support large public promises.",
    boundary: "The end is usually dated to the Lighthill Report (1973) and DARPA's shift to mission-oriented funding after the Mansfield Amendment (1969). Some historians argue the cuts were narrower than the 'winter' story suggests."
  },
  {
    id: "winter1",
    short: "Winter I",
    name: "First winter",
    start: 1974,
    end: 1980,
    synopsis: "State reviewers ask what the promises delivered. In Britain the Lighthill Report cuts funding for about a decade; in the US, money moves toward applied, mission-linked projects. Research continues, but the field loses its claim to general intelligence.",
    boundary: "'Winter' is a participants' metaphor, popularized in the 1980s. How cold it was depends on country, lab and subfield."
  },
  {
    id: "expert",
    short: "Expert systems",
    name: "Expert-systems boom",
    start: 1980,
    end: 1987,
    synopsis: "Knowledge becomes a product: rule-based expert systems like R1/XCON enter business, and states fund AI as industrial policy, with Japan's Fifth Generation project (1982), DARPA Strategic Computing (1983) and Britain's Alvey programme.",
    boundary: "The boom is easier to date by money than by ideas: the same years produce backpropagation (1986) and the neural-network revival, outside the expert-systems mainstream."
  },
  {
    id: "winter2",
    short: "Winter II",
    name: "Second winter",
    start: 1987,
    end: 1993,
    synopsis: "The specialized Lisp-machine market collapses as general workstations catch up, and expert systems prove costly to maintain. This time the retreat starts in a market rather than a funding review.",
    boundary: "Statistical and neural methods grow through these years. 'Winter' describes symbolic AI's commercial fortunes more than research activity overall."
  },
  {
    id: "statistical",
    short: "Statistical",
    name: "Statistical turn",
    start: 1993,
    end: 2012,
    synopsis: "Machine learning displaces hand-written knowledge: support-vector machines, Bayesian networks and convolutional nets, trained on benchmarks such as MNIST. The web, crowd labour and cheap storage make large datasets possible; games and challenges stage progress for the public.",
    boundary: "Ending this era at AlexNet (2012) follows the deep-learning story. A data-centred account would put the hinge at ImageNet (2009) or at CUDA (2006)."
  },
  {
    id: "deep",
    short: "Deep learning",
    name: "Deep learning",
    start: 2012,
    end: 2017,
    synopsis: "GPUs plus ImageNet-scale data make deep neural networks the dominant paradigm. Talent and compute concentrate in Google, Facebook, Microsoft, Baidu and DeepMind; OpenAI is founded as a nonprofit counterweight.",
    boundary: "Whether this is a 'revolution' or the payoff of thirty years of connectionist work is the central historiographic dispute of the period."
  },
  {
    id: "scale",
    short: "Scale",
    name: "Transformers & scale",
    start: 2017,
    end: 2022,
    synopsis: "The transformer (2017) and scaling laws (2020) turn progress into a question of compute and data budgets. Critique professionalizes: Gender Shades, model cards, Stochastic Parrots. The first national AI strategies and intergovernmental principles appear.",
    boundary: "Some accounts begin the generative era with GPT-3 (2020) rather than ChatGPT; others argue that scaling is a business strategy presented as a scientific law."
  },
  {
    id: "generative",
    short: "Generative",
    name: "Generative AI & governance",
    start: 2022,
    end: 2030,
    synopsis: "ChatGPT turns language models into a mass product. Capital expenditure on compute reaches national scale, copyright suits test the data supply, and states split between binding regulation (the EU AI Act) and deregulation plus pre-emption (US federal orders after 2025).",
    boundary: "This era is still being written. Its periodization will be set later by whoever controls the archive, which today is mostly company blogs and court filings."
  }
];

export const ERA_SOURCES = "Periodization follows common accounts such as Crevier, AI: The Tumultuous History (1993), Nilsson, The Quest for Artificial Intelligence (2010), and Mitchell, Artificial Intelligence: A Guide for Thinking Humans (2019). Boundaries are conventions, not facts.";

// Well-established dates; general reference unless noted.
export const WORLD = [
  { year: 1945.6, label: "End of WWII", note: "Wartime computing and operations research become peacetime science." },
  { year: 1957.76, label: "Sputnik", note: "Soviet satellite; the US response creates ARPA and expands science funding." },
  { year: 1958.1, label: "ARPA created", note: "Defense research agency that funds most US AI labs for two decades." },
  { year: 1962.8, label: "ARPA IPTO", note: "Information Processing Techniques Office; Licklider funds MIT, Stanford, CMU." },
  { year: 1969.9, label: "Mansfield Amendment", note: "Restricts defense funding to research with direct military relevance." },
  { year: 1973.8, label: "Oil crisis", note: "Stagflation squeezes public research budgets." },
  { year: 1989.86, label: "Berlin Wall falls", note: "Cold War ends; defense research justifications weaken." },
  { year: 1991.6, label: "World Wide Web public", note: "The web later becomes AI's largest data source." },
  { year: 2000.2, label: "Dot-com crash", note: "Capital retreats from internet firms; survivors consolidate." },
  { year: 2001.7, label: "9/11", note: "Surveillance and security funding expand data collection." },
  { year: 2007.03, label: "iPhone", note: "Smartphones put sensors and cameras in billions of pockets." },
  { year: 2008.7, label: "Financial crisis", note: "Low interest rates follow and cheap capital funds tech for a decade." },
  { year: 2013.45, label: "Snowden disclosures", note: "Mass data collection becomes a public political issue." },
  { year: 2018.2, label: "Cambridge Analytica", note: "Platform data misuse drives the first wave of tech regulation." },
  { year: 2020.2, label: "COVID-19 pandemic", note: "Remote work and stimulus accelerate cloud and AI investment." },
  { year: 2022.15, label: "Russia invades Ukraine", note: "AI enters battlefield and sanctions politics." },
  { year: 2022.6, label: "CHIPS and Science Act", note: "US industrial policy for semiconductors." },
  { year: 2025.05, label: "Stargate announced", note: "Proposed $500B US AI-infrastructure venture." }
];

export const HARDWARE = [
  { year: 1945.9, label: "ENIAC", note: "General-purpose electronic computer, completed late 1945." },
  { year: 1947.95, label: "Transistor", note: "Bell Labs; the basis of every later computer." },
  { year: 1958.7, label: "Integrated circuit", note: "Kilby (TI), then Noyce (Fairchild)." },
  { year: 1965.3, label: "Moore's law", note: "Moore predicts transistor counts doubling on a regular schedule." },
  { year: 1971.9, label: "Intel 4004", note: "First commercial single-chip microprocessor." },
  { year: 1981.6, label: "IBM PC", note: "Commodity computing; later undercuts Lisp machines." },
  { year: 1999.8, label: "GeForce 256", note: "NVIDIA markets the first 'GPU'." },
  { year: 2006.6, label: "AWS EC2", note: "Rentable cloud compute." },
  { year: 2006.9, label: "CUDA", note: "GPUs become general-purpose accelerators." },
  { year: 2016.4, label: "Google TPU", note: "Custom AI accelerator, disclosed May 2016." },
  { year: 2017.4, label: "NVIDIA V100", note: "Tensor cores for deep learning." },
  { year: 2020.4, label: "NVIDIA A100", note: "The GPT-3-era workhorse." },
  { year: 2022.2, label: "NVIDIA H100", note: "Frontier-training standard; export-controlled." },
  { year: 2024.2, label: "Blackwell B200", note: "Rack-scale systems become the unit of compute." }
];

export const RHYMES = [
  {
    id: "review-retreat",
    name: "Promise, review, retreat",
    thesis: "Each boom ended when a funder or a market asked what the promises had delivered. Reviews written by outsiders (ALPAC, Lighthill) and market tests (Lisp machines) did more to set direction than any technical result. The 2024 bear case asks the same question of the compute buildout.",
    ids: ["1966-alpac-report", "1973-lighthill-report", "1987-lisp-machine-market-collapse", "2024-the-ai-bear-case"]
  },
  {
    id: "benchmark-closure",
    name: "A benchmark settles the question",
    thesis: "A shared test decides what counts as progress, the field optimizes for it until it saturates, and a harder test replaces it. Each benchmark is a closure device: it ends an argument about what 'better' means.",
    ids: ["1998-lenet-5-and-mnist", "2009-imagenet-presented-at-cvpr", "2020-mmlu-benchmark", "2022-stanford-s-helm", "2026-arc-agi-3-frontier-models-near-zero"]
  },
  {
    id: "games-as-proof",
    name: "Games as public proof",
    thesis: "Public matches turn lab capability into spectacle. Corporate sponsors (IBM twice, then Google/DeepMind) use games as advertising, and each win is read as a claim about intelligence in general.",
    ids: ["1995-td-gammon", "1997-deep-blue-defeats-kasparov", "2011-ibm-watson-wins-jeopardy", "2016-mastering-the-game-of-go-with-deepneural-networks-and-tree-search"]
  },
  {
    id: "insider-critique",
    name: "Critique from inside",
    thesis: "The most consequential critiques come from inside the field. Institutions respond by absorbing the critique, through ethics boards and model cards, or by removing the critics.",
    ids: ["1969-minsky-papert-s-perceptrons", "2018-gender-shades", "2020-timnit-gebru-forced-out-of-google", "2021-stochastic-parrots", "2024-safety-researchers-leave-openai"]
  },
  {
    id: "national-race",
    name: "The national race",
    thesis: "AI policy is repeatedly framed as competition between states. In 1982 Japan played the rival that China plays now, and in both cases the rival's program was used to justify domestic spending.",
    ids: ["1982-japan-s-fifth-generation-project", "1983-darpa-strategic-computing", "2019-eo-13859-american-ai-leadership", "2022-us-chip-export-controls", "2025-america-s-ai-action-plan"]
  },
  {
    id: "open-closed",
    name: "Open release versus control",
    thesis: "Every capability jump reopens the same fight over who gets the weights. Staged release, leaks, open-weight strategies and foreign open models move the line back and forth.",
    ids: ["2019-openai-s-gpt-2-staged-release", "2022-stable-diffusion-public-release", "2023-llama-weights-leak", "2024-zuckerberg-s-open-source-ai-case", "2026-kimi-k3-released-as-open-weights"]
  },
  {
    id: "data-consent",
    name: "Scrape first, contest later",
    thesis: "Datasets are built from material gathered without consent, become infrastructure, and are contested only after they are embedded, first by researchers (Tiny Images), then by rights-holders in court.",
    ids: ["2007-common-crawl-founded", "2020-80-million-tiny-images-withdrawn", "2022-laion-5b-released", "2023-nyt-sues-openai-and-microsoft", "2025-bartz-v-anthropic-fair-use-ruling"]
  }
];

// Matched against each event's title, summary and note text. Lifelines show activity in this vault, not biographies.
export const ACTORS = [
  { id: "darpa", name: "DARPA / ARPA", kind: "state", pattern: "\\bD?ARPA\\b|Defense Advanced Research" },
  { id: "mit", name: "MIT", kind: "lab", pattern: "\\bMIT\\b|Massachusetts Institute of Technology" },
  { id: "stanford", name: "Stanford", kind: "lab", pattern: "Stanford" },
  { id: "minsky", name: "Marvin Minsky", kind: "person", pattern: "Minsky" },
  { id: "mccarthy", name: "John McCarthy", kind: "person", pattern: "McCarthy" },
  { id: "hinton", name: "Geoffrey Hinton", kind: "person", pattern: "Hinton" },
  { id: "lecun", name: "Yann LeCun", kind: "person", pattern: "LeCun" },
  { id: "ibm", name: "IBM", kind: "firm", pattern: "\\bIBM\\b" },
  { id: "google", name: "Google / DeepMind", kind: "firm", pattern: "Google|DeepMind" },
  { id: "microsoft", name: "Microsoft", kind: "firm", pattern: "Microsoft" },
  { id: "meta", name: "Meta / Facebook", kind: "firm", pattern: "\\bMeta\\b|Facebook" },
  { id: "openai", name: "OpenAI", kind: "firm", pattern: "OpenAI" },
  { id: "anthropic", name: "Anthropic", kind: "firm", pattern: "Anthropic" },
  { id: "nvidia", name: "NVIDIA", kind: "firm", pattern: "NVIDIA|Nvidia" },
  { id: "eu", name: "European Union", kind: "state", pattern: "\\bEU\\b|European (Union|Commission|Parliament)" },
  { id: "china", name: "China (state & labs)", kind: "state", pattern: "\\bChina\\b|Chinese|DeepSeek" }
];

export const REGIONS = [
  { id: "us", name: "United States", pattern: "United States|\\bU\\.?S\\.?\\b|American|White House|Congress|DARPA|ARPA|California|Colorado|New York|Stanford|\\bMIT\\b|Carnegie|NIST" },
  { id: "uk", name: "United Kingdom", pattern: "\\bUK\\b|United Kingdom|Brit(ain|ish)|Lighthill|Bletchley|Edinburgh|London" },
  { id: "europe", name: "EU & Europe", pattern: "\\bEU\\b|Europe|European|France|French|Germany|German|Italy|Italian|Mistral|Council of Europe|Paris" },
  { id: "china", name: "China", pattern: "\\bChina\\b|Chinese|DeepSeek|Kimi|Beijing" },
  { id: "japan", name: "Japan", pattern: "Japan|Japanese|ICOT|Hiroshima|Fukushima's" },
  { id: "ussr", name: "USSR / Russia", pattern: "Soviet|USSR|Russia" },
  { id: "global-south", name: "Global South", pattern: "India|Indian|New Delhi|Africa|African|Brazil|Latin America|Kenya" }
];

// Topics a history of AI would usually cover that the vault does not yet have a note for.
export const MISSING_TOPICS = [
  { year: 1959, title: "Soviet cybernetics rehabilitated", why: "Cybernetics moves from 'bourgeois pseudoscience' to state programme in the USSR. Without it the vault has no Soviet side of the Cold War story." },
  { year: 1972, title: "Prolog (Marseille)", why: "A European logic-programming tradition that later becomes the language of Japan's Fifth Generation project." },
  { year: 1984, title: "Alvey Programme (UK)", why: "Britain's answer to the Fifth Generation; the Lighthill decision reversed." },
  { year: 1987, title: "Cyc and the knowledge-engineering bet", why: "The longest-running attempt to hand-encode common sense." },
  { year: 2017, title: "China's New Generation AI Development Plan", why: "State Council plan for AI leadership by 2030; the Chinese counterpart to US strategy documents in the vault." },
  { year: 2018, title: "Data-labelling labour in Kenya and the Philippines", why: "The global labour behind RLHF and content moderation is visible in the vault only through MTurk." },
  { year: 2019, title: "India's National Strategy for AI (#AIforAll)", why: "Development-oriented national strategy outside the US–EU–China frame." }
];

export const TOURS = [
  {
    id: "two-winters",
    name: "The two winters",
    dek: "How promises, reviews and markets set the rhythm of early AI.",
    steps: [
      {
        ids: ["1955-56-a-proposal-for-the-dartmouth-summer-research-projecton-artificial-intelligence"],
        range: [1948, 1962],
        title: "A field named in a funding proposal",
        text: "AI begins as a grant application. The Dartmouth proposal claims that every feature of intelligence can in principle be described precisely enough for a machine to simulate it. That claim becomes the standard later reviewers measure the field against."
      },
      {
        ids: ["1966-alpac-report"],
        range: [1960, 1972],
        title: "The first audit",
        text: "ALPAC tells the Department of Defense, the CIA and the NSF that general machine translation is not in immediate prospect and that human translators are not scarce. A national academy committee, not a technical failure, ends the first wave of MT funding."
      },
      {
        ids: ["1969-minsky-papert-s-perceptrons"],
        range: [1956, 1975],
        title: "Critique from inside",
        text: "Minsky and Papert demand proofs of what perceptrons can do. Their book is remembered as having stopped neural-network research. How much it actually did is contested, which is a case of interpretative flexibility in the history itself."
      },
      {
        ids: ["1973-lighthill-report"],
        range: [1966, 1980],
        title: "The state decides what AI is",
        text: "An outsider's personal review for the UK Science Research Council splits AI into three parts and declares the part that made it a coherent field, robots and general reasoning, a failure. British funding changes for about a decade."
      },
      {
        ids: ["1982-japan-s-fifth-generation-project", "1983-darpa-strategic-computing"],
        range: [1978, 1990],
        title: "Thaw by national rivalry",
        text: "Japan's Fifth Generation project gives Western governments a rival. DARPA's Strategic Computing program answers with a pyramid that runs from chips to military applications to machine intelligence. Money returns because AI becomes industrial policy."
      },
      {
        ids: ["1987-lisp-machine-market-collapse"],
        range: [1982, 1995],
        title: "The second winter starts in a market",
        text: "The specialized Lisp-machine business collapses as cheaper general-purpose workstations catch up. This time no reviewer pulls the plug: commodity hardware does."
      },
      {
        ids: ["2024-the-ai-bear-case"],
        range: [2019, 2027],
        title: "The rhyme today",
        text: "The 2024 bear case asks whether revenue can justify GPU spending. The question is the one ALPAC and Lighthill asked, now put by investors instead of funders."
      }
    ]
  },
  {
    id: "data-bottleneck",
    name: "How data became the bottleneck",
    dek: "From hand-built benchmarks to scraped corpora to the courtroom.",
    steps: [
      {
        ids: ["1998-lenet-5-and-mnist"],
        range: [1990, 2004],
        title: "Learning beats handcraft, on a benchmark",
        text: "LeCun's group argues that systems should learn their own features rather than rely on hand-designed heuristics, and proves it on a new benchmark, MNIST. The argument and the test that settles it arrive together."
      },
      {
        ids: ["2005-amazon-mechanical-turk-launches"],
        range: [2000, 2010],
        title: "Artificial artificial intelligence",
        text: "Mechanical Turk lets a program call a human through an API. It makes cheap, invisible annotation labour available at scale, the labour that ImageNet will depend on."
      },
      {
        ids: ["2006-12-the-data-that-transformed-ai-research-and-possibly-the-world", "2009-imagenet-presented-at-cvpr"],
        range: [2004, 2014],
        title: "A taxonomy, a crowd, a competition",
        text: "ImageNet joins the WordNet taxonomy, crowd annotation and an annual competition. Its significance is institutional: it gives the field a shared arena."
      },
      {
        ids: ["2012-imagenet-classification-with-deep-convolutional-neural-networks"],
        range: [2008, 2016],
        title: "The arena picks a winner",
        text: "AlexNet wins ImageNet 2012 by a wide margin on GPUs. The benchmark that data built turns a contested method into the paradigm."
      },
      {
        ids: ["2007-common-crawl-founded", "2022-laion-5b-released"],
        range: [2005, 2024],
        title: "The web becomes the corpus",
        text: "Common Crawl gives away the web, and LAION-5B pairs 5.85 billion images with text. 'Open' datasets let more people train large models, and they also launder the question of consent."
      },
      {
        ids: ["2020-80-million-tiny-images-withdrawn"],
        range: [2016, 2024],
        title: "The first reckoning",
        text: "MIT withdraws 80 Million Tiny Images because automated collection from WordNet nouns put slurs and offensive images into it. Researchers admit the dataset is too large to inspect by hand."
      },
      {
        ids: ["2023-nyt-sues-openai-and-microsoft", "2025-bartz-v-anthropic-fair-use-ruling"],
        range: [2021, 2027],
        title: "Data goes to court",
        text: "The Times argues that training produced a substitute for its journalism. In 2025 two judges in the same district find fair use for training by nearly opposite reasoning. Closure on data is now being sought through law."
      }
    ]
  },
  {
    id: "lab-to-market",
    name: "From lab to market",
    dek: "How AI became a product, then a firm, then an asset class.",
    steps: [
      {
        ids: ["1961-unimate-enters-gm-production"],
        range: [1954, 1968],
        title: "Automation before AI",
        text: "The first Unimate unloads hot castings at a GM plant. Industrial automation, not thinking machines, is the first commercial success, and it is about labour."
      },
      {
        ids: ["1982-r1-xcon-expert-systems-go-commercial"],
        range: [1976, 1990],
        title: "Knowledge as a product",
        text: "R1/XCON configures VAX orders for DEC with thousands of if-then rules. Daily business use is presented as proof that expertise can be captured, and an industry forms around that claim."
      },
      {
        ids: ["2011-ibm-watson-wins-jeopardy"],
        range: [2006, 2016],
        title: "AI as brand",
        text: "IBM stages Watson on Jeopardy! as a demonstration and then sells 'Watson' as a business line. The brand outlasts the technology."
      },
      {
        ids: ["2015-openai-founded-as-a-nonprofit", "2019-openai-s-gpt-2-staged-release"],
        range: [2013, 2021],
        title: "The nonprofit that needed capital",
        text: "OpenAI is founded 'unconstrained by a need to generate financial return'. By 2019 it has restructured and stages GPT-2's release on safety grounds, which also makes the release a media event."
      },
      {
        ids: ["2022-chatgpt-launch"],
        range: [2019, 2025],
        title: "The research preview that became a market",
        text: "ChatGPT launches as a 'research preview' whose limits are to be discovered by its users. Iterative deployment makes the public part of the development process."
      },
      {
        ids: ["2023-brain-and-deepmind-merge"],
        range: [2020, 2026],
        title: "Incumbents consolidate",
        text: "Google merges Brain and DeepMind under Hassabis to 'work with greater speed', an institutional answer to a competitive shock."
      },
      {
        ids: ["2026-anthropic-s-65b-raise-ipo-filings", "2026-nvidia-q2-fy2027-compute-is-revenue"],
        range: [2023, 2027],
        title: "Compute is revenue",
        text: "Labs raise at near-trillion-dollar valuations and file for IPOs, and NVIDIA declares that compute is revenue. AI has become the asset class the bear case worried about."
      }
    ]
  },
  {
    id: "governing-ai",
    name: "Governing AI",
    dek: "From principles to binding law to pre-emption.",
    steps: [
      {
        ids: ["2016-obama-white-house-ai-report"],
        range: [2013, 2019],
        title: "Study, monitor, coordinate",
        text: "The first White House AI report asks agencies to study and coordinate, not Congress to legislate. Governance begins as administration."
      },
      {
        ids: ["2017-asilomar-ai-principles", "2019-oecd-ai-principles-adopted"],
        range: [2015, 2021],
        title: "The principles era",
        text: "Researchers at Asilomar, then governments at the OECD, issue principles. Agreement is broad because nothing is binding."
      },
      {
        ids: ["2021-eu-proposes-the-ai-act", "2024-eu-ai-act-enters-the-official-journal"],
        range: [2019, 2026],
        title: "Europe regulates by risk",
        text: "The Commission proposes rules by risk tier rather than by technology. By enactment, general-purpose models had forced a new chapter, so the law changed while it was being written."
      },
      {
        ids: ["2023-eo-14110-on-safe-secure-ai", "2023-bletchley-declaration"],
        range: [2021, 2025],
        title: "Frontier safety as policy",
        text: "EO 14110 uses the Defense Production Act to require reports from the largest model developers, and Bletchley names 'frontier' risk as international. The safety community's vocabulary becomes state vocabulary."
      },
      {
        ids: ["2024-colorado-ai-act-signed", "2025-eo-14148-revokes-eo-14110"],
        range: [2023, 2026],
        title: "States act; the federal line reverses",
        text: "Colorado regulates AI by the decisions it makes rather than by compute. In January 2025 the federal executive revokes EO 14110 on its first day."
      },
      {
        ids: ["2025-eo-14365-targets-state-ai-laws", "2026-xai-and-doj-sue-colorado"],
        range: [2024, 2027],
        title: "Pre-emption by litigation",
        text: "A federal task force challenges state AI laws, and xAI and the Justice Department sue Colorado. Governance becomes a fight over who governs."
      }
    ]
  }
];
