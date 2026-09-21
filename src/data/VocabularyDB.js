/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — VocabularyDB (Part 013)
 * ============================================================
 * 100 A0 German words, 15 categories. Every entry:
 * { id, de, en, category, difficulty (1-3), emoji }
 */
const W = (id, de, en, category, difficulty, emoji) =>
  ({ id, de, en, category, difficulty, emoji });

export const VOCABULARY = [
  // COLORS (6)
  W('rot', 'rot', 'red', 'COLORS', 1, '🔴'),
  W('blau', 'blau', 'blue', 'COLORS', 1, '🔵'),
  W('grun', 'grün', 'green', 'COLORS', 1, '🟢'),
  W('gelb', 'gelb', 'yellow', 'COLORS', 1, '🟡'),
  W('weiss', 'weiß', 'white', 'COLORS', 1, '⚪'),
  W('schwarz', 'schwarz', 'black', 'COLORS', 1, '⚫'),
  // NUMBERS (5)
  W('eins', 'eins', 'one', 'NUMBERS', 1, '1️⃣'),
  W('zwei', 'zwei', 'two', 'NUMBERS', 1, '2️⃣'),
  W('drei', 'drei', 'three', 'NUMBERS', 1, '3️⃣'),
  W('vier', 'vier', 'four', 'NUMBERS', 1, '4️⃣'),
  W('funf', 'fünf', 'five', 'NUMBERS', 1, '5️⃣'),
  // DIRECTIONS (4)
  W('links', 'links', 'left', 'DIRECTIONS', 2, '⬅️'),
  W('rechts', 'rechts', 'right', 'DIRECTIONS', 2, '➡️'),
  W('oben', 'oben', 'up', 'DIRECTIONS', 2, '⬆️'),
  W('unten', 'unten', 'down', 'DIRECTIONS', 2, '⬇️'),
  // ACTIONS (5)
  W('springen', 'springen', 'to jump', 'ACTIONS', 2, '🦘'),
  W('laufen', 'laufen', 'to run', 'ACTIONS', 2, '🏃'),
  W('stoppen', 'stoppen', 'to stop', 'ACTIONS', 2, '🛑'),
  W('tanzen', 'tanzen', 'to dance', 'ACTIONS', 2, '💃'),
  W('fallen', 'fallen', 'to fall', 'ACTIONS', 2, '🪂'),
  // FOOD (8)
  W('apfel', 'Apfel', 'apple', 'FOOD', 1, '🍎'),
  W('brot', 'Brot', 'bread', 'FOOD', 1, '🍞'),
  W('wasser', 'Wasser', 'water', 'FOOD', 1, '💧'),
  W('kaffee', 'Kaffee', 'coffee', 'FOOD', 1, '☕'),
  W('doner', 'Döner', 'döner kebab', 'FOOD', 1, '🥙'),
  W('kase', 'Käse', 'cheese', 'FOOD', 1, '🧀'),
  W('ei', 'Ei', 'egg', 'FOOD', 1, '🥚'),
  W('milch', 'Milch', 'milk', 'FOOD', 1, '🥛'),
  // ANIMALS (6)
  W('hund', 'Hund', 'dog', 'ANIMALS', 1, '🐕'),
  W('katze', 'Katze', 'cat', 'ANIMALS', 1, '🐈'),
  W('vogel', 'Vogel', 'bird', 'ANIMALS', 1, '🐦'),
  W('fisch', 'Fisch', 'fish', 'ANIMALS', 1, '🐟'),
  W('maus', 'Maus', 'mouse', 'ANIMALS', 1, '🐭'),
  W('bar', 'Bär', 'bear', 'ANIMALS', 1, '🐻'),
  // BODY (6)
  W('kopf', 'Kopf', 'head', 'BODY', 2, '🗣️'),
  W('hand', 'Hand', 'hand', 'BODY', 2, '✋'),
  W('fuss', 'Fuß', 'foot', 'BODY', 2, '🦶'),
  W('auge', 'Auge', 'eye', 'BODY', 2, '👁️'),
  W('ohr', 'Ohr', 'ear', 'BODY', 2, '👂'),
  W('mund', 'Mund', 'mouth', 'BODY', 2, '👄'),
  // OBJECTS (8)
  W('tisch', 'Tisch', 'table', 'OBJECTS', 2, '🪑'),
  W('stuhl', 'Stuhl', 'chair', 'OBJECTS', 2, '🪑'),
  W('tur', 'Tür', 'door', 'OBJECTS', 2, '🚪'),
  W('fenster', 'Fenster', 'window', 'OBJECTS', 2, '🪟'),
  W('buch', 'Buch', 'book', 'OBJECTS', 2, '📖'),
  W('auto', 'Auto', 'car', 'OBJECTS', 1, '🚗'),
  W('ball', 'Ball', 'ball', 'OBJECTS', 1, '⚽'),
  W('hut', 'Hut', 'hat', 'OBJECTS', 1, '🎩'),
  // CLOTHING (5)
  W('schuh', 'Schuh', 'shoe', 'CLOTHING', 2, '👟'),
  W('hose', 'Hose', 'pants', 'CLOTHING', 2, '👖'),
  W('jacke', 'Jacke', 'jacket', 'CLOTHING', 2, '🧥'),
  W('kleid', 'Kleid', 'dress', 'CLOTHING', 2, '👗'),
  W('socke', 'Socke', 'sock', 'CLOTHING', 2, '🧦'),
  // WEATHER (5)
  W('sonne', 'Sonne', 'sun', 'WEATHER', 1, '☀️'),
  W('regen', 'Regen', 'rain', 'WEATHER', 1, '🌧️'),
  W('schnee', 'Schnee', 'snow', 'WEATHER', 1, '❄️'),
  W('wind', 'Wind', 'wind', 'WEATHER', 1, '💨'),
  W('wolke', 'Wolke', 'cloud', 'WEATHER', 1, '☁️'),
  // PLACES (6)
  W('haus', 'Haus', 'house', 'PLACES', 1, '🏠'),
  W('schule', 'Schule', 'school', 'PLACES', 1, '🏫'),
  W('park', 'Park', 'park', 'PLACES', 1, '🌳'),
  W('strasse', 'Straße', 'street', 'PLACES', 2, '🛣️'),
  W('laden', 'Laden', 'shop', 'PLACES', 2, '🏪'),
  W('spati', 'Späti', 'late-night kiosk', 'PLACES', 2, '🌇'),
  // TIME (6)
  W('tag', 'Tag', 'day', 'TIME', 1, '🌤️'),
  W('nacht', 'Nacht', 'night', 'TIME', 1, '🌙'),
  W('morgen', 'Morgen', 'morning', 'TIME', 1, '🌅'),
  W('abend', 'Abend', 'evening', 'TIME', 1, '🌆'),
  W('uhr', 'Uhr', 'clock', 'TIME', 2, '🕰️'),
  W('stunde', 'Stunde', 'hour', 'TIME', 2, '⏳'),
  // ADJECTIVES (12)
  W('gross', 'groß', 'big', 'ADJECTIVES', 2, '🐘'),
  W('klein', 'klein', 'small', 'ADJECTIVES', 2, '🐭'),
  W('schnell', 'schnell', 'fast', 'ADJECTIVES', 2, '⚡'),
  W('langsam', 'langsam', 'slow', 'ADJECTIVES', 2, '🐢'),
  W('heiss', 'heiß', 'hot', 'ADJECTIVES', 2, '🔥'),
  W('kalt', 'kalt', 'cold', 'ADJECTIVES', 2, '🧊'),
  W('neu', 'neu', 'new', 'ADJECTIVES', 1, '✨'),
  W('alt', 'alt', 'old', 'ADJECTIVES', 1, '📜'),
  W('laut', 'laut', 'loud', 'ADJECTIVES', 2, '📢'),
  W('leise', 'leise', 'quiet', 'ADJECTIVES', 2, '🤫'),
  W('schwer', 'schwer', 'heavy', 'ADJECTIVES', 2, '🏋️'),
  W('leicht', 'leicht', 'light', 'ADJECTIVES', 2, '🎈'),
  // GREETINGS (8)
  W('hallo', 'Hallo', 'hello', 'GREETINGS', 1, '👋'),
  W('tschuss', 'Tschüss', 'bye', 'GREETINGS', 1, '👋'),
  W('danke', 'Danke', 'thank you', 'GREETINGS', 1, '🙏'),
  W('bitte', 'Bitte', 'please', 'GREETINGS', 1, '🙂'),
  W('ja', 'Ja', 'yes', 'GREETINGS', 1, '✅'),
  W('nein', 'Nein', 'no', 'GREETINGS', 1, '❌'),
  W('gut', 'Gut', 'good', 'GREETINGS', 1, '👍'),
  W('schlecht', 'Schlecht', 'bad', 'GREETINGS', 1, '👎'),
  // OPPOSITES (10) — brings the total to 100
  W('hoch', 'hoch', 'high', 'OPPOSITES', 2, '📐'),
  W('tief', 'tief', 'deep', 'OPPOSITES', 2, '🕳️'),
  W('nah', 'nah', 'near', 'OPPOSITES', 2, '📍'),
  W('fern', 'fern', 'far', 'OPPOSITES', 2, '🧭'),
  W('fruh', 'früh', 'early', 'OPPOSITES', 2, '🐣'),
  W('spat', 'spät', 'late', 'OPPOSITES', 2, '🦉'),
  W('dick', 'dick', 'thick', 'OPPOSITES', 2, '🧱'),
  W('dunn', 'dünn', 'thin', 'OPPOSITES', 2, '📏'),
  W('hell', 'hell', 'bright', 'OPPOSITES', 2, '💡'),
  W('dunkel', 'dunkel', 'dark', 'OPPOSITES', 2, '🌑'),
];

export class VocabularyDB {
  /** All 100 words. */
  getAll() { return VOCABULARY; }

  /** @param {string} c category */
  getByCategory(c) { return VOCABULARY.filter((w) => w.category === c); }

  /** @param {string} id */
  getById(id) { return VOCABULARY.find((w) => w.id === id) ?? null; }

  /** n unique random words. */
  getRandom(n) {
    return [...VOCABULARY].sort(() => Math.random() - 0.5).slice(0, n);
  }

  /** @param {1|2|3} d difficulty */
  getByDifficulty(d) { return VOCABULARY.filter((w) => w.difficulty === d); }
}
