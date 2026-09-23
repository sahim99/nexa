import { TitleNormalizer } from '../normalization/title-normalizer';

export class EntityResolver {
  private static readonly SUFFIXES = [
    /\binc\.?\b/gi,
    /\bllc\.?\b/gi,
    /\bcorp\.?\b/gi,
    /\bcorporation\b/gi,
    /\bltd\.?\b/gi,
    /\blimited\b/gi,
    /\btechnologies\b/gi,
    /\btechnology\b/gi,
    /\bco\.?\b/gi,
    /\bcompany\b/gi,
    /\bgroup\b/gi
  ];

  /**
   * Cleans company/entity name by removing corporate legal suffixes and punctuation.
   */
  public static cleanName(name: string): string {
    if (!name) return '';
    let cleaned = name.trim().toLowerCase();
    for (const suffix of EntityResolver.SUFFIXES) {
      cleaned = cleaned.replace(suffix, '');
    }
    return cleaned.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, ' ');
  }

  /**
   * Resolves whether two entity names refer to the same company.
   * Uses suffix stripping + Levenshtein distance <= 2.
   */
  public static isSameEntity(nameA: string, nameB: string): boolean {
    const cleanA = EntityResolver.cleanName(nameA);
    const cleanB = EntityResolver.cleanName(nameB);

    if (cleanA === cleanB) {
      return true;
    }

    if (Math.abs(cleanA.length - cleanB.length) <= 2) {
      const dist = TitleNormalizer.levenshtein(cleanA, cleanB);
      if (dist <= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves a raw company name to a canonical entity cluster.
   */
  public static resolveToCanonical(rawName: string, knownEntities: string[]): string {
    const cleanedRaw = EntityResolver.cleanName(rawName);

    for (const known of knownEntities) {
      if (EntityResolver.isSameEntity(cleanedRaw, known)) {
        return known;
      }
    }

    return rawName.trim();
  }
}
