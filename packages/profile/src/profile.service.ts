export interface UserProfileData {
  userId: string;
  name: string;
  email?: string;
  targetRoles: string[];
  skills: string[];
  preferredStages: string[];
  locations: string[];
  minSalary: number;
  rawResume?: string;
  parsedResume?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProfileService {
  private inMemoryProfiles = new Map<string, UserProfileData>();

  constructor(private readonly prismaClient?: any) {}

  public async saveProfile(data: UserProfileData): Promise<UserProfileData> {
    const record: UserProfileData = {
      ...data,
      targetRoles: [...(data.targetRoles || [])],
      skills: [...(data.skills || [])],
      preferredStages: [...(data.preferredStages || [])],
      locations: [...(data.locations || [])],
      minSalary: data.minSalary || 0,
      updatedAt: new Date(),
      createdAt: data.createdAt || new Date()
    };

    if (this.prismaClient?.userProfile) {
      try {
        const saved = await this.prismaClient.userProfile.upsert({
          where: { userId: data.userId },
          update: {
            name: data.name,
            email: data.email,
            targetRoles: data.targetRoles,
            skills: data.skills,
            preferredStages: data.preferredStages,
            locations: data.locations,
            minSalary: data.minSalary,
            rawResume: data.rawResume,
            parsedResume: data.parsedResume as any
          },
          create: {
            userId: data.userId,
            name: data.name,
            email: data.email,
            targetRoles: data.targetRoles,
            skills: data.skills,
            preferredStages: data.preferredStages,
            locations: data.locations,
            minSalary: data.minSalary,
            rawResume: data.rawResume,
            parsedResume: data.parsedResume as any
          }
        });
        return saved as UserProfileData;
      } catch {
        // Fallback to in-memory store
      }
    }

    this.inMemoryProfiles.set(data.userId, record);
    return record;
  }

  public async getProfile(userId: string): Promise<UserProfileData | null> {
    if (this.prismaClient?.userProfile) {
      try {
        const found = await this.prismaClient.userProfile.findUnique({
          where: { userId }
        });
        if (found) return found as UserProfileData;
      } catch {
        // Fallback to in-memory store
      }
    }

    return this.inMemoryProfiles.get(userId) || null;
  }

  public async deleteProfile(userId: string): Promise<boolean> {
    if (this.prismaClient?.userProfile) {
      try {
        await this.prismaClient.userProfile.delete({
          where: { userId }
        });
        return true;
      } catch {
        // Fallback
      }
    }

    return this.inMemoryProfiles.delete(userId);
  }

  public clear(): void {
    this.inMemoryProfiles.clear();
  }
}
