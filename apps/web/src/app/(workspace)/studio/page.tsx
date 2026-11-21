import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@astracode/ui";
import { StudioView } from "@/components/studio/studio-view";

export const metadata: Metadata = { title: "Studio" };

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <StudioView />
    </Suspense>
  );
}
