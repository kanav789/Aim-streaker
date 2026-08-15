"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/button";
import { registerWithPhone } from "@/service/auth";
import { updateUserName } from "@/service/user";

type RegisterFormValues = {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
};

function getRegisterErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this mobile number already exists.";
      case "auth/invalid-email":
        return "Please enter a valid 10-digit mobile number.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      default:
        return "Could not create account. Please try again.";
    }
  }

  return "Could not create account. Please try again.";
}

export default function RegisterView() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>();

  const password = watch("password");

  const onSubmit = async (data: RegisterFormValues) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const userCredential = await registerWithPhone(data.phone, data.password);
      if (userCredential.user && data.name.trim()) {
        await updateUserName(userCredential.user.uid, data.name.trim());
      }
      router.push("/");
    } catch (error) {
      console.error(error);
      setFormError(getRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pb-8 pt-10 bg-black text-white relative">
      
      {/* Header back button */}
      <div className="flex items-center mb-8">
        <Link href="/login" className="text-zinc-400 hover:text-white transition p-1 -ml-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Sign Up</h1>
        <p className="text-sm text-zinc-500 font-medium mt-1.5 font-sans">
          Create your account and start achieving your aims.
        </p>
      </div>

      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Full Name field */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Enter your full name"
              className={`w-full rounded-2xl h-14 border bg-zinc-950 pl-12 pr-4 text-primary outline-none transition placeholder:text-zinc-650 focus:border-accent ${
                errors.name ? "border-accent" : "border-zinc-800"
              }`}
              {...register("name", { required: "Full name is required" })}
            />
          </div>
          {errors.name?.message && (
            <p className="text-xs text-accent mt-0.5">{errors.name.message}</p>
          )}
        </div>

        {/* Phone Number with country prefix */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Phone Number
          </label>
          <div className="flex gap-3">
            <div className="flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold px-4 h-14 rounded-2xl select-none text-base">
              +91
            </div>
            <div className="flex-1">
              <input
                type="tel"
                placeholder="Enter your phone number"
                className={`w-full rounded-2xl h-14 border bg-zinc-950 px-4 text-primary outline-none transition placeholder:text-zinc-600 focus:border-accent ${
                  errors.phone ? "border-accent" : "border-zinc-800"
                }`}
                maxLength={10}
                {...register("phone", {
                  required: "Mobile number is required",
                  pattern: {
                    value: /^\d{10}$/,
                    message: "Please enter exactly 10 digits",
                  },
                })}
              />
            </div>
          </div>
          {errors.phone?.message && (
            <p className="text-xs text-accent mt-0.5">{errors.phone.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex w-full flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              className={`w-full rounded-2xl h-14 border bg-zinc-950 pl-4 pr-12 text-primary outline-none transition placeholder:text-zinc-600 focus:border-accent ${
                errors.password ? "border-accent" : "border-zinc-800"
              }`}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password should be at least 6 characters",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition p-1"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-xs text-accent mt-0.5">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex w-full flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              className={`w-full rounded-2xl h-14 border bg-zinc-950 pl-4 pr-12 text-primary outline-none transition placeholder:text-zinc-600 focus:border-accent ${
                errors.confirmPassword ? "border-accent" : "border-zinc-800"
              }`}
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) => value === password || "Passwords do not match",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition p-1"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.822 7.822L21 21m-2.228-2.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-xs text-accent mt-0.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Custom Terms Checkbox */}
        <div className="flex items-start gap-3 select-none mt-2">
          <label className="relative flex items-center cursor-pointer mt-0.5">
            <input
              type="checkbox"
              className="sr-only peer"
              {...register("agree", { required: "You must agree to the Terms of Service" })}
            />
            <div className="w-5 h-5 border border-zinc-800 bg-zinc-950 rounded-md peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className="w-3.5 h-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          </label>
          <span className="text-xs text-zinc-500 leading-normal">
            I agree to the{" "}
            <Link href="/terms" className="text-accent font-semibold hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-accent font-semibold hover:underline">
              Privacy Policy
            </Link>
          </span>
        </div>
        {errors.agree && (
          <p className="text-xs text-accent -mt-4">{errors.agree.message}</p>
        )}

        {formError ? (
          <p className="text-sm text-accent bg-accent/5 border border-accent/20 rounded-xl p-3 text-center">{formError}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-4 pt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </Button>

          <p className="text-center text-xs font-semibold text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline ml-1">
              Log In
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
