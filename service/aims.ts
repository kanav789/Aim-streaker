import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/config";

export interface AimStep {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

export interface Aim {
  id?: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  steps: AimStep[];
  progress: number; // percentage (0 to 100)
  streak: number;
  lastCheckInDate?: string | null; // YYYY-MM-DD
  completed: boolean;
  createdAt: string; // ISO string
}

const COLLECTION_NAME = "aims";

export async function createAim(
  userId: string,
  aimData: {
    title: string;
    description: string;
    deadline: string;
    steps: { id: string; text: string; completed: boolean }[];
  }
): Promise<string> {
  const newAim: Omit<Aim, "id"> = {
    userId,
    title: aimData.title,
    description: aimData.description,
    deadline: aimData.deadline,
    steps: aimData.steps,
    progress: 0,
    streak: 0,
    lastCheckInDate: null,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newAim);
  return docRef.id;
}

export async function getUserAims(userId: string): Promise<Aim[]> {
  const aimsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(aimsQuery);
  const aims: Aim[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    aims.push({
      id: doc.id,
      ...data,
    } as Aim);
  });

  return aims;
}

export async function getAimById(aimId: string): Promise<Aim | null> {
  const docRef = doc(db, COLLECTION_NAME, aimId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
    } as Aim;
  }

  return null;
}

export async function updateAimSteps(
  aimId: string,
  steps: AimStep[],
  progress: number
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, aimId);
  await updateDoc(docRef, {
    steps,
    progress,
  });
}

export async function checkInAimDaily(
  aimId: string,
  newStreak: number,
  lastCheckInDate: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, aimId);
  await updateDoc(docRef, {
    streak: newStreak,
    lastCheckInDate,
  });
}

export async function completeAim(aimId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, aimId);
  await updateDoc(docRef, {
    completed: true,
    progress: 100,
  });
}
