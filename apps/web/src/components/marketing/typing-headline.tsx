"use client";

import * as React from "react";

export function TypingHeadline({
  phrases,
  className,
}: {
  phrases: string[];
  className?: string;
}) {
  const [text, setText] = React.useState("");
  const [phraseIndex, setPhraseIndex] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(phrases[0] ?? "");
      return;
    }

    const phrase = phrases[phraseIndex] ?? "";
    let delay = deleting ? 34 : 62;

    if (!deleting && text === phrase) {
      delay = 2200;
    } else if (deleting && text === "") {
      delay = 320;
    }

    const timer = window.setTimeout(() => {
      if (!deleting && text === phrase) {
        setDeleting(true);
        return;
      }
      if (deleting && text === "") {
        setDeleting(false);
        setPhraseIndex((index) => (index + 1) % phrases.length);
        return;
      }
      setText(deleting ? phrase.slice(0, text.length - 1) : phrase.slice(0, text.length + 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [text, deleting, phraseIndex, phrases]);

  return (
    <span className={className}>
      <span className="sr-only">{phrases[0]}</span>
      <span aria-hidden="true">
        {text}
        <span className="typing-caret" />
      </span>
    </span>
  );
}
