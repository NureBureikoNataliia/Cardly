export interface Card {
  card_id: number;
  deck_id: number;
  card_type: string | null;
  front_text: string;
  back_text: string;
  front_media_url: string | null;
  back_media_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const cards: Card[] = [
  // Spanish Vocabulary - Basics (deck_id: 1)
  {
    card_id: 1,
    deck_id: 1,
    card_type: "basic",
    front_text: "Hello",
    back_text: "Hola",
    front_media_url: null,
    back_media_url: "https://example.com/audio/hola.mp3",
    notes: "Most common greeting",
    created_at: "2024-01-15T10:35:00Z",
    updated_at: "2024-01-15T10:35:00Z"
  },
  {
    card_id: 2,
    deck_id: 1,
    card_type: "basic",
    front_text: "Goodbye",
    back_text: "Adiós",
    front_media_url: null,
    back_media_url: "https://example.com/audio/adios.mp3",
    notes: "Formal goodbye",
    created_at: "2024-01-15T10:36:00Z",
    updated_at: "2024-01-15T10:36:00Z"
  },
  {
    card_id: 3,
    deck_id: 1,
    card_type: "basic",
    front_text: "Please",
    back_text: "Por favor",
    front_media_url: null,
    back_media_url: "https://example.com/audio/por-favor.mp3",
    notes: null,
    created_at: "2024-01-15T10:37:00Z",
    updated_at: "2024-01-15T10:37:00Z"
  },
  {
    card_id: 4,
    deck_id: 1,
    card_type: "basic",
    front_text: "Thank you",
    back_text: "Gracias",
    front_media_url: null,
    back_media_url: "https://example.com/audio/gracias.mp3",
    notes: "Used in all Spanish-speaking countries",
    created_at: "2024-01-15T10:38:00Z",
    updated_at: "2024-01-15T10:38:00Z"
  },
  {
    card_id: 5,
    deck_id: 1,
    card_type: "basic",
    front_text: "Water",
    back_text: "Agua",
    front_media_url: "https://example.com/images/water.jpg",
    back_media_url: "https://example.com/audio/agua.mp3",
    notes: "Feminine noun despite starting with 'a'",
    created_at: "2024-01-15T10:39:00Z",
    updated_at: "2024-01-15T10:39:00Z"
  },
  
  // JavaScript Interview Questions (deck_id: 2)
  {
    card_id: 6,
    deck_id: 2,
    card_type: "explanation",
    front_text: "What is a closure in JavaScript?",
    back_text: "A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.",
    front_media_url: null,
    back_media_url: null,
    notes: "Key concept for understanding scope and memory",
    created_at: "2024-01-10T09:20:00Z",
    updated_at: "2024-01-10T09:20:00Z"
  },
  {
    card_id: 7,
    deck_id: 2,
    card_type: "comparison",
    front_text: "Explain the difference between == and ===",
    back_text: "== performs type coercion before comparison, while === checks both value and type without coercion. === is generally preferred for strict equality.",
    front_media_url: null,
    back_media_url: null,
    notes: "Common source of bugs",
    created_at: "2024-01-10T09:25:00Z",
    updated_at: "2024-01-10T09:25:00Z"
  },
  {
    card_id: 8,
    deck_id: 2,
    card_type: "explanation",
    front_text: "What is the event loop?",
    back_text: "The event loop is JavaScript's mechanism for handling asynchronous operations. It continuously checks the call stack and task queue, executing tasks when the stack is empty.",
    front_media_url: null,
    back_media_url: null,
    notes: "Essential for understanding async JavaScript",
    created_at: "2024-01-10T09:30:00Z",
    updated_at: "2024-01-10T09:30:00Z"
  },
  {
    card_id: 9,
    deck_id: 2,
    card_type: "explanation",
    front_text: "What is hoisting?",
    back_text: "Hoisting is JavaScript's behavior of moving variable and function declarations to the top of their scope before code execution. Variables declared with var are hoisted but not initialized.",
    front_media_url: null,
    back_media_url: null,
    notes: "let and const are hoisted but in temporal dead zone",
    created_at: "2024-01-10T09:35:00Z",
    updated_at: "2024-01-10T09:35:00Z"
  },
  {
    card_id: 10,
    deck_id: 2,
    card_type: "explanation",
    front_text: "What is the difference between null and undefined?",
    back_text: "undefined means a variable has been declared but not assigned a value. null is an assignment value that represents no value or empty value, intentionally set by the programmer.",
    front_media_url: null,
    back_media_url: null,
    notes: "typeof null returns 'object' (historical bug)",
    created_at: "2024-01-10T09:40:00Z",
    updated_at: "2024-01-10T09:40:00Z"
  },
  
  // World Capitals (deck_id: 3)
  {
    card_id: 11,
    deck_id: 3,
    card_type: "basic",
    front_text: "What is the capital of France?",
    back_text: "Paris",
    front_media_url: "https://example.com/images/france-flag.png",
    back_media_url: "https://example.com/images/paris.jpg",
    notes: "Most visited city in the world",
    created_at: "2023-12-05T11:05:00Z",
    updated_at: "2023-12-05T11:05:00Z"
  },
  {
    card_id: 12,
    deck_id: 3,
    card_type: "basic",
    front_text: "What is the capital of Japan?",
    back_text: "Tokyo",
    front_media_url: "https://wallpaperaccess.com/full/390.gif",
    back_media_url: "https://images.ctfassets.net/rc3dlxapnu6k/38dgzPwLXEAzsiXwsiY6yd/ad37be2dd2050daad155c409c6eda4e0/iStock-1216765464.jpg?w=2120&h=1414&fl=progressive&q=50&fm=jpg",
    notes: "Largest metropolitan area in the world",
    created_at: "2023-12-05T11:06:00Z",
    updated_at: "2023-12-05T11:06:00Z"
  },
  {
    card_id: 13,
    deck_id: 3,
    card_type: "basic",
    front_text: "What is the capital of Brazil?",
    back_text: "Brasília",
    front_media_url: "https://example.com/images/brazil-flag.png",
    back_media_url: "https://example.com/images/brasilia.jpg",
    notes: "Planned city built in the 1960s",
    created_at: "2023-12-05T11:07:00Z",
    updated_at: "2023-12-05T11:07:00Z"
  },
  {
    card_id: 14,
    deck_id: 3,
    card_type: "basic",
    front_text: "What is the capital of Australia?",
    back_text: "Canberra",
    front_media_url: "https://example.com/images/australia-flag.png",
    back_media_url: "https://example.com/images/canberra.jpg",
    notes: "Not Sydney or Melbourne!",
    created_at: "2023-12-05T11:08:00Z",
    updated_at: "2023-12-05T11:08:00Z"
  },
  {
    card_id: 15,
    deck_id: 3,
    card_type: "basic",
    front_text: "What is the capital of Canada?",
    back_text: "Ottawa",
    front_media_url: "https://example.com/images/canada-flag.png",
    back_media_url: "https://example.com/images/ottawa.jpg",
    notes: "Located in Ontario province",
    created_at: "2023-12-05T11:09:00Z",
    updated_at: "2023-12-05T11:09:00Z"
  },
  
  // Biology - Cell Structure (deck_id: 4)
  {
    card_id: 16,
    deck_id: 4,
    card_type: "explanation",
    front_text: "What is the function of mitochondria?",
    back_text: "Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.",
    front_media_url: "https://example.com/images/mitochondria-diagram.png",
    back_media_url: null,
    notes: "Have their own DNA",
    created_at: "2024-01-22T13:25:00Z",
    updated_at: "2024-01-22T13:25:00Z"
  },
  {
    card_id: 17,
    deck_id: 4,
    card_type: "explanation",
    front_text: "What is the cell membrane made of?",
    back_text: "The cell membrane is composed of a phospholipid bilayer with embedded proteins.",
    front_media_url: "https://example.com/images/cell-membrane.png",
    back_media_url: null,
    notes: "Also called plasma membrane",
    created_at: "2024-01-22T13:26:00Z",
    updated_at: "2024-01-22T13:26:00Z"
  },
  {
    card_id: 18,
    deck_id: 4,
    card_type: "explanation",
    front_text: "What does the nucleus contain?",
    back_text: "The nucleus contains the cell's genetic material (DNA) organized into chromosomes.",
    front_media_url: "https://example.com/images/nucleus.png",
    back_media_url: null,
    notes: "Control center of the cell",
    created_at: "2024-01-22T13:27:00Z",
    updated_at: "2024-01-22T13:27:00Z"
  },
  {
    card_id: 19,
    deck_id: 4,
    card_type: "explanation",
    front_text: "What is the function of ribosomes?",
    back_text: "Ribosomes are responsible for protein synthesis by translating mRNA into amino acid chains.",
    front_media_url: null,
    back_media_url: null,
    notes: "Can be free-floating or attached to ER",
    created_at: "2024-01-22T13:28:00Z",
    updated_at: "2024-01-22T13:28:00Z"
  },
  {
    card_id: 20,
    deck_id: 4,
    card_type: "explanation",
    front_text: "What is the Golgi apparatus?",
    back_text: "The Golgi apparatus modifies, packages, and distributes proteins and lipids produced by the cell.",
    front_media_url: "https://example.com/images/golgi.png",
    back_media_url: null,
    notes: "Like a post office of the cell",
    created_at: "2024-01-22T13:29:00Z",
    updated_at: "2024-01-22T13:29:00Z"
  },
  
  // Music Theory Fundamentals (deck_id: 5)
  {
    card_id: 21,
    deck_id: 5,
    card_type: "basic",
    front_text: "How many notes are in a major scale?",
    back_text: "7 notes (8 including the octave)",
    front_media_url: null,
    back_media_url: null,
    notes: "Pattern: W-W-H-W-W-W-H",
    created_at: "2024-01-08T15:50:00Z",
    updated_at: "2024-01-08T15:50:00Z"
  },
  {
    card_id: 22,
    deck_id: 5,
    card_type: "basic",
    front_text: "What notes make up a C major chord?",
    back_text: "C, E, G",
    front_media_url: null,
    back_media_url: "https://example.com/audio/c-major-chord.mp3",
    notes: "Root, major third, perfect fifth",
    created_at: "2024-01-08T15:51:00Z",
    updated_at: "2024-01-08T15:51:00Z"
  },
  {
    card_id: 23,
    deck_id: 5,
    card_type: "explanation",
    front_text: "What is a time signature?",
    back_text: "A time signature indicates how many beats are in each measure and which note value gets one beat.",
    front_media_url: "https://example.com/images/time-signatures.png",
    back_media_url: null,
    notes: "e.g., 4/4 means 4 quarter notes per measure",
    created_at: "2024-01-08T15:52:00Z",
    updated_at: "2024-01-08T15:52:00Z"
  },
  
  // Medical Terminology (deck_id: 6)
  {
    card_id: 24,
    deck_id: 6,
    card_type: "basic",
    front_text: "What does the prefix 'cardio-' mean?",
    back_text: "Heart",
    front_media_url: null,
    back_media_url: null,
    notes: "e.g., cardiology, cardiovascular",
    created_at: "2023-11-30T08:10:00Z",
    updated_at: "2023-11-30T08:10:00Z"
  },
  {
    card_id: 25,
    deck_id: 6,
    card_type: "basic",
    front_text: "What does the suffix '-itis' mean?",
    back_text: "Inflammation",
    front_media_url: null,
    back_media_url: null,
    notes: "e.g., arthritis, bronchitis",
    created_at: "2023-11-30T08:11:00Z",
    updated_at: "2023-11-30T08:11:00Z"
  },
  {
    card_id: 26,
    deck_id: 6,
    card_type: "basic",
    front_text: "What does the prefix 'hemo-' or 'hemato-' mean?",
    back_text: "Blood",
    front_media_url: null,
    back_media_url: null,
    notes: "e.g., hematology, hemorrhage",
    created_at: "2023-11-30T08:12:00Z",
    updated_at: "2023-11-30T08:12:00Z"
  },
  
  // French Verbs - Present Tense (deck_id: 7)
  {
    card_id: 27,
    deck_id: 7,
    card_type: "conjugation",
    front_text: "Conjugate 'être' (to be) - je",
    back_text: "je suis",
    front_media_url: null,
    back_media_url: "https://example.com/audio/je-suis.mp3",
    notes: "Irregular verb",
    created_at: "2024-01-12T10:05:00Z",
    updated_at: "2024-01-12T10:05:00Z"
  },
  {
    card_id: 28,
    deck_id: 7,
    card_type: "conjugation",
    front_text: "Conjugate 'avoir' (to have) - tu",
    back_text: "tu as",
    front_media_url: null,
    back_media_url: "https://example.com/audio/tu-as.mp3",
    notes: "Irregular verb",
    created_at: "2024-01-12T10:06:00Z",
    updated_at: "2024-01-12T10:06:00Z"
  },
  {
    card_id: 29,
    deck_id: 7,
    card_type: "conjugation",
    front_text: "Conjugate 'parler' (to speak) - nous",
    back_text: "nous parlons",
    front_media_url: null,
    back_media_url: "https://example.com/audio/nous-parlons.mp3",
    notes: "Regular -er verb",
    created_at: "2024-01-12T10:07:00Z",
    updated_at: "2024-01-12T10:07:00Z"
  },
  
  // American History Timeline (deck_id: 8)
  {
    card_id: 30,
    deck_id: 8,
    card_type: "date",
    front_text: "When was the Declaration of Independence signed?",
    back_text: "July 4, 1776",
    front_media_url: null,
    back_media_url: "https://example.com/images/declaration.jpg",
    notes: "American Independence Day",
    created_at: "2024-01-05T12:35:00Z",
    updated_at: "2024-01-05T12:35:00Z"
  },
  {
    card_id: 31,
    deck_id: 8,
    card_type: "date",
    front_text: "When did the Civil War begin?",
    back_text: "April 12, 1861",
    front_media_url: null,
    back_media_url: null,
    notes: "Started with Battle of Fort Sumter",
    created_at: "2024-01-05T12:36:00Z",
    updated_at: "2024-01-05T12:36:00Z"
  },
  {
    card_id: 32,
    deck_id: 8,
    card_type: "date",
    front_text: "When did World War II end for the US?",
    back_text: "September 2, 1945",
    front_media_url: null,
    back_media_url: null,
    notes: "V-J Day - Japan surrendered",
    created_at: "2024-01-05T12:37:00Z",
    updated_at: "2024-01-05T12:37:00Z"
  }
];