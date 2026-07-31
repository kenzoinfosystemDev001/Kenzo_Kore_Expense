import React from 'react';

interface KenzoLogoProps {
  className?: string;
  size?: number;
}

export const KenzoLogo: React.FC<KenzoLogoProps> = ({ className = 'w-9 h-9', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 filter drop-shadow-[0_0_12px_rgba(0,163,255,0.6)] ${className}`}
    >
      <defs>
        <linearGradient id="kenzo-brand-grad-3d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E0FF" />
          <stop offset="45%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#0044EE" />
        </linearGradient>
      </defs>
      
      {/* 
        Kenzo Infosystems Official Logo (Image 3):
        - Left circular loop transitioning into smooth top-right and bottom-right ribbon swoops
      */}
      <path
        d="M 90,100 C 60,60 25,65 15,95 C 5,125 30,155 70,145 C 105,135 140,95 195,30 C 220,5 260,0 285,10 C 250,30 210,65 170,115 C 205,150 245,175 285,180 C 245,180 200,155 165,125 C 130,155 85,160 45,145 C 10,130 -5,85 15,45 C 40,5 100,10 150,55 Z"
        fill="url(#kenzo-brand-grad-3d)"
      />
      {/* Sleek inner highlight curve */}
      <path
        d="M 65,95 C 45,75 25,80 20,95 C 15,110 30,130 55,125 C 80,120 110,90 155,40 C 180,20 220,10 255,18 C 220,32 185,62 148,105 C 180,138 215,158 255,162 C 225,162 190,142 160,115 C 128,140 88,145 55,132"
        fill="none"
        stroke="#00F0FF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
};
