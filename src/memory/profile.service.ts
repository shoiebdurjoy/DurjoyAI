import { IMemoryRepository, UserProfile } from './memory.interface';
import { memoryRepository } from './memory.repository';

export class ProfileService {
  constructor(private readonly repo: IMemoryRepository = memoryRepository) {}

  /**
   * Retrieves the existing profile for a user or instantiates and registers a new default one.
   *
   * @param userId The unique user identifier
   * @param displayName Default fallback display name
   * @returns The resolved UserProfile
   */
  public async getOrCreateProfile(userId: string, displayName = 'User'): Promise<UserProfile> {
    const existing = await this.repo.getUserProfile(userId);
    if (existing) {
      return existing;
    }

    const defaultProfile: UserProfile = {
      userId,
      displayName,
      timezone: 'UTC',
      language: 'en',
      preferredName: displayName,
      personalityPreferences: [],
      favoriteTopics: [],
      goals: [],
      customFacts: [],
    };

    await this.repo.saveUserProfile(defaultProfile);
    return defaultProfile;
  }

  /**
   * Updates an existing user profile with incremental details.
   */
  public async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'userId'>>,
  ): Promise<UserProfile> {
    const profile = await this.getOrCreateProfile(userId);
    const updatedProfile: UserProfile = {
      ...profile,
      ...updates,
    };
    await this.repo.saveUserProfile(updatedProfile);
    return updatedProfile;
  }

  /**
   * Appends an important custom fact about the user.
   */
  public async addCustomFact(userId: string, fact: string): Promise<UserProfile> {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile.customFacts.includes(fact)) {
      profile.customFacts.push(fact);
      await this.repo.saveUserProfile(profile);
    }
    return profile;
  }
}

export const profileService = new ProfileService();
