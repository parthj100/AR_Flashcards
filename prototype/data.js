// === Lens prototype data ===
//
// Two roles for each item:
//   1. `clipPrompts` — natural-language descriptions CLIP uses to match camera
//      frames against this topic. Multiple prompts per topic = more robust.
//   2. full `flashcards[id]` entry — hand-authored rich content that overrides
//      LLM generation when the CLIP match lands on this id.
//
// For the many "extendedVocab" topics at the bottom we only provide prompts.
// When CLIP recognizes one of those, the Ollama/Phi-3 LLM generates the
// flashcard content on the fly at capture time.

window.LENS_DATA = {
  user: { name: 'Parth Joshi', initials: 'PJ', plan: 'Free plan · 7-day streak' },

  myDecks: [
    { id: 'biology-cell', name: 'Biology · cell unit', count: 24, dot: '#4a7fc6' },
    { id: 'botany-lab',   name: 'Botany lab',          count: 18, dot: '#4F8C5C' },
    { id: 'chem-101',     name: 'Chem 101',            count: 31, dot: '#6F509E' },
    { id: 'arch-survey',  name: 'Architecture survey', count: 9,  dot: '#A88468' }
  ],

  recentScans: [
    { id: 'copper-sulfate', title: 'Copper sulfate', sub: 'CuSO\u2084 \u00b7 5H\u2082O',     when: 'Yesterday',  cards: 12, status: 'studying', tag: 'CHEM', grad: 'var(--grad-blue)',   subject: 'chem' },
    { id: 'mitochondria',   title: 'Mitochondria',   sub: 'Cell organelle',    when: '8 min ago',  cards: 24, status: 'new',      tag: 'BIO',  grad: 'var(--grad-orange)', subject: 'bio' },
    { id: 'hagia-sophia',   title: 'Hagia Sophia',   sub: 'Istanbul \u00b7 537 AD', when: '2 days ago', cards: 8,  status: 'saved',    tag: 'ARCH', grad: 'var(--grad-arch)',   subject: 'arch' },
    { id: 'maple-leaf',     title: 'Maple leaf',     sub: 'Acer saccharum',    when: '4 days ago', cards: 5,  status: 'saved',    tag: 'BOT',  grad: 'var(--grad-amber)',  subject: 'bot' },
    { id: 'periodic-table', title: 'Periodic table', sub: 'Mendeleev \u00b7 1869',  when: '5 days ago', cards: 18, status: 'studying', tag: 'CHEM', grad: 'var(--grad-purple)', subject: 'chem' },
    { id: 'golden-gate',    title: 'Golden gate',    sub: 'Suspension bridge', when: '1 wk ago',   cards: 6,  status: 'saved',    tag: 'ARCH', grad: 'var(--grad-rust)',   subject: 'arch' }
  ],

  dueToday: [
    { id: 'mitochondria',   title: 'Mitochondria',         sub: 'Biology \u00b7 4 reps',     when: 'due 12m',     now: true },
    { id: 'endoplasmic',    title: 'Endoplasmic reticulum', sub: 'Biology \u00b7 1 rep',      when: 'due 1h' },
    { id: 'copper-sulfate', title: 'Copper sulfate',       sub: 'Chemistry \u00b7 6 reps',   when: 'due 2h' },
    { id: 'maple-lobes',    title: 'Maple leaf \u2014 lobes',   sub: 'Botany \u00b7 3 reps',      when: 'due 5h' },
    { id: 'hagia-dome',     title: 'Hagia Sophia dome',    sub: 'Architecture \u00b7 2 reps', when: 'due tonight' }
  ],

  decks: [
    { id: 'chem-101',     subject: 'CHEMISTRY',    name: 'Chem 101',         desc: 'Inorganic salts, periodic trends, and lab-bench compounds you can scan.',  cards: 31, due: 8, status: 'ACTIVE',    grad: 'var(--grad-blue)' },
    { id: 'biology-cell', subject: 'BIOLOGY',      name: 'Cell unit',        desc: 'Organelles, transport, and the biochemistry across the inner membrane.',  cards: 24, due: 12, status: 'ACTIVE',   grad: 'var(--grad-orange)' },
    { id: 'botany-lab',   subject: 'BOTANY',       name: 'Botany lab',       desc: 'Leaves, roots, seeds \u2014 what you can scan in the school greenhouse.',     cards: 18, due: 0,  status: 'CAUGHT UP', grad: 'var(--grad-green)' },
    { id: 'arch-survey',  subject: 'ARCHITECTURE', name: 'Survey of styles', desc: 'From classical to brutalist \u2014 buildings on the city walking tour.',      cards: 9,  due: 3,  status: 'ACTIVE',   grad: 'var(--grad-arch)' },
    { id: 'mineral-id',   subject: 'GEOLOGY',      name: 'Mineral ID',       desc: 'Hardness, cleavage, streak \u2014 lab samples and field finds.',              cards: 16, due: 5,  status: 'ACTIVE',   grad: 'var(--grad-violet)' },
    { id: 'renaissance',  subject: 'ART HISTORY',  name: 'Renaissance',      desc: 'Paintings, sculpture, and the patronage politics behind them.',          cards: 12, due: 0,  status: 'SHARED',   grad: 'var(--grad-art)' },
    { id: 'mechanics',    subject: 'PHYSICS',      name: 'Mechanics',        desc: 'Forces, momentum, and the experiments behind the formulas.',             cards: 21, due: 0,  status: 'ARCHIVED', grad: 'var(--grad-physics)' },
    { id: 'solar-system', subject: 'ASTRONOMY',    name: 'Solar system',     desc: 'Planets, moons, and the spectra you can pull from a backyard telescope.', cards: 11, due: 2,  status: 'ACTIVE',   grad: 'var(--grad-astro)' }
  ],

  // -----------------------------------------------------------------------
  // Hand-authored flashcards (override LLM output when CLIP picks this id)
  // Each has clipPrompts[] so CLIP can recognize the physical subject.
  // -----------------------------------------------------------------------
  flashcards: {
    'copper-sulfate': {
      id: 'copper-sulfate',
      crumbs: ['Decks', 'Chem 101'],
      subject: 'CHEMISTRY \u00b7 INORGANIC \u00b7 SALT',
      name: 'Copper sulfate',
      formula: 'CuSO\u2084  \u00b7  5H\u2082O',
      mass: 'M = 249.69 g/mol',
      grad: 'var(--grad-blue)',
      scanned: 'SCANNED YESTERDAY',
      reviewWhen: 'Tomorrow',
      reviewAt: '9:14 AM',
      reviewProgress: { done: 3, total: 8 },
      clipPrompts: [
        'a photo of bright blue copper sulfate crystals',
        'blue crystalline chemistry compound in a petri dish',
        'vivid blue inorganic salt crystals on a lab bench',
      ],
      oneline: 'A vivid blue inorganic salt \u2014 used as a fungicide, pigment, and electrolyte in copper plating; loses its water of crystallization above 150\u00b0C.',
      facts: [
        { num: '01', label: 'CRYSTAL SYSTEM',     body: 'Triclinic \u2014 vivid cobalt-blue crystals.' },
        { num: '02', label: 'HEATED ABOVE 150\u00b0C', body: 'Loses water of crystallization \u2014 turns chalk-white.' },
        { num: '03', label: 'COMMON USES',        body: 'Fungicide on grapes; pigment in glass; electrolyte for copper plating.' },
        { num: '04', label: 'SOLUBILITY IN WATER', body: '32 g per 100 mL at 20\u00b0C \u2014 highly soluble.' }
      ]
    },
    'mitochondria': {
      id: 'mitochondria',
      crumbs: ['Decks', 'Cell unit'],
      subject: 'BIOLOGY \u00b7 ORGANELLE \u00b7 EUKARYOTIC',
      name: 'Mitochondria',
      formula: 'C\u2086H\u2081\u2082O\u2086 + 6 O\u2082',
      mass: '~ 38 ATP / glucose',
      grad: 'var(--grad-orange)',
      scanned: 'SCANNED 8 MIN AGO',
      reviewWhen: 'Today',
      reviewAt: '6:00 PM',
      reviewProgress: { done: 1, total: 4 },
      clipPrompts: [
        'a textbook diagram of a mitochondrion',
        'a cross-section illustration of mitochondria cristae',
        'a biology diagram of a cell organelle with folded inner membrane',
      ],
      oneline: 'Double-membraned organelle \u2014 site of aerobic respiration and the cell\u2019s primary ATP factory; carries its own circular DNA.',
      facts: [
        { num: '01', label: 'OUTER MEMBRANE', body: 'Smooth, permeable to small molecules via porins.' },
        { num: '02', label: 'INNER MEMBRANE', body: 'Folded into cristae \u2014 hosts the electron transport chain.' },
        { num: '03', label: 'MATRIX',         body: 'Site of the Krebs cycle and mitochondrial DNA replication.' },
        { num: '04', label: 'ENDOSYMBIOSIS',  body: 'Likely descended from an engulfed \u03b1-proteobacterium ~1.5 Bya.' }
      ]
    },
    'hagia-sophia': {
      id: 'hagia-sophia',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE \u00b7 BYZANTINE \u00b7 6TH C.',
      name: 'Hagia Sophia',
      formula: '537 AD  \u00b7  Istanbul',
      mass: 'Dome span: 31.24 m',
      grad: 'var(--grad-arch)',
      scanned: 'SCANNED 2 DAYS AGO',
      reviewWhen: 'Friday',
      reviewAt: '8:30 AM',
      reviewProgress: { done: 2, total: 6 },
      clipPrompts: [
        'a photo of the Hagia Sophia in Istanbul',
        'a byzantine domed cathedral with four minarets',
        'the Hagia Sophia exterior with its large central dome',
      ],
      oneline: 'A pendentive-domed basilica commissioned by Justinian \u2014 for nearly a thousand years the largest cathedral in the world.',
      facts: [
        { num: '01', label: 'STRUCTURAL INNOVATION', body: 'Pendentives transfer the central dome onto four piers.' },
        { num: '02', label: 'ARCHITECTS',            body: 'Anthemius of Tralles and Isidore of Miletus.' },
        { num: '03', label: 'LATER HISTORY',         body: 'Cathedral \u2192 mosque (1453) \u2192 museum (1934) \u2192 mosque (2020).' },
        { num: '04', label: 'INTERIOR LIGHT',        body: '40 windows ringing the dome create the "floating" effect.' }
      ]
    },

    'maple-leaf': {
      id: 'maple-leaf',
      crumbs: ['Decks', 'Botany lab'],
      subject: 'BOTANY \u00b7 DECIDUOUS \u00b7 ACERACEAE',
      name: 'Maple leaf',
      formula: 'Acer saccharum',
      mass: '5 lobes  \u00b7  palmate venation',
      grad: 'var(--grad-amber)',
      scanned: 'SCANNED 4 DAYS AGO',
      reviewWhen: 'Saturday',
      reviewAt: '10:45 AM',
      reviewProgress: { done: 1, total: 5 },
      clipPrompts: [
        'a photo of a maple leaf',
        'a red or orange autumn maple leaf with five lobes',
        'a sugar maple leaf with palmate venation',
      ],
      oneline: 'Palmate, simple leaf with five sharply-pointed lobes \u2014 emblem of the sugar maple and source of commercial maple syrup.',
      facts: [
        { num: '01', label: 'LEAF TYPE',       body: 'Simple leaves arranged opposite on the twig, with palmate venation.' },
        { num: '02', label: 'LOBE PATTERN',    body: 'Five lobes \u2014 middle three large, lower two reduced; rounded U-shaped sinuses between them.' },
        { num: '03', label: 'AUTUMN PIGMENTS', body: 'Anthocyanins build up as chlorophyll degrades, yielding scarlet to amber colors.' },
        { num: '04', label: 'ECONOMIC VALUE',  body: 'Sap is tapped in late winter; ~40 L of sap reduces to 1 L of syrup.' }
      ]
    },

    'periodic-table': {
      id: 'periodic-table',
      crumbs: ['Decks', 'Chem 101'],
      subject: 'CHEMISTRY \u00b7 REFERENCE \u00b7 1869',
      name: 'Periodic table',
      formula: '118 elements  \u00b7  7 periods',
      mass: 'Atomic No. 1 \u2192 118',
      grad: 'var(--grad-purple)',
      scanned: 'SCANNED 5 DAYS AGO',
      reviewWhen: 'Sunday',
      reviewAt: '7:30 PM',
      reviewProgress: { done: 4, total: 9 },
      clipPrompts: [
        'a photo of the periodic table of elements chart',
        'a colorful wall chart of chemical elements in a grid',
        'a printed periodic table showing atomic numbers and element symbols',
      ],
      oneline: 'Tabular arrangement of the chemical elements ordered by atomic number \u2014 exposing recurring patterns in valence, mass, and reactivity.',
      facts: [
        { num: '01', label: 'PERIODIC LAW', body: 'Properties of elements are a periodic function of their atomic number.' },
        { num: '02', label: 'GROUPS',       body: '18 vertical columns \u2014 atoms in the same group share their outermost electron count.' },
        { num: '03', label: 'PERIODS',      body: '7 rows \u2014 moving right, electronegativity rises and atomic radius falls.' },
        { num: '04', label: 'BLOCKS',       body: 's, p, d, f \u2014 labeled by the orbital filled last; lanthanides and actinides sit in the f-block.' }
      ]
    },

    'golden-gate': {
      id: 'golden-gate',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE \u00b7 MODERNIST \u00b7 1937',
      name: 'Golden gate',
      formula: '1937  \u00b7  San Francisco',
      mass: 'Main span: 1,280 m',
      grad: 'var(--grad-rust)',
      scanned: 'SCANNED 1 WEEK AGO',
      reviewWhen: 'Next Monday',
      reviewAt: '11:00 AM',
      reviewProgress: { done: 0, total: 4 },
      clipPrompts: [
        'a photo of the Golden Gate Bridge in San Francisco',
        'an orange suspension bridge across a bay',
        'the Golden Gate Bridge with fog around its towers',
      ],
      oneline: 'Suspension bridge across the Golden Gate strait \u2014 for 27 years the longest span in the world; its International Orange paint was chosen for visibility in coastal fog.',
      facts: [
        { num: '01', label: 'STRUCTURAL TYPE', body: 'Steel-truss suspension bridge with two 227 m towers and main cables 92 cm in diameter.' },
        { num: '02', label: 'ENGINEERS',       body: 'Designed by Joseph Strauss with Charles Ellis and Leon Moisseiff.' },
        { num: '03', label: 'PAINT COLOR',     body: 'International Orange \u2014 chosen by consulting architect Irving Morrow over the Navy\u2019s black-and-yellow proposal.' },
        { num: '04', label: 'OPENING DATE',    body: 'Pedestrian opening May 27, 1937; vehicular traffic the following day.' }
      ]
    },

    'endoplasmic': {
      id: 'endoplasmic',
      crumbs: ['Decks', 'Cell unit'],
      subject: 'BIOLOGY \u00b7 ORGANELLE \u00b7 EUKARYOTIC',
      name: 'Endoplasmic reticulum',
      formula: 'ER  \u00b7  rough + smooth',
      mass: '~ 50% of cell membrane',
      grad: 'var(--grad-orange)',
      scanned: 'SCANNED 3 DAYS AGO',
      reviewWhen: 'Today',
      reviewAt: '7:00 PM',
      reviewProgress: { done: 0, total: 3 },
      clipPrompts: [
        'a textbook diagram of the endoplasmic reticulum',
        'an illustration of rough ER with ribosomes',
        'a diagram showing ER membrane tubules in a cell',
      ],
      oneline: 'A network of membrane-bound tubules continuous with the nuclear envelope \u2014 the cell\u2019s factory floor for protein folding and lipid synthesis.',
      facts: [
        { num: '01', label: 'ROUGH ER',         body: 'Studded with ribosomes \u2014 folds and threads nascent proteins into the lumen.' },
        { num: '02', label: 'SMOOTH ER',        body: 'No ribosomes \u2014 synthesizes lipids, detoxifies drugs, and stores Ca\u00b2\u207a.' },
        { num: '03', label: 'QUALITY CONTROL',  body: 'Misfolded proteins trigger the unfolded protein response (UPR) or are sent to ER-associated degradation.' },
        { num: '04', label: 'CONNECTIVITY',     body: 'Continuous with the outer nuclear membrane; communicates with the Golgi via COPII vesicles.' }
      ]
    },

    'maple-lobes': {
      id: 'maple-lobes',
      crumbs: ['Decks', 'Botany lab'],
      subject: 'BOTANY \u00b7 MORPHOLOGY \u00b7 LEAF DETAIL',
      name: 'Maple leaf \u2014 lobes',
      formula: 'Lobus  \u00b7  palmately divided',
      mass: '5 lobes typical',
      grad: 'var(--grad-amber)',
      scanned: 'SCANNED 4 DAYS AGO',
      reviewWhen: 'Today',
      reviewAt: '5:00 PM',
      reviewProgress: { done: 0, total: 3 },
      clipPrompts: [
        'a close-up photo of a maple leaf showing its lobes and sinuses',
        'a botanical illustration of maple leaf morphology',
      ],
      oneline: 'A close study of the lobed structure of the sugar maple leaf \u2014 useful for distinguishing it from red, silver, and Norway maples in the field.',
      facts: [
        { num: '01', label: 'SINUSES', body: 'Rounded, U-shaped sinuses between lobes \u2014 a key field marker vs. the V-shaped sinuses of the silver maple.' },
        { num: '02', label: 'MARGIN',  body: 'A few large teeth per lobe rather than the fine serration of the red maple.' },
        { num: '03', label: 'TIP',     body: 'Acuminate but not bristle-tipped \u2014 Norway maple tips bear a tiny "drip-tip" hair.' },
        { num: '04', label: 'PETIOLE', body: 'Long, slender petiole with clear sap; Norway maple petioles ooze milky latex when broken.' }
      ]
    },

    'hagia-dome': {
      id: 'hagia-dome',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE \u00b7 DOME \u00b7 BYZANTINE',
      name: 'Hagia Sophia dome',
      formula: '31.24 m span  \u00b7  55.6 m height',
      mass: '40 windows \u00b7 4 pendentives',
      grad: 'var(--grad-arch)',
      scanned: 'SCANNED 2 DAYS AGO',
      reviewWhen: 'Tonight',
      reviewAt: '9:30 PM',
      reviewProgress: { done: 1, total: 3 },
      clipPrompts: [
        'a photo of the interior dome of Hagia Sophia',
        'a byzantine dome with ring of arched windows at its base',
      ],
      oneline: 'The central dome of Hagia Sophia \u2014 a shallow hemispherical cap perched on pendentives and ringed with windows that make the structure read as if it were floating.',
      facts: [
        { num: '01', label: 'PENDENTIVES',      body: 'Four spherical triangles transfer the dome\u2019s circular load onto a square base of piers.' },
        { num: '02', label: 'WINDOWS',          body: '40 arched windows at the base of the dome flood the nave with light and dematerialize the structure.' },
        { num: '03', label: 'COLLAPSE & REBUILD', body: 'Original dome collapsed in 558 \u2014 rebuilt taller and steeper by Isidore the Younger in 562.' },
        { num: '04', label: 'BUTTRESSING',      body: 'Half-domes to the east and west absorb the dome\u2019s outward thrust; massive piers do the rest.' }
      ]
    },

    'quartz': {
      id: 'quartz',
      crumbs: ['Decks', 'Mineral ID'],
      subject: 'GEOLOGY \u00b7 SILICATE \u00b7 MINERAL',
      name: 'Quartz',
      formula: 'SiO\u2082',
      mass: 'Hardness 7  \u00b7  \u03c1 = 2.65 g/cm\u00b3',
      grad: 'var(--grad-violet)',
      scanned: 'SCANNED 6 DAYS AGO',
      reviewWhen: 'Wednesday',
      reviewAt: '2:15 PM',
      reviewProgress: { done: 2, total: 5 },
      clipPrompts: [
        'a photo of a clear quartz crystal',
        'a hexagonal crystalline mineral specimen',
        'a cluster of rock crystal quartz points',
      ],
      oneline: 'A trigonal silicate built from corner-sharing SiO\u2084 tetrahedra \u2014 the most abundant mineral in continental crust and a piezoelectric workhorse.',
      facts: [
        { num: '01', label: 'CRYSTAL SYSTEM',    body: 'Trigonal \u2014 typically forms hexagonal prisms terminated by rhombohedra.' },
        { num: '02', label: 'HARDNESS',          body: 'Mohs 7 \u2014 scratches glass; benchmark for the hardness scale.' },
        { num: '03', label: 'CLEAVAGE',          body: 'None \u2014 fractures conchoidally; a key field test against feldspar.' },
        { num: '04', label: 'PIEZOELECTRICITY',  body: 'Mechanical stress generates voltage \u2014 the basis of quartz oscillators in watches and radios.' }
      ]
    },

    'mona-lisa': {
      id: 'mona-lisa',
      crumbs: ['Decks', 'Renaissance'],
      subject: 'ART HISTORY \u00b7 HIGH RENAISSANCE \u00b7 1503',
      name: 'Mona Lisa',
      formula: 'Leonardo da Vinci  \u00b7  c. 1503\u201319',
      mass: 'Oil on poplar  \u00b7  77 \u00d7 53 cm',
      grad: 'var(--grad-art)',
      scanned: 'SCANNED LAST WEEK',
      reviewWhen: 'Thursday',
      reviewAt: '4:00 PM',
      reviewProgress: { done: 3, total: 6 },
      clipPrompts: [
        'a photo of the Mona Lisa painting by Leonardo da Vinci',
        'a renaissance portrait of a woman with an enigmatic smile',
      ],
      oneline: 'Half-length portrait of Lisa Gherardini, painted in oil on a poplar panel \u2014 the canonical example of Leonardo\u2019s sfumato and the most famous painting in the world.',
      facts: [
        { num: '01', label: 'SITTER',      body: 'Lisa Gherardini, wife of Florentine silk merchant Francesco del Giocondo \u2014 hence La Gioconda.' },
        { num: '02', label: 'TECHNIQUE',   body: 'Sfumato \u2014 almost imperceptible transitions of tone, achieved by glazing thin oil layers.' },
        { num: '03', label: 'COMPOSITION', body: 'Pyramidal posture and three-quarter view became the template for Western portraiture.' },
        { num: '04', label: 'PROVENANCE',  body: 'Acquired by Fran\u00e7ois I; held by the Louvre since 1797. Stolen in 1911, recovered in 1913.' }
      ]
    },

    'newtons-laws': {
      id: 'newtons-laws',
      crumbs: ['Decks', 'Mechanics'],
      subject: 'PHYSICS \u00b7 CLASSICAL \u00b7 1687',
      name: 'Newton\u2019s laws',
      formula: 'F = m \u00b7 a',
      mass: 'Three laws of motion',
      grad: 'var(--grad-physics)',
      scanned: 'SCANNED LAST WEEK',
      reviewWhen: 'Friday',
      reviewAt: '3:30 PM',
      reviewProgress: { done: 5, total: 8 },
      clipPrompts: [
        'a physics textbook page showing Newton\u2019s laws of motion',
        'a portrait of Isaac Newton',
        'a diagram of F = m a with arrows and vectors',
      ],
      oneline: 'Three laws relating force, mass, and motion \u2014 published in the Principia (1687) and the foundation of classical mechanics for the next two centuries.',
      facts: [
        { num: '01', label: 'FIRST LAW',  body: 'A body remains at rest or in uniform motion unless acted on by a net external force (inertia).' },
        { num: '02', label: 'SECOND LAW', body: 'F = m \u00b7 a \u2014 net force equals mass times acceleration; the rate of change of momentum.' },
        { num: '03', label: 'THIRD LAW',  body: 'For every action there is an equal and opposite reaction.' },
        { num: '04', label: 'LIMITS',     body: 'Breaks down at relativistic speeds and quantum scales \u2014 superseded by relativity and quantum mechanics.' }
      ]
    },

    'jupiter': {
      id: 'jupiter',
      crumbs: ['Decks', 'Solar system'],
      subject: 'ASTRONOMY \u00b7 GAS GIANT \u00b7 OUTER PLANET',
      name: 'Jupiter',
      formula: 'M = 1.898 \u00d7 10\u00b2\u2077 kg',
      mass: '11.21 R\u2295  \u00b7  317.8 M\u2295',
      grad: 'var(--grad-astro)',
      scanned: 'SCANNED 9 DAYS AGO',
      reviewWhen: 'Saturday',
      reviewAt: '8:00 PM',
      reviewProgress: { done: 1, total: 4 },
      clipPrompts: [
        'a photo of the planet Jupiter with its great red spot',
        'a banded gas giant with swirling orange and white clouds',
      ],
      oneline: 'Fifth planet from the sun and largest in the solar system \u2014 a hydrogen-helium gas giant with 95 known moons and a 400-year-old anticyclonic storm.',
      facts: [
        { num: '01', label: 'COMPOSITION',    body: '~ 90% hydrogen, ~ 10% helium by number; trace methane, ammonia, and water.' },
        { num: '02', label: 'GREAT RED SPOT', body: 'Anticyclonic storm 1.3\u00d7 wider than Earth; observed continuously since 1830, possibly since 1665.' },
        { num: '03', label: 'MAGNETOSPHERE',  body: 'Strongest in the solar system after the Sun \u2014 14\u00d7 Earth\u2019s field at the cloud tops.' },
        { num: '04', label: 'GALILEAN MOONS', body: 'Io, Europa, Ganymede, Callisto \u2014 discovered by Galileo in 1610; Ganymede is larger than Mercury.' }
      ]
    }
  },

  // -----------------------------------------------------------------------
  // Extended recognition vocabulary — topics CLIP can recognize but whose
  // flashcard bodies are generated on demand by Ollama/Phi-3 at capture time.
  //
  // `displayName` is shown live while scanning.
  // `subject` is shown as the topic's coarse category in the detection panel.
  // `grad` picks a deck-gradient CSS variable for the card cover.
  //
  // Keep prompts specific and visual — CLIP scores pictures against text,
  // so "a photo of X in Y setting with Z feature" works far better than
  // bare noun phrases.
  // -----------------------------------------------------------------------
  extendedVocab: [
    // --- Everyday objects / common demo items ---
    { id: 'banana',        displayName: 'Banana',         subject: 'BIOLOGY \u00b7 FRUIT',            grad: 'var(--grad-amber)',   prompts: ['a photo of a ripe yellow banana', 'a bunch of bananas on a counter'] },
    { id: 'apple',         displayName: 'Apple',          subject: 'BIOLOGY \u00b7 FRUIT',            grad: 'var(--grad-rust)',    prompts: ['a photo of a red apple', 'a green granny smith apple'] },
    { id: 'orange',        displayName: 'Orange',         subject: 'BIOLOGY \u00b7 CITRUS',           grad: 'var(--grad-amber)',   prompts: ['a photo of an orange fruit', 'a whole navel orange on a table'] },
    { id: 'strawberry',    displayName: 'Strawberry',     subject: 'BIOLOGY \u00b7 BERRY',            grad: 'var(--grad-rust)',    prompts: ['a photo of fresh strawberries', 'a ripe red strawberry with green leaves'] },
    { id: 'coffee-mug',    displayName: 'Coffee mug',     subject: 'MATERIALS \u00b7 CERAMIC',        grad: 'var(--grad-arch)',    prompts: ['a photo of a ceramic coffee mug', 'a cup of coffee on a desk'] },
    { id: 'laptop',        displayName: 'Laptop',         subject: 'TECHNOLOGY \u00b7 COMPUTING',     grad: 'var(--grad-physics)', prompts: ['a photo of an open laptop computer', 'a silver laptop on a desk'] },
    { id: 'smartphone',    displayName: 'Smartphone',     subject: 'TECHNOLOGY \u00b7 MOBILE',        grad: 'var(--grad-physics)', prompts: ['a photo of a modern smartphone', 'an iphone on a table'] },
    { id: 'keyboard',      displayName: 'Keyboard',       subject: 'TECHNOLOGY \u00b7 INPUT',         grad: 'var(--grad-physics)', prompts: ['a photo of a computer keyboard', 'a mechanical keyboard on a desk'] },
    { id: 'book',          displayName: 'Book',           subject: 'OBJECT \u00b7 PRINTED',           grad: 'var(--grad-arch)',    prompts: ['a photo of an open book', 'a stack of hardcover books'] },
    { id: 'pencil',        displayName: 'Pencil',         subject: 'OBJECT \u00b7 WRITING',           grad: 'var(--grad-amber)',   prompts: ['a photo of a wooden pencil', 'a sharpened yellow pencil'] },
    { id: 'scissors',      displayName: 'Scissors',       subject: 'OBJECT \u00b7 TOOL',              grad: 'var(--grad-arch)',    prompts: ['a photo of a pair of scissors', 'steel scissors on a table'] },
    { id: 'water-bottle',  displayName: 'Water bottle',   subject: 'OBJECT \u00b7 CONTAINER',         grad: 'var(--grad-blue)',    prompts: ['a photo of a water bottle', 'a clear plastic water bottle'] },

    // --- Biology — plants, animals, anatomy ---
    { id: 'sunflower',     displayName: 'Sunflower',      subject: 'BOTANY \u00b7 ASTERACEAE',        grad: 'var(--grad-amber)',   prompts: ['a photo of a sunflower in bloom', 'a large yellow sunflower head'] },
    { id: 'rose',          displayName: 'Rose',           subject: 'BOTANY \u00b7 ROSACEAE',          grad: 'var(--grad-rust)',    prompts: ['a photo of a red rose', 'a blooming rose flower'] },
    { id: 'oak-leaf',      displayName: 'Oak leaf',       subject: 'BOTANY \u00b7 FAGACEAE',          grad: 'var(--grad-green)',   prompts: ['a photo of an oak leaf with lobed margins', 'a green oak tree leaf'] },
    { id: 'fern',          displayName: 'Fern',           subject: 'BOTANY \u00b7 PTERIDOPHYTE',      grad: 'var(--grad-green)',   prompts: ['a photo of a fern with fronds', 'a green fern leaf with many pinnae'] },
    { id: 'cactus',        displayName: 'Cactus',         subject: 'BOTANY \u00b7 CACTACEAE',         grad: 'var(--grad-green)',   prompts: ['a photo of a cactus plant', 'a prickly green cactus in a pot'] },
    { id: 'dog',           displayName: 'Dog',            subject: 'ZOOLOGY \u00b7 MAMMAL',           grad: 'var(--grad-amber)',   prompts: ['a photo of a dog', 'a domestic dog looking at the camera'] },
    { id: 'cat',           displayName: 'Cat',            subject: 'ZOOLOGY \u00b7 MAMMAL',           grad: 'var(--grad-violet)',  prompts: ['a photo of a cat', 'a domestic cat sitting'] },
    { id: 'butterfly',     displayName: 'Butterfly',      subject: 'ZOOLOGY \u00b7 INSECT',           grad: 'var(--grad-orange)',  prompts: ['a photo of a butterfly', 'a colorful butterfly on a flower'] },
    { id: 'honeybee',      displayName: 'Honeybee',       subject: 'ZOOLOGY \u00b7 INSECT',           grad: 'var(--grad-amber)',   prompts: ['a photo of a honeybee on a flower', 'a bee collecting pollen'] },
    { id: 'skeleton',      displayName: 'Skeleton',       subject: 'ANATOMY \u00b7 SKELETAL',         grad: 'var(--grad-arch)',    prompts: ['a photo of a human skeleton model', 'an anatomical skeleton diagram'] },
    { id: 'human-brain',   displayName: 'Human brain',    subject: 'ANATOMY \u00b7 NERVOUS SYSTEM',   grad: 'var(--grad-orange)',  prompts: ['a diagram of the human brain', 'a model of the brain showing lobes'] },
    { id: 'dna-helix',     displayName: 'DNA double helix', subject: 'BIOLOGY \u00b7 MOLECULAR',      grad: 'var(--grad-violet)',  prompts: ['a model of the DNA double helix', 'an illustration of DNA with base pairs'] },

    // --- Chemistry — elements, equipment, glassware ---
    { id: 'beaker',        displayName: 'Beaker',         subject: 'CHEMISTRY \u00b7 GLASSWARE',      grad: 'var(--grad-blue)',    prompts: ['a photo of a chemistry beaker', 'a glass beaker with colored liquid'] },
    { id: 'test-tube',     displayName: 'Test tube',      subject: 'CHEMISTRY \u00b7 GLASSWARE',      grad: 'var(--grad-blue)',    prompts: ['a photo of test tubes in a rack', 'a chemistry test tube with liquid'] },
    { id: 'erlenmeyer',    displayName: 'Erlenmeyer flask', subject: 'CHEMISTRY \u00b7 GLASSWARE',    grad: 'var(--grad-blue)',    prompts: ['a photo of an Erlenmeyer flask', 'a conical chemistry flask on a lab bench'] },
    { id: 'microscope',    displayName: 'Microscope',     subject: 'INSTRUMENT \u00b7 OPTICAL',       grad: 'var(--grad-violet)',  prompts: ['a photo of a compound microscope', 'a lab microscope on a desk'] },
    { id: 'bunsen-burner', displayName: 'Bunsen burner',  subject: 'CHEMISTRY \u00b7 APPARATUS',      grad: 'var(--grad-rust)',    prompts: ['a photo of a bunsen burner with blue flame', 'a lab gas burner'] },
    { id: 'salt-crystal',  displayName: 'Salt crystal',   subject: 'CHEMISTRY \u00b7 MINERAL',        grad: 'var(--grad-arch)',    prompts: ['a photo of sodium chloride salt crystals', 'a cube of rock salt'] },
    { id: 'water-molecule', displayName: 'Water molecule', subject: 'CHEMISTRY \u00b7 MOLECULE',      grad: 'var(--grad-blue)',    prompts: ['a diagram of a water molecule H2O', 'a ball-and-stick model of water'] },

    // --- Geology / minerals ---
    { id: 'amethyst',      displayName: 'Amethyst',       subject: 'GEOLOGY \u00b7 SILICATE',         grad: 'var(--grad-violet)',  prompts: ['a photo of a purple amethyst crystal geode', 'amethyst crystals in a rock'] },
    { id: 'pyrite',        displayName: 'Pyrite',         subject: 'GEOLOGY \u00b7 SULFIDE',          grad: 'var(--grad-amber)',   prompts: ['a photo of a pyrite cube (fool\u2019s gold)', 'shiny brass-yellow pyrite mineral'] },
    { id: 'granite',       displayName: 'Granite',        subject: 'GEOLOGY \u00b7 IGNEOUS',          grad: 'var(--grad-arch)',    prompts: ['a photo of a granite rock sample', 'a speckled grey granite countertop'] },
    { id: 'obsidian',      displayName: 'Obsidian',       subject: 'GEOLOGY \u00b7 VOLCANIC GLASS',   grad: 'var(--grad-astro)',   prompts: ['a photo of a black obsidian stone', 'a shiny volcanic glass rock'] },

    // --- Architecture / landmarks ---
    { id: 'eiffel-tower',  displayName: 'Eiffel Tower',   subject: 'ARCHITECTURE \u00b7 IRON \u00b7 1889', grad: 'var(--grad-arch)', prompts: ['a photo of the Eiffel Tower in Paris', 'the Eiffel Tower at sunset'] },
    { id: 'colosseum',     displayName: 'Colosseum',      subject: 'ARCHITECTURE \u00b7 ROMAN',       grad: 'var(--grad-arch)',    prompts: ['a photo of the Roman Colosseum', 'the Colosseum in Rome with arched openings'] },
    { id: 'taj-mahal',     displayName: 'Taj Mahal',      subject: 'ARCHITECTURE \u00b7 MUGHAL',      grad: 'var(--grad-arch)',    prompts: ['a photo of the Taj Mahal', 'the white marble Taj Mahal mausoleum in Agra'] },
    { id: 'parthenon',     displayName: 'Parthenon',      subject: 'ARCHITECTURE \u00b7 CLASSICAL',   grad: 'var(--grad-arch)',    prompts: ['a photo of the Parthenon in Athens', 'the ancient Greek temple with doric columns'] },
    { id: 'sydney-opera',  displayName: 'Sydney Opera House', subject: 'ARCHITECTURE \u00b7 EXPRESSIONIST', grad: 'var(--grad-blue)', prompts: ['a photo of the Sydney Opera House', 'the sail-shell roofs of the Sydney Opera House'] },

    // --- Art ---
    { id: 'starry-night',  displayName: 'The Starry Night', subject: 'ART HISTORY \u00b7 POST-IMPRESSIONISM', grad: 'var(--grad-astro)', prompts: ['a photo of Van Gogh\u2019s The Starry Night', 'a swirling blue and yellow starry night painting'] },
    { id: 'scream',        displayName: 'The Scream',     subject: 'ART HISTORY \u00b7 EXPRESSIONISM', grad: 'var(--grad-rust)',   prompts: ['a photo of Munch\u2019s The Scream painting', 'a figure with hands on face on a bridge'] },
    { id: 'david',         displayName: 'David (Michelangelo)', subject: 'ART HISTORY \u00b7 RENAISSANCE SCULPTURE', grad: 'var(--grad-arch)', prompts: ['a photo of Michelangelo\u2019s David sculpture', 'a marble statue of David by Michelangelo'] },

    // --- Astronomy ---
    { id: 'moon',          displayName: 'The Moon',       subject: 'ASTRONOMY \u00b7 NATURAL SATELLITE', grad: 'var(--grad-astro)', prompts: ['a photo of the full moon', 'the lunar surface with craters'] },
    { id: 'saturn',        displayName: 'Saturn',         subject: 'ASTRONOMY \u00b7 GAS GIANT',      grad: 'var(--grad-astro)',   prompts: ['a photo of the planet Saturn with its rings', 'Saturn and its ring system'] },
    { id: 'mars',          displayName: 'Mars',           subject: 'ASTRONOMY \u00b7 TERRESTRIAL',    grad: 'var(--grad-rust)',    prompts: ['a photo of the red planet Mars', 'Mars surface with reddish rocks'] },
    { id: 'earth',         displayName: 'Earth',          subject: 'ASTRONOMY \u00b7 TERRESTRIAL',    grad: 'var(--grad-blue)',    prompts: ['a photo of planet Earth from space', 'the blue marble Earth image'] },

    // --- Physics apparatus ---
    { id: 'pendulum',      displayName: 'Pendulum',       subject: 'PHYSICS \u00b7 OSCILLATION',      grad: 'var(--grad-physics)', prompts: ['a photo of a swinging pendulum', 'a pendulum clock mechanism'] },
    { id: 'magnet',        displayName: 'Bar magnet',     subject: 'PHYSICS \u00b7 MAGNETISM',        grad: 'var(--grad-physics)', prompts: ['a photo of a bar magnet with iron filings', 'a horseshoe magnet attracting pins'] },
    { id: 'prism',         displayName: 'Optical prism',  subject: 'PHYSICS \u00b7 OPTICS',           grad: 'var(--grad-violet)',  prompts: ['a photo of a glass prism splitting light into a rainbow', 'a triangular optical prism'] },

    // --- Musical instruments (useful for art/music cross-subject demos) ---
    { id: 'piano',         displayName: 'Piano',          subject: 'MUSIC \u00b7 INSTRUMENT',         grad: 'var(--grad-astro)',   prompts: ['a photo of a piano keyboard', 'a grand piano in a concert hall'] },
    { id: 'violin',        displayName: 'Violin',         subject: 'MUSIC \u00b7 STRING',             grad: 'var(--grad-rust)',    prompts: ['a photo of a violin with bow', 'a wooden violin on a stand'] },
    { id: 'guitar',        displayName: 'Guitar',         subject: 'MUSIC \u00b7 STRING',             grad: 'var(--grad-amber)',   prompts: ['a photo of an acoustic guitar', 'a classical guitar lying on the ground'] },
  ],
};
