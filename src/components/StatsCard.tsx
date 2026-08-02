import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  value: string;
  label: string;
  iconColor?: string;
  iconBg?: string;
}

export const StatsCard = ({ icon: Icon, value, label, iconColor = "hsl(var(--teal))", iconBg = "hsl(var(--teal-light))" }: Props) => (
  <div className="safego-card flex items-center gap-4 p-6">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
      <Icon size={20} style={{ color: iconColor }} />
    </div>
    <div>
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);
