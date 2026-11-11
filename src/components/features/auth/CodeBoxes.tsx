"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const LENGTH = 6;

/**
 * The 6-digit code typed in 6 boxes (screens A3 and A3e). The whole code travels in one hidden
 * field, so the form reads it like any other input. Pasting or the keyboard's SMS/e-mail
 * suggestion fills every box at once.
 */
export function CodeBoxes({ name, legend, digitLabel, error }: { name: string; legend: ReactNode; digitLabel: (n: number) => string; error?: ReactNode }) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => boxes.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  /** Writes the digits found in `text` from box `from` on, then moves to the next empty box. */
  function write(from: number, text: string) {
    const typed = text.replace(/\D/g, "").slice(0, LENGTH - from);
    if (!typed) return;
    setDigits((d) => d.map((v, i) => (i >= from && i < from + typed.length ? typed[i - from] : v)));
    focus(from + typed.length);
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      // An empty box gives the key to the one before it.
      const at = digits[i] ? i : i - 1;
      if (at < 0) return;
      setDigits((d) => d.map((v, k) => (k === at ? "" : v)));
      focus(at);
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
  }

  function onPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    // A full code replaces everything, wherever the cursor is.
    write(text.replace(/\D/g, "").length >= LENGTH ? 0 : i, text);
  }

  return (
    <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
      <legend className="mb-2.5 p-0 text-sm font-extrabold text-ink">{legend}</legend>
      <input type="hidden" name={name} value={digits.join("")} />
      <div className="grid grid-cols-6 gap-2">
        {digits.map((value, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={digitLabel(i + 1)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${name}-msg` : undefined}
            value={value}
            onChange={(e) => (e.target.value ? write(i, e.target.value.replace(value, "") || e.target.value) : setDigits((d) => d.map((v, k) => (k === i ? "" : v))))}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-14 w-full min-w-0 rounded-md border-2 bg-raised p-0 text-center font-display text-[22px] font-extrabold text-ink focus:outline-3 focus:outline-offset-2 focus:outline-focus",
              error ? "border-danger shadow-[inset_0_0_0_1px_var(--danger)]" : "border-line-strong",
            )}
          />
        ))}
      </div>
      {error && (
        <p id={`${name}-msg`} className="flex items-start gap-1.5 text-[13px] leading-[18px] font-bold text-danger">
          <Icon name="info" size={16} className="mt-px" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
