/* ============================================================
   QUIZLER — js/data.js
   All static mock data: categories, quizzes, leaderboards,
   initial quiz history and users.
   ============================================================ */

const CATEGORIES = [
  { id: 1, name: 'Algebra',   quizCount: 2 },
  { id: 2, name: 'Geometry',  quizCount: 2 },
  { id: 3, name: 'Geography', quizCount: 2 },
  { id: 4, name: 'Chemistry', quizCount: 2 },
  { id: 5, name: 'Physics',   quizCount: 2 },
  { id: 6, name: 'Biology',   quizCount: 2 },
];

const QUIZZES = [
  {
    id: 1, title: 'Algebra Fundamentals', categoryId: 1, category: 'Algebra',
    difficulty: 'Easy', multiplier: 0.75, language: 'English', timePerQ: 30,
    updated: '10.04.2025', avgScore: 68, completedCount: 52,
    desc: 'Test your knowledge of core algebra concepts including equations, inequalities, and basic functions.',
    questions: [
      { text: 'What is the value of x in the equation 2x + 6 = 14?', opts: ['3','4','5','6'], correct: 1 },
      { text: 'Which of the following is a quadratic equation?', opts: ['3x + 2 = 0','x² + 5x + 6 = 0','2x - 7 = 9','5 = x + 1'], correct: 1 },
      { text: 'What is the slope of the line y = 3x + 2?', opts: ['2','3','5','1'], correct: 1 },
      { text: 'Simplify: 4(x + 3) - 2x', opts: ['2x + 12','6x + 3','2x + 3','4x + 12'], correct: 0 },
      { text: 'What are the roots of x² - 9 = 0?', opts: ['x = 3 only','x = ±9','x = ±3','x = 0'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'MathWiz', score:112 }, { rank:2, user:'AlgebraKing', score:104 },
      { rank:3, user:'User_67', score:98  }, { rank:4, user:'QuizKing',   score:90  },
      { rank:5, user:'LevR',    score:82  },
    ],
  },
  {
    id: 2, title: 'Advanced Algebra Challenge', categoryId: 1, category: 'Algebra',
    difficulty: 'Hard', multiplier: 1.5, language: 'English', timePerQ: 60,
    updated: '14.04.2025', avgScore: 145, completedCount: 19,
    desc: 'Push your algebra skills with complex equations, systems of equations, and polynomial expressions.',
    questions: [
      { text: 'Solve the system: x + y = 10, x - y = 4. What is x?', opts: ['3','5','7','8'], correct: 2 },
      { text: 'What is the discriminant of x² - 4x + 3 = 0?', opts: ['4','0','16','8'], correct: 0 },
      { text: 'Factor completely: x² + 7x + 12', opts: ['(x+3)(x+4)','(x+2)(x+6)','(x+1)(x+12)','(x+6)(x+2)'], correct: 0 },
      { text: 'What is the inverse function of f(x) = 2x - 6?', opts: ['f⁻¹(x) = (x+6)/2','f⁻¹(x) = 2x+6','f⁻¹(x) = x/2 - 6','f⁻¹(x) = (x-6)/2'], correct: 0 },
      { text: 'Simplify: (x³ · x²) / x⁴', opts: ['x','x²','x⁵','1'], correct: 0 },
    ],
    leaderboard: [
      { rank:1, user:'AlgebraKing', score:225 }, { rank:2, user:'MathWiz',    score:210 },
      { rank:3, user:'SciencePro',  score:195 }, { rank:4, user:'User_67',    score:178 },
      { rank:5, user:'QuizKing',    score:160 },
    ],
  },
  {
    id: 3, title: 'Geometry Basics', categoryId: 2, category: 'Geometry',
    difficulty: 'Easy', multiplier: 0.75, language: 'English', timePerQ: 30,
    updated: '08.04.2025', avgScore: 72, completedCount: 44,
    desc: 'Explore the fundamentals of plane geometry including shapes, angles, area, and perimeter.',
    questions: [
      { text: 'What is the sum of interior angles of a triangle?', opts: ['90°','180°','270°','360°'], correct: 1 },
      { text: 'What is the area of a rectangle with length 8 cm and width 5 cm?', opts: ['26 cm²','40 cm²','13 cm²','80 cm²'], correct: 1 },
      { text: 'How many sides does a hexagon have?', opts: ['5','7','6','8'], correct: 2 },
      { text: 'The circumference of a circle with radius 7 cm is approximately:', opts: ['21.98 cm','43.96 cm','153.94 cm','14 cm'], correct: 1 },
      { text: 'Two lines that never meet are called:', opts: ['Perpendicular','Intersecting','Parallel','Concurrent'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'GeoGenius', score:108 }, { rank:2, user:'MathWiz',  score:99 },
      { rank:3, user:'User_67',   score:92  }, { rank:4, user:'LevR',     score:85 },
      { rank:5, user:'QuizKing',  score:78  },
    ],
  },
  {
    id: 4, title: 'Geometry: Circles & Solids', categoryId: 2, category: 'Geometry',
    difficulty: 'Normal', multiplier: 1.0, language: 'English', timePerQ: 45,
    updated: '12.04.2025', avgScore: 103, completedCount: 27,
    desc: 'Deepen your understanding of circle theorems and 3D solid geometry.',
    questions: [
      { text: 'What is the volume of a cube with side length 4 cm?', opts: ['16 cm³','48 cm³','64 cm³','32 cm³'], correct: 2 },
      { text: 'The area of a circle with diameter 10 cm is approximately:', opts: ['31.4 cm²','78.5 cm²','314 cm²','157 cm²'], correct: 1 },
      { text: 'An angle inscribed in a semicircle is always:', opts: ['45°','60°','90°','180°'], correct: 2 },
      { text: 'What is the surface area of a sphere with radius 3 cm? (Use π ≈ 3.14)', opts: ['28.26 cm²','113.04 cm²','37.68 cm²','56.52 cm²'], correct: 1 },
      { text: 'A tangent to a circle is:', opts: ['A line passing through the centre','A chord that bisects the circle','A line that touches the circle at exactly one point','A line that crosses the circle at two points'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'GeoGenius',  score:165 }, { rank:2, user:'SciencePro', score:152 },
      { rank:3, user:'AlgebraKing',score:140 }, { rank:4, user:'MathWiz',    score:128 },
      { rank:5, user:'User_67',    score:115 },
    ],
  },
  {
    id: 5, title: 'World Geography Essentials', categoryId: 3, category: 'Geography',
    difficulty: 'Easy', multiplier: 0.75, language: 'English', timePerQ: 30,
    updated: '05.04.2025', avgScore: 65, completedCount: 61,
    desc: 'Test your knowledge of countries, capitals, continents, and major geographical features.',
    questions: [
      { text: 'What is the capital of France?', opts: ['Berlin','Madrid','Paris','Rome'], correct: 2 },
      { text: 'Which is the largest continent by area?', opts: ['Africa','North America','Asia','Europe'], correct: 2 },
      { text: 'Which river is the longest in the world?', opts: ['Amazon','Mississippi','Nile','Yangtze'], correct: 2 },
      { text: 'Which country has the largest population in the world?', opts: ['USA','India','China','Russia'], correct: 1 },
      { text: 'The Sahara Desert is located in which continent?', opts: ['Asia','South America','Africa','Australia'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'WorldExplorer', score:98 }, { rank:2, user:'User_67',   score:90 },
      { rank:3, user:'GeoGenius',     score:83 }, { rank:4, user:'QuizKing',  score:76 },
      { rank:5, user:'LevR',          score:70 },
    ],
  },
  {
    id: 6, title: 'Physical Geography Deep Dive', categoryId: 3, category: 'Geography',
    difficulty: 'Normal', multiplier: 1.0, language: 'English', timePerQ: 45,
    updated: '18.04.2025', avgScore: 96, completedCount: 33,
    desc: 'Explore climate zones, tectonic plates, ocean currents, and the physical processes shaping our planet.',
    questions: [
      { text: 'Which type of plate boundary causes earthquakes and volcanic eruptions?', opts: ['Transform','Divergent','Convergent','Parallel'], correct: 2 },
      { text: 'The Gulf Stream is an example of:', opts: ['A wind pattern','An ocean current','A mountain range','A tectonic fault'], correct: 1 },
      { text: 'Which climate zone is characterised by hot, dry summers and mild, wet winters?', opts: ['Tropical','Continental','Mediterranean','Polar'], correct: 2 },
      { text: 'What causes the seasons on Earth?', opts: ["Earth's varying distance from the Sun","Earth's axial tilt","The Moon's gravitational pull","Solar flares"], correct: 1 },
      { text: 'The deepest point in the ocean is located in:', opts: ['The Atlantic Ocean','The Indian Ocean','The Arctic Ocean','The Pacific Ocean'], correct: 3 },
    ],
    leaderboard: [
      { rank:1, user:'WorldExplorer', score:158 }, { rank:2, user:'GeoGenius',  score:144 },
      { rank:3, user:'SciencePro',    score:130 }, { rank:4, user:'User_67',    score:118 },
      { rank:5, user:'QuizKing',      score:105 },
    ],
  },
  {
    id: 7, title: 'Chemistry: Atoms & Elements', categoryId: 4, category: 'Chemistry',
    difficulty: 'Normal', multiplier: 1.0, language: 'English', timePerQ: 45,
    updated: '02.04.2025', avgScore: 105, completedCount: 38,
    desc: 'Discover the building blocks of matter — atomic structure, the periodic table, and element properties.',
    questions: [
      { text: 'How many protons does a carbon atom have?', opts: ['4','6','8','12'], correct: 1 },
      { text: 'Which element has the chemical symbol "Au"?', opts: ['Silver','Aluminium','Gold','Copper'], correct: 2 },
      { text: "What is the most abundant element in the Earth's atmosphere?", opts: ['Oxygen','Carbon dioxide','Argon','Nitrogen'], correct: 3 },
      { text: 'The atomic number of an element is determined by:', opts: ['The number of neutrons','The number of electrons in the outer shell','The number of protons','The atomic mass'], correct: 2 },
      { text: 'Which of the following is a noble gas?', opts: ['Chlorine','Hydrogen','Neon','Sodium'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'SciencePro', score:168 }, { rank:2, user:'ChemWiz',  score:155 },
      { rank:3, user:'MathWiz',    score:140 }, { rank:4, user:'User_67',  score:128 },
      { rank:5, user:'LevR',       score:115 },
    ],
  },
  {
    id: 8, title: 'Chemical Reactions & Bonding', categoryId: 4, category: 'Chemistry',
    difficulty: 'Hard', multiplier: 1.5, language: 'English', timePerQ: 60,
    updated: '21.04.2025', avgScore: 152, completedCount: 16,
    desc: 'Challenge yourself with chemical bonding types, reaction equations, and stoichiometry concepts.',
    questions: [
      { text: 'What type of bond is formed when electrons are shared between atoms?', opts: ['Ionic bond','Covalent bond','Metallic bond','Hydrogen bond'], correct: 1 },
      { text: 'In the reaction 2H₂ + O₂ → 2H₂O, what is the limiting reagent if you have 4 mol H₂ and 1 mol O₂?', opts: ['H₂','O₂','H₂O','Neither'], correct: 1 },
      { text: 'What is the pH of a neutral solution at 25°C?', opts: ['0','7','14','1'], correct: 1 },
      { text: 'Which of the following best describes an exothermic reaction?', opts: ['It absorbs heat from the surroundings','It produces a gas only','It releases heat to the surroundings','It occurs only in acidic conditions'], correct: 2 },
      { text: 'The molar mass of water (H₂O) is approximately:', opts: ['10 g/mol','16 g/mol','18 g/mol','20 g/mol'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'ChemWiz',    score:235 }, { rank:2, user:'SciencePro',  score:220 },
      { rank:3, user:'AlgebraKing',score:200 }, { rank:4, user:'MathWiz',     score:185 },
      { rank:5, user:'User_67',    score:168 },
    ],
  },
  {
    id: 9, title: 'Physics: Forces & Motion', categoryId: 5, category: 'Physics',
    difficulty: 'Normal', multiplier: 1.0, language: 'English', timePerQ: 45,
    updated: '07.04.2025', avgScore: 110, completedCount: 35,
    desc: "Test Newton's laws, kinematics, and the principles of force, acceleration, and momentum.",
    questions: [
      { text: "Newton's First Law states that an object at rest will:", opts: ['Accelerate unless a force acts on it','Remain at rest unless acted upon by a net force','Always move in a circle','Lose velocity over time due to gravity'], correct: 1 },
      { text: 'A car accelerates from 0 to 20 m/s in 4 seconds. What is its acceleration?', opts: ['4 m/s²','5 m/s²','80 m/s²','10 m/s²'], correct: 1 },
      { text: 'What is the unit of force in the SI system?', opts: ['Joule','Watt','Newton','Pascal'], correct: 2 },
      { text: 'If a 10 kg object has a velocity of 3 m/s, what is its momentum?', opts: ['3.3 kg·m/s','13 kg·m/s','30 kg·m/s','0.3 kg·m/s'], correct: 2 },
      { text: 'Which of the following is a scalar quantity?', opts: ['Velocity','Force','Speed','Acceleration'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'PhysicsGuru', score:175 }, { rank:2, user:'SciencePro', score:162 },
      { rank:3, user:'MathWiz',     score:148 }, { rank:4, user:'User_67',    score:135 },
      { rank:5, user:'ChemWiz',     score:122 },
    ],
  },
  {
    id: 10, title: 'Physics: Energy & Waves', categoryId: 5, category: 'Physics',
    difficulty: 'Hard', multiplier: 1.5, language: 'English', timePerQ: 60,
    updated: '22.04.2025', avgScore: 148, completedCount: 21,
    desc: 'Explore energy conservation, thermodynamics, wave properties, and electromagnetic radiation.',
    questions: [
      { text: 'Which law states that energy cannot be created or destroyed?', opts: ["Newton's Second Law","The Law of Conservation of Energy","Ohm's Law","Boyle's Law"], correct: 1 },
      { text: 'What is the frequency of a wave with a period of 0.02 seconds?', opts: ['2 Hz','20 Hz','50 Hz','100 Hz'], correct: 2 },
      { text: 'Which type of wave requires a medium to travel through?', opts: ['Electromagnetic wave','Light wave','Mechanical wave','Radio wave'], correct: 2 },
      { text: 'The work done by a force of 10 N moving an object 5 m is:', opts: ['2 J','15 J','50 J','0.5 J'], correct: 2 },
      { text: 'Which part of the electromagnetic spectrum has the shortest wavelength?', opts: ['Radio waves','Infrared','Visible light','Gamma rays'], correct: 3 },
    ],
    leaderboard: [
      { rank:1, user:'PhysicsGuru', score:228 }, { rank:2, user:'SciencePro',  score:212 },
      { rank:3, user:'ChemWiz',     score:195 }, { rank:4, user:'AlgebraKing', score:180 },
      { rank:5, user:'User_67',     score:165 },
    ],
  },
  {
    id: 11, title: 'Biology: Cells & Life', categoryId: 6, category: 'Biology',
    difficulty: 'Easy', multiplier: 0.75, language: 'English', timePerQ: 30,
    updated: '03.04.2025', avgScore: 70, completedCount: 58,
    desc: 'Explore the fundamental unit of life — cell structure, organelles, and basic biological processes.',
    questions: [
      { text: 'What is the powerhouse of the cell?', opts: ['Nucleus','Ribosome','Mitochondria','Vacuole'], correct: 2 },
      { text: 'Which organelle controls what enters and exits the cell?', opts: ['Cell wall','Golgi apparatus','Cell membrane','Endoplasmic reticulum'], correct: 2 },
      { text: 'DNA is found mainly in which organelle?', opts: ['Mitochondria','Nucleus','Ribosome','Lysosome'], correct: 1 },
      { text: 'Which of the following is found in plant cells but NOT in animal cells?', opts: ['Mitochondria','Cell membrane','Chloroplast','Nucleus'], correct: 2 },
      { text: 'What process do plants use to make food using sunlight?', opts: ['Respiration','Transpiration','Photosynthesis','Fermentation'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'BioNerd',    score:105 }, { rank:2, user:'SciencePro', score:97 },
      { rank:3, user:'User_67',    score:90  }, { rank:4, user:'ChemWiz',    score:82 },
      { rank:5, user:'WorldExplorer', score:75 },
    ],
  },
  {
    id: 12, title: 'Biology: Genetics & Evolution', categoryId: 6, category: 'Biology',
    difficulty: 'Normal', multiplier: 1.0, language: 'English', timePerQ: 45,
    updated: '19.04.2025', avgScore: 108, completedCount: 29,
    desc: 'Explore inheritance, DNA structure, natural selection, and the mechanisms driving evolution.',
    questions: [
      { text: 'What are the monomers of DNA called?', opts: ['Amino acids','Nucleotides','Fatty acids','Monosaccharides'], correct: 1 },
      { text: 'In a monohybrid cross between two Aa parents, what fraction of offspring will be aa?', opts: ['1/2','1/4','3/4','0'], correct: 1 },
      { text: 'Which scientist proposed the theory of natural selection?', opts: ['Gregor Mendel','Louis Pasteur','Charles Darwin','James Watson'], correct: 2 },
      { text: 'What is the term for a change in the DNA sequence of a gene?', opts: ['Mitosis','Mutation','Meiosis','Transcription'], correct: 1 },
      { text: 'How many chromosomes does a normal human body cell contain?', opts: ['23','44','46','48'], correct: 2 },
    ],
    leaderboard: [
      { rank:1, user:'BioNerd',    score:172 }, { rank:2, user:'SciencePro', score:158 },
      { rank:3, user:'ChemWiz',    score:145 }, { rank:4, user:'User_67',    score:132 },
      { rank:5, user:'PhysicsGuru',score:118 },
    ],
  },
];

const GLOBAL_LEADERBOARD = [
  { rank:1, user:'SciencePro',   score:1380 }, { rank:2, user:'MathWiz',      score:1245 },
  { rank:3, user:'PhysicsGuru',  score:1120 }, { rank:4, user:'ChemWiz',      score:1058 },
  { rank:5, user:'BioNerd',      score:980  }, { rank:6, user:'GeoGenius',    score:912  },
  { rank:7, user:'AlgebraKing',  score:855  }, { rank:8, user:'WorldExplorer',score:790  },
  { rank:9, user:'User_67',      score:728  }, { rank:10,user:'QuizKing',     score:651  },
];

const CAT_LEADERBOARDS = {
  1: [{ rank:1,user:'AlgebraKing',score:329},{rank:2,user:'MathWiz',score:314},{rank:3,user:'SciencePro',score:295},{rank:4,user:'User_67',score:276},{rank:5,user:'QuizKing',score:250}],
  2: [{ rank:1,user:'GeoGenius', score:273},{rank:2,user:'MathWiz',score:255},{rank:3,user:'SciencePro',score:240},{rank:4,user:'AlgebraKing',score:228},{rank:5,user:'User_67',score:207}],
  3: [{ rank:1,user:'WorldExplorer',score:256},{rank:2,user:'GeoGenius',score:238},{rank:3,user:'SciencePro',score:220},{rank:4,user:'User_67',score:208},{rank:5,user:'QuizKing',score:181}],
  4: [{ rank:1,user:'ChemWiz',   score:390},{rank:2,user:'SciencePro',score:368},{rank:3,user:'AlgebraKing',score:340},{rank:4,user:'MathWiz',score:325},{rank:5,user:'User_67',score:296}],
  5: [{ rank:1,user:'PhysicsGuru',score:403},{rank:2,user:'SciencePro',score:374},{rank:3,user:'ChemWiz',score:317},{rank:4,user:'AlgebraKing',score:300},{rank:5,user:'User_67',score:278}],
  6: [{ rank:1,user:'BioNerd',   score:277},{rank:2,user:'SciencePro',score:255},{rank:3,user:'ChemWiz',score:227},{rank:4,user:'User_67',score:222},{rank:5,user:'PhysicsGuru',score:193}],
};

// Default quiz history (used if no session history exists yet)
const DEFAULT_QUIZ_HISTORY = [
  { quiz:'Algebra Fundamentals',       category:'Algebra',   score:98,  date:'20.04.2025', quizId:1  },
  { quiz:'World Geography Essentials', category:'Geography', score:90,  date:'15.04.2025', quizId:5  },
  { quiz:'Physics: Forces & Motion',   category:'Physics',   score:135, date:'10.04.2025', quizId:9  },
  { quiz:'Biology: Cells & Life',      category:'Biology',   score:90,  date:'05.04.2025', quizId:11 },
];

// Default user accounts. Passwords stored in plain text for prototype only.
const DEFAULT_USERS = [
  { email:'user@quizler.com',  username:'User_67', password:'password123', role:'player',
    registrationDate:'01.01.2025', totalPoints:728 },
  { email:'admin@quizler.com', username:'Admin',   password:'admin12345',  role:'admin',
    registrationDate:'01.01.2025', totalPoints:0   },
];
