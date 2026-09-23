import { EntityResolver as AlgoEntityResolver } from '@nexa/algorithms';
import { MetricsCollector } from '@nexa/observability';

export interface EntityFact {
  fact: string;
  source?: string;
  timestamp: Date;
  embedding?: number[];
}

export interface EntityProfile {
  canonicalName: string;
  aliases: string[];
  facts: EntityFact[];
  centroidEmbedding?: number[];
  updatedAt: Date;
}

export class MemoryEntityResolver {
  private profiles = new Map<string, EntityProfile>();

  constructor(private readonly metrics: MetricsCollector = MetricsCollector.getInstance()) {}

  /**
   * Records a fact for an entity, resolving aliases with Levenshtein <= 2 and legal suffix stripping.
   * Calculates embedding centroid across all facts.
   * Zero LLM calls.
   */
  public addFact(rawName: string, factText: string, embedding?: number[]): EntityProfile {
    this.metrics.incrementCounter('algorithmDecisions');

    const cleaned = AlgoEntityResolver.cleanName(rawName);

    // Look for existing matching canonical profile
    let targetProfile: EntityProfile | undefined;
    for (const profile of this.profiles.values()) {
      if (
        profile.canonicalName === cleaned ||
        profile.aliases.includes(rawName) ||
        AlgoEntityResolver.isSameEntity(cleaned, profile.canonicalName)
      ) {
        targetProfile = profile;
        break;
      }
    }

    const newFact: EntityFact = {
      fact: factText,
      timestamp: new Date(),
      embedding
    };

    if (targetProfile) {
      if (!targetProfile.aliases.includes(rawName)) {
        targetProfile.aliases.push(rawName);
      }
      targetProfile.facts.push(newFact);
      targetProfile.updatedAt = new Date();

      // Update centroid embedding if vector provided
      if (embedding) {
        targetProfile.centroidEmbedding = this.computeCentroid(targetProfile.facts);
      }
      return targetProfile;
    }

    // Create new profile
    const profile: EntityProfile = {
      canonicalName: cleaned || rawName.trim().toLowerCase(),
      aliases: [rawName],
      facts: [newFact],
      centroidEmbedding: embedding ? [...embedding] : undefined,
      updatedAt: new Date()
    };

    this.profiles.set(profile.canonicalName, profile);
    return profile;
  }

  private computeCentroid(facts: EntityFact[]): number[] {
    const withEmbeddings = facts.filter((f) => f.embedding && f.embedding.length > 0);
    if (withEmbeddings.length === 0) return [];

    const dim = withEmbeddings[0].embedding!.length;
    const centroid = new Array(dim).fill(0);

    for (const f of withEmbeddings) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += f.embedding![i];
      }
    }

    return centroid.map((val) => val / withEmbeddings.length);
  }

  public getProfile(name: string): EntityProfile | undefined {
    const cleaned = AlgoEntityResolver.cleanName(name);
    for (const profile of this.profiles.values()) {
      if (
        profile.canonicalName === cleaned ||
        profile.aliases.includes(name) ||
        AlgoEntityResolver.isSameEntity(cleaned, profile.canonicalName)
      ) {
        return profile;
      }
    }
    return undefined;
  }

  public getAllProfiles(): EntityProfile[] {
    return Array.from(this.profiles.values());
  }
}
