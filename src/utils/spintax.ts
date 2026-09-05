/**
 * Spintax Utility
 * Transforma patrones del tipo "{Hola|Buen día|Estimado(a)}" en una opción aleatoria.
 * Es crucial para evitar que WhatsApp detecte patrones repetitivos de spam.
 */
export function parseSpintax(text: string): string {
  const spintaxRegex = /\{([^{}]+)\}/g;
  let matchesFound = true;

  while (matchesFound) {
    matchesFound = false;
    text = text.replace(spintaxRegex, (_match, group) => {
      matchesFound = true;
      const choices = group.split('|');
      const randomIndex = Math.floor(Math.random() * choices.length);
      return choices[randomIndex].trim();
    });
  }

  return text;
}

/**
 * Genera un delay aleatorio (jitter) en milisegundos entre min y max.
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Normaliza un número de teléfono de WhatsApp a 10 dígitos (estilo nacional).
 * Ejemplo: "5215512345678" -> "5512345678", "525512345678" -> "5512345678"
 */
export function normalizePhone10(rawPhone: string): string {
  const cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return cleaned;
}
