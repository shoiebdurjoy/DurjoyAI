import { IOwnerProfileRepository, OwnerProfile } from './owner-profile.interface';

export class InMemoryOwnerProfileRepository implements IOwnerProfileRepository {
  private profile: OwnerProfile | null = null;

  /**
   * Retrieves the in-memory owner profile record.
   */
  public async getProfile(): Promise<OwnerProfile | null> {
    return this.profile ? { ...this.profile } : null;
  }

  /**
   * Saves a clone of the owner profile record in memory.
   * Handles null parameters by clearing the store.
   */
  public async saveProfile(profile: OwnerProfile | null): Promise<void> {
    this.profile = profile ? { ...profile } : null;
  }
}

export const ownerProfileRepository = new InMemoryOwnerProfileRepository();
