/**
 * PII (Personally Identifiable Information) Detection
 *
 * Detects Swedish PII including:
 * - Personnummer (Swedish SSN)
 * - Names
 * - Email addresses
 * - Phone numbers
 * - Addresses
 */

export interface PIIDetection {
  hasPII: boolean;
  detectedTypes: PIIType[];
  matches: PIIMatch[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type PIIType =
  | 'PERSONNUMMER'
  | 'NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'ORGANIZATION_NUMBER';

export interface PIIMatch {
  type: PIIType;
  value: string;
  position: { start: number; end: number };
  confidence: number; // 0-1
}

/**
 * Regex patterns for Swedish PII detection
 */
const PII_PATTERNS = {
  // Swedish personnummer: YYYYMMDD-XXXX or YYMMDD-XXXX or without dash
  PERSONNUMMER: [
    /\b(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[-\s]?\d{4}\b/g,
    /\b\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[-\s]?\d{4}\b/g,
  ],

  // Swedish organization number: XXXXXX-XXXX
  ORGANIZATION_NUMBER: /\b\d{6}[-\s]?\d{4}\b/g,

  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Swedish phone numbers (various formats)
  PHONE: [
    /\b0\d{1,3}[-\s]?\d{5,8}\b/g, // 08-123456, 070-1234567
    /\b\+46[-\s]?\d{1,3}[-\s]?\d{5,8}\b/g, // +46-8-123456
  ],

  // Common Swedish name patterns (heuristic)
  NAME: /\b[A-ZÅÄÖ][a-zåäö]+\s+[A-ZÅÄÖ][a-zåäö]+\b/g,
};

/**
 * Swedish common first names and surnames for better detection
 */
const SWEDISH_COMMON_NAMES = new Set([
  'Andersson',
  'Johansson',
  'Karlsson',
  'Nilsson',
  'Eriksson',
  'Larsson',
  'Olsson',
  'Persson',
  'Svensson',
  'Gustafsson',
  'Pettersson',
  'Jonsson',
  'Jansson',
  'Hansson',
  'Bengtsson',
  'Erik',
  'Lars',
  'Karl',
  'Anders',
  'Per',
  'Johan',
  'Nils',
  'Anna',
  'Maria',
  'Eva',
  'Karin',
  'Lena',
  'Emma',
]);

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIDetection {
  const matches: PIIMatch[] = [];

  // Detect personnummer
  for (const pattern of PII_PATTERNS.PERSONNUMMER) {
    const found = text.matchAll(pattern);
    for (const match of found) {
      if (match.index !== undefined && isValidPersonnummer(match[0])) {
        matches.push({
          type: 'PERSONNUMMER',
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.95,
        });
      }
    }
  }

  // Detect organization numbers
  const orgMatches = text.matchAll(PII_PATTERNS.ORGANIZATION_NUMBER);
  for (const match of orgMatches) {
    if (match.index !== undefined) {
      matches.push({
        type: 'ORGANIZATION_NUMBER',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.7,
      });
    }
  }

  // Detect emails
  const emailMatches = text.matchAll(PII_PATTERNS.EMAIL);
  for (const match of emailMatches) {
    if (match.index !== undefined) {
      matches.push({
        type: 'EMAIL',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.9,
      });
    }
  }

  // Detect phone numbers
  for (const pattern of PII_PATTERNS.PHONE) {
    const found = text.matchAll(pattern);
    for (const match of found) {
      if (match.index !== undefined) {
        matches.push({
          type: 'PHONE',
          value: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.8,
        });
      }
    }
  }

  // Detect names (with Swedish name validation)
  const nameMatches = text.matchAll(PII_PATTERNS.NAME);
  for (const match of nameMatches) {
    if (match.index !== undefined) {
      const nameParts = match[0].split(' ');
      const hasCommonSwedishName = nameParts.some((part) =>
        SWEDISH_COMMON_NAMES.has(part)
      );

      matches.push({
        type: 'NAME',
        value: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: hasCommonSwedishName ? 0.85 : 0.6,
      });
    }
  }

  // Determine severity
  const detectedTypes = [...new Set(matches.map((m) => m.type))];
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  if (detectedTypes.includes('PERSONNUMMER')) {
    severity = 'HIGH'; // Personnummer is highly sensitive
  } else if (detectedTypes.length >= 2) {
    severity = 'MEDIUM'; // Multiple PII types
  } else if (detectedTypes.length === 1) {
    severity = 'LOW';
  }

  return {
    hasPII: matches.length > 0,
    detectedTypes,
    matches,
    severity,
  };
}

/**
 * Validate Swedish personnummer using Luhn algorithm
 */
function isValidPersonnummer(pnr: string): boolean {
  // Remove dashes and spaces
  const cleaned = pnr.replace(/[-\s]/g, '');

  // Must be 10 or 12 digits
  if (!/^\d{10,12}$/.test(cleaned)) return false;

  // Use last 10 digits for validation
  const digits = cleaned.slice(-10);

  // Luhn algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(digits[i], 10);

    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(digits[9], 10);
}

/**
 * Anonymize detected PII
 */
export function anonymizePII(text: string, detection: PIIDetection): string {
  if (!detection.hasPII) return text;

  let anonymized = text;
  const replacements: { [key in PIIType]: string } = {
    PERSONNUMMER: '[PERSONNUMMER]',
    NAME: '[PERSON]',
    EMAIL: '[EMAIL]',
    PHONE: '[TELEFON]',
    ADDRESS: '[ADRESS]',
    ORGANIZATION_NUMBER: '[ORG_NR]',
  };

  // Sort matches by position (reverse) to avoid index shifting
  const sortedMatches = [...detection.matches].sort(
    (a, b) => b.position.start - a.position.start
  );

  for (const match of sortedMatches) {
    const replacement = replacements[match.type];
    anonymized =
      anonymized.slice(0, match.position.start) +
      replacement +
      anonymized.slice(match.position.end);
  }

  return anonymized;
}

/**
 * Get warning message in Swedish
 */
export function getPIIWarningMessage(detection: PIIDetection, language: 'sv' | 'en' = 'sv'): string {
  if (!detection.hasPII) return '';

  const types = detection.detectedTypes;

  if (language === 'sv') {
    const typeLabels: { [key in PIIType]: string } = {
      PERSONNUMMER: 'personnummer',
      NAME: 'namn',
      EMAIL: 'e-postadress',
      PHONE: 'telefonnummer',
      ADDRESS: 'adress',
      ORGANIZATION_NUMBER: 'organisationsnummer',
    };

    const detectedLabels = types.map((t) => typeLabels[t]).join(', ');

    if (detection.severity === 'HIGH') {
      return `⚠️ VARNING: Din text innehåller känsliga personuppgifter (${detectedLabels}). Detta kan bryta mot GDPR om det skickas till en AI-modell utanför EU.`;
    } else if (detection.severity === 'MEDIUM') {
      return `⚠️ Din text kan innehålla personuppgifter (${detectedLabels}). Kontrollera innan du skickar.`;
    } else {
      return `ℹ️ Din text kan innehålla personuppgifter (${detectedLabels}).`;
    }
  }

  // English
  const typeLabels: { [key in PIIType]: string } = {
    PERSONNUMMER: 'Swedish SSN',
    NAME: 'name',
    EMAIL: 'email address',
    PHONE: 'phone number',
    ADDRESS: 'address',
    ORGANIZATION_NUMBER: 'organization number',
  };

  const detectedLabels = types.map((t) => typeLabels[t]).join(', ');

  if (detection.severity === 'HIGH') {
    return `⚠️ WARNING: Your text contains sensitive personal data (${detectedLabels}). This may violate GDPR if sent to an AI model outside the EU.`;
  } else if (detection.severity === 'MEDIUM') {
    return `⚠️ Your text may contain personal data (${detectedLabels}). Please verify before sending.`;
  } else {
    return `ℹ️ Your text may contain personal data (${detectedLabels}).`;
  }
}
