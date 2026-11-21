import type { Metadata } from "next";
import { ApiView } from "@/components/api-center/api-view";

export const metadata: Metadata = { title: "API Explorer" };

export default function ApiPage() {
  return <ApiView />;
}
