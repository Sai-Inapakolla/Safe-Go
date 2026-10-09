import React, { useState, useEffect } from "react";
import {
  User,
  Users,
  Heart,
  Car,
  Accessibility,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Phone,
  ShieldCheck,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { RideMode } from "@/config/modeConfig";

export interface BookingRecipientDetails {
  bookingFor: "myself" | "others";
  gender?: "she" | "he" | "other";
  age?: number;
  preferenceMode: RideMode;
  riderName?: string;
  riderPhone?: string;
}

export interface BookingForModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (details: BookingRecipientDetails) => void;
  initialDetails?: Partial<BookingRecipientDetails>;
}

export const BookingForModal: React.FC<BookingForModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  initialDetails,
}) => {
  const { t } = useTranslation();

  // Load saved or initial state
  const [bookingFor, setBookingFor] = useState<"myself" | "others">(
    initialDetails?.bookingFor ||
      (localStorage.getItem("safego_booking_for") as "myself" | "others") ||
      "myself"
  );

  const [gender, setGender] = useState<"she" | "he" | "other">(
    initialDetails?.gender ||
      (localStorage.getItem("safego_booking_recipient_gender") as "she" | "he" | "other") ||
      "she"
  );

  const [age, setAge] = useState<string>(
    initialDetails?.age
      ? String(initialDetails.age)
      : localStorage.getItem("safego_booking_recipient_age") || "24"
  );

  const [preferenceMode, setPreferenceMode] = useState<RideMode>(
    initialDetails?.preferenceMode ||
      (localStorage.getItem("safego_booking_recipient_preference_mode") as RideMode) ||
      (localStorage.getItem("safego_preferred_mode") as RideMode) ||
      "normal"
  );

  const [riderName, setRiderName] = useState<string>(
    initialDetails?.riderName ||
      localStorage.getItem("safego_booking_recipient_name") ||
      ""
  );

  const [riderPhone, setRiderPhone] = useState<string>(
    initialDetails?.riderPhone ||
      localStorage.getItem("safego_booking_recipient_phone") ||
      ""
  );

  // Sync state if modal is reopened or initialDetails change
  useEffect(() => {
    if (isOpen) {
      const savedFor = initialDetails?.bookingFor || (localStorage.getItem("safego_booking_for") as "myself" | "others") || "myself";
      setBookingFor(savedFor);
      if (initialDetails?.gender) setGender(initialDetails.gender);
      if (initialDetails?.age) setAge(String(initialDetails.age));
      if (initialDetails?.preferenceMode) setPreferenceMode(initialDetails.preferenceMode);
      if (initialDetails?.riderName) setRiderName(initialDetails.riderName);
      if (initialDetails?.riderPhone) setRiderPhone(initialDetails.riderPhone);
    }
  }, [isOpen, initialDetails]);

  if (!isOpen) return null;

  // Auto-suggest preference mode when gender or age changes in "Others" mode
  const handleGenderSelect = (selectedGender: "she" | "he" | "other") => {
    setGender(selectedGender);
    if (selectedGender === "she" && preferenceMode === "normal") {
      setPreferenceMode("pink");
    } else if (selectedGender === "he" && preferenceMode === "pink") {
      setPreferenceMode("normal");
      toast.info("Switched to Normal Mode (Pink Mode is exclusively for women passengers).", { duration: 3000 });
    }
  };

  const handleAgeChange = (val: string) => {
    setAge(val);
    const parsedAge = parseInt(val, 10);
    if (!isNaN(parsedAge) && parsedAge >= 60 && preferenceMode === "normal") {
      setPreferenceMode("elderly");
      toast.info("Senior citizen detected. Elderly Mode recommended for extra boarding assistance.", { duration: 3500 });
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (bookingFor === "others") {
      const parsedAge = parseInt(age, 10);
      if (!age || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        toast.error("Please specify a valid age for the passenger (1-120 years).");
        return;
      }

      if (gender === "he" && preferenceMode === "pink") {
        toast.error("Pink Mode is exclusively reserved for female passengers. Please select Normal, Elderly, or PWD Mode.");
        return;
      }
    }

    const payload: BookingRecipientDetails = {
      bookingFor,
      gender: bookingFor === "others" ? gender : undefined,
      age: bookingFor === "others" ? parseInt(age, 10) : undefined,
      preferenceMode,
      riderName: bookingFor === "others" ? riderName.trim() : undefined,
      riderPhone: bookingFor === "others" ? riderPhone.trim() : undefined,
    };

    // Persist details in localStorage
    localStorage.setItem("safego_booking_for", bookingFor);
    if (bookingFor === "others") {
      localStorage.setItem("safego_booking_recipient_gender", gender);
      localStorage.setItem("safego_booking_recipient_age", age);
      localStorage.setItem("safego_booking_recipient_preference_mode", preferenceMode);
      localStorage.setItem("safego_booking_recipient_name", riderName.trim());
      localStorage.setItem("safego_booking_recipient_phone", riderPhone.trim());
    } else {
      localStorage.removeItem("safego_booking_recipient_gender");
      localStorage.removeItem("safego_booking_recipient_age");
      localStorage.removeItem("safego_booking_recipient_name");
      localStorage.removeItem("safego_booking_recipient_phone");
    }

    // Dispatch global event for live synchronization across components
    window.dispatchEvent(
      new CustomEvent("safego_booking_for_changed", {
        detail: payload,
      })
    );

    onProceed(payload);
    onClose();
  };

  const modeOptions = [
    {
      id: "normal" as RideMode,
      name: "Normal Mode",
      badge: "Standard",
      color: "hsl(var(--primary))",
      lightBg: "bg-primary/10",
      textColor: "text-primary",
      icon: Car,
      description: "Standard verified fleet, fast & reliable safety."
    },
    {
      id: "pink" as RideMode,
      name: "Pink Mode",
      badge: "For Women",
      color: "hsl(var(--pink))",
      lightBg: "bg-pink-500/10",
      textColor: "text-pink-600 dark:text-pink-400",
      icon: Heart,
      description: "Exclusively verified female pilots & AI-monitored routes.",
      disabled: bookingFor === "others" && gender === "he"
    },
    {
      id: "elderly" as RideMode,
      name: "Elderly Mode",
      badge: "Seniors (60+)",
      color: "hsl(var(--blue))",
      lightBg: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
      icon: ShieldCheck,
      description: "Driver boarding assistance, patient pace & family alerts."
    },
    {
      id: "pwd" as RideMode,
      name: "PWD Mode",
      badge: "Accessible",
      color: "hsl(var(--purple))",
      lightBg: "bg-purple-500/10",
      textColor: "text-purple-600 dark:text-purple-400",
      icon: Accessibility,
      description: "Wheelchair-accessible cabs with trained empathic drivers."
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-for-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl my-auto overflow-hidden rounded-[2.5rem] border border-border/80 bg-background/95 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 p-2 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">SafeGo Ride Request</span>
            </div>
            <h2 id="booking-for-modal-title" className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              To whom are you booking this ride?
            </h2>
          </div>
        </div>

        {/* STEP 1: Myself or Others Selector */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 mb-6">
          {/* Myself Option */}
          <button
            type="button"
            onClick={() => setBookingFor("myself")}
            className={`group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              bookingFor === "myself"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]"
                : "border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card"
            }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div
                className={`p-2.5 rounded-xl transition-all ${
                  bookingFor === "myself"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <User size={22} />
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  bookingFor === "myself"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 bg-background"
                }`}
              >
                {bookingFor === "myself" && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <span className="font-black text-base sm:text-lg text-foreground block">Myself</span>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                I am traveling on this ride
              </p>
            </div>
            <span className="mt-3 inline-block self-start px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-secondary text-muted-foreground">
              Personal Ride
            </span>
          </button>

          {/* Others Option */}
          <button
            type="button"
            onClick={() => setBookingFor("others")}
            className={`group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              bookingFor === "others"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]"
                : "border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card"
            }`}
          >
            <div className="flex items-start justify-between w-full mb-3">
              <div
                className={`p-2.5 rounded-xl transition-all ${
                  bookingFor === "others"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Users size={22} />
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  bookingFor === "others"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 bg-background"
                }`}
              >
                {bookingFor === "others" && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </div>
            <div>
              <span className="font-black text-base sm:text-lg text-foreground block">Others</span>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Booking for family, friend, or parent
              </p>
            </div>
            <span className="mt-3 inline-block self-start px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
              Someone Else
            </span>
          </button>
        </div>

        {/* STEP 2: IF "OTHERS" IS SELECTED - ASK FOR THEIR DETAILS */}
        {bookingFor === "others" && (
          <div className="space-y-4 mb-6 p-4 sm:p-5 rounded-3xl bg-secondary/30 border border-border/70 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Users size={16} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                Please specify their details
              </h3>
            </div>

            {/* Gender Selection: Whether she / he */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2 block">
                Whether She or He *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "she", label: "She (Female)", icon: "👩" },
                  { id: "he", label: "He (Male)", icon: "👨" },
                  { id: "other", label: "Other", icon: "🧑" },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGenderSelect(g.id as "she" | "he" | "other")}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      gender === g.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "border-border/70 bg-card hover:bg-secondary/70 text-foreground"
                    }`}
                  >
                    <span>{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
              {gender === "she" && (
                <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold mt-1.5 flex items-center gap-1">
                  <Heart size={11} className="fill-current" />
                  Pink Mode (verified female drivers & AI safety routing) is available for her!
                </p>
              )}
            </div>

            {/* Age Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="modal-rider-age" className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Passenger Age *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAgeChange("24")}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-full bg-secondary border border-border/50"
                  >
                    Adult (24)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgeChange("68")}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20"
                  >
                    Senior (60+)
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  id="modal-rider-age"
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="Enter passenger age (e.g. 24, 68)"
                  className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  years old
                </span>
              </div>
            </div>

            {/* Preference Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Your Preference Mode *
                </label>
                <span className="text-[10px] font-bold text-primary">
                  {modeOptions.find((m) => m.id === preferenceMode)?.badge}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = preferenceMode === opt.id;
                  const isDisabled = opt.disabled;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setPreferenceMode(opt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? "border-primary bg-card ring-2 ring-primary/20 shadow-sm"
                          : isDisabled
                          ? "border-border/40 bg-secondary/30 opacity-50 cursor-not-allowed"
                          : "border-border/70 bg-card hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${opt.color}20` }}
                        >
                          <Icon size={14} style={{ color: opt.color }} />
                        </div>
                        <span className="text-xs font-black text-foreground truncate">{opt.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {opt.badge} · {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Rider Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label htmlFor="modal-rider-name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">
                  Passenger Name (Optional)
                </label>
                <input
                  id="modal-rider-name"
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary transition-all text-foreground"
                />
              </div>
              <div>
                <label htmlFor="modal-rider-phone" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">
                  Passenger Phone (Optional)
                </label>
                <input
                  id="modal-rider-phone"
                  type="tel"
                  value={riderPhone}
                  onChange={(e) => setRiderPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary transition-all text-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 (Alternative): IF "MYSELF" IS SELECTED - Quick Preference Mode Preview */}
        {bookingFor === "myself" && (
          <div className="mb-6 p-4 rounded-3xl bg-secondary/30 border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Your Preference Mode
              </label>
              <span className="text-[10px] font-bold text-muted-foreground">Tap to switch</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {modeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = preferenceMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreferenceMode(opt.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "border-primary bg-card ring-2 ring-primary/20 shadow-sm"
                        : "border-border/60 bg-card hover:bg-secondary"
                    }`}
                  >
                    <Icon size={16} style={{ color: opt.color }} />
                    <span className="text-[11px] font-bold text-foreground">{opt.name.replace(" Mode", "")}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <Info size={13} className="shrink-0 text-primary" />
              <span>You are listed as the primary traveler. Your verified safety settings will apply.</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-border/80 bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="px-7 py-3 rounded-2xl bg-primary hover:brightness-110 active:scale-95 text-primary-foreground text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer"
          >
            <span>Proceed to Book Ride</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingForModal;
