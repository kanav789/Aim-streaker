"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FirebaseError } from "firebase/app";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { registerWithPhone } from "@/service/auth";

type RegisterFormValues = {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
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
      await registerWithPhone(data.name, data.phone, data.password);
      router.push("/");
    } catch (error) {
      console.error(error);
      setFormError(getRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pb-8 pt-12">
      <h1 className="mb-8 text-2xl font-semibold text-primary">Register</h1>

      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Input
          label="Name"
          type="text"
          placeholder="Enter your name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name", {
            required: "Name is required",
          })}
        />

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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 6,
              message: "Password should be at least 6 characters",
            },
          })}
        />

        <Input
          label="Confirm password"
          type="password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Confirm password is required",
            validate: (value) =>
              value === password || "Passwords do not match",
          })}
        />

        {formError ? (
          <p className="text-sm text-accent">{formError}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-4 pt-8">
          <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
