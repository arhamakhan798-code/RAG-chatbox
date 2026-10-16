import React from "react";

export interface AvatarOption {
  id: string;
  name: string;
  gender: "male" | "female";
  role: string;
  renderSvg: (size?: number) => React.ReactNode;
}

export const AVATAR_PRESETS: AvatarOption[] = [
  // ── 5 Male Avatars ───────────────────────────────────────────────────────────
  {
    id: "male_1",
    name: "Leo",
    gender: "male",
    role: "Cyber Techie",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#0f172a" stroke="#f97316" strokeWidth="2.5" />
        {/* Glow */}
        <circle cx="50" cy="50" r="40" fill="url(#grad_leo)" opacity="0.3" />
        {/* Body / Jacket */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#1e293b" stroke="#ea580c" strokeWidth="2" />
        <path d="M42 68L50 82L58 68" fill="#f97316" opacity="0.7" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#fdba74" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="12" fill="#fed7aa" />
        {/* Hair - Leo (Orange neon spiked fringe) */}
        <path d="M30 36C30 22 40 16 52 16C62 16 70 22 70 32C66 26 58 24 50 24C40 24 34 28 30 36Z" fill="#ea580c" />
        <path d="M36 22L44 14L46 22L54 12L56 22" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="44" cy="46" r="3" fill="#1e293b" />
        <circle cx="56" cy="46" r="3" fill="#1e293b" />
        <circle cx="45" cy="45" r="1" fill="#fff" />
        <circle cx="57" cy="45" r="1" fill="#fff" />
        {/* Eyebrows */}
        <path d="M40 40L47 41" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
        <path d="M53 41L60 40" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" />
        {/* Smile */}
        <path d="M46 56Q50 60 54 56" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Cyber ear piece / headset */}
        <rect x="65" y="42" width="6" height="12" rx="3" fill="#f97316" />
        <path d="M68 54L64 62" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <radialGradient id="grad_leo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "male_2",
    name: "Ethan",
    gender: "male",
    role: "Core Developer",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#0b0f19" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Background glow */}
        <circle cx="50" cy="50" r="38" fill="url(#grad_ethan)" opacity="0.25" />
        {/* Hoodie */}
        <path d="M22 88C22 72 32 66 50 66C68 66 78 72 78 88" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <path d="M42 66L50 78L58 66" fill="#0284c7" />
        {/* Neck */}
        <rect x="44" y="53" width="12" height="15" rx="3" fill="#fcd34d" />
        {/* Face */}
        <rect x="33" y="30" width="34" height="34" rx="11" fill="#fde68a" />
        {/* Hair - Ethan (Dark stylish parted hair) */}
        <path d="M30 32C30 18 42 14 54 14C66 14 70 22 70 30C66 22 56 20 48 20C38 20 32 24 30 32Z" fill="#1e1b4b" />
        {/* Glasses */}
        <rect x="38" y="42" width="10" height="9" rx="3" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        <rect x="52" y="42" width="10" height="9" rx="3" fill="none" stroke="#38bdf8" strokeWidth="2.2" />
        <line x1="48" y1="46" x2="52" y2="46" stroke="#38bdf8" strokeWidth="2" />
        {/* Eyes inside glasses */}
        <circle cx="43" cy="46" r="2.2" fill="#0f172a" />
        <circle cx="57" cy="46" r="2.2" fill="#0f172a" />
        {/* Smile */}
        <path d="M46 56Q50 59 54 56" stroke="#b45309" strokeWidth="2" strokeLinecap="round" fill="none" />
        <defs>
          <radialGradient id="grad_ethan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "male_3",
    name: "Marcus",
    gender: "male",
    role: "Cosmic Vanguard",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#110d19" stroke="#ec4899" strokeWidth="2.5" />
        {/* Suit Armor */}
        <path d="M20 88C20 70 34 64 50 64C66 64 80 70 80 88" fill="#18181b" stroke="#db2777" strokeWidth="2" />
        <rect x="42" y="66" width="16" height="12" rx="4" fill="#831843" />
        <circle cx="50" cy="72" r="3" fill="#ec4899" />
        {/* Neck */}
        <rect x="43" y="52" width="14" height="15" rx="3" fill="#e0a96d" />
        {/* Face */}
        <rect x="33" y="28" width="34" height="36" rx="10" fill="#e0a96d" />
        {/* Hair - Marcus (Sleek fade crop) */}
        <path d="M32 28C32 18 42 16 50 16C58 16 68 18 68 28C64 22 56 20 50 20C42 20 36 24 32 28Z" fill="#18181b" />
        {/* Eyes */}
        <line x1="40" y1="44" x2="47" y2="44" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="53" y1="44" x2="60" y2="44" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        {/* Confident smirk */}
        <path d="M46 54Q51 57 55 53" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Tech collar pins */}
        <circle cx="34" cy="74" r="2.5" fill="#f43f5e" />
        <circle cx="66" cy="74" r="2.5" fill="#f43f5e" />
      </svg>
    ),
  },
  {
    id: "male_4",
    name: "Kai",
    gender: "male",
    role: "Urban Pioneer",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#091319" stroke="#10b981" strokeWidth="2.5" />
        {/* Jacket */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#132a22" stroke="#10b981" strokeWidth="1.8" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#fcd34d" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="12" fill="#fde68a" />
        {/* Beanie - Emerald */}
        <path d="M30 32C30 18 40 14 50 14C60 14 70 18 70 32H30Z" fill="#047857" stroke="#10b981" strokeWidth="1.5" />
        <rect x="28" y="28" width="44" height="8" rx="4" fill="#065f46" />
        {/* Eyes */}
        <circle cx="43" cy="46" r="2.5" fill="#064e3b" />
        <circle cx="57" cy="46" r="2.5" fill="#064e3b" />
        {/* Airpod */}
        <path d="M66 46L69 52" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        {/* Smile */}
        <path d="M46 56Q50 59 54 56" stroke="#b45309" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "male_5",
    name: "Zane",
    gender: "male",
    role: "Gamer Elite",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#140a1c" stroke="#a855f7" strokeWidth="2.5" />
        {/* Hoodie */}
        <path d="M20 88C20 70 32 66 50 66C68 66 80 70 80 88" fill="#2e1065" stroke="#a855f7" strokeWidth="1.5" />
        {/* Face */}
        <rect x="33" y="32" width="34" height="34" rx="10" fill="#fed7aa" />
        {/* Visor Glasses - Neon Purple */}
        <rect x="34" y="40" width="32" height="10" rx="3" fill="#a855f7" stroke="#c084fc" strokeWidth="1.5" />
        <line x1="36" y1="45" x2="64" y2="45" stroke="#e9d5ff" strokeWidth="1.5" />
        {/* Hair - Zane (Wild violet spike) */}
        <path d="M30 32C30 18 42 12 52 12C64 12 70 20 70 30" fill="#7e22ce" />
        <path d="M38 16L46 6L48 16L56 8L58 18" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
        {/* Headset arc */}
        <path d="M26 44C26 26 38 22 50 22C62 22 74 26 74 44" stroke="#c084fc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x="23" y="42" width="7" height="12" rx="3" fill="#a855f7" />
        <rect x="70" y="42" width="7" height="12" rx="3" fill="#a855f7" />
        {/* Smile */}
        <path d="M46 56Q50 59 54 56" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // ── 5 Female Avatars ─────────────────────────────────────────────────────────
  {
    id: "female_1",
    name: "Maya",
    gender: "female",
    role: "AI Lead",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#120c19" stroke="#f43f5e" strokeWidth="2.5" />
        {/* Background glow */}
        <circle cx="50" cy="50" r="38" fill="url(#grad_maya)" opacity="0.25" />
        {/* Top / Blazer */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#4c0519" stroke="#f43f5e" strokeWidth="1.8" />
        <path d="M44 68L50 78L56 68" fill="#fda4af" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="14" fill="#ffedd5" />
        {/* Hair - Maya (Chic bob with crimson highlights) */}
        <path d="M26 34C26 18 36 14 50 14C64 14 74 18 74 34V54C74 54 70 56 68 48C68 38 64 24 50 24C36 24 32 38 32 48C30 56 26 54 26 54V34Z" fill="#881337" />
        <path d="M34 22L42 16L44 24" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="43" cy="46" r="2.8" fill="#4c0519" />
        <circle cx="57" cy="46" r="2.8" fill="#4c0519" />
        <circle cx="44" cy="45" r="1" fill="#fff" />
        <circle cx="58" cy="45" r="1" fill="#fff" />
        {/* Eyelashes */}
        <path d="M39 42L45 44" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M55 44L61 42" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
        {/* Lips */}
        <path d="M46 56Q50 60 54 56" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Cyber Earring */}
        <circle cx="30" cy="48" r="3" fill="#f43f5e" />
        <circle cx="30" cy="54" r="1.8" fill="#fda4af" />
        <defs>
          <radialGradient id="grad_maya" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "female_2",
    name: "Sophia",
    gender: "female",
    role: "Hardware Architect",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#0b171f" stroke="#06b6d4" strokeWidth="2.5" />
        {/* Sweater */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#164e63" stroke="#06b6d4" strokeWidth="1.8" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="14" fill="#fde68a" />
        {/* Hair - Sophia (Elegant dark teal with bun) */}
        <circle cx="50" cy="14" r="10" fill="#0e7490" />
        <path d="M28 34C28 18 38 18 50 18C62 18 72 18 72 34C72 44 68 46 66 42C66 32 60 26 50 26C40 26 34 32 34 42C32 46 28 44 28 34Z" fill="#083344" />
        {/* Glasses - Rose Gold */}
        <circle cx="43" cy="46" r="6" stroke="#fb7185" strokeWidth="2" fill="none" />
        <circle cx="57" cy="46" r="6" stroke="#fb7185" strokeWidth="2" fill="none" />
        <line x1="49" y1="46" x2="51" y2="46" stroke="#fb7185" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="43" cy="46" r="2.2" fill="#083344" />
        <circle cx="57" cy="46" r="2.2" fill="#083344" />
        {/* Gentle smile */}
        <path d="M46 56Q50 59 54 56" stroke="#b45309" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "female_3",
    name: "Zara",
    gender: "female",
    role: "Cosmic Navigator",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#130e1f" stroke="#c084fc" strokeWidth="2.5" />
        {/* Astro suit */}
        <path d="M22 88C22 70 34 66 50 66C66 66 78 70 78 88" fill="#241442" stroke="#c084fc" strokeWidth="1.8" />
        <rect x="42" y="68" width="16" height="10" rx="3" fill="#581c87" />
        <circle cx="50" cy="73" r="2.5" fill="#f0abfc" />
        {/* Neck */}
        <rect x="44" y="52" width="12" height="16" rx="3" fill="#e0a96d" />
        {/* Face */}
        <rect x="34" y="30" width="32" height="34" rx="14" fill="#e0a96d" />
        {/* Hair - Zara (Purple braids / flowing cosmic hair) */}
        <path d="M26 34C26 18 36 14 50 14C64 14 74 18 74 34V60C74 60 70 66 68 56C68 44 64 24 50 24C36 24 32 44 32 56C30 66 26 60 26 60V34Z" fill="#581c87" />
        <path d="M32 44L28 58" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        <path d="M68 44L72 58" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="43" cy="44" r="2.8" fill="#2e1065" />
        <circle cx="57" cy="44" r="2.8" fill="#2e1065" />
        <circle cx="44" cy="43" r="1" fill="#fff" />
        <circle cx="58" cy="43" r="1" fill="#fff" />
        {/* Cosmic brow star */}
        <circle cx="50" cy="34" r="1.5" fill="#f43f5e" />
        {/* Smile */}
        <path d="M46 54Q50 58 54 54" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "female_4",
    name: "Chloe",
    gender: "female",
    role: "Creative Stylist",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#1b120c" stroke="#f59e0b" strokeWidth="2.5" />
        {/* Jacket */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#451a03" stroke="#f59e0b" strokeWidth="1.8" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#ffedd5" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="14" fill="#ffedd5" />
        {/* Hair - Chloe (Golden amber wavy shoulder hair) */}
        <path d="M26 34C26 16 36 12 50 12C64 12 74 16 74 34C74 46 72 54 68 50C66 40 62 22 50 22C38 22 34 40 32 50C28 54 26 46 26 34Z" fill="#b45309" />
        <path d="M30 46Q34 54 38 60" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M70 46Q66 54 62 60" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <circle cx="43" cy="46" r="2.8" fill="#451a03" />
        <circle cx="57" cy="46" r="2.8" fill="#451a03" />
        <circle cx="44" cy="45" r="1" fill="#fff" />
        <circle cx="58" cy="45" r="1" fill="#fff" />
        {/* Warm smile */}
        <path d="M45 56Q50 60 55 56" stroke="#ea580c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "female_5",
    name: "Aria",
    gender: "female",
    role: "Pro Streamer",
    renderSvg: (size = 40) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#140c1b" stroke="#ec4899" strokeWidth="2.5" />
        {/* Space Buns */}
        <circle cx="28" cy="20" r="9" fill="#db2777" stroke="#ec4899" strokeWidth="1.5" />
        <circle cx="72" cy="20" r="9" fill="#db2777" stroke="#ec4899" strokeWidth="1.5" />
        {/* Hoodie */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#310e25" stroke="#ec4899" strokeWidth="1.8" />
        {/* Neck */}
        <rect x="44" y="54" width="12" height="16" rx="3" fill="#ffedd5" />
        {/* Face */}
        <rect x="34" y="32" width="32" height="34" rx="14" fill="#ffedd5" />
        {/* Hair - Aria (Dual bangs) */}
        <path d="M28 32C28 18 38 16 50 16C62 16 72 18 72 32C68 24 58 22 50 22C42 22 32 24 28 32Z" fill="#9d174d" />
        {/* Streamer Headset */}
        <path d="M24 40C24 22 36 18 50 18C64 18 76 22 76 40" stroke="#f472b6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x="22" y="38" width="7" height="14" rx="3" fill="#ec4899" />
        <rect x="71" y="38" width="7" height="14" rx="3" fill="#ec4899" />
        {/* Eyes with pink tint */}
        <circle cx="43" cy="46" r="3" fill="#831843" />
        <circle cx="57" cy="46" r="3" fill="#831843" />
        <circle cx="44" cy="45" r="1" fill="#fff" />
        <circle cx="58" cy="45" r="1" fill="#fff" />
        {/* Cute smile */}
        <path d="M46 56Q50 59 54 56" stroke="#db2777" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

// Helper to render either custom uploaded photo or chosen preset avatar
export function UserAvatarDisplay({
  avatarId,
  customUrl,
  size = 34,
  className = "",
}: {
  avatarId: string;
  customUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt="User profile"
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1.5px solid rgba(249, 115, 22, 0.6)",
          boxShadow: "0 0 10px rgba(249, 115, 22, 0.35)",
        }}
      />
    );
  }

  const found = AVATAR_PRESETS.find((a) => a.id === avatarId) || AVATAR_PRESETS[0];
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {found.renderSvg(size)}
    </div>
  );
}
