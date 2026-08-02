import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Waveform bars — animated by audioLevel (0-1)
// ---------------------------------------------------------------------------
const WaveformBars = ({ level }: { level: number }) => {
  const factors = [0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.3];
  return (
    <div className="flex gap-[3px] items-center h-7">
      {factors.map((f, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white transition-all duration-75"
          style={{ height: `${Math.max(3, level * f * 28)}px`, opacity: 0.85 + level * 0.15 }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Floating Assistant
// ---------------------------------------------------------------------------
export const FloatingAssistant: React.FC = () => {
  const {
    isListening,
    isProcessing,
    isSpeaking,
    audioLevel,
    transcript,
    lastFeedback,
    voiceEnabled,
    startListening,
    stopListening,
    setVoiceEnabled,
  } = useVoiceAssistant();

  const [showBubble, setShowBubble]       = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef                          = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording timer
  useEffect(() => {
    if (isListening) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isListening]);

  // Bubble visibility
  useEffect(() => {
    const active = transcript || isProcessing || isSpeaking || isListening;
    if (active) {
      setShowBubble(true);
    } else if (lastFeedback) {
      setShowBubble(true);
      const t = setTimeout(() => setShowBubble(false), 5000);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowBubble(false), 1000);
      return () => clearTimeout(t);
    }
  }, [transcript, isProcessing, isSpeaking, lastFeedback]);

  // Hide on restricted portals and PWD mode
  const restrictedPaths = ["/admin", "/driver", "/pwd-mode"];
  const isRestricted = restrictedPaths.some(path => 
    window.location.pathname === path || window.location.pathname.startsWith(`${path}/`)
  );
  
  if (isRestricted) return null;

  const handleButtonClick = () => {
    if (isProcessing || isSpeaking) return; // Busy — ignore
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // State labels
  const bubbleLabel = isProcessing
    ? "SafeGo AI is thinking"
    : isSpeaking
    ? "SafeGo AI Speaking"
    : isListening
    ? `Listening  ${formatTime(recordingTime)}`
    : lastFeedback
    ? "SafeGo AI"
    : "SafeGo AI";

  const bubbleContent = transcript && isListening
    ? transcript
    : isProcessing
    ? "Gemini Flash is analyzing..."
    : isSpeaking || lastFeedback
    ? lastFeedback
    : "Tap the mic to speak a command";

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      {/* Info / feedback bubble */}
      {(showBubble || isListening || isProcessing || isSpeaking) && (
        <div
          className={cn(
            "max-w-[260px] mb-2 px-5 py-3 rounded-[24px] backdrop-blur-xl border shadow-[0_20px_40px_rgba(0,0,0,0.12)]",
            "animate-in slide-in-from-bottom-4 zoom-in-75 duration-300 pointer-events-auto",
            "bg-white/90 border-white/20",
            isProcessing        && "ring-2 ring-primary/30",
            isSpeaking          && "ring-2 ring-purple-400/40",
            isListening         && "ring-2 ring-red-400/40"
          )}
        >
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2">
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : isSpeaking ? (
              <Volume2 className="h-4 w-4 text-purple-500 animate-pulse shrink-0" />
            ) : isListening ? (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground truncate">
              {bubbleLabel}
            </span>
          </div>

          {/* Waveform hidden as WebSpeech doesn't provide raw PCM levels easily */}

          {/* Content */}
          <p
            className={cn(
              "text-[15px] font-semibold leading-tight tracking-tight",
              isSpeaking ? "text-purple-600" : "text-primary",
              isListening && !transcript && "text-muted-foreground italic"
            )}
          >
            {isListening && !transcript ? "Speak now…" : bubbleContent}
          </p>
        </div>
      )}

      {/* Floating mic button */}
      <button
        id="voice-assistant-btn"
        onClick={handleButtonClick}
        disabled={isProcessing || isSpeaking}
        aria-label={isListening ? "Stop recording" : "Start voice assistant"}
        className={cn(
          "h-20 w-20 rounded-full flex items-center justify-center",
          "transition-all duration-300 active:scale-90 pointer-events-auto relative group overflow-hidden",
          "disabled:opacity-80 disabled:cursor-not-allowed",
          isListening
            ? "bg-red-500 shadow-[0_0_35px_rgba(239,68,68,0.55)] ring-4 ring-white scale-105"
            : isSpeaking
            ? "bg-purple-600 shadow-[0_0_35px_rgba(147,51,234,0.5)] ring-4 ring-white"
            : isProcessing
            ? "bg-primary/80 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            : "bg-black shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:scale-105"
        )}
      >
        {/* Glow layer */}
        <div
          className={cn(
            "absolute inset-0 opacity-50 blur-xl transition-all duration-700",
            isListening
              ? "bg-red-400 scale-150 animate-pulse"
              : isSpeaking
              ? "bg-purple-500 scale-125 animate-pulse"
              : isProcessing
              ? "bg-primary scale-110 animate-pulse"
              : "bg-primary/60 group-hover:scale-110"
          )}
        />

        {/* Glass inner ring */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-md border border-white/30 z-0" />

        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center">
          {isListening ? (
             <Mic className="h-9 w-9 text-white animate-pulse" />
          ) : isSpeaking ? (
            <Volume2 className="h-9 w-9 text-white animate-pulse" />
          ) : isProcessing ? (
            <Loader2 className="h-9 w-9 text-white animate-spin" />
          ) : (
            <>
              <Mic className="h-9 w-9 text-white group-hover:text-yellow-400 transition-colors" />
              {voiceEnabled && (
                <div className="absolute -top-7 -right-2 bg-green-500 text-[9px] font-black px-2 py-0.5 rounded-full text-white shadow-lg border-2 border-black">
                  ON
                </div>
              )}
            </>
          )}
        </div>
      </button>
    </div>
  );
};
