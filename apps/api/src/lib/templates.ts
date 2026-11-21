import type { ExtensionTemplate } from "@astracode/database";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  language: string;
  files: { path: string; content: string }[];
};

export const builtinTemplates: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank project",
    description: "An empty workspace with a README to get oriented.",
    language: "markdown",
    files: [
      {
        path: "README.md",
        content: `# New project

Created with AstraCode.

Use the Studio file tree to add files, open the terminal to run commands, and start a chat in Astra AI to generate code. Enable agent mode to have Astra propose file changes for your approval.
`,
      },
    ],
  },
  {
    id: "static-web",
    name: "Static web",
    description: "HTML, CSS and JavaScript with an immediately previewable page.",
    language: "html",
    files: [
      {
        path: "index.html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AstraCode Static App</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="panel">
      <p class="eyebrow">AstraCode Studio</p>
      <h1>Build beyond limits.</h1>
      <p class="lede">
        Edit the files on the left, save, then refresh the preview.
      </p>
      <button id="counter" type="button">Clicked 0 times</button>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`,
      },
      {
        path: "styles.css",
        content: `:root {
  color-scheme: dark;
  font-family: Inter, system-ui, sans-serif;
  background: #0b0b0f;
  color: #f4f4f8;
}

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
}

.panel {
  max-width: 540px;
  padding: 3rem;
  border: 1px solid #262633;
  border-radius: 16px;
  background: #131319;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #a78bfa;
}

h1 {
  margin: 0.4rem 0 0.8rem;
  font-size: 2.4rem;
  letter-spacing: -0.03em;
}

.lede {
  color: #a1a1b5;
  line-height: 1.6;
}

button {
  margin-top: 1.4rem;
  padding: 0.65rem 1rem;
  border-radius: 9px;
  border: 1px solid #6d4aff;
  background: #6d4aff;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background: #7c5cff;
}
`,
      },
      {
        path: "app.js",
        content: `const button = document.getElementById("counter");
let count = 0;

button?.addEventListener("click", () => {
  count += 1;
  button.textContent = \`Clicked \${count} time\${count === 1 ? "" : "s"}\`;
});
`,
      },
    ],
  },
  {
    id: "python-cli",
    name: "Python CLI",
    description: "A small typed CLI with a testable core and a test file.",
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
    return Result(value=sum(range(n + 1)), label="triangular")


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
      {
        path: "README.md",
        content: `# Python CLI

Run in the AstraCode terminal:

\`\`\`bash
python3 main.py 5
\`\`\`

Tests require pytest: \`python3 -m pytest\`.
`,
      },
    ],
  },
  {
    id: "node-script",
    name: "Node script",
    description: "A dependency-free Node.js script with strict input handling.",
    language: "javascript",
    files: [
      {
        path: "index.js",
        content: `#!/usr/bin/env node
const [input] = process.argv.slice(2);

if (!input) {
  console.error("Usage: node index.js <name>");
  process.exit(1);
}

const message = \`Hello, \${input.trim()}. This script runs in the AstraCode sandbox.\`;
console.log(message);
`,
      },
      {
        path: "README.md",
        content: `# Node script

\`\`\`bash
node index.js Astra
\`\`\`
`,
      },
    ],
  },
];

export function extensionTemplates(templates: ExtensionTemplate[] | undefined): ProjectTemplate[] {
  if (!templates) return [];
  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    language: t.language,
    files: t.files,
  }));
}

export function findBuiltinTemplate(id: string): ProjectTemplate | undefined {
  return builtinTemplates.find((t) => t.id === id);
}
