"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useAuth } from "@/context/auth-context";
import { logout, updateUserPassword } from "@/service/auth";
import { getUserProfile, updateUserName, type UserProfile } from "@/service/user";
import { FirebaseError } from "firebase/app";

export default function ProfileView() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit profile form states
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const userProfile = await getUserProfile(user.uid, "");
      setProfile(userProfile);
      setEditName(userProfile.name || "");
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setFormError(null);

    if (!editName.trim()) {
      setFormError("Name field cannot be left blank.");
      return;
    }

    const isChangingPassword = newPassword.trim() !== "";
    if (isChangingPassword) {
      if (!currentPassword.trim()) {
        setFormError("Please enter your current password to verify.");
        return;
      }
      if (newPassword.length < 6) {
        setFormError("New password should be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    setIsSaving(true);

    try {
      // 1. Update display name in Firestore
      await updateUserName(user.uid, editName.trim());

      // 2. Update authentication password if requested
      if (isChangingPassword) {
        await updateUserPassword(profile.phone, currentPassword, newPassword);
      }

      // Re-fetch profile to sync display name, reset form
      await fetchProfile();
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
          setFormError("Incorrect current password.");
        } else {
          setFormError("Failed to save changes. Please try again.");
        }
      } else {
        setFormError("Failed to save changes. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormError(null);
    setEditName(profile?.name || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsEditing(false);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        {isEditing ? (
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-secondary hover:text-primary transition"
          >
            Cancel
          </button>
        ) : (
          <Link href="/" className="text-sm text-secondary hover:text-primary transition">
            Back
          </Link>
        )}
        <p className="text-base font-semibold text-primary">
          {isEditing ? "Edit Profile" : "Profile"}
        </p>
        <span className="w-10" aria-hidden />
      </header>

      {/* Main Container */}
      <main className="flex flex-1 flex-col px-4 pt-8">
        {!isEditing ? (
          /* VIEW STATE */
          <div className="flex flex-col items-center flex-1">
            <Image
              src="/images/anime-avatar.png"
              alt="Profile"
              width={96}
              height={96}
              className="h-24 w-24 rounded-full border border-border object-cover"
            />

            <h3 className="mt-4 text-lg font-bold text-primary">
              {profile?.name ? profile.name : (
                <span className="text-secondary/70 italic font-normal">No display name set</span>
              )}
            </h3>
            {profile?.phone ? (
              <p className="mt-0.5 text-sm text-secondary font-mono">
                {profile.phone}
              </p>
            ) : null}

            {/* User Coins Display */}
            {profile ? (
              <div className="mt-4 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-sm font-bold text-accent">
                  <span>🪙</span>
                  <span>{profile.coins} {profile.coins === 1 ? "coin" : "coins"}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 h-7 w-20 bg-border animate-pulse rounded-full" />
            )}

            {/* Custom CTA Edit profile button */}
            <div className="mt-6 w-full">
              <Button
                type="button"
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold disabled:opacity-50"
                onClick={() => setIsEditing(true)}
                disabled={!profile}
              >
                {profile ? "Edit Profile Info" : "Loading profile..."}
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="mt-6 w-full flex flex-col gap-3">
              <Link
                href="/profile/rewards"
                className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-primary transition hover:border-secondary/30 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎁</span>
                  <span>Rewards Center</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-secondary">
                  <span>View rewards</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            </div>

            <div className="mt-auto w-full pb-8 pt-8">
              <Button
                type="button"
                variant="secondary"
                className="w-full py-3"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </Button>
            </div>
          </div>
        ) : (
          /* EDIT STATE */
          <form onSubmit={handleSave} className="flex flex-col flex-1 gap-5">
            <Input
              label="Display Name"
              type="text"
              placeholder="e.g. John Doe"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
                Change Password (Optional)
              </h4>
              <div className="flex flex-col gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {formError ? <p className="text-sm text-accent">{formError}</p> : null}

            <div className="mt-auto flex gap-4 pt-8 pb-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 py-3"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 py-3 bg-accent text-background font-bold hover:bg-accent/90"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
