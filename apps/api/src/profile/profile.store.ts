import { Injectable } from '@nestjs/common';

export interface StoredProfile {
  userId: string;
  fullName: string;
  email: string;
  targetRoles: string[];
  skills: string[];
  preferredStages: string[];
  locations: string[];
  minSalary: number;
  bio?: string;
}

/**
 * Process-local profile. The canonical Prisma schema has no UserProfile model,
 * so this is not written to Postgres. It resets when the API process restarts.
 */
@Injectable()
export class ProfileStore {
  private readonly profiles = new Map<string, StoredProfile>();

  get(userId = 'default'): StoredProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  save(input: Partial<StoredProfile> & { fullName?: string }, userId = 'default'): StoredProfile {
    const record: StoredProfile = {
      userId,
      fullName: input.fullName || '',
      email: input.email || '',
      targetRoles: input.targetRoles || [],
      skills: input.skills || [],
      preferredStages: input.preferredStages || [],
      locations: input.locations || [],
      minSalary: Number(input.minSalary) || 0,
      bio: input.bio,
    };
    this.profiles.set(userId, record);
    return record;
  }
}
