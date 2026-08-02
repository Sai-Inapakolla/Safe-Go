import React from 'react';

interface SafeGoLogoAnimatedProps {
  size?: number;
  className?: string;
}

export const SafeGoLogoAnimated: React.FC<SafeGoLogoAnimatedProps> = ({ size = 100, className = "" }) => {
  const fontSize = size * 0.45;
  const viewBoxWidth = size * 3.5;
  const viewBoxHeight = size * 1.2;

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.2))' }}
    >
      <defs>
        {/* The combined logo content */}
        <g id="logoContent">
          {/* Circular Badge with Inner Detail */}
          <g transform={`translate(${size * 0.1}, ${size * 0.1})`}>
            <circle cx={size * 0.5} cy={size * 0.5} r={size * 0.45} fill="none" stroke="currentColor" strokeWidth={size * 0.04} opacity="0.8" />
            <circle cx={size * 0.5} cy={size * 0.5} r={size * 0.38} fill="none" stroke="currentColor" strokeWidth={size * 0.02} opacity="0.4" />
            
            {/* Simplified Car Icon */}
            <path 
              d={`M${size * 0.3} ${size * 0.6} L${size * 0.7} ${size * 0.6} L${size * 0.65} ${size * 0.45} L${size * 0.35} ${size * 0.45} Z`} 
              fill="currentColor" 
              opacity="0.9"
            />
            <circle cx={size * 0.4} cy={size * 0.65} r={size * 0.05} fill="currentColor" />
            <circle cx={size * 0.6} cy={size * 0.65} r={size * 0.05} fill="currentColor" />
            
            {/* Safety Shield Lines */}
            <path 
              d={`M${size * 0.5} ${size * 0.2} L${size * 0.5} ${size * 0.3} M${size * 0.2} ${size * 0.5} L${size * 0.3} ${size * 0.5} M${size * 0.7} ${size * 0.5} L${size * 0.8} ${size * 0.5} M${size * 0.5} ${size * 0.7} L${size * 0.5} ${size * 0.8}`} 
              stroke="currentColor" 
              strokeWidth={size * 0.03} 
              strokeLinecap="round"
            />
          </g>
          
          {/* SafeGo Text with Kerning */}
          <text 
            x={size * 1.2} 
            y={size * 0.75} 
            fontFamily="Syne, sans-serif" 
            fontWeight="800" 
            fontSize={fontSize} 
            fill="currentColor"
            letterSpacing="-0.02em"
          >
            SafeGo
          </text>
        </g>

        {/* Mask 1: Hides the solid text where the light shines */}
        <mask id="maskHideFill">
          <rect width="100%" height="100%" fill="white" />
          <ellipse 
            cx={viewBoxWidth / 2} 
            cy={viewBoxHeight / 2} 
            rx={size * 1.2} 
            ry={size * 0.6} 
            fill="black" 
            className="logo-spotlight-rotate" 
          />
        </mask>

        {/* Mask 2: Shows the glowing outline only where the light shines */}
        <mask id="maskStrokeShow">
          <ellipse 
            cx={viewBoxWidth / 2} 
            cy={viewBoxHeight / 2} 
            rx={size * 1.2} 
            ry={size * 0.6} 
            fill="url(#gradientMask)" 
            className="logo-spotlight-rotate" 
          />
        </mask>

        {/* Gradient for the spotlight edge softness */}
        <radialGradient id="gradientMask">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base State: Faintly visible logo */}
      <use href="#logoContent" className="wordsFill" opacity="0.1" />
      
      {/* Background Fill (Hidden where light shines) */}
      <use href="#logoContent" className="wordsFill text-foreground" mask="url(#maskHideFill)" opacity="0.3" />
      
      {/* Glowing Stroke (Shown only where light shines) */}
      <use href="#logoContent" className="wordsStroke" mask="url(#maskStrokeShow)" />
    </svg>
  );
};
