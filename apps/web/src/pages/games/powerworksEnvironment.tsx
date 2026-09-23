import type { ReactNode } from "react";

// Presentation only. The facility changes visually without changing combat rules.
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
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="pw-vault" x2="0" y2="1">
            <stop stopColor="#1b343b" />
            <stop offset=".72" stopColor="#293b40" />
            <stop offset="1" stopColor="#182a31" />
          </linearGradient>
          <linearGradient id="pw-deck" x2="0" y2="1">
            <stop stopColor="#3f4a48" />
            <stop offset="1" stopColor="#15282f" />
          </linearGradient>
          <radialGradient id="pw-lamp">
            <stop stopColor="#e7c077" stopOpacity=".58" />
            <stop offset="1" stopColor="#e7c077" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pw-reactor">
            <stop stopColor="#e7c88a" stopOpacity=".7" />
            <stop offset=".38" stopColor="#c48a42" stopOpacity=".28" />
            <stop offset="1" stopColor="#c48a42" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1200" height="600" fill="url(#pw-vault)" />
        <path d="M0 0H1200V112L895 186H305L0 112Z" fill="#182d34" stroke="#61716a" strokeWidth="5" />
        <path d="M104 0V262L344 332H856L1096 262V0M242 0V231L405 291H795L958 231V0" fill="none" stroke="#536463" strokeWidth="10" opacity=".65" />
        <path d="M0 137L334 279H866L1200 137M0 194L337 303H863L1200 194" fill="none" stroke="#0b1c24" strokeWidth="13" />
        <path d="M0 0L0 413L295 332V0M1200 0V413L905 332V0" fill="#203138" stroke="#101f26" strokeWidth="8" />

        {room === 0 && (
          <>
            <path d="M365 0V300H835V0" fill="#263b3e" stroke="#101f26" strokeWidth="14" />
            <path d="M468 0V249H732V0" fill="#0f232d" stroke="#789187" strokeWidth="7" />
            <path d="M525 0V246M675 0V246M472 125H728" stroke="#536a69" strokeWidth="9" />
            <path d="M0 124H314L423 199M1200 124H886L777 199" fill="none" stroke="#688077" strokeWidth="17" />
            <path d="M0 146H304L414 218M1200 146H896L786 218" fill="none" stroke="#1a2529" strokeWidth="7" />
            <path d="M35 185H290M910 185H1165" stroke="#a88a55" strokeWidth="5" opacity=".65" />
            <path d="M402 265H798" stroke="#b0925d" strokeWidth="5" />
            <path d="M450 279H750" stroke="#6b8582" strokeWidth="5" />
          </>
        )}

        {room === 1 && (
          <>
            <path d="M386 0V287H814V0" fill="#26363b" stroke="#101f26" strokeWidth="15" />
            <path d="M449 0V234H751V0" fill="#15272f" stroke="#71817a" strokeWidth="9" />
            <path d="M479 39H721V181H479Z" fill="#283a3d" stroke="#72827c" strokeWidth="5" />
            <path d="M493 60H707M493 89H707M493 118H707M493 147H707" stroke="#546b69" strokeWidth="8" />
            <path d="M438 205H762" stroke="#c19b5e" strokeWidth="13" />
            <path d="M422 236H778" stroke="#192830" strokeWidth="18" />
            <path d="M0 72H356M844 72H1200M0 227H343M857 227H1200" stroke="#8a7554" strokeWidth="6" opacity=".7" />
            <circle cx="409" cy="102" r="8" fill="#ddb56f" className="pw-env-beacon" />
            <circle cx="791" cy="102" r="8" fill="#ddb56f" className="pw-env-beacon delayed" />
          </>
        )}

        {room === 2 && (
          <>
            <path d="M380 0V307H820V0" fill="#2b3b3d" stroke="#101f26" strokeWidth="12" />
            <path d="M469 0V233H731V0" fill="#142830" stroke="#667c75" strokeWidth="9" />
            <Turbine x={248} y={158} />
            <Turbine x={952} y={158} />
            <path d="M0 73H109M391 73H455M745 73H809M1091 73H1200M0 228H109M391 228H455M745 228H809M1091 228H1200" stroke="#a38b5e" strokeWidth="12" />
            <path d="M392 273H808" stroke="#cea966" strokeWidth="5" />
            <path d="M502 181H698" stroke="#426768" strokeWidth="5" className="pw-env-conduit" />
          </>
        )}

        {room === 3 && (
          <>
            <path d="M385 0V308H815V0" fill="#2e3f42" stroke="#15252b" strokeWidth="17" />
            <path d="M462 0V264H738V0" fill="#11232b" stroke="#7d8576" strokeWidth="7" />
            <circle cx="600" cy="143" r="142" fill="url(#pw-reactor)" className="pw-env-core-glow" />
            <circle cx="600" cy="143" r="104" fill="#25383d" stroke="#ad925e" strokeWidth="14" />
            <circle cx="600" cy="143" r="72" fill="#142b34" stroke="#708c85" strokeWidth="9" />
            <g className="pw-env-rotor slow" style={{ transformOrigin: "600px 143px" }}>
              <path d="M600 47V237M504 143H696M532 75L668 211M668 75L532 211" stroke="#7d8a7e" strokeWidth="15" />
            </g>
            <circle cx="600" cy="143" r="32" fill="#bc9254" stroke="#f1cb86" strokeWidth="9" className="pw-env-core" />
            <path d="M0 92H354L438 181M1200 92H846L762 181" fill="none" stroke="#677e78" strokeWidth="17" />
            <path d="M0 220H368L446 244M1200 220H832L754 244" fill="none" stroke="#ac8651" strokeWidth="8" className="pw-env-conduit" />
          </>
        )}

        <path d="M0 383L376 304H824L1200 383V600H0Z" fill="url(#pw-deck)" stroke="#14262a" strokeWidth="8" />
        <path d="M377 306L260 600M824 306L940 600M600 308V600M0 438H1200M0 535H1200" fill="none" stroke="#71817a" strokeWidth="5" opacity=".48" />
        <path d="M0 371L353 300M1200 371L847 300" stroke="#bf985e" strokeWidth="6" opacity=".72" />
        <path d="M0 544H1200" stroke="#101e25" strokeWidth="20" />
        <path d="M64 548L103 600M1136 548L1097 600" stroke="#a98d61" strokeWidth="7" />

        <g className="pw-env-lights">
          {[94, 250, 950, 1106].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={i % 2 ? 102 : 181} r="44" fill="url(#pw-lamp)" />
              <rect x={x - 3} y={i % 2 ? 99 : 178} width="6" height="6" fill="#f0c982" className="pw-env-beacon" />
            </g>
          ))}
        </g>
        <path className="pw-env-haze" d="M0 292Q250 270 450 300T900 290T1200 300V344Q1000 326 780 348T260 333T0 351Z" fill="#afc8b2" opacity=".055" />
        <path d="M0 0V600H35L86 0M1200 0V600H1165L1114 0" fill="#14232a" stroke="#5e6b63" strokeWidth="6" />
        <path d="M0 0H1200V19H0Z" fill="#101f26" />
      </svg>
      {children}
    </div>
  );
}

function Turbine({ x, y }: { x: number; y: number }) {
  const spokes: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    spokes.push(
      <path
        key={i}
        d={`M${x} ${y - 78}L${x + 25} ${y - 35}L${x + 5} ${y - 20}Z`}
        fill="#60716d"
        stroke="#1d3035"
        strokeWidth="5"
        transform={`rotate(${i * 60} ${x} ${y})`}
      />
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r="105" fill="#14252d" stroke="#667b75" strokeWidth="17" />
      <circle cx={x} cy={y} r="85" fill="#243b40" stroke="#a48a5c" strokeWidth="7" />
      <g className="pw-env-rotor" style={{ transformOrigin: `${x}px ${y}px` }}>
        {spokes}
      </g>
      <circle cx={x} cy={y} r="23" fill="#9a815b" stroke="#e3be7b" strokeWidth="7" />
    </g>
  );
}
