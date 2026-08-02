import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
interface VoiceAssistantContextType {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  transcript: string;
  lastCommand: string;
  lastFeedback: string;
  voiceEnabled: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  shareCurrentLocation?: () => void;
  triggerSOS?: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

// GEMINI CONFIG (REST VERSION)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const API_BASE = import.meta.env.VITE_API_URL || "";
const VOICE_API_URL = `${API_BASE}/api/voice`;

// ---------------------------------------------------------------------------
// Provider using Web Speech API + Gemini Flash
// ---------------------------------------------------------------------------
export const VoiceAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [lastFeedback, setLastFeedback] = useState("");
  const [voiceEnabled, setVoiceEnabledState] = useState(
    () => localStorage.getItem("voice_assistant_enabled") === "true"
  );

  const navigate = useNavigate();
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Set to Indian English for the project

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("Listening...");
      };

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        setTranscript(text);

        // Clear previous "auto-submit" timer
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);

        if (result.isFinal) {
          handleFinalTranscript(text);
        } else {
          // If not final, wait 2s of silence to auto-submit
          submitTimeoutRef.current = setTimeout(() => {
            handleFinalTranscript(text);
          }, 2000);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("[Voice] STT Error:", event.error);
        if (event.error === "no-speech" && window.location.pathname === "/pwd-mode") {
          // Restart if no speech detected ONLY in PWD mode (Hands-free)
          console.log("[Voice] Auto-restarting in PWD Mode due to silence...");
          stopListening();
          setTimeout(() => startListening(), 1000);
        } else {
          setIsListening(false);
          setTranscript("");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Text to Speech (Browser API)
  // ---------------------------------------------------------------------------
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    // Auto-select a clear English voice if available
    const getBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return voices.find(v => v.lang.includes("en-IN")) ||
        voices.find(v => v.lang.includes("en-GB")) ||
        voices.find(v => v.lang.includes("en-US")) ||
        voices[0];
    };

    const bestVoice = getBestVoice();
    if (bestVoice) utterance.voice = bestVoice;

    console.log("[Voice] Synthesis Result:", text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
      // Auto-stop after 5s of total silence if nothing captured
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (isListening && !transcript) {
          stopListening();
        }
      }, 5000);
    } catch (e) {
      console.error("[Voice] Start failed:", e);
    }
  };

  // Preload voices
  useEffect(() => {
    const handleVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
      submitTimeoutRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Voice Command via Gemini Flash
  // ---------------------------------------------------------------------------
  const handleFinalTranscript = async (text: string) => {
    const lower = text.toLowerCase();

    // Fast Path: Emergency Keywords (Hardcoded as requested)
    if (lower.includes("help") || lower.includes("police") || lower.includes("danger") || lower.includes("emergency")) {
      handleAction({ action: "SOS", feedback: "Triggering emergency SOS now! Help is on the way." });
      return;
    }
    if (lower.includes("location") || lower.includes("where am i")) {
      handleAction({ action: "LOCATION_SHARE", feedback: "Sharing your live location with your trusted contacts now." });
      return;
    }

    // AI Path: Gemini Flash for Intent Verification
    setIsProcessing(true);
    setLastCommand(text);
    console.log("[Voice] Gemini Request:", text);
    try {
      const prompt = `You are the brain of SafeGo, an Indian ride safety app. 
      Convert the user command into a JSON action. 
      Possible actions: NAVIGATE, LOGOUT, SOS, LOCATION_SHARE, UNKNOWN.
      Possible targets: /pwd-mode, /book/pink, /book/elderly, /book/normal, /dashboard, /safety, /home.
      Dashboard tabs: "Dashboard", "My Rides", "Safety Reports", "Emergency Contacts", "Settings".
      
      User said: "${text}"
      
      Respond only with JSON:
      {
        "action": "ACTION_NAME",
        "target": "/path",
        "feedback": "Spoken English response",
        "params": { "activeTab": "optional_tab_name" }
      }`;

      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY // Backup auth
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("[Voice] Gemini REST Error Body:", errBody);
        throw new Error(`Gemini REST failure: ${res.status}`);
      }
      const result = await res.json();
      console.log("[Voice] Gemini Raw Response:", result);
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const actionData = JSON.parse(jsonStr);

      console.log("[Voice] Executing Action:", actionData.action);
      handleAction(actionData);
    } catch (err) {
      console.error("[Voice] Gemini Error:", err);
      // Fallback: Just repeat back what we heard if AI fails
      speak("I understood: " + text + ". But I can't process that right now.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = (data: any) => {
    const { action, target, feedback, params } = data;
    setLastFeedback(feedback);
    speak(feedback);

    switch (action) {
      case "NAVIGATE":
        if (target) navigate(target, { state: params });
        break;
      case "SOS":
        triggerSOS();
        break;
      case "LOCATION_SHARE":
        shareCurrentLocation();
        break;
      case "LOGOUT":
        ["token", "userEmail", "user_role", "safego_profile"].forEach(k => localStorage.removeItem(k));
        navigate("/home");
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // Backend Integration for Actions (SOS, Location)
  // ---------------------------------------------------------------------------
  const triggerSOS = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await fetch(`${VOICE_API_URL}/sos-trigger`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`
          },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            location_address: "Current Location",
          }),
        });
        toast.error("SOS Alert triggered!");
      } catch { speak("Failed to reach emergency services."); }
    });
  };

  const shareCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await fetch(`${VOICE_API_URL}/location-share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`
          },
          body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        });
        toast.info("Location shared.");
      } catch { speak("Failed to share location."); }
    });
  };

  const setVoiceEnabled = (val: boolean) => {
    setVoiceEnabledState(val);
    localStorage.setItem("voice_assistant_enabled", String(val));
    if (!val) stopListening();
  };

  // DEBUG TRIGGER (For testing without a real mic)
  useEffect(() => {
    (window as any).__SAFEGO_DEBUG_VOICE = (text: string) => {
      console.log("[Voice] DEBUG: Mocking transcript ->", text);
      handleFinalTranscript(text);
    };
    return () => { delete (window as any).__SAFEGO_DEBUG_VOICE; };
  }, []);

  return (
    <VoiceAssistantContext.Provider
      value={{
        isListening, isProcessing, isSpeaking,
        audioLevel: 0,
        transcript, lastCommand, lastFeedback,
        voiceEnabled, startListening, stopListening, speak, setVoiceEnabled,
        shareCurrentLocation, triggerSOS,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error("useVoiceAssistant must be used within VoiceAssistantProvider");
  return ctx;
};
