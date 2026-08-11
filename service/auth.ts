import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { createUserProfile } from "./user";

// Helper: Map phone number to virtual email format (using only digits)
export function phoneToEmail(phone: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `${cleanPhone}@aimstreaker.local`;
}

export async function registerWithPhone(
  name: string,
  phone: string,
  password: string
): Promise<UserCredential> {
  const email = phoneToEmail(phone);
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Initialize user profile in Firestore
  if (userCredential.user) {
    await createUserProfile(userCredential.user.uid, name, phone);
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

export async function logout(): Promise<void> {
  return signOut(auth);
}
