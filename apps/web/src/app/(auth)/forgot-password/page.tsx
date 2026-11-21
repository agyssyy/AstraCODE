import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@astracode/ui";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
