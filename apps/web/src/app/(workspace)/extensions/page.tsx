import type { Metadata } from "next";
import { ExtensionsView } from "@/components/extensions/extensions-view";

export const metadata: Metadata = { title: "Extensions" };

export default function ExtensionsPage() {
  return <ExtensionsView />;
}
