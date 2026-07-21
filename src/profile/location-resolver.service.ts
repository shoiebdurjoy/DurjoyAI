import { ownerProfileService, OwnerProfileService } from './owner-profile.service';
import { OwnerLocationDetail } from './owner-profile.interface';
import { Logger } from '../utils/logger';

export class LocationResolverService {
  constructor(private readonly profileService: OwnerProfileService = ownerProfileService) {}

  /**
   * Resolves target owner location based on keywords in prompt or returns Home default.
   *
   * @param prompt Input query string
   * @returns Resolved OwnerLocationDetail object
   */
  public async resolveTargetLocation(prompt: string): Promise<OwnerLocationDetail> {
    const profile = await this.profileService.getProfile();
    const home = profile?.locations?.home || {
      name: 'Home',
      address: 'Uttara, Dhaka, Bangladesh',
      area: 'Uttara',
      city: 'Dhaka',
      country: 'Bangladesh',
    };
    const university = profile?.locations?.university || {
      name: 'BRAC University',
      address: 'BRAC University, Merul Badda, Dhaka, Bangladesh',
      area: 'Merul Badda',
      city: 'Dhaka',
      country: 'Bangladesh',
    };

    const text = prompt.trim().toLowerCase();

    // Check for University keywords
    if (/\b(university|campus|brac|brac university|merul badda)\b/i.test(text)) {
      return university;
    }

    // Default to Home location
    return home;
  }

  /**
   * Expands location-implicit user queries into explicit search query strings.
   *
   * Examples:
   *   "Will it rain today?" -> "weather today Uttara Dhaka Bangladesh"
   *   "How's the weather at university?" -> "weather BRAC University Merul Badda Dhaka"
   *   "Traffic to university" -> "traffic Uttara to BRAC University Merul Badda Dhaka"
   *   "Rain on my way to university" -> "weather rain Uttara to Merul Badda Dhaka"
   *   "Should I leave now" -> "traffic Uttara to BRAC University Merul Badda Dhaka"
   *
   * @param prompt Original user prompt
   * @returns Expanded search query string
   */
  public async expandSearchQuery(prompt: string): Promise<string> {
    const text = prompt.trim().toLowerCase();

    const profile = await this.profileService.getProfile();
    const homeArea = profile?.locations?.home?.area || 'Uttara';
    const homeCity = profile?.locations?.home?.city || 'Dhaka';
    const homeCountry = profile?.locations?.home?.country || 'Bangladesh';

    const uniName = profile?.locations?.university?.name || 'BRAC University';
    const uniArea = profile?.locations?.university?.area || 'Merul Badda';
    const uniCity = profile?.locations?.university?.city || 'Dhaka';

    // 1. Route / Traffic queries
    if (
      /\b(traffic|route|way to|commute|leave now|should i leave|heading to)\b/i.test(text) &&
      /\b(university|campus|brac|work)\b/i.test(text)
    ) {
      const expanded = `traffic ${homeArea} to ${uniName} ${uniArea} ${uniCity}`;
      Logger.info('LocationResolver', `Expanded query: "${prompt}" -> "${expanded}"`);
      return expanded;
    }

    if (/\b(should i leave now|leave now)\b/i.test(text)) {
      const expanded = `traffic ${homeArea} to ${uniName} ${uniArea} ${uniCity}`;
      Logger.info('LocationResolver', `Expanded query: "${prompt}" -> "${expanded}"`);
      return expanded;
    }

    // 2. Weather & Rain queries for University
    if (
      /\b(weather|rain|rainy|temperature|forecast|climate)\b/i.test(text) &&
      /\b(university|campus|brac|merul badda)\b/i.test(text)
    ) {
      const expanded = `weather ${uniName} ${uniArea} ${uniCity}`;
      Logger.info('LocationResolver', `Expanded query: "${prompt}" -> "${expanded}"`);
      return expanded;
    }

    // 3. Weather & Rain queries for Home / Default (e.g. "Will it rain today?", "How's the weather?")
    if (
      /\b(will it rain|is it going to rain|rain today|weather today|how's the weather|weather near home|weather outside)\b/i.test(
        text,
      )
    ) {
      const expanded = `weather today ${homeArea} ${homeCity} ${homeCountry}`;
      Logger.info('LocationResolver', `Expanded query: "${prompt}" -> "${expanded}"`);
      return expanded;
    }

    return prompt;
  }
}

export const locationResolverService = new LocationResolverService();
