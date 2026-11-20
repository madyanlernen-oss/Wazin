import React from 'react';

interface FormattedChatMessageProps {
  text: string;
  isAdvisor?: boolean;
  className?: string;
}

/**
 * Regex to isolate numbers, percentages, fractions, ranges, and clock times in LTR
 * so that Arabic text flow, brackets, and punctuation marks remain naturally aligned.
 */
export const NUMBER_ISOLATION_REGEX =
  /(\(\s*\d+(?:\.\d+)?\s*[\/–—-]\s*\d+(?:\.\d+)?\s*\)|\b\d+(?:\.\d+)?\s*[\/–—-]\s*\d+(?:\.\d+)?|[+-]?\d+(?:\.\d+)?%|\b\d{1,2}:\d{2}\b|[+-]\d+(?:\.\d+)?)/g;

/**
 * Isolates numbers, fractions (e.g. 1/8, 8/10), percentages (e.g. 85%),
 * and numeric ranges inside a text chunk using dir="ltr" and unicodeBidi="isolate".
 */
export function isolateNumbersInText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(NUMBER_ISOLATION_REGEX);

  return parts.map((part, idx) => {
    if (NUMBER_ISOLATION_REGEX.test(part)) {
      return (
        <span
          key={idx}
          dir="ltr"
          className="inline-block font-sans font-bold mx-0.5 text-inherit"
          style={{ unicodeBidi: 'isolate' }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Sanitizes raw agent output, stripping leaked reasoning blocks, JSON envelopes,
 * and fenced code markers before displaying.
 */
export function sanitizeRawMessage(rawText: string): string {
  if (!rawText) return '';

  let sanitized = rawText;

  // 1. Strip XML-like thought/reasoning tags if present
  sanitized = sanitized.replace(/<(?:thought|reasoning)>[\s\S]*?<\/(?:thought|reasoning)>/gi, '');

  // 2. If the entire string is a raw JSON payload, extract the human-facing message
  if (sanitized.trim().startsWith('{') && sanitized.includes('"')) {
    try {
      const match = sanitized.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const extracted = parsed.reply || parsed.advice || parsed.summary || parsed.content || '';
        if (extracted && typeof extracted === 'string') {
          sanitized = extracted;
        }
      }
    } catch {
      // not valid JSON, proceed with raw text
    }
  }

  // 3. Strip code fences
  sanitized = sanitized
    .replace(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/gm, '$1')
    .replace(/```/g, '');

  return sanitized.trim();
}

/**
 * FormattedChatMessage
 * - Strips any raw reasoning or JSON leakage.
 * - Parses markdown bold markers (**text** and __text__) into crisp strong elements.
 * - Cleans stray unclosed asterisks so no raw '**' appears in the UI.
 * - Isolates numbers, fractions (1/8, 8/10), and percentages (85%) with dir="ltr".
 * - Maintains WCAG 2.2 AA compliant typography in both Light and Dark modes.
 */
export const FormattedChatMessage: React.FC<FormattedChatMessageProps> = ({
  text,
  isAdvisor = true,
  className = '',
}) => {
  const clean = sanitizeRawMessage(text);
  if (!clean) return null;

  const lines = clean.split('\n');

  return (
    <div className={`space-y-1.5 leading-relaxed text-xs sm:text-sm font-sans ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return <div key={lineIdx} className="h-1.5" />;
        }

        // Clean leading markdown headers (#, ##, ###) while preserving the text
        const contentLine = trimmedLine.replace(/^#{1,6}\s+/, '');

        // Split by bold patterns: (**bold**) or (__bold__)
        const boldRegex = /(\*\*[^*]+\*\*|__[^_]+__)/g;
        const parts = contentLine.split(boldRegex);

        return (
          <p key={lineIdx} className="m-0">
            {parts.map((part, partIdx) => {
              const isAsteriskBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
              const isUnderscoreBold = part.startsWith('__') && part.endsWith('__') && part.length > 4;

              if (isAsteriskBold || isUnderscoreBold) {
                const boldContent = part.slice(2, -2).trim();
                return (
                  <strong
                    key={partIdx}
                    className={`font-black ${
                      isAdvisor
                        ? 'text-[#0F172A] dark:text-white font-extrabold'
                        : 'text-white font-extrabold underline decoration-white/30'
                    }`}
                  >
                    {isolateNumbersInText(boldContent)}
                  </strong>
                );
              }

              // Remove any leftover stray double asterisks from unclosed formatting
              const cleanPart = part.replace(/\*\*/g, '').replace(/__/g, '');

              return <React.Fragment key={partIdx}>{isolateNumbersInText(cleanPart)}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
};
