import { modes } from "@/config/modeConfig";
import type { RideMode } from "@/config/modeConfig";

interface Props {
  active: string;
  onSelect: (id: string) => void;
}

export const ModeFilterTabs = ({ active, onSelect }: Props) => {
  const tabs = [{ id: "all", name: "All Modes" }, ...modes.map((m) => ({ id: m.id, name: m.name }))];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {tabs.map((t) => {
        const isActive = active === t.id;
        const mode = modes.find((m) => m.id === t.id);
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              isActive
                ? "text-primary-foreground shadow-sm"
                : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
            style={isActive ? { backgroundColor: mode?.accent || "hsl(var(--foreground))", color: "white" } : undefined}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
};
