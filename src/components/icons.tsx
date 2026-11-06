// Small inline icons. Always decorative: the text next to them carries the meaning.

type IconProps = { size?: number };

function Svg({ size = 14, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icon"
    >
      {children}
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.6V8l2.2 1.4" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.2 8.4l3 3 6.6-6.8" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 11.5V7.2a4 4 0 0 1 8 0v4.3l1.2 1.2H2.8z" />
      <path d="M6.6 14.2a1.5 1.5 0 0 0 2.8 0" />
    </Svg>
  );
}

export function QuestionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M6.3 6.3a1.8 1.8 0 0 1 3.5.6c0 1.2-1.8 1.5-1.8 2.6" />
      <path d="M8 11.6h.01" strokeWidth="2" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 7.4v3.6" />
      <path d="M8 5h.01" strokeWidth="2" />
    </Svg>
  );
}
