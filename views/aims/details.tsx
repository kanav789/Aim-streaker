"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAims } from "@/context/aims-context";
import { DetailsSkeleton } from "@/components/details-skeleton";
import { getLocalYYYYMMDD, getYesterdayYYYYMMDD } from "@/service/date";
import type { Aim, AimStep } from "@/service/aims";
import { Button } from "@/components/button";
import { ConfirmModal } from "@/components/confirm-modal";

interface AimDetailsViewProps {
  aimId: string;
}

export default function AimDetailsView({ aimId }: AimDetailsViewProps) {
  const router = useRouter();

  const {
    aims,
    loading: aimsLoading,
    updateAimStepsAction,
    updateAimRecurringStepsAction,
    checkInAimDailyAction,
    completeAimAction,
    deleteAimAction,
  } = useAims();

  const [checkingIn, setCheckingIn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aim = aims.find((a) => a.id === aimId) || null;

  useEffect(() => {
    if (!aimsLoading && !aim) {
      setError("Aim not found.");
    } else {
      setError(null);
    }
  }, [aimsLoading, aim]);

  const handleMilestoneToggle = async (stepId: string) => {
    if (!aim) return;

    const updatedSteps = aim.steps.map((step) => {
      if (step.id === stepId) {
        const nextCompleted = !step.completed;
        const updatedStep: AimStep = {
          ...step,
          completed: nextCompleted,
        };
        if (nextCompleted) {
          updatedStep.completedAt = getLocalYYYYMMDD();
        } else {
          delete (updatedStep as any).completedAt;
        }
        return updatedStep;
      }
      return step;
    });

    const completedCount = updatedSteps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);

    try {
      await updateAimStepsAction(aimId, updatedSteps, progress);
    } catch (err) {
      console.error("Failed to update milestones", err);
    }
  };

  const handleHabitToggle = async (stepId: string) => {
    if (!aim) return;

    const habitsList = aim.recurringSteps || [];
    const targetHabit = habitsList.find((s) => s.id === stepId);
    if (targetHabit?.completed) return; // Prevent unchecking daily habits

    const updatedRecurringSteps = habitsList.map((step) => {
      if (step.id === stepId) {
        return {
          ...step,
          completed: true,
          completedAt: getLocalYYYYMMDD(),
        };
      }
      return step;
    });

    try {
      await updateAimRecurringStepsAction(aimId, updatedRecurringSteps);
    } catch (err) {
      console.error("Failed to update daily habits", err);
    }
  };

  const handleCheckIn = async () => {
    if (!aim || checkingIn) return;

    setCheckingIn(true);
    const todayStr = getLocalYYYYMMDD();
    const yesterdayStr = getYesterdayYYYYMMDD();

    let newStreak = aim.streak;
    if (aim.lastCheckInDate === yesterdayStr || (aim.streak === 0 && !aim.lastCheckInDate)) {
      newStreak += 1;
    } else if (aim.lastCheckInDate !== todayStr) {
      newStreak = 1;
    }

    try {
      await checkInAimDailyAction(aimId, newStreak, todayStr);
    } catch (err) {
      console.error("Failed to check in", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCompleteAim = async () => {
    if (!aim) return;

    try {
      await completeAimAction(aimId);
    } catch (err) {
      console.error("Failed to complete Aim", err);
    }
  };

  // Helper: Format Deadline and Days Left
  const getDeadlineInfo = () => {
    if (!aim) return { text: "", status: "normal" };

    const target = new Date(aim.deadline + "T00:00:00");
    const today = new Date(getLocalYYYYMMDD() + "T00:00:00");
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = target.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (aim.completed) {
      return { text: `Target: ${formattedDate} (Completed 🎉)`, status: "completed" };
    }

    if (diffDays < 0) {
      return {
        text: `Target: ${formattedDate} (${Math.abs(diffDays)} days overdue ⚠️)`,
        status: "overdue",
      };
    } else if (diffDays === 0) {
      return { text: `Target: ${formattedDate} (Due today! ⚡)`, status: "due-today" };
    } else {
      return { text: `Target: ${formattedDate} (${diffDays} days left)`, status: "normal" };
    }
  };

  if (aimsLoading) {
    return <DetailsSkeleton />;
  }

  if (error || !aim) {
    return (
      <div className="flex min-h-full flex-1 flex-col px-4 pt-12 items-center text-center">
        <p className="text-base text-accent mb-4">{error || "Something went wrong."}</p>
        <Link href="/" className="text-sm text-secondary hover:text-primary underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const deadlineInfo = getDeadlineInfo();
  
  // One-time milestones stats
  const completedSteps = aim.steps.filter((s) => s.completed).length;
  const totalSteps = aim.steps.length;
  
  // Daily habits stats
  const habits = aim.recurringSteps || [];
  const completedHabits = habits.filter((h) => h.completed).length;
  const totalHabits = habits.length;
  const isDailyHabitsCompleted = totalHabits > 0 ? completedHabits === totalHabits : true;

  const isCheckedInToday = aim.lastCheckInDate === getLocalYYYYMMDD();

  return (
    <div className="flex min-h-full flex-1 flex-col pb-8 bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-900">
        <Link href="/" className="text-sm text-secondary hover:text-primary">
          Back
        </Link>
        <h1 className="text-base font-semibold text-primary truncate max-w-[200px]">
          {aim.title}
        </h1>
        <span className="w-10" aria-hidden />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col px-4 pt-6">
        {/* Aim Hero Title & Description */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary tracking-tight">{aim.title}</h2>
          {aim.description ? (
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{aim.description}</p>
          ) : null}

          {/* Deadline indicator badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-950 px-3 py-1 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                deadlineInfo.status === "completed"
                  ? "bg-green-500"
                  : deadlineInfo.status === "overdue"
                    ? "bg-accent"
                    : deadlineInfo.status === "due-today"
                      ? "bg-yellow-450"
                      : "bg-secondary"
              }`}
            />
            <span className="text-zinc-450">{deadlineInfo.text}</span>
          </div>
        </div>

        {/* Milestone Progress Card */}
        <div className="mb-6 rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Milestone Progress</span>
            <span className="text-xs text-secondary font-mono">
              {completedSteps}/{totalSteps} steps ({aim.progress}%)
            </span>
          </div>
          {/* Progress Bar Container */}
          <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${aim.progress}%` }}
            />
          </div>
        </div>

        {/* Daily Streak Check-in */}
        {!aim.completed && (
          <div className="mb-6 grid grid-cols-5 gap-3 items-center rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
            <div className="col-span-3">
              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Current Streak
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-primary">{aim.streak}</span>
                <span className="text-xs text-zinc-400">consecutive days</span>
              </div>
            </div>
            <div className="col-span-2">
              <button
                onClick={handleCheckIn}
                disabled={isCheckedInToday || checkingIn || !isDailyHabitsCompleted}
                className={`w-full flex items-center justify-center gap-1 px-1 rounded-xl py-2.5 text-center text-[10px] font-bold transition-all duration-300 ${
                  isCheckedInToday
                    ? "bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed"
                    : !isDailyHabitsCompleted
                      ? "bg-zinc-950 text-zinc-650 border border-zinc-900/60 cursor-not-allowed"
                      : "bg-accent text-background hover:bg-accent/90 active:scale-[0.98] shadow-md shadow-accent/5"
                }`}
              >
                {isCheckedInToday
                  ? "Checked In"
                  : !isDailyHabitsCompleted
                    ? "Habits Incomplete"
                    : "Check In ⚡"}
              </button>
            </div>
          </div>
        )}

        {/* Daily Habits Checklist (Reset daily) */}
        {habits.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Daily Habits (Resets Daily)</h3>
              <span className="text-xs font-mono text-zinc-500">{completedHabits}/{totalHabits}</span>
            </div>
            <div className="flex flex-col gap-3">
              {habits.map((step) => (
                <div
                  key={step.id}
                  onClick={() => !aim.completed && !isCheckedInToday && !step.completed && handleHabitToggle(step.id)}
                  className={`flex items-start gap-3 rounded-xl border border-zinc-900 p-4 transition-all duration-200 ${
                    step.completed ? "bg-zinc-950/30 opacity-70 border-zinc-950" : "bg-zinc-950/80 hover:border-zinc-800"
                  } ${aim.completed || isCheckedInToday || step.completed ? "cursor-default" : "cursor-pointer"}`}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                      step.completed
                        ? "bg-accent border-accent text-background"
                        : "bg-transparent border-zinc-800"
                    }`}
                  >
                    {step.completed && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4.5 w-4.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {/* Habits Details */}
                  <div className="flex-1">
                    <p className={`text-sm font-medium transition ${step.completed ? "line-through text-zinc-550" : "text-zinc-200"}`}>
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones Checklist (One-time steps) */}
        {aim.steps.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Milestones (One-Time Steps)</h3>
            <div className="flex flex-col gap-3">
              {aim.steps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => !aim.completed && handleMilestoneToggle(step.id)}
                  className={`flex items-start gap-3 rounded-xl border border-zinc-900 p-4 transition-all duration-200 ${
                    step.completed ? "bg-zinc-950/30 opacity-70 border-zinc-950" : "bg-zinc-950/80 hover:border-zinc-800"
                  } ${aim.completed ? "cursor-default" : "cursor-pointer"}`}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                      step.completed
                        ? "bg-accent border-accent text-background"
                        : "bg-transparent border-zinc-800"
                    }`}
                  >
                    {step.completed && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4.5 w-4.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {/* Milestone Details */}
                  <div className="flex-1">
                    <p className={`text-sm font-medium transition ${step.completed ? "line-through text-zinc-550" : "text-zinc-200"}`}>
                      {step.text}
                    </p>
                    {step.completedAt && (
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        Completed on {step.completedAt}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions Block */}
        {!aim.completed && (
          <div className="mt-8 pt-4 border-t border-zinc-900/60 space-y-3 pb-8">
            <p className="text-[10px] text-zinc-500 text-center leading-relaxed max-w-[280px] mx-auto">
              Ready to wrap up? You can either permanently archive this habit as achieved, or delete it.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCompleteAim}
                className="py-2.5 border-zinc-800 text-zinc-400 text-xs font-semibold hover:border-green-500/30 hover:text-green-500 hover:bg-green-500/5 transition duration-200"
              >
                Archive (Achieved)
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="py-2.5 border-zinc-800 text-zinc-400 text-xs font-semibold hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition duration-200"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Habit"}
              </Button>
            </div>
          </div>
        )}

        {aim.completed && (
          <div className="mt-8 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-sm font-semibold text-green-500">
              🎉 Congratulations! You achieved this Aim!
            </p>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Aim?"
        message="Are you sure you want to delete this Aim? Your progress and streak will be permanently lost."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteAimAction(aimId);
            setIsDeleteModalOpen(false);
            router.push("/");
          } catch (err) {
            console.error("Failed to delete aim", err);
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
          }
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive={true}
      />
    </div>
  );
}
