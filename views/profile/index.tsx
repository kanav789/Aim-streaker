"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useAuth } from "@/context/auth-context";
import { useAims } from "@/context/aims-context";
import { logout, updateUserPassword } from "@/service/auth";
import { type UserProfile } from "@/service/user";
import { FirebaseError } from "firebase/app";

const BEGINNER_AVATARS = [
  "/images/beginner-group/avatar-2.png",
  "/images/beginner-group/avatar-3.jpeg",
  "/images/beginner-group/avatar-4.jpeg",
  "/images/beginner-group/avatar-5.jpeg",
  "/images/beginner-group/avatar-6.jpeg",
];

export default function ProfileView() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateUserNameAction, updateUserAvatarAction } = useAims();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit profile form states
  const [editName, setEditName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || "");
      setSelectedAvatar(profile.avatarUrl || "");
    }
  }, [profile]);

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
      await updateUserNameAction(editName.trim());

      // 2. Update profile avatarUrl in Firestore
      await updateUserAvatarAction(selectedAvatar);

      // 3. Update authentication password if requested
      if (isChangingPassword) {
        await updateUserPassword(profile.phone, currentPassword, newPassword);
      }

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
    setSelectedAvatar(profile?.avatarUrl || "");
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
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt="Profile"
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full border border-border bg-black" />
            )}

            <h3 className="mt-4 text-lg font-bold text-primary">
              {profile?.name ? (
                profile.name
              ) : (
                <span className="text-secondary/70 italic font-normal">No display name set</span>
              )}
            </h3>
            {profile?.phone ? (
              <p className="mt-0.5 text-sm text-secondary font-mono">{profile.phone}</p>
            ) : null}

            {/* User Coins Display */}
            {profile ? (
              <div className="mt-4 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-sm font-bold text-accent">
                  <span>🪙</span>
                  <span>
                    {profile.coins} {profile.coins === 1 ? "coin" : "coins"}
                  </span>
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

              {/* Terms of Service */}
              <Link
                href="/terms"
                className="w-full flex items-center justify-between rounded-xl border border-border bg-zinc-950 px-4 py-3.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-800 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📄</span>
                  <span>Terms of Service</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4 text-zinc-650"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </Link>

              {/* Privacy Policy */}
              <Link
                href="/privacy"
                className="w-full flex items-center justify-between rounded-xl border border-border bg-zinc-950 px-4 py-3.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-800 hover:text-white active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🔒</span>
                  <span>Privacy Policy</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4 text-zinc-650"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
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

            {/* Avatar Selector Grid */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-medium text-secondary">Select Avatar</label>
              <div className="flex flex-wrap gap-3 items-center">
                {BEGINNER_AVATARS.map((url) => {
                  const isSelected = selectedAvatar === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`h-14 w-14 shrink-0 rounded-full border overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? "border-accent border-2 scale-110 shadow-lg shadow-accent/20"
                          : "border-border hover:border-secondary"
                      }`}
                    >
                      <img src={url} alt="Avatar Option" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 pt-4 border-t border-border">
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
