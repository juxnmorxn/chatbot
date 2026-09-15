/**
 * Utilidades para normalización de texto y comparación difusa (Fuzzy Matching)
 * Permite encontrar coincidencias en nombres propios aun con faltas ortográficas,
 * ausencia de tildes o variaciones tipográficas comunes.
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
 * Calcula el coeficiente de Dice (Bigramas) para medir similitud fonética/estructural (0 a 1)
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
 * Valida estrictamente el nombre de pila (primer nombre) para evitar que personas con los mismos
 * apellidos (ej. hermanos o parientes) se confundan entre sí.
 */
export function computeNameMatchScore(query: string, targetName: string): number {
  const qClean = cleanPersonName(query);
  const tClean = cleanPersonName(targetName);

  const qNorm = normalizeText(qClean);
  const tNorm = normalizeText(tClean);

  if (!qNorm || !tNorm) return 0;
  if (qNorm === tNorm) return 100;

  // Tokenización excluyendo palabras vacías
  const qTokens = qNorm.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));
  const tTokens = tNorm.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w));

  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  // 1. VALIDACIÓN DEL NOMBRE DE PILA (Primer nombre propio):
  // En español el primer token (ej. "Virginia" vs "Magdalena") es el nombre de pila.
  // Si los primeros nombres son completamente distintos, NO deben coincidir aunque compartan ambos apellidos.
  const qFirstName = qTokens[0];
  let firstNameMatched = false;
  let bestFirstNameSim = 0;

  for (const tWord of tTokens) {
    if (qFirstName === tWord) {
      firstNameMatched = true;
      bestFirstNameSim = 1.0;
      break;
    }
    const maxLen = Math.max(qFirstName.length, tWord.length);
    const dist = levenshteinDistance(qFirstName, tWord);
    const maxAllowedDist = maxLen >= 6 ? 2 : (maxLen >= 4 ? 1 : 0);
    if (dist <= maxAllowedDist) {
      const sim = 1.0 - (dist / maxLen);
      if (sim > bestFirstNameSim) bestFirstNameSim = sim;
      if (sim >= 0.7) firstNameMatched = true;
    }
  }

  // Si el usuario ingresó nombre y apellido(s), pero el primer nombre no coincide en absoluto
  if (qTokens.length >= 2 && !firstNameMatched && bestFirstNameSim < 0.6) {
    // Penalización estricta: son personas distintas con mismos apellidos
    return Math.round(bestFirstNameSim * 30);
  }

  // Si una cadena contiene exactamente a la otra y el primer nombre coincide
  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) {
    const lengthRatio = Math.min(qNorm.length, tNorm.length) / Math.max(qNorm.length, tNorm.length);
    return Math.round(80 + (20 * lengthRatio));
  }

  // 2. Comparación token por token para tolerar errores como "gonzales" vs "gonzalez"
  let matchedTokensScore = 0;
  for (const qWord of qTokens) {
    let bestWordMatch = 0;
    for (const tWord of tTokens) {
      if (qWord === tWord) {
        bestWordMatch = 1.0;
        break;
      }
      const maxLen = Math.max(qWord.length, tWord.length);
      const dist = levenshteinDistance(qWord, tWord);
      const maxAllowedDist = maxLen >= 6 ? 2 : (maxLen >= 4 ? 1 : 0);
      if (dist <= maxAllowedDist) {
        const sim = 1.0 - (dist / maxLen);
        if (sim > bestWordMatch) bestWordMatch = sim;
      } else {
        const dice = diceCoefficient(qWord, tWord);
        if (dice > 0.7 && dice > bestWordMatch) bestWordMatch = dice;
      }
    }
    matchedTokensScore += bestWordMatch;
  }

  const tokenCoverage = matchedTokensScore / qTokens.length;
  const diceOverall = diceCoefficient(qNorm, tNorm);

  const finalScore = (tokenCoverage * 0.75 + diceOverall * 0.25) * 100;
  return Math.round(Math.min(100, Math.max(0, finalScore)));
}
