import React from 'react';

interface KompakLogoProps {
  className?: string;
  variant?: 'full' | 'icon-only' | 'light';
  height?: number | string;
}

export const KompakLogo: React.FC<KompakLogoProps> = ({
  className = '',
  variant = 'full',
  height = 36,
}) => {
  // If only icon is requested
  if (variant === 'icon-only') {
    return (
      <svg
        viewBox="0 0 110 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
        className={`inline-block shrink-0 ${className}`}
        aria-label="Logo Kompak SDMA"
      >
        {/* Speech Bubble Base */}
        <path
          d="M12 8C7.58172 8 4 11.5817 4 16V68C4 72.4183 7.58172 76 12 76H26V94L42 76H68C72.4183 76 76 72.4183 76 68V16C76 11.5817 72.4183 8 68 8H12Z"
          fill="#1A4480"
        />

        {/* Doorway Cutout (White Inner) */}
        <path
          d="M28 20H48V64H28V20Z"
          fill="#FFFFFF"
        />

        {/* 3D Open Door (Golden Yellow) */}
        {/* Door frame / leaf swung open into perspective */}
        <polygon
          points="28,20 54,12 54,72 28,64"
          fill="#F5B324"
        />
        <polygon
          points="54,12 56,13 56,71 54,72"
          fill="#D99B16"
        />

        {/* Door Panels (4 recessed bevel panels) */}
        {/* Top Left Panel */}
        <polygon
          points="32,24 41,21 41,38 32,39"
          fill="#F5B324"
          stroke="#E09F14"
          strokeWidth="1.2"
        />
        {/* Top Right Panel */}
        <polygon
          points="43,20 50,18 50,37 43,38"
          fill="#F5B324"
          stroke="#E09F14"
          strokeWidth="1.2"
        />
        {/* Bottom Left Panel */}
        <polygon
          points="32,44 41,43 41,60 32,58"
          fill="#F5B324"
          stroke="#E09F14"
          strokeWidth="1.2"
        />
        {/* Bottom Right Panel */}
        <polygon
          points="43,43 50,42 50,62 43,59"
          fill="#F5B324"
          stroke="#E09F14"
          strokeWidth="1.2"
        />

        {/* Round Doorknob */}
        <circle cx="36" cy="41" r="2.8" fill="#1A4480" />

        {/* 3 Radiating Light Beams (Teal / Cyan) */}
        {/* Top beam */}
        <line
          x1="66"
          y1="28"
          x2="78"
          y2="20"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Middle beam */}
        <line
          x1="70"
          y1="42"
          x2="84"
          y2="42"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Bottom beam */}
        <line
          x1="66"
          y1="56"
          x2="78"
          y2="64"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Full Logo Lockup with Typography (Matches the user's Kompak Logo.png exactly)
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon */}
      <svg
        viewBox="0 0 110 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Speech Bubble Base */}
        <path
          d="M12 8C7.58172 8 4 11.5817 4 16V68C4 72.4183 7.58172 76 12 76H26V94L42 76H68C72.4183 76 76 72.4183 76 68V16C76 11.5817 72.4183 8 68 8H12Z"
          fill={variant === 'light' ? '#FFFFFF' : '#1A4480'}
        />

        {/* Doorway Cutout */}
        <path
          d="M28 20H48V64H28V20Z"
          fill={variant === 'light' ? '#0F2B56' : '#FFFFFF'}
        />

        {/* 3D Open Door in Perspective */}
        <polygon
          points="28,20 54,12 54,72 28,64"
          fill="#F5B324"
        />
        <polygon
          points="54,12 56,13 56,71 54,72"
          fill="#D99B16"
        />

        {/* Door Panels */}
        <polygon
          points="32,24 41,21 41,38 32,39"
          fill="#F5B324"
          stroke="#D99B16"
          strokeWidth="1.2"
        />
        <polygon
          points="43,20 50,18 50,37 43,38"
          fill="#F5B324"
          stroke="#D99B16"
          strokeWidth="1.2"
        />
        <polygon
          points="32,44 41,43 41,60 32,58"
          fill="#F5B324"
          stroke="#D99B16"
          strokeWidth="1.2"
        />
        <polygon
          points="43,43 50,42 50,62 43,59"
          fill="#F5B324"
          stroke="#D99B16"
          strokeWidth="1.2"
        />

        {/* Round Doorknob */}
        <circle
          cx="36"
          cy="41"
          r="2.8"
          fill={variant === 'light' ? '#FFFFFF' : '#1A4480'}
        />

        {/* 3 Radiating Light Beams */}
        <line
          x1="66"
          y1="28"
          x2="78"
          y2="20"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="70"
          y1="42"
          x2="84"
          y2="42"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="66"
          y1="56"
          x2="78"
          y2="64"
          stroke="#1FA7A8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>

      {/* Typography: KOMPAK + SDMA */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-serif font-black tracking-tight text-xl sm:text-2xl ${
            variant === 'light' ? 'text-white' : 'text-[#1A4480]'
          }`}
          style={{
            fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
            letterSpacing: '0.04em',
          }}
        >
          KOMPAK
        </span>
        <span
          className="font-bold text-[10px] sm:text-xs text-[#1FA7A8] tracking-[0.38em] uppercase mt-1 pl-0.5"
          style={{ letterSpacing: '0.36em' }}
        >
          SDMA
        </span>
      </div>
    </div>
  );
};
