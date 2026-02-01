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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Socrate_du_Louvre.jpg/220px-Socrate_du_Louvre.jpg",
    description: "The father of Western philosophy who taught through questioning.",
    teachingStyle: "Asks thought-provoking questions to help you discover answers yourself",
  },
  {
    id: "hypatia",
    name: "Hypatia",
    title: "Mathematician & Astronomer",
    era: "350-415 AD",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Hypatia_portrait.png/220px-Hypatia_portrait.png",
    description: "One of history's first notable female mathematicians and philosophers.",
    teachingStyle: "Gives precise, structured explanations with mathematical clarity",
  },
  {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Artist & Inventor",
    era: "1452-1519",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Francesco_Melzi_-_Portrait_of_Leonardo.png/220px-Francesco_Melzi_-_Portrait_of_Leonardo.png",
    description: "The ultimate Renaissance polymath who mastered art, science, and engineering.",
    teachingStyle: "Uses visual examples and connects ideas across different fields",
  },
  {
    id: "curie",
    name: "Marie Curie",
    title: "Physicist & Chemist",
    era: "1867-1934",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/220px-Marie_Curie_c._1920s.jpg",
    description: "Two-time Nobel Prize winner who pioneered research on radioactivity.",
    teachingStyle: "Encourages hands-on experimentation and careful observation",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    title: "Physicist & Educator",
    era: "1918-1988",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/4/42/Richard_Feynman_Nobel.jpg/220px-Richard_Feynman_Nobel.jpg",
    description: "Nobel laureate known for making complex physics fun and accessible.",
    teachingStyle: "Explains complex ideas simply with humor and real-world examples",
  },
  {
    id: "turing",
    name: "Alan Turing",
    title: "Computer Scientist",
    era: "1912-1954",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Alan_Turing_Aged_16.jpg/220px-Alan_Turing_Aged_16.jpg",
    description: "The father of computer science and artificial intelligence.",
    teachingStyle: "Breaks down problems into logical steps with systematic reasoning",
  },
];

// Voice options data
export interface Voice {
  id: string;
  name: string;
  description: string;
  personality: string;
}

export const VOICES: Voice[] = [
  {
    id: "alloy",
    name: "Alloy",
    description: "Neutral & balanced",
    personality: "Professional and clear, good for any subject",
  },
  {
    id: "echo",
    name: "Echo",
    description: "Warm & thoughtful",
    personality: "Calm and reassuring, great for complex topics",
  },
  {
    id: "fable",
    name: "Fable",
    description: "British & expressive",
    personality: "Engaging storyteller, perfect for history and literature",
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Deep & authoritative",
    personality: "Confident and commanding, ideal for science and math",
  },
  {
    id: "nova",
    name: "Nova",
    description: "Bright & friendly",
    personality: "Energetic and encouraging, great for beginners",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    description: "Soft & clear",
    personality: "Gentle and patient, perfect for step-by-step learning",
  },
];
