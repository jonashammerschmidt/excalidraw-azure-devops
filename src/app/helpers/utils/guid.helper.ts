/**
 * Eine Konstante, die einen leeren oder nicht initialisierten GUID-Wert darstellt.
 *
 * Format: '00000000-0000-0000-0000-000000000000'.
 * Wird häufig als Platzhalter oder Standardwert für GUID-Propertys verwendet.
 */
export const GUID_EMPTY = '00000000-0000-0000-0000-000000000000';

/**
 * Erzeugt eine pseudo-zufällige GUID (Globally Unique Identifier) als Zeichenkette.
 *
 * Das Format entspricht dem Standardmuster: 8-4-4-4-12 hexadezimale Zeichen.
 * Hinweis: Die erzeugte GUID ist **nicht** kryptographisch sicher und sollte nicht für sicherheitsrelevante Zwecke verwendet werden.
 *
 * @returns {string} Eine pseudo-zufällig generierte GUID-Zeichenkette.
 */
export function newGuid(): string {
  return (
    generateGuidHexSegment()
    + generateGuidHexSegment()
    + '-'
    + generateGuidHexSegment()
    + '-'
    + generateGuidHexSegment()
    + '-'
    + generateGuidHexSegment()
    + '-'
    + generateGuidHexSegment()
    + generateGuidHexSegment()
    + generateGuidHexSegment()
  );
}

function generateGuidHexSegment(): string {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}
