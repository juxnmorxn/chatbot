/**
 * Utilidades para normalización de texto y comparación difusa (Fuzzy Matching)
 * Permite encontrar coincidencias en nombres propios aun con faltas ortográficas,
 * ausencia de tildes, intercambio b/v, z/c/s, o variaciones tipográficas comunes.
 */

/**
 * Normaliza un texto:
 * - Convierte a minúsculas
 * - Remueve acentos y diacríticos (á -> a, é -> e, etc.)
 * - Remueve caracteres especiales o puntuación no alfanumérica
 * - Remueve espacios dobles o redundantes
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .replace(/[^a-z0-9\s]/g, ' ')     // Conserva solo letras, números y espacios
    .replace(/\s+/g, ' ')            // Reemplaza múltiples espacios por uno
    .trim();
}

/**
 * Normalización fonética adaptada al español:
 * - b y v suenan igual (v -> b)
 * - z, c (ante e,i) y s suenan igual (z -> s, ce/ci -> se/si)
 * - ll e y suenan igual (ll -> y)
 * - h es muda (se elimina)
 * - qu y k suenan como k (qu -> k, c antes de a,o,u -> k)
 * - Letras dobles consecutivas se reducen (rr -> r, mm -> m, nn -> n, etc.)
 */
export function phoneticNormalize(text: string): string {
  let s = normalizeText(text);
  if (!s) return '';
  s = s.replace(/h/g, '');
  s = s.replace(/v/g, 'b');
  s = s.replace(/z/g, 's');
  s = s.replace(/c(?=[ei])/g, 's');
  s = s.replace(/qu/g, 'k');
  s = s.replace(/c(?=[aou])/g, 'k');
  s = s.replace(/ll/g, 'y');
  s = s.replace(/(.)\1+/g, '$1'); // Reducir letras duplicadas (ej: marribel -> maribel)
  return s.trim();
}

/**
 * Genera fragmentos de búsqueda (trigramas y prefijos fonéticos) para consultas SQL en SQLite/Turso
 */
export function generateSearchFragments(query: string): string[] {
  const norm = normalizeText(query);
  const phon = phoneticNormalize(query);
  const words = Array.from(new Set([...norm.split(' '), ...phon.split(' ')])).filter(w => w.length >= 2);
  const fragments = new Set<string>();

  for (const w of words) {
    // Prefijos de 3 y 4 letras
    if (w.length >= 3) fragments.add(w.slice(0, 3));
    if (w.length >= 4) fragments.add(w.slice(0, 4));
    // Palabra completa
    fragments.add(w);

    // Trigramas internos si la palabra tiene 4 o más caracteres
    for (let i = 0; i <= w.length - 3; i++) {
      fragments.add(w.slice(i, i + 3));
    }
  }

  return Array.from(fragments).filter(f => f.length >= 3).slice(0, 12);
}

/**
 * Calcula la distancia Levenshtein entre dos cadenas
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // sustitución
          Math.min(
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // borrado
          )
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Calcula el coeficiente de Dice (Bigramas) para medir similitud estructural (0 a 1)
 */
export function diceCoefficient(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substr(i, 2);
    const count = bigrams1.get(bigram) || 0;
    bigrams1.set(bigram, count + 1);
  }

  let intersectionSize = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substr(i, 2);
    const count = bigrams1.get(bigram) || 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / ((s1.length - 1) + (s2.length - 1));
}

/**
 * Palabras comunes irrelevantes en nombres de personas o descripciones de ONU
 */
const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'onu', 'cliente', 'casa', 'soy', 'yo', 'me', 'llamo', 'mi', 'nombre', 'es', 'hola']);

/**
 * Elimina prefijos numéricos de contrato comunes en SmartOLT (ej: "2095-Magdalena", "696-Maria")
 * y limpia frases conversacionales comunes (ej: "soy virginia no magdalena", "hola me llamo juan")
 */
export function cleanPersonName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^[0-9]+[-\s_]+/g, '') // Elimina prefijos como "2095-", "696 "
    .replace(/^(cli|onu|srv|cto)[-_0-9]+\s*/i, '')
    .replace(/^(?:hola|buenas|buen dia|buen día|buenas tardes|buenas noches|que tal|hey|hi)?\s*(?:soy|me llamo|mi nombre es|yo soy|mi nombre)\s+/i, '')
    .replace(/\b(?:no)\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+/gi, '') // Elimina aclaraciones negativas como "no magdalena", "no pedro"
    .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula un puntaje de coincidencia global (0 a 100) entre la consulta del usuario y un registro.
 * Soporta:
 * 1. Errores tipográficos fuertes (ej. "maribel", "mribel", "marribel", "marivel", "arrivel").
 * 2. Nombre de pila + 1 solo apellido (ej. "Maribel Lopez" vs "MARIBEL LOPEZ HERNANDEZ").
 * 3. 1 solo nombre (ej. "Maribel" vs "MARIBEL HERNANDEZ").
 * 4. Fonética en español (b/v, z/c/s, h muda, etc.).
 */
export function computeNameMatchScore(query: string, targetName: string): number {
  const qClean = cleanPersonName(query);
  const tClean = cleanPersonName(targetName);

  const qNorm = normalizeText(qClean);
  const tNorm = normalizeText(tClean);

  if (!qNorm || !tNorm) return 0;
  if (qNorm === tNorm) return 100;

  const qPhon = phoneticNormalize(qClean);
  const tPhon = phoneticNormalize(tClean);
  if (qPhon === tPhon) return 98;

  // Tokenización excluyendo palabras vacías
  const qTokens = qNorm.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const tTokens = tNorm.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const qPhonTokens = qPhon.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const tPhonTokens = tPhon.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));

  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  // Evaluar cobertura de palabras del query en el target
  let allQueryWordsMatched = true;
  let totalTokenMatchScore = 0;

  for (let i = 0; i < qTokens.length; i++) {
    const qWord = qTokens[i];
    const qPWord = qPhonTokens[i] || qWord;
    let bestMatchForThisToken = 0;

    for (let j = 0; j < tTokens.length; j++) {
      const tWord = tTokens[j];
      const tPWord = tPhonTokens[j] || tWord;

      // 1. Coincidencia exacta estándar o fonética
      if (qWord === tWord || qPWord === tPWord) {
        bestMatchForThisToken = 1.0;
        break;
      }

      // 2. Substring directo
      if (tWord.startsWith(qWord) || qWord.startsWith(tWord) || tPWord.startsWith(qPWord) || qPWord.startsWith(tPWord)) {
        const ratio = Math.min(qWord.length, tWord.length) / Math.max(qWord.length, tWord.length);
        if (ratio >= 0.6) {
          bestMatchForThisToken = Math.max(bestMatchForThisToken, 0.85 + (ratio * 0.1));
          continue;
        }
      }

      // 3. Distancia Levenshtein estándar y fonética
      const maxLen = Math.max(qWord.length, tWord.length);
      const distStd = levenshteinDistance(qWord, tWord);
      const distPhon = levenshteinDistance(qPWord, tPWord);
      const bestDist = Math.min(distStd, distPhon);

      // Tolerancia según longitud:
      // >= 6 caracteres: hasta 2 errores (ej. "maribel" vs "arrivel" / "mribel")
      // >= 4 caracteres: hasta 1 error (ej. "juan" vs "jua")
      const maxAllowedDist = maxLen >= 6 ? 2 : (maxLen >= 4 ? 1 : 0);
      if (bestDist <= maxAllowedDist) {
        const sim = 1.0 - (bestDist / (maxLen + 1));
        if (sim > bestMatchForThisToken) bestMatchForThisToken = sim;
      } else {
        const dice = Math.max(diceCoefficient(qWord, tWord), diceCoefficient(qPWord, tPWord));
        if (dice >= 0.65 && dice > bestMatchForThisToken) {
          bestMatchForThisToken = dice;
        }
      }
    }

    if (bestMatchForThisToken < 0.65) {
      allQueryWordsMatched = false;
    }
    totalTokenMatchScore += bestMatchForThisToken;
  }

  const queryCoverage = totalTokenMatchScore / qTokens.length;

  // Validación de Primer Nombre (Nombre de Pila)
  const qFirstName = qTokens[0];
  const qPFirstName = qPhonTokens[0] || qFirstName;
  let firstNameMatched = false;
  let bestFirstNameSim = 0;

  for (let j = 0; j < tTokens.length; j++) {
    const tWord = tTokens[j];
    const tPWord = tPhonTokens[j] || tWord;

    if (qFirstName === tWord || qPFirstName === tPWord) {
      firstNameMatched = true;
      bestFirstNameSim = 1.0;
      break;
    }
    const maxLen = Math.max(qFirstName.length, tWord.length);
    const dist = Math.min(levenshteinDistance(qFirstName, tWord), levenshteinDistance(qPFirstName, tPWord));
    const maxAllowedDist = maxLen >= 6 ? 2 : (maxLen >= 4 ? 1 : 0);
    if (dist <= maxAllowedDist) {
      const sim = 1.0 - (dist / (maxLen + 1));
      if (sim > bestFirstNameSim) bestFirstNameSim = sim;
      if (sim >= 0.65) firstNameMatched = true;
    }
  }

  // Si el primer nombre no coincide nada (personas distintas con apellidos iguales)
  if (!firstNameMatched && bestFirstNameSim < 0.55) {
    return Math.round(bestFirstNameSim * 20);
  }

  // Si todas las palabras del usuario (ej. 1 nombre o 1 nombre + 1 apellido) coincidieron sólidamente:
  if (allQueryWordsMatched && queryCoverage >= 0.8) {
    return Math.round(82 + (queryCoverage * 16));
  }

  const diceOverall = Math.max(diceCoefficient(qNorm, tNorm), diceCoefficient(qPhon, tPhon));
  const finalScore = (queryCoverage * 0.70 + diceOverall * 0.30) * 100;
  return Math.round(Math.min(100, Math.max(0, finalScore)));
}
