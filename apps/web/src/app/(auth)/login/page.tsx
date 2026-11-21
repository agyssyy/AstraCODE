import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@astracode/ui";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
