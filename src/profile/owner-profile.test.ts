/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ownerProfileService } from './owner-profile.service';
import { loadOwnerProfile } from './owner-profile.loader';
import { DEFAULT_OWNER_PROFILE } from './owner-profile.constants';

describe('Durjoy AI Owner Profile (Brain 0) Tests', () => {
  it('should calculate age dynamically from birth date correctly', () => {
    // Test case 1: Birthdate 2002-11-11
    // The current server time is 2026-07-19.
    // 2026-07-19 minus 2002-11-11:
    // Today is July 19. Birth month is November (11).
    // July (7) < November (11), so the owner has not had their birthday in 2026 yet.
    // Age should be: (2026 - 2002) - 1 = 23 years old.
    const age = ownerProfileService.calculateAge('2002-11-11');
    assert.strictEqual(age, 23);

    // Test case 2: Birthday already passed this year (e.g. born Jan 1st 2000)
    // 2026 - 2000 = 26 years old.
    const agePassed = ownerProfileService.calculateAge('2000-01-01');
    assert.strictEqual(agePassed, 26);
  });

  it('should initialize repository with default configurations via loader', async () => {
    // Reset state
    await ownerProfileService.updateProfile(null as any);

    let profile = await ownerProfileService.getProfile();
    assert.strictEqual(profile, null);

    await loadOwnerProfile();
    profile = await ownerProfileService.getProfile();

    assert.notStrictEqual(profile, null);
    assert.strictEqual(profile?.fullName, DEFAULT_OWNER_PROFILE.fullName);
    assert.strictEqual(profile?.education.university, 'BRAC University');
  });

  it('should compile context summaries containing current dynamic age and goals', async () => {
    await loadOwnerProfile();
    const context = await ownerProfileService.getBrain0Context();

    assert.ok(context.includes('Owner Name: Durjoy'));
    assert.ok(context.includes('Age: 23 years old'));
    assert.ok(context.includes('BRAC University'));
    assert.ok(context.includes('Become an AI Engineer'));
    assert.ok(context.includes('Durjoy AI'));
  });
});
