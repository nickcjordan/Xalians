import type { ReactNode } from "react";

// Static material detail lives in the backplates. Only machinery and atmosphere move.
export function PowerworksEnvironment({
  room,
  className = "pw-environment",
  children,
}: {
  room: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${className} pw-facility sector-${room}`} aria-hidden="true">
      <svg viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <radialGradient id="pw-ambient-amber">
            <stop stopColor="#ffd989" stopOpacity=".34" />
            <stop offset="1" stopColor="#ffd989" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pw-ambient-cyan">
            <stop stopColor="#67cbd9" stopOpacity=".25" />
            <stop offset="1" stopColor="#67cbd9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pw-security-beam" x2="0" y2="1">
            <stop stopColor="#f45145" stopOpacity=".22" />
            <stop offset="1" stopColor="#f45145" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="pw-env-haze">
          <path d="M0 308Q310 280 620 321T1180 315T1672 312V390Q1200 355 837 385T0 390Z" fill="#b1c8c2" opacity=".045" />
        </g>
        {room === 0 && (
          <g className="pw-env-beacon">
            <ellipse cx="265" cy="210" rx="125" ry="110" fill="url(#pw-ambient-amber)" />
            <ellipse cx="1406" cy="210" rx="125" ry="110" fill="url(#pw-ambient-amber)" />
          </g>
        )}
        {room === 1 && (
          <g className="pw-env-beacon">
            <path d="M903 19L825 244H988Z" fill="url(#pw-security-beam)" />
            <path d="M1584 21L1488 240H1661Z" fill="url(#pw-security-beam)" />
          </g>
        )}
        {room === 2 && (
          <g className="pw-env-conduit">
            <ellipse cx="836" cy="176" rx="215" ry="230" fill="url(#pw-ambient-cyan)" />
            <path d="M831 111l13 32-12 19 10 20-13 28 10 30" fill="none" stroke="#9ee8ef" strokeWidth="3" opacity=".35" />
          </g>
        )}
        {room === 3 && (
          <g className="pw-env-core">
            <ellipse cx="1330" cy="95" rx="245" ry="190" fill="url(#pw-ambient-amber)" />
            <ellipse cx="1330" cy="95" rx="145" ry="135" fill="url(#pw-ambient-cyan)" />
          </g>
        )}
      </svg>
      {children}
    </div>
  );
}
