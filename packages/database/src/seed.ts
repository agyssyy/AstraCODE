import type { Database } from "./client.js";
import { extensions } from "./schema.js";

const catalog = [
  {
    id: "code-review-presets",
    name: "Code Review Presets",
    description:
      "Three focused review personas — security, performance and accessibility — available as one-click system prompts in Astra AI.",
    category: "Prompt Packs",
    version: "1.2.0",
    author: "AstraCode Labs",
    permissions: ["chat:presets"],
    verified: true,
    manifest: {
      prompts: [
        {
          id: "security-review",
          title: "Security review",
          description: "Audit code for injection, auth and data-exposure risks.",
          prompt:
            "Review the code for security issues. Focus on injection, authentication and authorization gaps, unsafe deserialization, secret exposure, SSRF and path traversal. Rank findings by severity and show a corrected snippet for each.",
        },
        {
          id: "performance-review",
          title: "Performance review",
          description: "Find hotspots and unnecessary work in a code path.",
          prompt:
            "Review the code for performance. Identify algorithmic complexity, repeated work, unnecessary renders or I/O, and memory growth. For each issue give the expected impact and a concrete optimization.",
        },
        {
          id: "a11y-review",
          title: "Accessibility review",
          description: "Check semantics, keyboard flow and contrast.",
          prompt:
            "Review the interface code for accessibility. Check semantic HTML, ARIA usage, focus management, keyboard operability, labels and color contrast. Provide patched code for every issue found.",
        },
      ],
    },
  },
  {
    id: "react-starter-kit",
    name: "React Starter Kit",
    description:
      "A lean Vite + React starter template that installs directly into Astra Studio, including a small router-free app shell.",
    category: "Templates",
    version: "1.0.3",
    author: "AstraCode Labs",
    permissions: ["project:write"],
    verified: true,
    manifest: {
      templates: [
        {
          id: "react-vite",
          name: "React + Vite",
          description: "Minimal React 18 app with Vite, ready to run in the sandbox.",
          language: "javascript",
          files: [
            {
              path: "package.json",
              content: `{
  "name": "astra-react-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.5"
  }
}
`,
            },
            {
              path: "index.html",
              content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Astra React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
            },
            {
              path: "src/main.jsx",
              content: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,
            },
            {
              path: "src/App.jsx",
              content: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="card">
      <h1>Hello from Astra Studio</h1>
      <p>Edit src/App.jsx and the preview updates on refresh.</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Count is {count}
      </button>
    </main>
  );
}
`,
            },
            {
              path: "src/styles.css",
              content: `:root {
  color-scheme: light dark;
  font-family: Inter, system-ui, sans-serif;
  background: #0c0c10;
  color: #f2f2f7;
}

body {
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}

.card {
  padding: 2.5rem;
  border: 1px solid #2a2a35;
  border-radius: 14px;
  background: #14141b;
}

button {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #3b3b4a;
  background: #1e1e28;
  color: inherit;
  cursor: pointer;
}
`,
            },
          ],
        },
      ],
    },
  },
  {
    id: "python-toolbox",
    name: "Python Toolbox",
    description:
      "A typed Python CLI starter plus a review preset tuned for data pipelines and script hygiene.",
    category: "Templates",
    version: "1.1.0",
    author: "AstraCode Labs",
    permissions: ["project:write", "chat:presets"],
    verified: true,
    manifest: {
      templates: [
        {
          id: "python-cli",
          name: "Python CLI",
          description: "Argument-parsing CLI with a testable core function.",
          language: "python",
          files: [
            {
              path: "main.py",
              content: `"""AstraCode Python CLI starter."""
import argparse
from dataclasses import dataclass


@dataclass(frozen=True)
class Result:
    value: int
    label: str


def compute(n: int) -> Result:
    if n < 0:
        raise ValueError("n must be non-negative")
    total = sum(range(n + 1))
    return Result(value=total, label="triangular")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute triangular numbers")
    parser.add_argument("n", type=int, help="upper bound")
    args = parser.parse_args()
    result = compute(args.n)
    print(f"{result.label}({args.n}) = {result.value}")


if __name__ == "__main__":
    main()
`,
            },
            {
              path: "test_main.py",
              content: `import pytest
from main import compute


def test_compute():
    assert compute(5).value == 15


def test_negative():
    with pytest.raises(ValueError):
        compute(-1)
`,
            },
          ],
        },
      ],
      prompts: [
        {
          id: "python-review",
          title: "Python review",
          description: "Review scripts for typing, packaging and edge cases.",
          prompt:
            "Review this Python code. Check type hints, error handling, resource cleanup, packaging, testability and common standard-library pitfalls. Suggest idiomatic fixes with full snippets.",
        },
      ],
    },
  },
  {
    id: "test-generator",
    name: "Test Generator",
    description:
      "Prompt presets that generate unit tests and hunt down missing edge cases, with framework-aware guidance.",
    category: "Prompt Packs",
    version: "1.0.1",
    author: "AstraCode Labs",
    permissions: ["chat:presets"],
    verified: true,
    manifest: {
      prompts: [
        {
          id: "unit-tests",
          title: "Generate unit tests",
          description: "Write a focused test suite for the selected code.",
          prompt:
            "Generate a complete unit test file for the code. Use the project's existing test framework when known, otherwise choose the standard one for the language. Cover happy paths, boundaries and error cases. Do not test implementation details.",
        },
        {
          id: "edge-cases",
          title: "Find missing edge cases",
          description: "List untested inputs and failure modes.",
          prompt:
            "Analyze this code for missing test coverage. List boundary values, invalid inputs, concurrency and resource-failure cases, and the exact test you would add for each. Mark which cases are highest risk.",
        },
      ],
    },
  },
  {
    id: "api-design-kit",
    name: "API Design Kit",
    description:
      "REST and OpenAPI prompt presets that keep endpoint design consistent and reviewable.",
    category: "Prompt Packs",
    version: "1.3.2",
    author: "AstraCode Labs",
    permissions: ["chat:presets"],
    verified: true,
    manifest: {
      prompts: [
        {
          id: "rest-design",
          title: "Design a REST resource",
          description: "Model routes, payloads and status codes.",
          prompt:
            "Design REST endpoints for the described resource. Specify paths, methods, request and response schemas, pagination, filtering, status codes and error shapes. Follow consistent naming and keep the design idempotent where possible.",
        },
        {
          id: "openapi",
          title: "Write OpenAPI schema",
          description: "Produce a valid OpenAPI 3.1 document.",
          prompt:
            "Produce a valid OpenAPI 3.1 YAML document for the described API. Include reusable schemas, error responses, authentication and realistic examples. Validate that every $ref resolves.",
        },
      ],
    },
  },
  {
    id: "docs-writer",
    name: "Docs Writer",
    description:
      "Turn a repository or module into a clear README and usage guide without marketing filler.",
    category: "Prompt Packs",
    version: "1.0.0",
    author: "AstraCode Labs",
    permissions: ["chat:presets"],
    verified: true,
    manifest: {
      prompts: [
        {
          id: "readme",
          title: "Write README",
          description: "Structured README with setup and usage.",
          prompt:
            "Write a README for this project. Include what it does, requirements, install, configuration, a complete usage example, troubleshooting and license. Use the actual names and commands found in the code. Do not invent features.",
        },
        {
          id: "changelog",
          title: "Draft changelog",
          description: "Group changes into a readable release note.",
          prompt:
            "Draft a changelog entry from these changes. Group into Added, Changed, Fixed, Removed and Security. Only include changes visible to users or integrators, with clear one-line descriptions.",
        },
      ],
    },
  },
];

export const bundledExtensions = catalog;

export async function seedExtensions(db: Database): Promise<void> {
  for (const entry of catalog) {
    await db
      .insert(extensions)
      .values({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        category: entry.category,
        version: entry.version,
        author: entry.author,
        permissions: entry.permissions,
        manifest: entry.manifest,
        verified: entry.verified,
        docsUrl: "/docs#extensions",
      })
      .onConflictDoUpdate({
        target: extensions.id,
        set: {
          name: entry.name,
          description: entry.description,
          category: entry.category,
          version: entry.version,
          manifest: entry.manifest,
          permissions: entry.permissions,
        },
      });
  }
}
