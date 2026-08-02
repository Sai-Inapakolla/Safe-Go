import { Navbar } from "@/components/Navbar";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { SOSButton } from "@/components/SOSButton";
import { ArrowLeft, Phone, MessageCircle, Share2, Star } from "lucide-react";
import { Link } from "react-router-dom";

const RideTracking = () => (
  <div className="flex h-screen flex-col">
    {/* Top bar */}
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        <Link to="/home" className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-secondary">
          <ArrowLeft size={14} />
        </Link>
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Ride in Progress
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono text-muted-foreground">12:34</span>
        <button className="text-sm text-primary font-medium flex items-center gap-1">
          <Share2 size={14} /> Share Location
        </button>
      </div>
    </div>

    {/* Map */}
    <div className="flex-1 relative">
      <MapPlaceholder />
      {/* Animated car */}
      <div className="absolute left-[40%] top-[50%] h-6 w-6 rounded-full bg-foreground shadow-lg flex items-center justify-center">
        <span className="text-background text-[10px]">🚗</span>
      </div>
    </div>

    {/* Bottom panel */}
    <div className="rounded-t-3xl border-t border-border bg-background p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
      {/* Driver info */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">JD</div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">James D.</p>
          <p className="text-xs text-muted-foreground"><Star size={10} className="inline fill-amber-400 text-amber-400" /> 4.9 · Toyota Vios · ABC 123</p>
        </div>
        <div className="flex gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label="Call">
            <Phone size={16} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:bg-secondary" aria-label="Chat">
            <MessageCircle size={16} />
          </button>
        </div>
      </div>

      {/* Route */}
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">SM Mall</span>
        <span className="text-primary">→</span>
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">BGC</span>
        <span className="ml-auto font-semibold text-amber-600">Arriving in 12 min</span>
      </div>

      {/* Safety */}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-muted-foreground">AI Safety Monitoring Active</span>
      </div>
      <div className="mt-2">
        <SafetyScoreBar score={72} label="Trip Progress" />
      </div>

      {/* SOS */}
      <div className="mt-4">
        <SOSButton />
      </div>
    </div>
  </div>
);

export default RideTracking;
