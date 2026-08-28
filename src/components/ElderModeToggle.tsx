import React from "react";
import { useElderMode } from "@/contexts/ElderModeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

export const ElderModeToggle: React.FC<{ showLabel?: boolean; className?: string }> = ({
  showLabel = false,
  className = "",
}) => {
  const { isElderMode, toggleElderMode } = useElderMode();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => toggleElderMode()}
            aria-label={isElderMode ? "Disable Senior Vision Mode" : "Enable Senior Vision Mode"}
            className={`relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-xs ${
              isElderMode
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-400"
                : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            } ${className}`}
          >
            <span className="font-black text-xs tracking-tight">A+</span>
            {showLabel && (
              <span className="font-semibold text-xs tracking-normal">
                {isElderMode ? "Senior Mode (On)" : "Senior Mode"}
              </span>
            )}
            {isElderMode && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          <p className="font-bold">{isElderMode ? "Senior Vision Active (Click to Reset)" : "Enable Senior / Elder Vision Mode"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Larger fonts, bold text & high contrast readability</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
