/** Illustration of the vision section: an African developer raises a trophy. The cup and confetti move gently (CSS). */
export function Champion({ label }: { label: string }) {
  return (
    <svg className="champ" viewBox="0 0 320 360" role="img" aria-labelledby="champ-t">
      <title id="champ-t">{label}</title>
      <defs>
        <radialGradient id="g-skin" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#7A4A2C" />
          <stop offset="1" stopColor="#3A2114" />
        </radialGradient>
        <radialGradient id="g-skin2" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#6E4228" />
          <stop offset="1" stopColor="#2F1A10" />
        </radialGradient>
        <linearGradient id="g-shirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B4AB0" />
          <stop offset="1" stopColor="#1F296B" />
        </linearGradient>
        <linearGradient id="g-pants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#242942" />
          <stop offset="1" stopColor="#0D1020" />
        </linearGradient>
        <linearGradient id="g-cup" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE37A" />
          <stop offset=".5" stopColor="#F2B705" />
          <stop offset="1" stopColor="#B98700" />
        </linearGradient>
        <radialGradient id="g-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#F2B705" stopOpacity=".55" />
          <stop offset="1" stopColor="#F2B705" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="glow" cx="214" cy="62" r="70" fill="url(#g-glow)" />
      <g className="conf" fill="#F2B705">
        <rect x="40" y="60" width="26" height="7" rx="3" />
        <rect x="250" y="130" width="20" height="7" rx="3" fill="#6F7DD0" />
        <rect x="60" y="120" width="16" height="7" rx="3" fill="#283588" />
        <rect x="270" y="30" width="22" height="7" rx="3" fill="#6F7DD0" />
        <rect x="24" y="170" width="18" height="7" rx="3" fill="#F2B705" />
        <rect x="280" y="190" width="16" height="7" rx="3" fill="#283588" />
      </g>
      <ellipse cx="160" cy="338" rx="86" ry="12" fill="#0D1020" opacity=".14" />
      <g>
        {/* Legs and shoes */}
        <path d="M128 228h28v96h-28z" fill="url(#g-pants)" />
        <path d="M166 228h28v96h-28z" fill="url(#g-pants)" />
        <path d="M122 318h40a6 6 0 0 1 6 6v6h-52v-6a6 6 0 0 1 6-6z" fill="#F3F1EC" stroke="#0D1020" strokeWidth="3" />
        <path d="M160 318h40a6 6 0 0 1 6 6v6h-52v-6a6 6 0 0 1 6-6z" fill="#F3F1EC" stroke="#0D1020" strokeWidth="3" />
        {/* Shirt with the code bars */}
        <path d="M118 140c0-14 12-24 26-24h34c14 0 26 10 26 24v92H118z" fill="url(#g-shirt)" />
        <path d="M140 116h42l-6 20h-30z" fill="#F3F1EC" opacity=".9" />
        <g fill="#F2B705" transform="translate(142 160)">
          <rect x="0" y="0" width="12" height="5" rx="2" />
          <rect x="16" y="0" width="22" height="5" rx="2" />
          <rect x="0" y="9" width="24" height="5" rx="2" fill="#FFFFFF" />
          <rect x="28" y="9" width="10" height="5" rx="2" fill="#FFFFFF" />
          <rect x="0" y="18" width="14" height="5" rx="2" />
          <rect x="18" y="18" width="20" height="5" rx="2" fill="#6F7DD0" />
        </g>
        {/* Left arm down, right arm raised with the trophy */}
        <path d="M118 150c-14 6-24 30-24 56v18" fill="none" stroke="url(#g-shirt)" strokeWidth="22" strokeLinecap="round" />
        <circle cx="94" cy="232" r="14" fill="url(#g-skin2)" />
        <path d="M200 148c12-14 24-40 22-78" fill="none" stroke="url(#g-shirt)" strokeWidth="22" strokeLinecap="round" />
        <circle cx="222" cy="66" r="14" fill="url(#g-skin2)" />
        {/* Neck and head */}
        <rect x="148" y="98" width="24" height="26" rx="8" fill="url(#g-skin2)" />
        <ellipse cx="160" cy="76" rx="36" ry="40" fill="url(#g-skin)" />
        <path d="M124 70c2-26 18-40 36-40s34 14 36 40c-10-10-22-14-36-14s-26 4-36 14z" fill="#0D1020" />
        <path d="M126 64c6-4 10-4 12 2M182 64c6-4 10-4 12 2" fill="none" stroke="#0D1020" strokeWidth="3" strokeLinecap="round" />
        <circle cx="146" cy="80" r="3.5" fill="#0D1020" />
        <circle cx="174" cy="80" r="3.5" fill="#0D1020" />
        <path d="M146 98c6 8 22 8 28 0" fill="none" stroke="#0D1020" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M148 98c6 5 18 5 24 0z" fill="#FFFFFF" />
      </g>
      <g className="cup">
        <rect x="206" y="40" width="32" height="10" rx="3" fill="#0D1020" />
        <rect x="214" y="30" width="16" height="12" fill="url(#g-cup)" />
        <path d="M196 -10h52v18c0 16-11 26-26 26s-26-10-26-26z" fill="url(#g-cup)" stroke="#0D1020" strokeWidth="3" />
        <path d="M196 -4h-10a9 9 0 0 0 10 12M248 -4h10a9 9 0 0 1-10 12" fill="none" stroke="#B98700" strokeWidth="4" strokeLinecap="round" />
        <path d="M208 -2l6 14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      </g>
    </svg>
  );
}
