export const MapPlaceholder = ({ className = "" }: { className?: string }) => (
  <div className={`relative h-full w-full overflow-hidden bg-secondary ${className}`}>
    {/* Grid pattern */}
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="road-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#road-grid)" />
    </svg>
    {/* Route line */}
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 20 80 Q 40 30 80 20" fill="none" stroke="hsl(var(--teal))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.6" />
    </svg>
    {/* Pins */}
    <div className="absolute left-[20%] top-[75%] h-4 w-4 rounded-full bg-primary shadow-lg" />
    <div className="absolute right-[22%] top-[18%] h-4 w-4 rounded-full bg-amber-500 shadow-lg" />
    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">Map placeholder</p>
  </div>
);
