"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import {
  getUserAims,
  createAim,
  updateAimSteps,
  checkInAimDaily,
  completeAim,
  deleteAim,
  type Aim,
  type AimStep,
} from "@/service/aims";
import {
  getUserProfile,
  updateGlobalStreakAndCoins,
  deductCoinsForBrokenStreak,
  updateUserName,
  updateUserAvatar,
  type UserProfile,
} from "@/service/user";

type AimsContextValue = {
  aims: Aim[];
  profile: UserProfile | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  createAimAction: (
    title: string,
    description: string,
    deadline: string,
    steps: { id: string; text: string; completed: boolean }[]
  ) => Promise<string>;
  updateAimStepsAction: (
    aimId: string,
    steps: AimStep[],
    progress: number
  ) => Promise<void>;
  checkInAimDailyAction: (
    aimId: string,
    newStreak: number,
    lastCheckInDate: string
  ) => Promise<void>;
  completeAimAction: (aimId: string) => Promise<void>;
  deleteAimAction: (aimId: string) => Promise<void>;
  handleGlobalCheckInAction: () => Promise<void>;
  updateUserNameAction: (name: string) => Promise<void>;
  updateUserAvatarAction: (avatarUrl: string) => Promise<void>;
};

const AimsContext = createContext<AimsContextValue | undefined>(undefined);

export function AimsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [aims, setAims] = useState<Aim[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async (uid: string, email: string) => {
    try {
      const aimsData = await getUserAims(uid);
      const profileData = await getUserProfile(uid, email);

      const todayStr = new Date().toLocaleDateString("en-CA");
      const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

      let streakCount = profileData.globalStreak || 0;
      let finalProfile = { ...profileData };

      if (
        profileData.lastGlobalCheckInDate &&
        profileData.lastGlobalCheckInDate !== todayStr &&
        profileData.lastGlobalCheckInDate !== yesterdayStr
      ) {
        // Streak broken: Reset globalStreak to 0 and deduct 5 coins
        if (streakCount > 0) {
          streakCount = 0;
          await deductCoinsForBrokenStreak(uid, -5);
          finalProfile.globalStreak = 0;
          finalProfile.coins = Math.max(0, (profileData.coins || 0) - 5);
        }
      }

      setAims(aimsData);
      setProfile(finalProfile);
    } catch (err) {
      console.error("Failed to load aims/profile data from Firestore", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setAims([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchDashboardData(user.uid, user.email || "User");
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    await fetchDashboardData(user.uid, user.email || "User");
  };

  const createAimAction = async (
    title: string,
    description: string,
    deadline: string,
    steps: { id: string; text: string; completed: boolean }[]
  ): Promise<string> => {
    if (!user) throw new Error("User must be authenticated");

    const newId = await createAim(user.uid, {
      title,
      description,
      deadline,
      steps,
    });

    const newAim: Aim = {
      id: newId,
      userId: user.uid,
      title,
      description,
      deadline,
      steps: steps.map((s) => ({ ...s, completedAt: s.completed ? new Date().toLocaleDateString("en-CA") : undefined })),
      progress: 0,
      streak: 0,
      lastCheckInDate: null,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setAims((prev) => [newAim, ...prev]);
    return newId;
  };

  const updateAimStepsAction = async (
    aimId: string,
    steps: AimStep[],
    progress: number
  ) => {
    await updateAimSteps(aimId, steps, progress);
    setAims((prev) =>
      prev.map((aim) => (aim.id === aimId ? { ...aim, steps, progress } : aim))
    );
  };

  const checkInAimDailyAction = async (
    aimId: string,
    newStreak: number,
    lastCheckInDate: string
  ) => {
    await checkInAimDaily(aimId, newStreak, lastCheckInDate);
    setAims((prev) =>
      prev.map((aim) =>
        aim.id === aimId ? { ...aim, streak: newStreak, lastCheckInDate } : aim
      )
    );
  };

  const completeAimAction = async (aimId: string) => {
    await completeAim(aimId);
    setAims((prev) =>
      prev.map((aim) =>
        aim.id === aimId ? { ...aim, completed: true, progress: 100 } : aim
      )
    );
  };

  const deleteAimAction = async (aimId: string) => {
    await deleteAim(aimId);
    setAims((prev) => prev.filter((aim) => aim.id !== aimId));
  };

  const handleGlobalCheckInAction = async () => {
    if (!user || !profile) return;

    const todayStr = new Date().toLocaleDateString("en-CA");
    if (profile.lastGlobalCheckInDate === todayStr) return;

    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    let newStreak = profile.globalStreak || 0;

    if (
      profile.lastGlobalCheckInDate === yesterdayStr ||
      (newStreak === 0 && !profile.lastGlobalCheckInDate)
    ) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await updateGlobalStreakAndCoins(user.uid, newStreak, todayStr, 1);

    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        globalStreak: newStreak,
        lastGlobalCheckInDate: todayStr,
        coins: (prev.coins || 0) + 1,
      };
    });
  };

  const updateUserNameAction = async (name: string) => {
    if (!user) return;
    await updateUserName(user.uid, name);
    setProfile((prev) => (prev ? { ...prev, name } : null));
  };

  const updateUserAvatarAction = async (avatarUrl: string) => {
    if (!user) return;
    await updateUserAvatar(user.uid, avatarUrl);
    setProfile((prev) => (prev ? { ...prev, avatarUrl } : null));
  };

  return (
    <AimsContext.Provider
      value={{
        aims,
        profile,
        loading,
        refreshData,
        createAimAction,
        updateAimStepsAction,
        checkInAimDailyAction,
        completeAimAction,
        deleteAimAction,
        handleGlobalCheckInAction,
        updateUserNameAction,
        updateUserAvatarAction,
      }}
    >
      {children}
    </AimsContext.Provider>
  );
}

export function useAims() {
  const context = useContext(AimsContext);
  if (context === undefined) {
    throw new Error("useAims must be used within an AimsProvider");
  }
  return context;
}
