import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";

export type AppRideMode = "pink" | "elderly" | "pwd" | "normal";

export interface AppModeContextType {
  // Senior / Elder Mode
  isElderMode: boolean;
  toggleElderMode: (val?: boolean) => void;
  setElderMode: (val: boolean) => void;

  // Pink Mode (Default for women / female riders)
  isPinkMode: boolean;
  togglePinkMode: (val?: boolean) => void;
  setPinkMode: (val: boolean) => void;

  // Disability Mode (PWD Accessibility)
  isDisabilityMode: boolean;
  hasDisability: boolean;
  toggleDisabilityMode: (val?: boolean) => void;
  setDisabilityMode: (val: boolean) => void;

  // Overall Preferred Ride Mode
  activeMode: AppRideMode;
  setActiveMode: (mode: AppRideMode) => void;

  // Rider Profile
  gender: string;
  age: number;
  setRiderPreferences: (prefs: {
    gender?: string;
    age?: number | string;
    hasDisability?: boolean;
    mode?: AppRideMode;
  }) => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const API_URL = getApiUrl();

export const ElderModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage
  const [gender, setGender] = useState<string>(() => {
    return localStorage.getItem("safego_user_gender") || "female";
  });

  const [age, setAge] = useState<number>(() => {
    const stored = localStorage.getItem("safego_user_age");
    return stored ? parseInt(stored, 10) || 24 : 24;
  });

  const [hasDisability, setHasDisabilityState] = useState<boolean>(() => {
    return localStorage.getItem("safego_has_disability") === "true";
  });

  const [isElderMode, setIsElderMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("safego_elder_mode");
      if (stored !== null) return stored === "true";
      const storedAge = localStorage.getItem("safego_user_age");
      if (storedAge && parseInt(storedAge, 10) >= 60) return true;
    } catch {}
    return false;
  });

  const [isDisabilityMode, setIsDisabilityMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("safego_has_disability");
      if (stored !== null) return stored === "true";
      const storedMode = localStorage.getItem("safego_preferred_mode");
      if (storedMode === "pwd") return true;
    } catch {}
    return false;
  });

  const [isPinkMode, setIsPinkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("safego_pink_mode");
      if (stored !== null) return stored === "true";
      const storedGender = localStorage.getItem("safego_user_gender") || "female";
      const storedMode = localStorage.getItem("safego_preferred_mode");
      // Default to Pink Mode if female, or if preferred_mode is pink, or on initial run
      if (storedMode === "pink" || storedGender === "female") return true;
    } catch {}
    return true; // Default user gets Pink Mode as requested
  });

  const [activeMode, setActiveModeState] = useState<AppRideMode>(() => {
    const stored = localStorage.getItem("safego_preferred_mode") as AppRideMode;
    if (stored && ["pink", "elderly", "pwd", "normal"].includes(stored)) {
      return stored;
    }
    const storedDisability = localStorage.getItem("safego_has_disability") === "true";
    if (storedDisability) return "pwd";
    const storedElder = localStorage.getItem("safego_elder_mode") === "true";
    if (storedElder) return "elderly";
    const storedGender = localStorage.getItem("safego_user_gender") || "female";
    if (storedGender === "female") return "pink";
    return "pink"; // By default user can have Pink mode
  });

  // 2. Synchronize HTML class tokens with active modes
  useEffect(() => {
    const root = document.documentElement;

    // Senior / Elder Mode
    if (isElderMode || activeMode === "elderly") {
      root.classList.add("elder-mode");
    } else {
      root.classList.remove("elder-mode");
    }

    // Pink Mode
    if (isPinkMode || activeMode === "pink") {
      root.classList.add("pink-mode");
    } else {
      root.classList.remove("pink-mode");
    }

    // Disability Mode
    if (isDisabilityMode || hasDisability || activeMode === "pwd") {
      root.classList.add("disability-mode");
    } else {
      root.classList.remove("disability-mode");
    }

    // Persist to localStorage
    try {
      localStorage.setItem("safego_elder_mode", isElderMode ? "true" : "false");
      localStorage.setItem("safego_pink_mode", isPinkMode ? "true" : "false");
      localStorage.setItem("safego_has_disability", hasDisability ? "true" : "false");
      localStorage.setItem("safego_preferred_mode", activeMode);
      localStorage.setItem("safego_user_gender", gender);
      localStorage.setItem("safego_user_age", String(age));
    } catch {}
  }, [isElderMode, isPinkMode, isDisabilityMode, hasDisability, activeMode, gender, age]);

  // 3. Listen to Cross-Tab Storage Changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "safego_elder_mode" && e.newValue !== null) {
        setIsElderMode(e.newValue === "true");
      }
      if (e.key === "safego_pink_mode" && e.newValue !== null) {
        setIsPinkMode(e.newValue === "true");
      }
      if (e.key === "safego_has_disability" && e.newValue !== null) {
        setHasDisabilityState(e.newValue === "true");
        setIsDisabilityMode(e.newValue === "true");
      }
      if (e.key === "safego_preferred_mode" && e.newValue !== null) {
        setActiveModeState(e.newValue as AppRideMode);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // 4. Backend Synchronization
  const syncWithBackend = useCallback(async (data: {
    is_elder?: boolean;
    has_disability?: boolean;
    gender?: string;
    age?: number;
    preferred_mode?: string;
  }) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn("Could not sync rider preferences with backend:", err);
    }
  }, []);

  // 5. Actions
  const setElderMode = (val: boolean) => {
    setIsElderMode(val);
    if (val) {
      setActiveModeState("elderly");
      setIsPinkMode(false);
      setIsDisabilityMode(false);
    } else if (activeMode === "elderly") {
      setActiveModeState(gender === "female" ? "pink" : "normal");
    }
    syncWithBackend({ is_elder: val, preferred_mode: val ? "elderly" : (gender === "female" ? "pink" : "normal") });
  };

  const toggleElderMode = (val?: boolean) => {
    const nextVal = typeof val === "boolean" ? val : !isElderMode;
    setElderMode(nextVal);
    if (nextVal) {
      toast.success("Senior Mode Enabled", {
        description: "116% enlarged typography, high-contrast clarity & senior-certified drivers active.",
        duration: 3500,
      });
    } else {
      toast.info("Standard Vision Mode Restored", { duration: 2500 });
    }
  };

  const setPinkMode = (val: boolean) => {
    setIsPinkMode(val);
    if (val) {
      setActiveModeState("pink");
      setIsElderMode(false);
      setIsDisabilityMode(false);
    } else if (activeMode === "pink") {
      setActiveModeState("normal");
    }
    syncWithBackend({ preferred_mode: val ? "pink" : "normal" });
  };

  const togglePinkMode = (val?: boolean) => {
    const nextVal = typeof val === "boolean" ? val : !isPinkMode;
    setPinkMode(nextVal);
    if (nextVal) {
      toast.success("Pink Mode Active", {
        description: "Female drivers preferred, enhanced route safety & emergency tracking active.",
        duration: 3500,
      });
    } else {
      toast.info("Standard Mode Active", { duration: 2500 });
    }
  };

  const setDisabilityMode = (val: boolean) => {
    setIsDisabilityMode(val);
    setHasDisabilityState(val);
    if (val) {
      setActiveModeState("pwd");
      setIsElderMode(false);
      setIsPinkMode(false);
    } else if (activeMode === "pwd") {
      setActiveModeState(gender === "female" ? "pink" : "normal");
    }
    syncWithBackend({
      has_disability: val,
      preferred_mode: val ? "pwd" : (gender === "female" ? "pink" : "normal"),
    });
  };

  const toggleDisabilityMode = (val?: boolean) => {
    const nextVal = typeof val === "boolean" ? val : !isDisabilityMode;
    setDisabilityMode(nextVal);
    if (nextVal) {
      toast.success("Disability / PWD Mode Enabled", {
        description: "Wheelchair ramp vehicles, audio guidance & physical assistance priority active.",
        duration: 3500,
      });
    } else {
      toast.info("Standard Accessibility Mode Restored", { duration: 2500 });
    }
  };

  const setActiveMode = (mode: AppRideMode) => {
    setActiveModeState(mode);
    if (mode === "pink") {
      setIsPinkMode(true);
      setIsElderMode(false);
      setIsDisabilityMode(false);
    } else if (mode === "elderly") {
      setIsElderMode(true);
      setIsPinkMode(false);
      setIsDisabilityMode(false);
    } else if (mode === "pwd") {
      setIsDisabilityMode(true);
      setHasDisabilityState(true);
      setIsPinkMode(false);
      setIsElderMode(false);
    } else {
      setIsPinkMode(false);
      setIsElderMode(false);
      setIsDisabilityMode(false);
    }
    syncWithBackend({ preferred_mode: mode });
  };

  const setRiderPreferences = (prefs: {
    gender?: string;
    age?: number | string;
    hasDisability?: boolean;
    mode?: AppRideMode;
  }) => {
    if (prefs.gender !== undefined) setGender(prefs.gender);
    if (prefs.age !== undefined) {
      const numAge = typeof prefs.age === "number" ? prefs.age : parseInt(prefs.age, 10);
      if (!isNaN(numAge)) {
        setAge(numAge);
        if (numAge >= 60 && !prefs.hasDisability && prefs.mode === undefined) {
          setIsElderMode(true);
          setActiveModeState("elderly");
        }
      }
    }
    if (prefs.hasDisability !== undefined) {
      setHasDisabilityState(prefs.hasDisability);
      setIsDisabilityMode(prefs.hasDisability);
      if (prefs.hasDisability && prefs.mode === undefined) {
        setActiveModeState("pwd");
      }
    }

    if (prefs.mode !== undefined) {
      setActiveMode(prefs.mode);
    } else if (prefs.hasDisability) {
      setActiveMode("pwd");
    } else if (prefs.age !== undefined && prefs.age >= 60) {
      setActiveMode("elderly");
    } else if (prefs.gender === "female" || (prefs.gender === undefined && gender === "female")) {
      setActiveMode("pink");
    }

    syncWithBackend({
      gender: prefs.gender,
      age: prefs.age,
      has_disability: prefs.hasDisability,
      is_elder: prefs.age !== undefined ? prefs.age >= 60 : undefined,
      preferred_mode: prefs.mode,
    });
  };

  const value: AppModeContextType = {
    isElderMode,
    toggleElderMode,
    setElderMode,

    isPinkMode,
    togglePinkMode,
    setPinkMode,

    isDisabilityMode,
    hasDisability,
    toggleDisabilityMode,
    setDisabilityMode,

    activeMode,
    setActiveMode,

    gender,
    age,
    setRiderPreferences,
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    return {
      isElderMode: false,
      toggleElderMode: () => {},
      setElderMode: () => {},
      isPinkMode: true,
      togglePinkMode: () => {},
      setPinkMode: () => {},
      isDisabilityMode: false,
      hasDisability: false,
      toggleDisabilityMode: () => {},
      setDisabilityMode: () => {},
      activeMode: "pink" as AppRideMode,
      setActiveMode: () => {},
      gender: "female",
      age: 24,
      setRiderPreferences: () => {},
    };
  }
  return context;
};

// Backward-compatible hook for components already using useElderMode
export const useElderMode = () => {
  const ctx = useAppMode();
  return {
    isElderMode: ctx.isElderMode,
    toggleElderMode: ctx.toggleElderMode,
    setElderMode: ctx.setElderMode,
  };
};
