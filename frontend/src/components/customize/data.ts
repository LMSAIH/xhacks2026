// Historical characters data
export interface Character {
  id: string;
  name: string;
  title: string;
  era: string;
  image: string;
  description: string;
  teachingStyle: string;
}

export const CHARACTERS: Character[] = [
  {
    id: "socrates",
    name: "Socrates",
    title: "Greek Philosopher",
    era: "470-399 BC",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Socrate_du_Louvre.jpg/440px-Socrate_du_Louvre.jpg",
    description: "The father of Western philosophy who taught through questioning.",
    teachingStyle: "Asks thought-provoking questions to help you discover answers yourself",
  },
  {
    id: "newton",
    name: "Isaac Newton",
    title: "Physicist & Mathematician",
    era: "1643-1727",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Portrait_of_Sir_Isaac_Newton%2C_1689.jpg/440px-Portrait_of_Sir_Isaac_Newton%2C_1689.jpg",
    description: "Discovered gravity, invented calculus, and revolutionized physics.",
    teachingStyle: "Rigorous mathematical proofs with methodical step-by-step explanations",
  },
  {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Artist & Inventor",
    era: "1452-1519",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Francesco_Melzi_-_Portrait_of_Leonardo.png/440px-Francesco_Melzi_-_Portrait_of_Leonardo.png",
    description: "The ultimate Renaissance polymath who mastered art, science, and engineering.",
    teachingStyle: "Uses visual examples and connects ideas across different fields",
  },
  {
    id: "curie",
    name: "Marie Curie",
    title: "Physicist & Chemist",
    era: "1867-1934",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/440px-Marie_Curie_c._1920s.jpg",
    description: "Two-time Nobel Prize winner who pioneered research on radioactivity.",
    teachingStyle: "Encourages hands-on experimentation and careful observation",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    title: "Physicist & Educator",
    era: "1918-1988",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Richard_Feynman_Nobel.jpg/440px-Richard_Feynman_Nobel.jpg",
    description: "Nobel laureate known for making complex physics fun and accessible.",
    teachingStyle: "Explains complex ideas simply with humor and real-world examples",
  },
  {
    id: "turing",
    name: "Alan Turing",
    title: "Computer Scientist",
    era: "1912-1954",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/440px-Alan_Turing_Aged_16.jpg",
    description: "The father of computer science and artificial intelligence.",
    teachingStyle: "Breaks down problems into logical steps with systematic reasoning",
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    title: "Theoretical Physicist",
    era: "1879-1955",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg/440px-Einstein_1921_by_F_Schmutzer_-_restoration.jpg",
    description: "Revolutionary physicist who developed the theory of relativity.",
    teachingStyle: "Uses thought experiments and creative analogies to explain complex ideas",
  },
  {
    id: "ada",
    name: "Ada Lovelace",
    title: "First Programmer",
    era: "1815-1852",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/440px-Ada_Lovelace_portrait.jpg",
    description: "Visionary mathematician who wrote the first computer algorithm.",
    teachingStyle: "Combines poetic imagination with rigorous logical thinking",
  },
  {
    id: "aristotle",
    name: "Aristotle",
    title: "Greek Philosopher",
    era: "384-322 BC",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/440px-Aristotle_Altemps_Inv8575.jpg",
    description: "Polymath who made foundational contributions to logic, science, and ethics.",
    teachingStyle: "Systematic categorization and observation-based reasoning",
  },
  {
    id: "tesla",
    name: "Nikola Tesla",
    title: "Inventor & Engineer",
    era: "1856-1943",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Tesla_circa_1890.jpeg/440px-Tesla_circa_1890.jpeg",
    description: "Visionary inventor who pioneered AC electricity and wireless technology.",
    teachingStyle: "Vivid visualization and futuristic thinking",
  },
  {
    id: "sagan",
    name: "Carl Sagan",
    title: "Astronomer & Educator",
    era: "1934-1996",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Carl_Sagan_Planetary_Society.JPG/440px-Carl_Sagan_Planetary_Society.JPG",
    description: "Beloved science communicator who made the cosmos accessible to everyone.",
    teachingStyle: "Awe-inspiring storytelling that connects science to human experience",
  },
  {
    id: "nightingale",
    name: "Florence Nightingale",
    title: "Nurse & Statistician",
    era: "1820-1910",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg/440px-Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg",
    description: "Pioneer of modern nursing and statistical data visualization.",
    teachingStyle: "Evidence-based reasoning with compassionate care",
  },
];

// Voice options data - Cloudflare Workers AI / Deepgram Aura voices
export interface Voice {
  id: string;
  name: string;
  description: string;
  personality: string;
  gender: "male" | "female";
  bestFor: string[];
}

// Default voices (fallback if backend is unavailable)
// These match the backend's Deepgram Aura voices
export const VOICES: Voice[] = [
  {
    id: "aura-asteria-en",
    name: "Asteria",
    description: "Warm & professional",
    personality: "Friendly and approachable, perfect for general tutoring",
    gender: "female",
    bestFor: ["general tutoring", "math", "science"],
  },
  {
    id: "aura-luna-en",
    name: "Luna",
    description: "Soft & calm",
    personality: "Gentle and patient, great for relaxed learning",
    gender: "female",
    bestFor: ["meditation", "language learning", "bedtime stories"],
  },
  {
    id: "aura-athena-en",
    name: "Athena",
    description: "Confident & clear",
    personality: "Assertive and articulate, ideal for business topics",
    gender: "female",
    bestFor: ["business", "presentations", "leadership"],
  },
  {
    id: "aura-hera-en",
    name: "Hera",
    description: "Mature & authoritative",
    personality: "Wise and commanding, perfect for advanced subjects",
    gender: "female",
    bestFor: ["history", "philosophy", "advanced topics"],
  },
  {
    id: "aura-orion-en",
    name: "Orion",
    description: "Deep & professional",
    personality: "Thoughtful and knowledgeable, great for technical topics",
    gender: "male",
    bestFor: ["engineering", "technical topics", "podcasts"],
  },
  {
    id: "aura-arcas-en",
    name: "Arcas",
    description: "Young & energetic",
    personality: "Enthusiastic and lively, ideal for engaging content",
    gender: "male",
    bestFor: ["gaming", "sports", "youth content"],
  },
  {
    id: "aura-perseus-en",
    name: "Perseus",
    description: "Warm & friendly",
    personality: "Approachable and helpful, versatile for any subject",
    gender: "male",
    bestFor: ["customer service", "tutorials", "general"],
  },
  {
    id: "aura-angus-en",
    name: "Angus",
    description: "British & refined",
    personality: "Sophisticated and eloquent, perfect for literature",
    gender: "male",
    bestFor: ["literature", "arts", "sophisticated topics"],
  },
  {
    id: "aura-orpheus-en",
    name: "Orpheus",
    description: "Smooth storyteller",
    personality: "Captivating narrator, ideal for creative content",
    gender: "male",
    bestFor: ["narratives", "audiobooks", "creative writing"],
  },
  {
    id: "aura-helios-en",
    name: "Helios",
    description: "Clear news anchor",
    personality: "Crisp and professional, great for formal content",
    gender: "male",
    bestFor: ["news", "announcements", "formal content"],
  },
  {
    id: "aura-zeus-en",
    name: "Zeus",
    description: "Powerful & commanding",
    personality: "Bold and inspiring, perfect for motivation",
    gender: "male",
    bestFor: ["motivation", "leadership", "epic content"],
  },
];
