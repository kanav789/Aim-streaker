"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { getLocalYYYYMMDD, getYesterdayYYYYMMDD } from "@/service/date";
import {
  getUserAims,
  createAim,
  updateAimSteps,
  updateAimRecurringSteps,
  checkInAimDaily,
  completeAim,
  deleteAim,
  type Aim,
  type AimStep,
  type CheckInLog,
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
    steps: { id: string; text: string; completed: boolean }[],
    recurringSteps: { id: string; text: string; completed: boolean }[]
  ) => Promise<string>;
  updateAimStepsAction: (
    aimId: string,
    steps: AimStep[],
    progress: number
  ) => Promise<void>;
  updateAimRecurringStepsAction: (
    aimId: string,
    recurringSteps: AimStep[]
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

      const todayStr = getLocalYYYYMMDD();
      const yesterdayStr = getYesterdayYYYYMMDD();

      const normalizedAims = aimsData.map((aim) => {
        let hasChanges = false;
        let streak = aim.streak || 0;

        // If they missed yesterday's check-in, the habit streak resets to 0 in memory
        if (
          aim.lastCheckInDate &&
          aim.lastCheckInDate !== todayStr &&
          aim.lastCheckInDate !== yesterdayStr
        ) {
          if (streak > 0) {
            streak = 0;
            hasChanges = true;
          }
        }

        const currentRecurringSteps = aim.recurringSteps || [];
        const updatedRecurringSteps = currentRecurringSteps.map((step) => {
          // If step was completed on a previous day, reset it in memory
          if (step.completed && step.completedAt !== todayStr) {
            hasChanges = true;
            return { ...step, completed: false, completedAt: undefined };
          }
          return step;
        });

        if (hasChanges) {
          return {
            ...aim,
            recurringSteps: updatedRecurringSteps,
            streak,
          };
        }
        return {
          ...aim,
          recurringSteps: currentRecurringSteps, // Ensure it is initialized
        };
      });

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

      setAims(normalizedAims);
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
    steps: { id: string; text: string; completed: boolean }[],
    recurringSteps: { id: string; text: string; completed: boolean }[]
  ): Promise<string> => {
    if (!user) throw new Error("User must be authenticated");

    const newId = await createAim(user.uid, {
      title,
      description,
      deadline,
      steps,
      recurringSteps,
    });

    const newAim: Aim = {
      id: newId,
      userId: user.uid,
      title,
      description,
      deadline,
      steps: steps.map((s) => ({ ...s, completedAt: s.completed ? getLocalYYYYMMDD() : undefined })),
      recurringSteps: recurringSteps.map((s) => ({ ...s, completedAt: s.completed ? getLocalYYYYMMDD() : undefined })),
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

  const updateAimRecurringStepsAction = async (
    aimId: string,
    recurringSteps: AimStep[]
  ) => {
    await updateAimRecurringSteps(aimId, recurringSteps);
    setAims((prev) =>
      prev.map((aim) => (aim.id === aimId ? { ...aim, recurringSteps } : aim))
    );
  };

  const checkInAimDailyAction = async (
    aimId: string,
    newStreak: number,
    lastCheckInDate: string
  ) => {
    const targetAim = aims.find((a) => a.id === aimId);
    if (!targetAim) return;

    const completedSteps = (targetAim.recurringSteps || [])
      .filter((s) => s.completed)
      .map((s) => s.id);

    await checkInAimDaily(aimId, newStreak, lastCheckInDate, completedSteps);

    setAims((prev) =>
      prev.map((aim) => {
        if (aim.id === aimId) {
          const updatedHistory = aim.checkInHistory ? [...aim.checkInHistory] : [];
          if (!updatedHistory.some((h) => h.date === lastCheckInDate)) {
            updatedHistory.push({
              date: lastCheckInDate,
              completedSteps,
            });
          }
          return {
            ...aim,
            streak: newStreak,
            lastCheckInDate,
            checkInHistory: updatedHistory,
          };
        }
        return aim;
      })
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

    const todayStr = getLocalYYYYMMDD();
    if (profile.lastGlobalCheckInDate === todayStr) return;

    const yesterdayStr = getYesterdayYYYYMMDD();
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
        updateAimRecurringStepsAction,
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
