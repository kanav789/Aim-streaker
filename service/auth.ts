import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/firebase/config";

export async function registerWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  return signOut(auth);
}
