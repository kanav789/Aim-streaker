"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FirebaseError } from "firebase/app";
import { Input } from "@/components/input";
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
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pb-8 pt-12">
      <h1 className="mb-8 text-2xl font-semibold text-primary">Login</h1>

      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Input
          label="Mobile Number (10 Digits)"
          type="tel"
          placeholder="e.g. 9876543210"
          autoComplete="tel"
          maxLength={10}
          minLength={10}
          error={errors.phone?.message}
          {...register("phone", {
            required: "Mobile number is required",
            pattern: {
              value: /^\d{10}$/,
              message: "Please enter exactly 10 digits (numbers only)",
            },
          })}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
          })}
        />

        {formError ? (
          <p className="text-sm text-accent">{formError}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-4 pt-8">
          <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>

          <p className="text-center text-sm text-secondary">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Register
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
