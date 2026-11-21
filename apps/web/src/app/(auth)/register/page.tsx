import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@astracode/ui";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
