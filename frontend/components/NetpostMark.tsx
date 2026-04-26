type NetpostMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function NetpostMark({ size = 24, className, title = "Netpost" }: NetpostMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-label={title}
      role="img"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={6}>
        <line x1="26" y1="32" x2="94" y2="32" />
        <line x1="26" y1="48" x2="78" y2="48" opacity={0.85} />
        <line x1="26" y1="64" x2="86" y2="64" opacity={0.7} />
        <line x1="26" y1="80" x2="68" y2="80" opacity={0.55} />
        <line x1="26" y1="96" x2="58" y2="96" opacity={0.4} />
        <circle cx={98} cy={80} r={6} fill="currentColor" />
      </g>
    </svg>
  );
}
