export interface OwnerEducation {
  university: string;
  degree: string;
  major: string;
  status: string;
}

export interface OwnerCareer {
  currentWork: string;
}

export interface OwnerLanguages {
  primary: string;
  secondary: string[];
}

export interface OwnerCommunicationPreferences {
  style: string[];
  avoid: string[];
}

export interface OwnerProfile {
  fullName: string;
  preferredName: string;
  assistantName: string;
  dateOfBirth: string; // YYYY-MM-DD format
  nationality: string;
  bloodGroup: string;
  currentCountry: string;
  languages: OwnerLanguages;
  education: OwnerEducation;
  career: OwnerCareer;
  goals: string[];
  interests: string[];
  communicationPreferences: OwnerCommunicationPreferences;
  teachingStyle: string[];
  problemSolvingStyle: string[];
  assistantPersonality: {
    name: string;
    role: string;
    mission: string;
    styleInstructions: string[];
  };
}

export interface IOwnerProfileRepository {
  /**
   * Retrieves the current owner profile from storage.
   */
  getProfile(): Promise<OwnerProfile | null>;

  /**
   * Updates or saves the owner profile. Allows null for clearing.
   */
  saveProfile(profile: OwnerProfile | null): Promise<void>;
}
