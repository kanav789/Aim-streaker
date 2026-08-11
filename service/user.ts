import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

export interface UserProfile {
  uid: string;
  email: string;
  coins: number;
  globalStreak: number;
  lastGlobalCheckInDate?: string | null; // YYYY-MM-DD
}

const COLLECTION_NAME = "users";

export async function getUserProfile(userId: string, email: string): Promise<UserProfile> {
  const docRef = doc(db, COLLECTION_NAME, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      uid: userId,
      email: data.email || email,
      coins: typeof data.coins === "number" ? data.coins : 0,
      globalStreak: typeof data.globalStreak === "number" ? data.globalStreak : 0,
      lastGlobalCheckInDate: data.lastGlobalCheckInDate || null,
    } as UserProfile;
  } else {
    // Initialize default profile in Firestore
    const defaultProfile: UserProfile = {
      uid: userId,
      email,
      coins: 0,
      globalStreak: 0,
      lastGlobalCheckInDate: null,
    };
    await setDoc(docRef, defaultProfile);
    return defaultProfile;
  }
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
