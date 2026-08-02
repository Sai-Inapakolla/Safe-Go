interface Props {
  score: number;
  label?: string;
  color?: string;
}

export const SafetyScoreBar = ({ score, label = "Safety Analysis Score", color = "hsl(var(--teal))" }: Props) => (
  <div className="w-full">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <span className="text-sm font-black tracking-tight" style={{ color }}>{score}%</span>
      </div>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 border border-border/10">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out relative"
        style={{ width: `${score}%`, backgroundColor: color }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
      </div>
    </div>
  </div>
);
