"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/button";
import { loginWithPhone } from "@/service/auth";

type LoginFormValues = {
  phone: string;
  password: string;
};

function getLoginErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Please enter a valid mobile number.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid mobile number or password.";
      default:
        return "Could not log in. Please try again.";
    }
  }

  return "Could not log in. Please try again.";
}

export default function LoginView() {
  const router = useRouter();
  const [view, setView] = useState<"welcome" | "login">("welcome");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      await loginWithPhone(data.phone, data.password);
      router.push("/");
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "welcome") {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-between px-4 pb-8 pt-16 bg-black text-white relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo and Slogan area */}
        <div className="flex flex-1 flex-col items-center justify-center w-full max-w-xs">
          
          {/* Target Logo SVG */}
          <div className="mb-6 relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full text-accent fill-none stroke-current" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" strokeWidth="2.5" className="text-zinc-800" />
              <circle cx="50" cy="50" r="30" strokeWidth="2.5" className="text-zinc-700" />
              <circle cx="50" cy="50" r="20" strokeWidth="3" className="text-zinc-600" />
              <circle cx="50" cy="50" r="10" strokeWidth="4.5" className="text-accent" />
              {/* Arrow */}
              <line x1="12" y1="12" x2="44" y2="44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="text-accent" />
              <polygon points="44,44 42,32 32,42" className="text-accent fill-current" />
            </svg>
          </div>

          <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase text-center">
            Aim <span className="text-accent">Streaker</span>
          </h1>

          <h2 className="text-3xl font-black text-center mt-12 mb-4 leading-tight text-white tracking-tight">
            Every day you <br />
            show up, <span className="text-accent">you win.</span>
          </h2>

          <p className="text-xs text-zinc-500 font-medium text-center max-w-[260px] leading-relaxed">
            Set your aim. Take action.<br />Build unstoppable streaks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={() => setView("login")}
          >
            Log In
          </Button>

          <Link href="/register" className="w-full block">
            <Button variant="secondary" className="w-full">
              Sign Up
            </Button>
          </Link>

          <p className="text-[10px] text-zinc-600 text-center leading-relaxed mt-4">
            By continuing, you agree to our <br />
            <span className="text-accent font-semibold hover:underline cursor-pointer">Terms of Service</span> and{" "}
            <span className="text-accent font-semibold hover:underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pb-8 pt-10 bg-black text-white relative">
      
      {/* Header back navigation */}
      <div className="flex items-center mb-8">
        <button 
          onClick={() => setView("welcome")}
          className="text-zinc-400 hover:text-white transition p-1 -ml-1"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Log In</h1>
        <p className="text-sm text-zinc-500 font-medium mt-1.5">Welcome back! Let's continue your journey.</p>
      </div>

      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Phone number field container with +91 block */}
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

        {/* Password input container with toggle */}
        <div className="flex w-full flex-col gap-1.5 relative">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className={`w-full rounded-2xl h-14 border bg-zinc-950 pl-4 pr-12 text-primary outline-none transition placeholder:text-zinc-600 focus:border-accent ${
                errors.password ? "border-accent" : "border-zinc-800"
              }`}
              {...register("password", { required: "Password is required" })}
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
          <div className="flex justify-end mt-1">
            <span className="text-xs font-semibold text-accent hover:underline cursor-pointer">
              Forgot Password?
            </span>
          </div>
          {errors.password?.message && (
            <p className="text-xs text-accent mt-0.5">{errors.password.message}</p>
          )}
        </div>

        {formError ? (
          <p className="text-sm text-accent bg-accent/5 border border-accent/20 rounded-xl p-3 text-center">{formError}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-4 pt-6">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>

          <p className="text-center text-xs font-semibold text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline ml-1">
              Sign Up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
