import type { Metadata } from "next";
import { BenchmarkView } from "@/components/benchmark/benchmark-view";

export const metadata: Metadata = { title: "Benchmarks" };

export default function BenchmarkPage() {
  return <BenchmarkView />;
}
