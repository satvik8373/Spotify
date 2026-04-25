import { User } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";

type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL"> & {
  providerData?: Array<{ providerId?: string }>;
};

type UserProfileOverrides = Record<string, any>;

export const buildUserProfileDocument = (
  user: FirebaseUserLike,
  overrides: UserProfileOverrides = {}
) => {
  const email = String(overrides.email ?? user.email ?? "").trim();
  const fallbackName = email ? email.split("@")[0] : "User";
  const displayName = String(
    overrides.displayName ?? overrides.fullName ?? overrides.name ?? user.displayName ?? fallbackName
  ).trim() || "User";
  const imageUrl = overrides.imageUrl !== undefined
    ? overrides.imageUrl
    : overrides.photoURL !== undefined
      ? overrides.photoURL
      : user.photoURL || null;
  const provider = overrides.provider || user.providerData?.[0]?.providerId || "password";

  return {
    uid: user.uid,
    email,
    emailLower: email.toLowerCase(),
    displayName,
    fullName: overrides.fullName ?? displayName,
    imageUrl,
    photoURL: imageUrl,
    provider,
    schemaVersion: 2,
    ...overrides,
    updatedAt: serverTimestamp(),
  };
};

export const buildNewUserProfileDocument = (
  user: FirebaseUserLike,
  overrides: UserProfileOverrides = {}
) => ({
  ...buildUserProfileDocument(user, overrides),
  createdAt: serverTimestamp(),
});
