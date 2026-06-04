"use client";

type CounterSize = "xs" | "small" | "normal" | "large";

const DIGIT_SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fbcg",
  "5": "afgcd",
  "6": "afgcde",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcfg",
};

const SIZE_MAP: Record<CounterSize, { digitW: number; digitH: number; gap: number; padX: number; padY: number }> = {
  xs: { digitW: 10, digitH: 16, gap: 2, padX: 5, padY: 4 },
  small: { digitW: 13, digitH: 22, gap: 3, padX: 7, padY: 5 },
  normal: { digitW: 17, digitH: 28, gap: 4, padX: 9, padY: 6 },
  large: { digitW: 26, digitH: 42, gap: 5, padX: 12, padY: 8 },
};

const SEGMENT_RECTS: Record<string, { x: number; y: number; w: number; h: number }> = {
  a: { x: 3, y: 1, w: 18, h: 3 },
  b: { x: 20, y: 4, w: 3, h: 13 },
  c: { x: 20, y: 19, w: 3, h: 13 },
  d: { x: 3, y: 32, w: 18, h: 3 },
  e: { x: 1, y: 19, w: 3, h: 13 },
  f: { x: 1, y: 4, w: 3, h: 13 },
  g: { x: 3, y: 16, w: 18, h: 3 },
};

function SevenSegmentDigit({ char, size }: { char: string; size: CounterSize }) {
  const active = new Set((DIGIT_SEGMENTS[char] || "").split(""));
  const { digitW, digitH } = SIZE_MAP[size];

  return (
    <svg
      width={digitW}
      height={digitH}
      viewBox="0 0 24 36"
      aria-hidden="true"
      className="seg-digit shrink-0"
    >
      {Object.entries(SEGMENT_RECTS).map(([name, rect]) => (
        <rect
          key={name}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          rx="1.2"
          className={active.has(name) ? "seg-on" : "seg-off"}
        />
      ))}
    </svg>
  );
}

function formatCounterChars(value: number, minDigits: number) {
  const numStr = String(value).padStart(minDigits, "0");
  const chars: string[] = [];
  for (let i = 0; i < numStr.length; i++) {
    if (i > 0 && (numStr.length - i) % 3 === 0) {
      chars.push(",");
    }
    chars.push(numStr[i]);
  }
  return chars;
}

export default function SevenSegmentCounter({
  value,
  size = "normal",
  minDigits = 5,
  stopPropagation = false,
}: {
  value: number;
  size?: CounterSize;
  minDigits?: number;
  stopPropagation?: boolean;
}) {
  const chars = formatCounterChars(value, minDigits);
  const sizing = SIZE_MAP[size];

  return (
    <div
      className="seg-counter"
      style={{ gap: sizing.gap, padding: `${sizing.padY}px ${sizing.padX}px` }}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      aria-label={value.toLocaleString()}
    >
      {chars.map((char, index) =>
        char === "," ? (
          <span key={index} className="seg-comma" aria-hidden="true">
            ,
          </span>
        ) : (
          <div key={index} className="seg-digit-shell">
            <SevenSegmentDigit char={char} size={size} />
          </div>
        )
      )}
    </div>
  );
}
