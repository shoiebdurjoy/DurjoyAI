import { ownerProfileService } from './owner-profile.service';
import { DEFAULT_OWNER_PROFILE } from './owner-profile.constants';

/**
 * Initializes and loads the default Owner Profile (Brain 0) into memory at startup.
 */
export async function loadOwnerProfile(): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log('[Owner Profile Loader] Initializing Brain 0 (Owner Profile)...');
    await ownerProfileService.updateProfile(DEFAULT_OWNER_PROFILE);
    // eslint-disable-next-line no-console
    console.log('[Owner Profile Loader] Brain 0 loaded successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Owner Profile Loader] Failed to initialize Brain 0:', error);
  }
}
