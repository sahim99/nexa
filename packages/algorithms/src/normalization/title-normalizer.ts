export class TitleNormalizer {
  private static readonly CANONICAL_MAP: Record<string, string> = {
    'sr swe': 'senior software engineer',
    'sr. swe': 'senior software engineer',
    'swe': 'software engineer',
    'swe ii': 'software engineer ii',
    'swe iii': 'software engineer iii',
    'fullstack dev': 'full stack engineer',
    'full stack dev': 'full stack engineer',
    'full-stack dev': 'full stack engineer',
    'fullstack engineer': 'full stack engineer',
    'frontend dev': 'frontend engineer',
    'front end dev': 'frontend engineer',
    'backend dev': 'backend engineer',
    'back end dev': 'backend engineer',
    'sr engineer': 'senior engineer',
    'sr software engineer': 'senior software engineer',
    'sr. software engineer': 'senior software engineer',
    'staff swe': 'staff software engineer',
    'lead dev': 'lead developer',
    'tech lead': 'technical lead',
    'devops eng': 'devops engineer',
    'sre': 'site reliability engineer',
    'infra eng': 'infrastructure engineer',
    'cloud eng': 'cloud engineer',
    'ai eng': 'ai engineer',
    'ml eng': 'machine learning engineer',
    'data eng': 'data engineer'
  };

  /**
   * Levenshtein distance computation
   */
  public static levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Normalizes a raw job title using exact taxonomy dictionary or Levenshtein distance <= 3.
   */
  public static normalize(rawTitle: string): string {
    if (!rawTitle) return '';
    const clean = rawTitle.toLowerCase().trim();

    // 1. Direct dictionary match
    if (TitleNormalizer.CANONICAL_MAP[clean]) {
      return TitleNormalizer.CANONICAL_MAP[clean];
    }

    // 2. Partial prefix / token replacements
    let normalized = clean;
    if (normalized.startsWith('sr. ') || normalized.startsWith('sr ')) {
      normalized = normalized.replace(/^sr\.?\s+/, 'senior ');
    }
    if (normalized.endsWith(' dev')) {
      normalized = normalized.replace(/\s+dev$/, ' developer');
    }
    if (normalized.includes('swe')) {
      normalized = normalized.replace(/\bswe\b/g, 'software engineer');
    }

    if (TitleNormalizer.CANONICAL_MAP[normalized]) {
      return TitleNormalizer.CANONICAL_MAP[normalized];
    }

    // 3. Levenshtein fallback (distance <= 3) against keys in canonical map
    for (const [key, canonical] of Object.entries(TitleNormalizer.CANONICAL_MAP)) {
      if (Math.abs(clean.length - key.length) <= 3) {
        if (TitleNormalizer.levenshtein(clean, key) <= 2) {
          return canonical;
        }
      }
    }

    return normalized;
  }
}
