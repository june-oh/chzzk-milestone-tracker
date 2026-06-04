"use client";

type StatSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<StatSize, string> = {
  sm: "text-[18px] leading-none",
  md: "text-[24px] leading-none",
  lg: "text-[40px] md:text-[48px] leading-none",
};

export default function StatCounter({
  value,
  size = "md",
  className = "",
  stopPropagation = false,
}: {
  value: number;
  size?: StatSize;
  className?: string;
  stopPropagation?: boolean;
}) {
  return (
    <p
      className={`font-mono font-bold tabular-nums tracking-tight text-black ${SIZE_CLASS[size]} ${className}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      aria-label={value.toLocaleString()}
    >
      {value.toLocaleString()}
    </p>
  );
}
