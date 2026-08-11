import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { createUserProfile } from "./user";

// Helper: Map phone number to virtual email format (using only digits)
export function phoneToEmail(phone: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `${cleanPhone}@aimstreaker.local`;
}

// Register with phone (name is initialized empty, user sets it in profile)
export async function registerWithPhone(
  phone: string,
  password: string
): Promise<UserCredential> {
  const email = phoneToEmail(phone);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Initialize user profile in Firestore with blank name
  if (userCredential.user) {
    await createUserProfile(userCredential.user.uid, "", phone);
  }
  
  return userCredential;
}

export async function loginWithPhone(
  phone: string,
  password: string
): Promise<UserCredential> {
  const email = phoneToEmail(phone);
  return signInWithEmailAndPassword(auth, email, password);
}

// Secure password update with re-authentication
export async function updateUserPassword(
  phone: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user session found.");
  }

  const email = phoneToEmail(phone);
  const credential = EmailAuthProvider.credential(email, currentPassword);

  // 1. Re-authenticate user session
  await reauthenticateWithCredential(user, credential);

  // 2. Perform password update
  await updatePassword(user, newPassword);
}

export async function logout(): Promise<void> {
  return signOut(auth);
}
