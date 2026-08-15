"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAims } from "@/context/aims-context";
import { Input } from "@/components/input";
import { Button } from "@/components/button";

export default function CreateAimView() {
  const router = useRouter();
  
  const { aims, loading: aimsLoading, createAimAction } = useAims();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [recurringSteps, setRecurringSteps] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasActiveAim = aims.some((aim) => !aim.completed);

  // Milestones handlers
  const handleAddStep = () => {
    setSteps([...steps, ""]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const handleStepChange = (index: number, value: string) => {
    const nextSteps = [...steps];
    nextSteps[index] = value;
    setSteps(nextSteps);
  };

  // Daily Habits handlers
  const handleAddRecurringStep = () => {
    setRecurringSteps([...recurringSteps, ""]);
  };

  const handleRemoveRecurringStep = (index: number) => {
    if (recurringSteps.length === 1) return;
    setRecurringSteps(recurringSteps.filter((_, idx) => idx !== index));
  };

  const handleRecurringStepChange = (index: number, value: string) => {
    const nextSteps = [...recurringSteps];
    nextSteps[index] = value;
    setRecurringSteps(nextSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasActiveAim) return;

    setError(null);

    // Basic Validation
    if (!title.trim()) {
      setError("Please provide a title for your aim.");
      return;
    }
    if (!deadline) {
      setError("Please choose a target deadline.");
      return;
    }

    const filteredSteps = steps.filter((step) => step.trim() !== "");
    const filteredRecurringSteps = recurringSteps.filter((step) => step.trim() !== "");

    if (filteredSteps.length === 0) {
      setError("Please add at least one Milestone.");
      return;
    }
    if (filteredRecurringSteps.length === 0) {
      setError("Please add at least one Daily Habit.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedSteps = filteredSteps.map((step, idx) => ({
        id: `step_${idx}_${Date.now()}`,
        text: step.trim(),
        completed: false,
      }));

      const formattedRecurringSteps = filteredRecurringSteps.map((step, idx) => ({
        id: `rec_${idx}_${Date.now()}`,
        text: step.trim(),
        completed: false,
      }));

      await createAimAction(
        title.trim(),
        description.trim(),
        deadline,
        formattedSteps,
        formattedRecurringSteps
      );

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Failed to create Aim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (aimsLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background px-4">
        <p className="text-sm text-secondary animate-pulse">Checking focused aims...</p>
      </div>
    );
  }

  if (hasActiveAim) {
    return (
      <div className="flex min-h-full flex-col px-4 pb-8 pt-12 text-center bg-background justify-center items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-accent/20 bg-accent/5 text-2xl">
          🎯
        </div>
        <h1 className="text-xl font-bold text-primary">Aim Already Active</h1>
        <p className="mt-3 max-w-sm text-sm text-secondary leading-relaxed">
          To maintain absolute focus, Aim Streaker limits you to exactly one active aim at a time.
          Complete or delete your active aim to begin another one!
        </p>

        <div className="mt-8 w-full max-w-xs">
          <Link href="/">
            <Button className="w-full py-3 bg-accent text-background font-bold hover:bg-accent/90">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <Link href="/" className="text-sm text-secondary hover:text-primary">
          Cancel
        </Link>
        <h1 className="text-lg font-semibold text-primary">New Aim</h1>
        <span className="w-10" aria-hidden />
      </header>

      {/* Form Container */}
      <main className="flex flex-1 flex-col px-4 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
          <Input
            label="Aim Title"
            placeholder="e.g. Master a skill, build a habit, or achieve a target"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Description</label>
            <textarea
              placeholder="Describe the target milestones and daily routines needed to achieve your aim..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent min-h-[100px] text-sm"
            />
          </div>

          <Input
            label="Target Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />

          {/* One-Time Milestones Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-secondary">
                Milestones (One-Time Tasks)
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs font-semibold text-accent hover:underline"
              >
                + Add Milestone
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-secondary font-mono">
                    {String(index + 1).padStart(2, "0")}.
                  </span>
                  <input
                    placeholder={`Milestone ${index + 1} (e.g. Acquire resources)`}
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent"
                    required
                  />
                  {steps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="p-2 text-secondary hover:text-accent transition"
                      aria-label="Remove milestone"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4.5 w-4.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Daily Recurring Habits Section */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-secondary">
                Daily Habits (Resets Daily)
              </label>
              <button
                type="button"
                onClick={handleAddRecurringStep}
                className="text-xs font-semibold text-accent hover:underline"
              >
                + Add Daily Habit
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {recurringSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-secondary font-mono">
                    {String(index + 1).padStart(2, "0")}.
                  </span>
                  <input
                    placeholder={`Daily Habit ${index + 1} (e.g. Practice 30 mins)`}
                    value={step}
                    onChange={(e) => handleRecurringStepChange(index, e.target.value)}
                    className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/60 focus:border-accent"
                    required
                  />
                  {recurringSteps.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecurringStep(index)}
                      className="p-2 text-secondary hover:text-accent transition"
                      aria-label="Remove daily habit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4.5 w-4.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-accent">{error}</p> : null}

          {/* Actions */}
          <div className="mt-auto pt-8">
            <Button
              type="submit"
              className="w-full py-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Launching Aim..." : "Launch Aim"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
