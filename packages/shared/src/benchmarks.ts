import type { BenchmarkSuite } from "./types.js";

export const benchmarkSuites: BenchmarkSuite[] = [
  {
    id: "core-coding",
    name: "Core coding",
    description: "Everyday implementation and algorithm tasks with verifiable behaviour.",
    prompts: [
      {
        id: "binary-search",
        title: "Fix binary search",
        language: "typescript",
        prompt: `This binary search has an off-by-one bug that skips valid elements. Fix it and explain the boundary logic.\n\n\`\`\`ts\nfunction search(arr: number[], target: number): number {\n  let lo = 0;\n  let hi = arr.length - 1;\n  while (lo < hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1;\n    else hi = mid;\n  }\n  return -1;\n}\n\`\`\``,
      },
      {
        id: "debounce",
        title: "Implement debounce",
        language: "typescript",
        prompt:
          "Implement a typed `debounce` utility in TypeScript that returns a cancellable and flushable wrapper. Preserve the latest arguments and `this` context. Include tests for rapid calls, cancellation and flush.",
      },
    ],
  },
  {
    id: "debugging",
    name: "Debugging",
    description: "Diagnose failures from realistic symptoms and produce a minimal fix.",
    prompts: [
      {
        id: "race-condition",
        title: "React request race",
        language: "typescript",
        prompt: `A React search box shows stale results: typing quickly can display the response for an older query. Explain the root cause and rewrite the effect so only the latest request can update state.\n\n\`\`\`tsx\nuseEffect(() => {\n  fetch('/api/search?q=' + query)\n    .then((r) => r.json())\n    .then(setResults);\n}, [query]);\n\`\`\``,
      },
      {
        id: "memory-leak",
        title: "Node memory leak",
        language: "javascript",
        prompt:
          "A Node.js service grows memory until it is OOM-killed after a few hours. It registers a listener per websocket connection and keeps a Map of sessions. Describe the likely leaks and provide a corrected module with cleanup on disconnect and bounded session storage.",
      },
    ],
  },
  {
    id: "refactoring",
    name: "Refactoring",
    description: "Restructure code without changing observable behaviour.",
    prompts: [
      {
        id: "async-await",
        title: "Callback to async/await",
        language: "javascript",
        prompt: `Refactor this callback-heavy code to async/await with correct error propagation and parallel loading where safe. Keep the public return shape identical.\n\n\`\`\`js\nfunction loadUser(id, cb) {\n  db.users.find(id, (err, user) => {\n    if (err) return cb(err);\n    db.orders.forUser(id, (err, orders) => {\n      if (err) return cb(err);\n      db.flags.forUser(id, (err, flags) => {\n        if (err) return cb(err);\n        cb(null, { user, orders, flags });\n      });\n    });\n  });\n}\n\`\`\``,
      },
      {
        id: "component-split",
        title: "Split a large component",
        language: "typescript",
        prompt:
          "Outline how you would split a 400-line React component that fetches data, manages filters, and renders a table with inline editing. Propose the file structure, the props and state boundaries, and which hooks you would extract. Include skeleton code for the two most important extracted units.",
      },
    ],
  },
];

export function getSuite(id: string): BenchmarkSuite | undefined {
  return benchmarkSuites.find((s) => s.id === id);
}
