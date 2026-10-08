import React from "react";
import { useAppMode, AppRideMode } from "@/contexts/ElderModeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, Users, Accessibility, Car } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const ModeQuickSwitcher: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { activeMode, setActiveMode } = useAppMode();

  const getModeInfo = (m: AppRideMode) => {
    switch (m) {
      case "pink":
        return {
          label: "Pink Mode",
          shortLabel: "Pink",
          icon: Heart,
          colorClass: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/40 hover:bg-pink-500/25",
          activeBadge: "bg-pink-500 text-white",
          description: "Female driver preference, safe lit routes & emergency tracking",
        };
      case "elderly":
        return {
          label: "Senior Mode",
          shortLabel: "Senior",
          icon: Users,
          colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25",
          activeBadge: "bg-amber-500 text-white",
          description: "116% large typography, patient drivers & doorstep assistance",
        };
      case "pwd":
        return {
          label: "Disability Mode",
          shortLabel: "PWD",
          icon: Accessibility,
          colorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 hover:bg-purple-500/25",
          activeBadge: "bg-purple-600 text-white",
          description: "Wheelchair ramp certified fleet & voice navigation assistance",
        };
      default:
        return {
          label: "Standard Mode",
          shortLabel: "Standard",
          icon: Car,
          colorClass: "bg-muted text-muted-foreground border-border/60 hover:bg-muted/80",
          activeBadge: "bg-primary text-primary-foreground",
          description: "Fast everyday rides with GPS monitoring",
        };
    }
  };

  const currentInfo = getModeInfo(activeMode);
  const CurrentIcon = currentInfo.icon;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                id="navbar-mode-switcher-btn"
                className={`relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-xs border ${currentInfo.colorClass} ${className}`}
                aria-label={`Active mode: ${currentInfo.label}`}
              >
                <CurrentIcon size={14} className={activeMode === "pink" ? "fill-pink-500" : ""} />
                <span className="hidden lg:inline">{currentInfo.shortLabel}</span>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMode === "pink" ? "bg-pink-400" : activeMode === "elderly" ? "bg-amber-400" : activeMode === "pwd" ? "bg-purple-400" : "bg-primary"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${activeMode === "pink" ? "bg-pink-500" : activeMode === "elderly" ? "bg-amber-500" : activeMode === "pwd" ? "bg-purple-500" : "bg-primary"}`} />
                </span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-bold">{currentInfo.label} Active</p>
            <p className="text-[11px] text-muted-foreground">{currentInfo.description}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-xl border border-border/80">
          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1">
            Switch Ride Mode
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          <DropdownMenuItem
            onClick={() => setActiveMode("pink")}
            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer font-bold text-xs ${
              activeMode === "pink" ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 font-black" : ""
            }`}
          >
            <div className="h-6 w-6 rounded-lg bg-pink-500/20 text-pink-500 flex items-center justify-center">
              <Heart size={13} className="fill-pink-500" />
            </div>
            <div className="flex-1">
              <p className="leading-tight">Pink Mode</p>
              <p className="text-[9px] font-normal text-muted-foreground">Default for women</p>
            </div>
            {activeMode === "pink" && <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setActiveMode("elderly")}
            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer font-bold text-xs ${
              activeMode === "elderly" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black" : ""
            }`}
          >
            <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Users size={13} />
            </div>
            <div className="flex-1">
              <p className="leading-tight">Senior Mode</p>
              <p className="text-[9px] font-normal text-muted-foreground">116% Large Typography</p>
            </div>
            {activeMode === "elderly" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setActiveMode("pwd")}
            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer font-bold text-xs ${
              activeMode === "pwd" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black" : ""
            }`}
          >
            <div className="h-6 w-6 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center">
              <Accessibility size={13} />
            </div>
            <div className="flex-1">
              <p className="leading-tight">Disability Mode</p>
              <p className="text-[9px] font-normal text-muted-foreground">Wheelchair Ramp fleet</p>
            </div>
            {activeMode === "pwd" && <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setActiveMode("normal")}
            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer font-bold text-xs ${
              activeMode === "normal" ? "bg-primary/10 text-primary font-black" : ""
            }`}
          >
            <div className="h-6 w-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <Car size={13} />
            </div>
            <div className="flex-1">
              <p className="leading-tight">Normal Mode</p>
              <p className="text-[9px] font-normal text-muted-foreground">Standard commute</p>
            </div>
            {activeMode === "normal" && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
