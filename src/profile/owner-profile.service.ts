import { IOwnerProfileRepository, OwnerProfile } from './owner-profile.interface';
import { ownerProfileRepository } from './owner-profile.repository';

export class OwnerProfileService {
  constructor(private readonly repo: IOwnerProfileRepository = ownerProfileRepository) {}

  /**
   * Retrieves the current owner profile from the repository.
   */
  public async getProfile(): Promise<OwnerProfile | null> {
    return this.repo.getProfile();
  }

  /**
   * Saves or updates the owner profile in the repository.
   */
  public async updateProfile(profile: OwnerProfile): Promise<void> {
    await this.repo.saveProfile(profile);
  }

  /**
   * Calculates the owner's age dynamically from their Date of Birth.
   *
   * @param dobStr Date of Birth string (YYYY-MM-DD)
   * @returns The calculated current age
   */
  public calculateAge(dobStr: string): number {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Returns a consolidated text prompt describing the owner's profile (Brain 0 context).
   */
  public async getBrain0Context(): Promise<string> {
    const profile = await this.getProfile();
    if (!profile) {
      return 'No Owner Profile loaded (Brain 0 is empty).';
    }

    const age = this.calculateAge(profile.dateOfBirth);

    return `
=== DURJOY AI OWNER PROFILE (BRAIN 0) ===
Owner Name: ${profile.fullName}
Preferred Name: ${profile.preferredName}
Age: ${age} years old (DOB: ${profile.dateOfBirth})
Nationality: ${profile.nationality}
Blood Group: ${profile.bloodGroup}
Current Location: ${profile.currentCountry}
Languages: Primary is ${profile.languages.primary}, secondary: ${profile.languages.secondary.join(', ')}

Education:
- University: ${profile.education.university}
- Degree: ${profile.education.degree}
- Major: ${profile.education.major}
- Status: ${profile.education.status}

Career:
- Work: ${profile.career.currentWork}

Long-term Goals:
${profile.goals.map((g) => `- ${g}`).join('\n')}

Interests:
${profile.interests.map((i) => `- ${i}`).join('\n')}

Communication Style:
${profile.communicationPreferences.style.map((s) => `- ${s}`).join('\n')}
${profile.communicationPreferences.avoid.map((a) => `- ${a}`).join('\n')}

Teaching Style:
${profile.teachingStyle.map((t) => `- ${t}`).join('\n')}

Problem Solving Style:
${profile.problemSolvingStyle.map((p) => `- ${p}`).join('\n')}

Assistant Persona:
- Name: ${profile.assistantPersonality.name}
- Role: ${profile.assistantPersonality.role}
- Mission: ${profile.assistantPersonality.mission}
- Rules:
${profile.assistantPersonality.styleInstructions.map((r) => `  * ${r}`).join('\n')}
=========================================
`;
  }
}

export const ownerProfileService = new OwnerProfileService();
