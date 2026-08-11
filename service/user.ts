import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  coins: number;
  globalStreak: number;
  lastGlobalCheckInDate?: string | null; // YYYY-MM-DD
  avatarUrl?: string; // YYYY-MM-DD
}

const COLLECTION_NAME = "users";

export async function getUserProfile(userId: string, defaultName: string = ""): Promise<UserProfile> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      uid: userId,
      name: data.name || defaultName || "User",
      phone: data.phone || "",
      coins: typeof data.coins === "number" ? data.coins : 0,
      globalStreak: typeof data.globalStreak === "number" ? data.globalStreak : 0,
      lastGlobalCheckInDate: data.lastGlobalCheckInDate || null,
      avatarUrl: data.avatarUrl || "",
    } as UserProfile;
  } else {
    // Initialize default profile in Firestore
    const defaultProfile: UserProfile = {
      uid: userId,
      name: defaultName || "User",
      phone: "",
      coins: 0,
      globalStreak: 0,
      lastGlobalCheckInDate: null,
      avatarUrl: "",
    };
    await setDoc(docRef, defaultProfile);
    return defaultProfile;
  }
}

export async function createUserProfile(
  userId: string,
  name: string,
  phone: string
): Promise<UserProfile> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const profile: UserProfile = {
    uid: userId,
    name,
    phone,
    coins: 0,
    globalStreak: 0,
    lastGlobalCheckInDate: null,
    avatarUrl: "",
  };
  await setDoc(docRef, profile);
  return profile;
}

export async function updateGlobalStreakAndCoins(
  userId: string,
  newStreak: number,
  lastCheckInDate: string,
  coinChange: number
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);
  const currentCoins = docSnap.exists() ? (docSnap.data().coins || 0) : 0;

  await updateDoc(docRef, {
    globalStreak: newStreak,
    lastGlobalCheckInDate: lastCheckInDate,
    coins: currentCoins + coinChange,
  });
}

export async function deductCoinsForBrokenStreak(
  userId: string,
  coinChange: number
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);
  const currentCoins = docSnap.exists() ? (docSnap.data().coins || 0) : 0;

  await updateDoc(docRef, {
    globalStreak: 0,
    coins: currentCoins + coinChange,
  });
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  await updateDoc(docRef, {
    name,
  });
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  await updateDoc(docRef, {
    avatarUrl,
  });
}
