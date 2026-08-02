import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { ModeConfig } from "@/config/modeConfig";

export const ModeCard = ({ mode, hideCTA = false }: { mode: ModeConfig; hideCTA?: boolean }) => {
  const Icon = mode.icon;
  const isPink = mode.id === "pink";

  return (
    <div
      className={`safego-card p-8 flex flex-col ${isPink ? "border-l-[3px]" : ""}`}
      style={isPink ? { borderLeftColor: mode.accent } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: mode.lightBg }}>
          <Icon size={24} style={{ color: mode.accent }} />
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: mode.lightBg, color: mode.accent }}
        >
          {mode.badge}
        </span>
      </div>

      <h3 className="mt-5 font-display text-2xl font-bold text-foreground">{mode.name}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{mode.description}</p>

      <div className="my-4 h-px bg-border" />

      <div className="flex flex-col gap-2.5 flex-1">
        {mode.features.map((f) => (
          <div key={f} className="flex items-center gap-2.5">
            <Check size={16} style={{ color: mode.accent }} />
            <span className="text-sm text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>

      {!hideCTA && (
        <Link
          to={`/book/${mode.id}`}
          className="mt-6 flex w-full items-center justify-center rounded-full py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          style={{ backgroundColor: mode.accent }}
        >
          {mode.cta}
        </Link>
      )}
    </div>
  );
};
