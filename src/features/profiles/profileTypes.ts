export type UserProfile = {
  createdAt: string;
  defaultTimezone: string;
  displayName: string;
  id: string;
  updatedAt: string;
};

export type ProfileInput = {
  defaultTimezone: string;
  displayName: string;
};

export type ProfileFieldErrors = {
  defaultTimezone?: string | undefined;
  displayName?: string | undefined;
};

export type ProfileRepository = {
  getOwnProfile: (userId: string) => Promise<UserProfile | null>;
  saveOwnProfile: (userId: string, input: ProfileInput) => Promise<UserProfile>;
};
