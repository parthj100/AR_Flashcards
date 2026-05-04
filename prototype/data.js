// === Lens prototype data ===
window.LENS_DATA = {
  user: { name: 'Parth Joshi', initials: 'PJ', plan: 'Free plan · 7-day streak' },

  myDecks: [
    { id: 'biology-cell', name: 'Biology · cell unit', count: 24, dot: '#4a7fc6' },
    { id: 'botany-lab',   name: 'Botany lab',          count: 18, dot: '#4F8C5C' },
    { id: 'chem-101',     name: 'Chem 101',            count: 31, dot: '#6F509E' },
    { id: 'arch-survey',  name: 'Architecture survey', count: 9,  dot: '#A88468' }
  ],

  recentScans: [
    { id: 'copper-sulfate', title: 'Copper sulfate', sub: 'CuSO₄ · 5H₂O',     when: 'Yesterday',  cards: 12, status: 'studying', tag: 'CHEM', grad: 'var(--grad-blue)',   subject: 'chem' },
    { id: 'mitochondria',   title: 'Mitochondria',   sub: 'Cell organelle',    when: '8 min ago',  cards: 24, status: 'new',      tag: 'BIO',  grad: 'var(--grad-orange)', subject: 'bio' },
    { id: 'hagia-sophia',   title: 'Hagia Sophia',   sub: 'Istanbul · 537 AD', when: '2 days ago', cards: 8,  status: 'saved',    tag: 'ARCH', grad: 'var(--grad-arch)',   subject: 'arch' },
    { id: 'maple-leaf',     title: 'Maple leaf',     sub: 'Acer saccharum',    when: '4 days ago', cards: 5,  status: 'saved',    tag: 'BOT',  grad: 'var(--grad-amber)',  subject: 'bot' },
    { id: 'periodic-table', title: 'Periodic table', sub: 'Mendeleev · 1869',  when: '5 days ago', cards: 18, status: 'studying', tag: 'CHEM', grad: 'var(--grad-purple)', subject: 'chem' },
    { id: 'golden-gate',    title: 'Golden gate',    sub: 'Suspension bridge', when: '1 wk ago',   cards: 6,  status: 'saved',    tag: 'ARCH', grad: 'var(--grad-rust)',   subject: 'arch' }
  ],

  dueToday: [
    { id: 'mitochondria',   title: 'Mitochondria',         sub: 'Biology · 4 reps',     when: 'due 12m',     now: true },
    { id: 'endoplasmic',    title: 'Endoplasmic reticulum', sub: 'Biology · 1 rep',      when: 'due 1h' },
    { id: 'copper-sulfate', title: 'Copper sulfate',       sub: 'Chemistry · 6 reps',   when: 'due 2h' },
    { id: 'maple-lobes',    title: 'Maple leaf — lobes',   sub: 'Botany · 3 reps',      when: 'due 5h' },
    { id: 'hagia-dome',     title: 'Hagia Sophia dome',    sub: 'Architecture · 2 reps', when: 'due tonight' }
  ],

  decks: [
    { id: 'chem-101',     subject: 'CHEMISTRY',    name: 'Chem 101',         desc: 'Inorganic salts, periodic trends, and lab-bench compounds you can scan.',  cards: 31, due: 8, status: 'ACTIVE',    grad: 'var(--grad-blue)' },
    { id: 'biology-cell', subject: 'BIOLOGY',      name: 'Cell unit',        desc: 'Organelles, transport, and the biochemistry across the inner membrane.',  cards: 24, due: 12, status: 'ACTIVE',   grad: 'var(--grad-orange)' },
    { id: 'botany-lab',   subject: 'BOTANY',       name: 'Botany lab',       desc: 'Leaves, roots, seeds — what you can scan in the school greenhouse.',     cards: 18, due: 0,  status: 'CAUGHT UP', grad: 'var(--grad-green)' },
    { id: 'arch-survey',  subject: 'ARCHITECTURE', name: 'Survey of styles', desc: 'From classical to brutalist — buildings on the city walking tour.',      cards: 9,  due: 3,  status: 'ACTIVE',   grad: 'var(--grad-arch)' },
    { id: 'mineral-id',   subject: 'GEOLOGY',      name: 'Mineral ID',       desc: 'Hardness, cleavage, streak — lab samples and field finds.',              cards: 16, due: 5,  status: 'ACTIVE',   grad: 'var(--grad-violet)' },
    { id: 'renaissance',  subject: 'ART HISTORY',  name: 'Renaissance',      desc: 'Paintings, sculpture, and the patronage politics behind them.',          cards: 12, due: 0,  status: 'SHARED',   grad: 'var(--grad-art)' },
    { id: 'mechanics',    subject: 'PHYSICS',      name: 'Mechanics',        desc: 'Forces, momentum, and the experiments behind the formulas.',             cards: 21, due: 0,  status: 'ARCHIVED', grad: 'var(--grad-physics)' },
    { id: 'solar-system', subject: 'ASTRONOMY',    name: 'Solar system',     desc: 'Planets, moons, and the spectra you can pull from a backyard telescope.', cards: 11, due: 2,  status: 'ACTIVE',   grad: 'var(--grad-astro)' }
  ],

  flashcards: {
    'copper-sulfate': {
      id: 'copper-sulfate',
      crumbs: ['Decks', 'Chem 101'],
      subject: 'CHEMISTRY · INORGANIC · SALT',
      name: 'Copper sulfate',
      formula: 'CuSO₄  ·  5H₂O',
      mass: 'M = 249.69 g/mol',
      grad: 'var(--grad-blue)',
      scanned: 'SCANNED YESTERDAY',
      reviewWhen: 'Tomorrow',
      reviewAt: '9:14 AM',
      reviewProgress: { done: 3, total: 8 },
      oneline: 'A vivid blue inorganic salt — used as a fungicide, pigment, and electrolyte in copper plating; loses its water of crystallization above 150°C.',
      facts: [
        { num: '01', label: 'CRYSTAL SYSTEM',     body: 'Triclinic — vivid cobalt-blue crystals.' },
        { num: '02', label: 'HEATED ABOVE 150°C', body: 'Loses water of crystallization — turns chalk-white.' },
        { num: '03', label: 'COMMON USES',        body: 'Fungicide on grapes; pigment in glass; electrolyte for copper plating.' },
        { num: '04', label: 'SOLUBILITY IN WATER', body: '32 g per 100 mL at 20°C — highly soluble.' }
      ]
    },
    'mitochondria': {
      id: 'mitochondria',
      crumbs: ['Decks', 'Cell unit'],
      subject: 'BIOLOGY · ORGANELLE · EUKARYOTIC',
      name: 'Mitochondria',
      formula: 'C₆H₁₂O₆ + 6 O₂',
      mass: '~ 38 ATP / glucose',
      grad: 'var(--grad-orange)',
      scanned: 'SCANNED 8 MIN AGO',
      reviewWhen: 'Today',
      reviewAt: '6:00 PM',
      reviewProgress: { done: 1, total: 4 },
      oneline: 'Double-membraned organelle — site of aerobic respiration and the cell\'s primary ATP factory; carries its own circular DNA.',
      facts: [
        { num: '01', label: 'OUTER MEMBRANE', body: 'Smooth, permeable to small molecules via porins.' },
        { num: '02', label: 'INNER MEMBRANE', body: 'Folded into cristae — hosts the electron transport chain.' },
        { num: '03', label: 'MATRIX',         body: 'Site of the Krebs cycle and mitochondrial DNA replication.' },
        { num: '04', label: 'ENDOSYMBIOSIS',  body: 'Likely descended from an engulfed α-proteobacterium ~1.5 Bya.' }
      ]
    },
    'hagia-sophia': {
      id: 'hagia-sophia',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE · BYZANTINE · 6TH C.',
      name: 'Hagia Sophia',
      formula: '537 AD  ·  Istanbul',
      mass: 'Dome span: 31.24 m',
      grad: 'var(--grad-arch)',
      scanned: 'SCANNED 2 DAYS AGO',
      reviewWhen: 'Friday',
      reviewAt: '8:30 AM',
      reviewProgress: { done: 2, total: 6 },
      oneline: 'A pendentive-domed basilica commissioned by Justinian — for nearly a thousand years the largest cathedral in the world.',
      facts: [
        { num: '01', label: 'STRUCTURAL INNOVATION', body: 'Pendentives transfer the central dome onto four piers.' },
        { num: '02', label: 'ARCHITECTS',            body: 'Anthemius of Tralles and Isidore of Miletus.' },
        { num: '03', label: 'LATER HISTORY',         body: 'Cathedral → mosque (1453) → museum (1934) → mosque (2020).' },
        { num: '04', label: 'INTERIOR LIGHT',        body: '40 windows ringing the dome create the "floating" effect.' }
      ]
    },

    'maple-leaf': {
      id: 'maple-leaf',
      crumbs: ['Decks', 'Botany lab'],
      subject: 'BOTANY · DECIDUOUS · ACERACEAE',
      name: 'Maple leaf',
      formula: 'Acer saccharum',
      mass: '5 lobes  ·  palmate venation',
      grad: 'var(--grad-amber)',
      scanned: 'SCANNED 4 DAYS AGO',
      reviewWhen: 'Saturday',
      reviewAt: '10:45 AM',
      reviewProgress: { done: 1, total: 5 },
      oneline: 'Palmate, simple leaf with five sharply-pointed lobes — emblem of the sugar maple and source of commercial maple syrup.',
      facts: [
        { num: '01', label: 'LEAF TYPE',       body: 'Simple leaves arranged opposite on the twig, with palmate venation.' },
        { num: '02', label: 'LOBE PATTERN',    body: 'Five lobes — middle three large, lower two reduced; rounded U-shaped sinuses between them.' },
        { num: '03', label: 'AUTUMN PIGMENTS', body: 'Anthocyanins build up as chlorophyll degrades, yielding scarlet to amber colors.' },
        { num: '04', label: 'ECONOMIC VALUE',  body: 'Sap is tapped in late winter; ~40 L of sap reduces to 1 L of syrup.' }
      ]
    },

    'periodic-table': {
      id: 'periodic-table',
      crumbs: ['Decks', 'Chem 101'],
      subject: 'CHEMISTRY · REFERENCE · 1869',
      name: 'Periodic table',
      formula: '118 elements  ·  7 periods',
      mass: 'Atomic No. 1 → 118',
      grad: 'var(--grad-purple)',
      scanned: 'SCANNED 5 DAYS AGO',
      reviewWhen: 'Sunday',
      reviewAt: '7:30 PM',
      reviewProgress: { done: 4, total: 9 },
      oneline: 'Tabular arrangement of the chemical elements ordered by atomic number — exposing recurring patterns in valence, mass, and reactivity.',
      facts: [
        { num: '01', label: 'PERIODIC LAW', body: 'Properties of elements are a periodic function of their atomic number.' },
        { num: '02', label: 'GROUPS',       body: '18 vertical columns — atoms in the same group share their outermost electron count.' },
        { num: '03', label: 'PERIODS',      body: '7 rows — moving right, electronegativity rises and atomic radius falls.' },
        { num: '04', label: 'BLOCKS',       body: 's, p, d, f — labeled by the orbital filled last; lanthanides and actinides sit in the f-block.' }
      ]
    },

    'golden-gate': {
      id: 'golden-gate',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE · MODERNIST · 1937',
      name: 'Golden gate',
      formula: '1937  ·  San Francisco',
      mass: 'Main span: 1,280 m',
      grad: 'var(--grad-rust)',
      scanned: 'SCANNED 1 WEEK AGO',
      reviewWhen: 'Next Monday',
      reviewAt: '11:00 AM',
      reviewProgress: { done: 0, total: 4 },
      oneline: 'Suspension bridge across the Golden Gate strait — for 27 years the longest span in the world; its International Orange paint was chosen for visibility in coastal fog.',
      facts: [
        { num: '01', label: 'STRUCTURAL TYPE', body: 'Steel-truss suspension bridge with two 227 m towers and main cables 92 cm in diameter.' },
        { num: '02', label: 'ENGINEERS',       body: 'Designed by Joseph Strauss with Charles Ellis and Leon Moisseiff.' },
        { num: '03', label: 'PAINT COLOR',     body: 'International Orange — chosen by consulting architect Irving Morrow over the Navy\'s black-and-yellow proposal.' },
        { num: '04', label: 'OPENING DATE',    body: 'Pedestrian opening May 27, 1937; vehicular traffic the following day.' }
      ]
    },

    'endoplasmic': {
      id: 'endoplasmic',
      crumbs: ['Decks', 'Cell unit'],
      subject: 'BIOLOGY · ORGANELLE · EUKARYOTIC',
      name: 'Endoplasmic reticulum',
      formula: 'ER  ·  rough + smooth',
      mass: '~ 50% of cell membrane',
      grad: 'var(--grad-orange)',
      scanned: 'SCANNED 3 DAYS AGO',
      reviewWhen: 'Today',
      reviewAt: '7:00 PM',
      reviewProgress: { done: 0, total: 3 },
      oneline: 'A network of membrane-bound tubules continuous with the nuclear envelope — the cell\'s factory floor for protein folding and lipid synthesis.',
      facts: [
        { num: '01', label: 'ROUGH ER',         body: 'Studded with ribosomes — folds and threads nascent proteins into the lumen.' },
        { num: '02', label: 'SMOOTH ER',        body: 'No ribosomes — synthesizes lipids, detoxifies drugs, and stores Ca²⁺.' },
        { num: '03', label: 'QUALITY CONTROL',  body: 'Misfolded proteins trigger the unfolded protein response (UPR) or are sent to ER-associated degradation.' },
        { num: '04', label: 'CONNECTIVITY',     body: 'Continuous with the outer nuclear membrane; communicates with the Golgi via COPII vesicles.' }
      ]
    },

    'maple-lobes': {
      id: 'maple-lobes',
      crumbs: ['Decks', 'Botany lab'],
      subject: 'BOTANY · MORPHOLOGY · LEAF DETAIL',
      name: 'Maple leaf — lobes',
      formula: 'Lobus  ·  palmately divided',
      mass: '5 lobes typical',
      grad: 'var(--grad-amber)',
      scanned: 'SCANNED 4 DAYS AGO',
      reviewWhen: 'Today',
      reviewAt: '5:00 PM',
      reviewProgress: { done: 0, total: 3 },
      oneline: 'A close study of the lobed structure of the sugar maple leaf — useful for distinguishing it from red, silver, and Norway maples in the field.',
      facts: [
        { num: '01', label: 'SINUSES', body: 'Rounded, U-shaped sinuses between lobes — a key field marker vs. the V-shaped sinuses of the silver maple.' },
        { num: '02', label: 'MARGIN',  body: 'A few large teeth per lobe rather than the fine serration of the red maple.' },
        { num: '03', label: 'TIP',     body: 'Acuminate but not bristle-tipped — Norway maple tips bear a tiny "drip-tip" hair.' },
        { num: '04', label: 'PETIOLE', body: 'Long, slender petiole with clear sap; Norway maple petioles ooze milky latex when broken.' }
      ]
    },

    'hagia-dome': {
      id: 'hagia-dome',
      crumbs: ['Decks', 'Survey of styles'],
      subject: 'ARCHITECTURE · DOME · BYZANTINE',
      name: 'Hagia Sophia dome',
      formula: '31.24 m span  ·  55.6 m height',
      mass: '40 windows · 4 pendentives',
      grad: 'var(--grad-arch)',
      scanned: 'SCANNED 2 DAYS AGO',
      reviewWhen: 'Tonight',
      reviewAt: '9:30 PM',
      reviewProgress: { done: 1, total: 3 },
      oneline: 'The central dome of Hagia Sophia — a shallow hemispherical cap perched on pendentives and ringed with windows that make the structure read as if it were floating.',
      facts: [
        { num: '01', label: 'PENDENTIVES',      body: 'Four spherical triangles transfer the dome\'s circular load onto a square base of piers.' },
        { num: '02', label: 'WINDOWS',          body: '40 arched windows at the base of the dome flood the nave with light and dematerialize the structure.' },
        { num: '03', label: 'COLLAPSE & REBUILD', body: 'Original dome collapsed in 558 — rebuilt taller and steeper by Isidore the Younger in 562.' },
        { num: '04', label: 'BUTTRESSING',      body: 'Half-domes to the east and west absorb the dome\'s outward thrust; massive piers do the rest.' }
      ]
    },

    'quartz': {
      id: 'quartz',
      crumbs: ['Decks', 'Mineral ID'],
      subject: 'GEOLOGY · SILICATE · MINERAL',
      name: 'Quartz',
      formula: 'SiO₂',
      mass: 'Hardness 7  ·  ρ = 2.65 g/cm³',
      grad: 'var(--grad-violet)',
      scanned: 'SCANNED 6 DAYS AGO',
      reviewWhen: 'Wednesday',
      reviewAt: '2:15 PM',
      reviewProgress: { done: 2, total: 5 },
      oneline: 'A trigonal silicate built from corner-sharing SiO₄ tetrahedra — the most abundant mineral in continental crust and a piezoelectric workhorse.',
      facts: [
        { num: '01', label: 'CRYSTAL SYSTEM',    body: 'Trigonal — typically forms hexagonal prisms terminated by rhombohedra.' },
        { num: '02', label: 'HARDNESS',          body: 'Mohs 7 — scratches glass; benchmark for the hardness scale.' },
        { num: '03', label: 'CLEAVAGE',          body: 'None — fractures conchoidally; a key field test against feldspar.' },
        { num: '04', label: 'PIEZOELECTRICITY',  body: 'Mechanical stress generates voltage — the basis of quartz oscillators in watches and radios.' }
      ]
    },

    'mona-lisa': {
      id: 'mona-lisa',
      crumbs: ['Decks', 'Renaissance'],
      subject: 'ART HISTORY · HIGH RENAISSANCE · 1503',
      name: 'Mona Lisa',
      formula: 'Leonardo da Vinci  ·  c. 1503–19',
      mass: 'Oil on poplar  ·  77 × 53 cm',
      grad: 'var(--grad-art)',
      scanned: 'SCANNED LAST WEEK',
      reviewWhen: 'Thursday',
      reviewAt: '4:00 PM',
      reviewProgress: { done: 3, total: 6 },
      oneline: 'Half-length portrait of Lisa Gherardini, painted in oil on a poplar panel — the canonical example of Leonardo\'s sfumato and the most famous painting in the world.',
      facts: [
        { num: '01', label: 'SITTER',      body: 'Lisa Gherardini, wife of Florentine silk merchant Francesco del Giocondo — hence La Gioconda.' },
        { num: '02', label: 'TECHNIQUE',   body: 'Sfumato — almost imperceptible transitions of tone, achieved by glazing thin oil layers.' },
        { num: '03', label: 'COMPOSITION', body: 'Pyramidal posture and three-quarter view became the template for Western portraiture.' },
        { num: '04', label: 'PROVENANCE',  body: 'Acquired by François I; held by the Louvre since 1797. Stolen in 1911, recovered in 1913.' }
      ]
    },

    'newtons-laws': {
      id: 'newtons-laws',
      crumbs: ['Decks', 'Mechanics'],
      subject: 'PHYSICS · CLASSICAL · 1687',
      name: 'Newton\'s laws',
      formula: 'F = m · a',
      mass: 'Three laws of motion',
      grad: 'var(--grad-physics)',
      scanned: 'SCANNED LAST WEEK',
      reviewWhen: 'Friday',
      reviewAt: '3:30 PM',
      reviewProgress: { done: 5, total: 8 },
      oneline: 'Three laws relating force, mass, and motion — published in the Principia (1687) and the foundation of classical mechanics for the next two centuries.',
      facts: [
        { num: '01', label: 'FIRST LAW',  body: 'A body remains at rest or in uniform motion unless acted on by a net external force (inertia).' },
        { num: '02', label: 'SECOND LAW', body: 'F = m · a — net force equals mass times acceleration; the rate of change of momentum.' },
        { num: '03', label: 'THIRD LAW',  body: 'For every action there is an equal and opposite reaction.' },
        { num: '04', label: 'LIMITS',     body: 'Breaks down at relativistic speeds and quantum scales — superseded by relativity and quantum mechanics.' }
      ]
    },

    'jupiter': {
      id: 'jupiter',
      crumbs: ['Decks', 'Solar system'],
      subject: 'ASTRONOMY · GAS GIANT · OUTER PLANET',
      name: 'Jupiter',
      formula: 'M = 1.898 × 10²⁷ kg',
      mass: '11.21 R⊕  ·  317.8 M⊕',
      grad: 'var(--grad-astro)',
      scanned: 'SCANNED 9 DAYS AGO',
      reviewWhen: 'Saturday',
      reviewAt: '8:00 PM',
      reviewProgress: { done: 1, total: 4 },
      oneline: 'Fifth planet from the sun and largest in the solar system — a hydrogen-helium gas giant with 95 known moons and a 400-year-old anticyclonic storm.',
      facts: [
        { num: '01', label: 'COMPOSITION',    body: '~ 90% hydrogen, ~ 10% helium by number; trace methane, ammonia, and water.' },
        { num: '02', label: 'GREAT RED SPOT', body: 'Anticyclonic storm 1.3× wider than Earth; observed continuously since 1830, possibly since 1665.' },
        { num: '03', label: 'MAGNETOSPHERE',  body: 'Strongest in the solar system after the Sun — 14× Earth\'s field at the cloud tops.' },
        { num: '04', label: 'GALILEAN MOONS', body: 'Io, Europa, Ganymede, Callisto — discovered by Galileo in 1610; Ganymede is larger than Mercury.' }
      ]
    }
  }
};
