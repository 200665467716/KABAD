/**
 * Screen T3 has one box for the tasks to test: one task per line.
 * A number or a mark typed in front ("1. ", "2) ", "- ", "• ") is dropped, empty lines too.
 */
export const parseSteps = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d+\s*[.):-]|[-•*])\s*/, "").trim())
    .filter(Boolean);
