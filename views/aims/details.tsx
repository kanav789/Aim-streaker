"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  getAimById,
  updateAimSteps,
  checkInAimDaily,
  completeAim,
  deleteAim,
  type Aim,
  type AimStep,
} from "@/service/aims";
import { Button } from "@/components/button";
import { ConfirmModal } from "@/components/confirm-modal";

interface AimDetailsViewProps {
  aimId: string;
}

export default function AimDetailsView({ aimId }: AimDetailsViewProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [aim, setAim] = useState<Aim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch Aim Details
  useEffect(() => {
    if (!user) return;

    const fetchAim = async () => {
      try {
        const data = await getAimById(aimId);
        if (!data) {
          setError("Aim not found.");
          return;
        }
        if (data.userId !== user.uid) {
          setError("Access denied.");
          return;
        }
        setAim(data);
      } catch (err) {
        console.error(err);
        setError("Error loading Aim details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAim();
  }, [aimId, user]);

  const handleStepToggle = async (stepId: string) => {
    if (!aim) return;

    const updatedSteps = aim.steps.map((step) => {
      if (step.id === stepId) {
        const nextCompleted = !step.completed;
        return {
          ...step,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toLocaleDateString("en-CA") : undefined,
        };
      }
      return step;
    });

    const completedCount = updatedSteps.filter((s) => s.completed).length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);

    try {
      await updateAimSteps(aimId, updatedSteps, progress);
      setAim((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          steps: updatedSteps,
          progress,
        };
      });
    } catch (err) {
      console.error("Failed to update steps", err);
    }
  };

  const handleCheckIn = async () => {
    if (!aim || checkingIn) return;

    setCheckingIn(true);
    const todayStr = new Date().toLocaleDateString("en-CA");
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

    let newStreak = aim.streak;
    if (aim.lastCheckInDate === yesterdayStr || (aim.streak === 0 && !aim.lastCheckInDate)) {
      newStreak += 1;
    } else if (aim.lastCheckInDate !== todayStr) {
      newStreak = 1;
    }

    try {
      await checkInAimDaily(aimId, newStreak, todayStr);
      setAim((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          streak: newStreak,
          lastCheckInDate: todayStr,
        };
      });
    } catch (err) {
      console.error("Failed to check in", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCompleteAim = async () => {
    if (!aim) return;

    try {
      await completeAim(aimId);
      setAim((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          completed: true,
          progress: 100,
        };
      });
    } catch (err) {
      console.error("Failed to complete Aim", err);
    }
  };

  // Helper: Format Deadline and Days Left
  const getDeadlineInfo = () => {
    if (!aim) return { text: "", status: "normal" };

    const target = new Date(aim.deadline + "T00:00:00");
    const today = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00");
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

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 flex-col justify-center items-center">
        <p className="text-sm text-secondary animate-pulse">Loading Aim details...</p>
      </div>
    );
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
  const completedSteps = aim.steps.filter((s) => s.completed).length;
  const totalSteps = aim.steps.length;
  const isCheckedInToday = aim.lastCheckInDate === new Date().toLocaleDateString("en-CA");

  return (
    <div className="flex min-h-full flex-1 flex-col pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
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
            <p className="mt-2 text-sm text-secondary leading-relaxed">{aim.description}</p>
          ) : null}

          {/* Deadline indicator badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                deadlineInfo.status === "completed"
                  ? "bg-green-500"
                  : deadlineInfo.status === "overdue"
                    ? "bg-accent" // orange/red alarm
                    : deadlineInfo.status === "due-today"
                      ? "bg-yellow-400"
                      : "bg-secondary"
              }`}
            />
            <span className="text-secondary">{deadlineInfo.text}</span>
          </div>
        </div>

        {/* Progress Stats Card */}
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-primary">Progress</span>
            <span className="text-xs text-secondary font-mono">
              {completedSteps}/{totalSteps} steps ({aim.progress}%)
            </span>
          </div>
          {/* Progress Bar Container */}
          <div className="h-2.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${aim.progress}%` }}
            />
          </div>
        </div>

        {/* Action Log / Streak check-in */}
        {!aim.completed && (
          <div className="mb-6 grid grid-cols-5 gap-3 items-center rounded-2xl border border-border bg-surface p-4">
            <div className="col-span-3">
              <span className="block text-xs font-semibold text-secondary uppercase tracking-wider">
                Current Streak
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-primary">{aim.streak}</span>
                <span className="text-xs text-secondary">consecutive days</span>
              </div>
            </div>
            <div className="col-span-2">
              <button
                onClick={handleCheckIn}
                disabled={isCheckedInToday || checkingIn}
                className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all duration-300 ${
                  isCheckedInToday
                    ? "bg-border text-secondary border border-border cursor-not-allowed"
                    : "bg-accent text-background hover:bg-accent/90 active:scale-[0.98] shadow-md shadow-accent/5"
                }`}
              >
                {isCheckedInToday ? "Checked In" : "Check In"}
              </button>
            </div>
          </div>
        )}

        {/* Action Steps Section */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-primary mb-4">Steps to Achieve</h3>
          <div className="flex flex-col gap-3">
            {aim.steps.map((step, index) => (
              <div
                key={step.id}
                onClick={() => !aim.completed && handleStepToggle(step.id)}
                className={`flex items-start gap-3 rounded-xl border border-border p-4 transition-all duration-200 ${
                  step.completed ? "bg-surface/30 opacity-70" : "bg-surface hover:border-secondary/30"
                } ${aim.completed ? "cursor-default" : "cursor-pointer"}`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                    step.completed
                      ? "bg-accent border-accent text-background"
                      : "bg-transparent border-border"
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

                {/* Step Details */}
                <div className="flex-1">
                  <p
                    className={`text-sm text-primary font-medium transition ${
                      step.completed ? "line-through text-secondary" : ""
                    }`}
                  >
                    {step.text}
                  </p>
                  {step.completedAt && (
                    <span className="text-[10px] text-secondary mt-1 block">
                      Completed on {step.completedAt}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Aim Finalizer */}
        {!aim.completed && aim.progress === 100 && (
          <div className="mt-auto animate-bounce">
            <Button
              type="button"
              onClick={handleCompleteAim}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold"
            >
              🎉 Finalize & Complete Aim!
            </Button>
          </div>
        )}

        {aim.completed && (
          <div className="mt-auto rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-sm font-semibold text-green-500">
              🎉 Congratulations! You achieved this Aim!
            </p>
          </div>
        )}

        {/* Delete Aim Section */}
        <div className="mt-8 pb-8">
          <Button
            type="button"
            variant="secondary"
            className="w-full py-3 border-accent/25 hover:border-accent/40 text-accent text-xs font-semibold"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Aim"}
          </Button>
        </div>
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
            await deleteAim(aimId);
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
