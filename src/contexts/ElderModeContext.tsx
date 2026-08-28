import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface ElderModeContextType {
  isElderMode: boolean;
  toggleElderMode: (val?: boolean) => void;
  setElderMode: (val: boolean) => void;
}

const ElderModeContext = createContext<ElderModeContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ElderModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isElderMode, setIsElderMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("safego_elder_mode");
      if (stored !== null) {
        return stored === "true";
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    // Apply or remove the class from the <html> root element
    if (isElderMode) {
      document.documentElement.classList.add("elder-mode");
    } else {
      document.documentElement.classList.remove("elder-mode");
    }
    try {
      localStorage.setItem("safego_elder_mode", isElderMode ? "true" : "false");
    } catch {}
  }, [isElderMode]);

  // Sync with cross-tab events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "safego_elder_mode" && e.newValue !== null) {
        setIsElderMode(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Sync with backend profile if logged in
  const syncWithBackend = async (enabled: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_elder: enabled }),
      });
    } catch (err) {
      console.warn("Could not sync elder mode preference with backend:", err);
    }
  };

  const setElderMode = (val: boolean) => {
    setIsElderMode(val);
    syncWithBackend(val);
  };

  const toggleElderMode = (val?: boolean) => {
    const nextVal = typeof val === "boolean" ? val : !isElderMode;
    setIsElderMode(nextVal);
    syncWithBackend(nextVal);
    if (nextVal) {
      toast.success("Senior Vision Mode Enabled", {
        description: "Enlarged typography, high contrast, and simplified layout active.",
        duration: 3000,
      });
    } else {
      toast.info("Standard Vision Mode Restored", {
        duration: 2500,
      });
    }
  };

  return (
    <ElderModeContext.Provider value={{ isElderMode, toggleElderMode, setElderMode }}>
      {children}
    </ElderModeContext.Provider>
  );
};

export const useElderMode = () => {
  const context = useContext(ElderModeContext);
  if (!context) {
    return {
      isElderMode: false,
      toggleElderMode: () => {},
      setElderMode: () => {},
    };
  }
  return context;
};
