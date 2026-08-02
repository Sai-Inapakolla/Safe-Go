import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ModeCard } from "@/components/ModeCard";
import { ModeFilterTabs } from "@/components/ModeFilterTabs";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { modes } from "@/config/modeConfig";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Bell, MapPin, CheckCircle, ArrowRight, Star,
  Clock, Users, Car, ShieldCheck, Zap, HelpCircle, Lock,
  Banknote, GraduationCap, Heart, CalendarCheck, Navigation,
  X, User, Globe, Accessibility, Cpu, MessageSquare
} from "lucide-react";

// ─── Services Hero Graphic Component ───────────────────────────────────────────
const ServicesHeroGraphic = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const slideshowImages = [
    "/taxi-yellow-1.webp",
    "/taxi-yellow-2.webp",
    "/taxi-yellow-3.webp",
    "/taxi-yellow-4.webp"
  ];

  const ACCENT_COLOR = "#4f46e5"; // Premium Indigo
  const active = selectedCard || hoveredCard;

  useEffect(() => {
    if (active) return;
    const interval = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 3500); // Slow, premium transition rate for a comfortable, cinematic flow
    return () => clearInterval(interval);
  }, [active]);

  const leftCards = [
    { title: "Pink Mode", desc: "Verified female drivers exclusively for women passengers, ensuring maximum comfort.", top: "12.5%", color: ACCENT_COLOR },
    { title: "PWD Accessibility", desc: "Specially equipped vehicles and trained drivers for differently-abled passengers.", top: "37.5%", color: "#374151" },
    { title: "Elderly Assistance", desc: "Patient, top-rated drivers offering door-to-door support for senior citizens.", top: "62.5%", color: "#374151" },
    { title: "AI Safe Routing", desc: "Machine learning algorithms analyze crime data for the absolute safest path.", top: "87.5%", color: "#374151" },
  ];

  const rightCards = [
    { title: "Emergency SOS", desc: "One-tap emergency alert instantly notifies authorities and pre-selected contacts.", top: "12.5%", color: "#374151" },
    { title: "Live Tracking", desc: "Share your real-time location with family for complete peace of mind.", top: "37.5%", color: "#374151" },
    { title: "Verified Operators", desc: "Strict background checks and continuous monitoring for every active driver.", top: "62.5%", color: "#374151" },
    { title: "Multilingual App", desc: "Navigate and communicate seamlessly with native language app support.", top: "87.5%", color: "#374151" },
  ];

  const getCardIcon = (title: string) => {
    switch (title) {
      case "Pink Mode":
        return <User className="text-[#f43f5e] w-5 h-5" />;
      case "PWD Accessibility":
        return <Accessibility className="text-[#f43f5e] w-5 h-5" />;
      case "Elderly Assistance":
        return <Heart className="text-[#f43f5e] w-5 h-5" />;
      case "AI Safe Routing":
        return <Cpu className="text-[#f43f5e] w-5 h-5" />;
      case "Emergency SOS":
        return <Bell className="text-[#f43f5e] w-5 h-5" />;
      case "Live Tracking":
        return <MapPin className="text-[#f43f5e] w-5 h-5" />;
      case "Verified Operators":
        return <ShieldCheck className="text-[#f43f5e] w-5 h-5" />;
      case "Multilingual App":
        return <MessageSquare className="text-[#f43f5e] w-5 h-5" />;
      default:
        return <Shield className="text-[#f43f5e] w-5 h-5" />;
    }
  };

  const getLineStyles = (cardTitle: string) => {
    if (selectedCard !== null) {
      if (selectedCard === cardTitle) {
        return {
          stroke: ACCENT_COLOR,
          strokeWidth: "4",
          opacity: 1,
          style: { "--flow-speed": "0.6s" } as React.CSSProperties
        };
      } else {
        return {
          stroke: ACCENT_COLOR,
          strokeWidth: "0",
          opacity: 0,
          style: { "--flow-speed": "3s" } as React.CSSProperties
        };
      }
    }

    const isHovered = hoveredCard === cardTitle;
    const isAnyHovered = hoveredCard !== null;

    if (isHovered) {
      return {
        stroke: ACCENT_COLOR,
        strokeWidth: "4",
        opacity: 1,
        style: { "--flow-speed": "0.6s" } as React.CSSProperties
      };
    }

    if (isAnyHovered) {
      return {
        stroke: ACCENT_COLOR,
        strokeWidth: "1.5",
        opacity: 0.08,
        style: { "--flow-speed": "3s" } as React.CSSProperties
      };
    }

    return {
      stroke: ACCENT_COLOR,
      strokeWidth: "2.8",
      opacity: 0.8,
      style: { "--flow-speed": "1.8s" } as React.CSSProperties
    };
  };

  return (
    <div className="relative w-[1000px] h-[720px] flex justify-center items-center shrink-0 scale-[0.45] sm:scale-[0.58] md:scale-[0.72] lg:scale-[0.82] xl:scale-[0.92] origin-center select-none">

      {/* Stylesheet for flowchart animations */}
      <style>{`
        @keyframes dash-flow {
          to {
            stroke-dashoffset: -24;
          }
        }
        .flow-line {
          stroke-dasharray: 8 6;
          animation: dash-flow var(--flow-speed, 1.8s) linear infinite;
          transition: stroke-width 0.3s, opacity 0.3s, stroke 0.3s;
        }
        @keyframes float-y-1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes float-y-2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(4px); }
        }
        @keyframes float-x {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(3px); }
        }
        @keyframes radar-sweep {
          0% { transform: scale(0.1); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes siren-ring {
          0%, 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
        }
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg); }
          20%, 60% { transform: rotate(12deg); }
          40%, 80% { transform: rotate(-12deg); }
        }
        .badge-float-1 { animation: float-y-1 4s ease-in-out infinite; }
        .badge-float-2 { animation: float-y-2 4.5s ease-in-out infinite; }
        .badge-float-3 { animation: float-x 3.8s ease-in-out infinite; }
      `}</style>

      {/* Central Phone */}
      <div className="relative w-[300px] h-[600px] z-20 bg-[#1e1e1e] rounded-[3.2rem] border-[12px] border-[#2d2d2d] shadow-[0_25px_60px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col justify-center items-center">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
          <div className="w-24 h-5 bg-[#2d2d2d] rounded-b-2xl"></div>
        </div>

        {/* Interactive Phone Screen UI */}
        <div className={`w-full h-full bg-[#f8fafc] dark:bg-zinc-950 overflow-hidden relative flex flex-col transition-all duration-500 ${active === "Emergency SOS" ? "ring-4 ring-red-500/80 ring-inset" : ""
          }`}
          style={{
            animation: active === "Emergency SOS" ? "siren-ring 2s infinite" : "none"
          }}>
          {/* Top Info Bar inside Screen */}
          <div className="absolute top-0 inset-x-0 h-10 px-5 flex items-center justify-between z-40 bg-white/40 dark:bg-black/30 backdrop-blur-sm border-b border-gray-200/20">
            <span className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300">9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">SECURED</span>
            </div>
          </div>

          {active ? (
            <motion.div
              key="map-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full flex flex-col"
            >
              {/* Vector City Map SVG Background */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.65] dark:opacity-[0.25] z-0" viewBox="0 0 276 576" preserveAspectRatio="none">
                {/* Soft grid lines */}
                <defs>
                  <pattern id="city-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.7" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#city-grid)" />

                {/* Roads */}
                <path d="M -20 180 Q 80 180 120 220 T 260 250" fill="none" stroke="#e2e8f0" strokeWidth="20" strokeLinecap="round" />
                <path d="M 60 -20 Q 60 180 140 220 T 140 600" fill="none" stroke="#e2e8f0" strokeWidth="18" strokeLinecap="round" />
                <path d="M 220 -20 L 220 600" fill="none" stroke="#e2e8f0" strokeWidth="14" />

                {/* Road center lines */}
                <path d="M -20 180 Q 80 180 120 220 T 260 250" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
                <path d="M 60 -20 Q 60 180 140 220 T 140 600" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
              </svg>

              {/* Dynamic Map Route Line */}
              <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 276 576" preserveAspectRatio="none">
                {/* Base route */}
                <path
                  d="M 60 140 Q 60 200 140 240 T 140 400"
                  fill="none"
                  stroke={
                    active === "Pink Mode"
                      ? "#db2777"
                      : active === "AI Safe Routing"
                        ? "#4f46e5"
                        : active === "Emergency SOS"
                          ? "#dc2626"
                          : "#0d9488"
                  }
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                  style={{
                    filter: active ? "drop-shadow(0 0 5px rgba(79, 70, 229, 0.45))" : "none"
                  }}
                />

                {/* Alternating bypassed unsafe route for AI Safe Routing */}
                {active === "AI Safe Routing" && (
                  <path
                    d="M 60 140 L 220 140 L 220 310 L 140 400"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    className="opacity-70 animate-pulse"
                  />
                )}

                {/* Route Start Waypoint */}
                <circle cx="60" cy="140" r="5" fill="#10b981" />
                <circle cx="60" cy="140" r="10" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-ping" style={{ animationDuration: "2s" }} />

                {/* Route End Waypoint */}
                <rect x="136" y="396" width="8" height="8" rx="1.5" fill="#ef4444" />
                <circle cx="140" cy="400" r="12" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-pulse" />
              </svg>

              {/* Live GPS Car Dot */}
              <div
                className="absolute z-20 transition-all duration-1000 ease-in-out"
                style={{
                  left: active === "AI Safe Routing" ? "138px" : "138px",
                  top: active === "AI Safe Routing" ? "300px" : "280px"
                }}
              >
                <div className={`h-4 w-4 rounded-full flex items-center justify-center border-2 border-white shadow-lg ${active === "Pink Mode" ? "bg-pink-600" : active === "Emergency SOS" ? "bg-red-600" : "bg-primary"
                  }`}>
                  <Navigation size={8} className="text-white fill-white rotate-45" />
                </div>
                <div className={`absolute -inset-1 rounded-full animate-ping opacity-25 ${active === "Pink Mode" ? "bg-pink-600" : "bg-primary"
                  }`} />
              </div>

              {/* Radar Sweep Effect (Live Tracking Active) */}
              {active === "Live Tracking" && (
                <div className="absolute left-[138px] top-[280px] z-15 pointer-events-none -translate-x-1/2 -translate-y-1/2">
                  <div className="w-24 h-24 rounded-full border border-emerald-500/40 bg-emerald-500/5" style={{ animation: "radar-sweep 2s infinite linear" }} />
                  <div className="absolute inset-0 w-24 h-24 rounded-full border border-emerald-500/20" style={{ animation: "radar-sweep 2s infinite linear", animationDelay: "1s" }} />
                </div>
              )}

              {/* Siren Alert Icon (Emergency Active) */}
              {active === "Emergency SOS" && (
                <div className="absolute left-1/2 top-1/3 -translate-x-1/2 z-20 bg-red-600 text-white rounded-full p-3 shadow-xl animate-bounce">
                  <Bell size={24} className="animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}

              {/* AI Bypass Badge overlay */}
              {active === "AI Safe Routing" && (
                <div className="absolute left-1/2 top-[160px] -translate-x-1/2 z-20 bg-red-500 text-white text-[8px] font-extrabold uppercase py-0.5 px-1.5 rounded shadow border border-white flex items-center gap-0.5 animate-pulse">
                  <X size={8} /> High-Risk Area Bypassed
                </div>
              )}

              {/* ────── Floating Safety Badges (matching first screenshot) ────── */}

              {/* Badge 1: Pass / Pink Mode */}
              <div
                className={`absolute top-[50px] left-[12px] z-30 transition-all duration-300 badge-float-1 flex items-center gap-1 rounded-full px-2.5 py-1.5 shadow-md border ${active === "Pink Mode"
                  ? "bg-pink-50 border-pink-200 scale-110 shadow-pink-100"
                  : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                  }`}
                style={{
                  borderColor: active === "Pink Mode" ? "#f472b6" : undefined,
                  boxShadow: active === "Pink Mode" ? "0 8px 20px rgba(244, 114, 182, 0.25)" : undefined
                }}
              >
                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center ${active === "Pink Mode" ? "bg-pink-600 text-white" : "border border-red-500 text-red-500"}`}>
                  <X size={10} className="stroke-[3]" />
                </div>
                <span className={`text-[9px] font-extrabold ${active === "Pink Mode" ? "text-pink-700" : "text-gray-800 dark:text-gray-200"}`}>
                  {active === "Pink Mode" ? "Pink Mode" : "Pass"}
                </span>
              </div>

              {/* Badge 2: Emergency Protected (Red) */}
              <div
                className={`absolute top-[45px] right-[10px] z-30 transition-all duration-300 badge-float-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-md border ${active === "Emergency SOS"
                  ? "bg-red-600 border-red-500 scale-112 shadow-red-200 text-white"
                  : "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400"
                  }`}
                style={{
                  animation: active === "Emergency SOS" ? "bell-shake 0.5s infinite" : undefined
                }}
              >
                <Bell size={10} className={active === "Emergency SOS" ? "text-white" : "text-red-500"} />
                <span className="text-[9px] font-extrabold">Emergency Protected</span>
              </div>

              {/* Badge 3: Verified Driver */}
              <div
                className={`absolute top-[95px] left-[8px] z-30 transition-all duration-300 badge-float-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-md border ${active === "Verified Operators"
                  ? "bg-emerald-50 border-emerald-200 scale-110 shadow-emerald-100"
                  : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                  }`}
                style={{
                  borderColor: active === "Verified Operators" ? "#34d399" : undefined,
                  boxShadow: active === "Verified Operators" ? "0 8px 20px rgba(52, 211, 153, 0.25)" : undefined
                }}
              >
                <ShieldCheck size={11} className="text-emerald-500" />
                <span className={`text-[9px] font-extrabold ${active === "Verified Operators" ? "text-emerald-700" : "text-gray-800 dark:text-gray-200"}`}>Verified Driver</span>
              </div>

              {/* Badge 4: AI Safe Route */}
              <div
                className={`absolute top-[145px] right-[8px] z-30 transition-all duration-300 badge-float-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-md border ${active === "AI Safe Routing"
                  ? "bg-indigo-50 border-indigo-200 scale-110 shadow-indigo-100"
                  : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                  }`}
                style={{
                  borderColor: active === "AI Safe Routing" ? "#818cf8" : undefined,
                  boxShadow: active === "AI Safe Routing" ? "0 8px 20px rgba(129, 140, 248, 0.25)" : undefined
                }}
              >
                <Navigation size={10} className="text-indigo-500 fill-indigo-100 rotate-45" />
                <span className={`text-[9px] font-extrabold ${active === "AI Safe Routing" ? "text-indigo-700" : "text-gray-800 dark:text-gray-200"}`}>AI Safe Route</span>
              </div>

              {/* Badge 5: 24/7 Monitored */}
              <div
                className={`absolute bottom-[220px] left-[10px] z-30 transition-all duration-300 badge-float-2 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-md border ${active === "Live Tracking"
                  ? "bg-pink-50 border-pink-200 scale-110 shadow-pink-100"
                  : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                  }`}
                style={{
                  borderColor: active === "Live Tracking" ? "#f472b6" : undefined
                }}
              >
                <Clock size={11} className="text-pink-500" />
                <span className={`text-[9px] font-extrabold ${active === "Live Tracking" ? "text-pink-700" : "text-gray-800 dark:text-gray-200"}`}>24/7 Monitored</span>
              </div>

              {/* Badge 6: Multilingual Enabled */}
              <div
                className={`absolute bottom-[200px] right-[10px] z-30 transition-all duration-300 badge-float-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-md border ${active === "Multilingual App"
                  ? "bg-blue-50 border-blue-200 scale-110 shadow-blue-100"
                  : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                  }`}
                style={{
                  borderColor: active === "Multilingual App" ? "#60a5fa" : undefined
                }}
              >
                <Globe size={11} className="text-blue-500" />
                <span className={`text-[9px] font-extrabold ${active === "Multilingual App" ? "text-blue-700" : "text-gray-800 dark:text-gray-200"}`}>Multilingual Enabled</span>
              </div>

              {/* Dynamic Accessibility and Elderly Badges (fades in) */}
              {active === "PWD Accessibility" && (
                <div className="absolute top-[215px] left-[12px] z-30 animate-bounce flex items-center gap-1 bg-blue-600 border border-blue-500 text-white rounded-full px-2.5 py-1.5 shadow-lg">
                  <Users size={11} />
                  <span className="text-[9px] font-extrabold">PWD Assisted</span>
                </div>
              )}

              {active === "Elderly Assistance" && (
                <div className="absolute top-[210px] right-[12px] z-30 animate-bounce flex items-center gap-1 bg-amber-500 border border-amber-400 text-white rounded-full px-2.5 py-1.5 shadow-lg">
                  <Heart size={11} className="fill-white" />
                  <span className="text-[9px] font-extrabold">Elderly Care</span>
                </div>
              )}

              {/* ────── Bottom Ride Details Card (matching first screenshot) ────── */}
              <div className="absolute bottom-[38px] left-[12px] right-[12px] bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-zinc-800/80 z-30 transition-all duration-300 flex flex-col">

                {/* Card Header (Profile & Payment Type) */}
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${active === "Pink Mode"
                    ? "bg-pink-100 text-pink-600"
                    : active === "PWD Accessibility"
                      ? "bg-blue-100 text-blue-600"
                      : active === "Elderly Assistance"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-[#0d9488]/10 text-[#0d9488]"
                    }`}>
                    {active === "Pink Mode" ? (
                      <User size={16} />
                    ) : active === "PWD Accessibility" ? (
                      <Users size={16} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>

                  {/* Digital Payment Label */}
                  <div className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wide ${active === "Emergency SOS"
                    ? "bg-red-100 text-red-600"
                    : active === "Pink Mode"
                      ? "bg-pink-100 text-pink-600"
                      : active === "PWD Accessibility"
                        ? "bg-blue-100 text-blue-600"
                        : active === "Elderly Assistance"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-emerald-100 text-emerald-700"
                    }`}>
                    {active === "Emergency SOS" ? (
                      "SOS BROADCAST"
                    ) : active === "Pink Mode" ? (
                      "FEMALE OPERATOR"
                    ) : active === "PWD Accessibility" ? (
                      "ACCESSIBLE RIDE"
                    ) : active === "Elderly Assistance" ? (
                      "CARE SPECIALIST"
                    ) : active === "Multilingual App" ? (
                      "डिजिटल भुगतान"
                    ) : (
                      "DIGITAL PAYMENT"
                    )}
                  </div>
                </div>

                {/* Ride Details (ETA, car type) */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight ${active === "Emergency SOS" ? "text-red-600 animate-pulse" : "text-gray-900 dark:text-white"
                      }`}>
                      {active === "Emergency SOS" ? (
                        "ACTIVE"
                      ) : active === "Multilingual App" ? (
                        "3 मिनट"
                      ) : (
                        "3 min"
                      )}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                      {active === "Emergency SOS" ? (
                        "Alert Broadcasted"
                      ) : active === "Pink Mode" ? (
                        "Innova • Female Driver"
                      ) : active === "Multilingual App" ? (
                        "सेडान • 1.7 किमी"
                      ) : (
                        "Sedan • 1.7 km"
                      )}
                    </span>
                  </div>
                </div>

                {/* Route addresses */}
                <div className="flex flex-col gap-2 relative pl-4 border-l border-dashed border-gray-200 dark:border-zinc-800 ml-1.5 text-left">
                  {/* Pickup Address */}
                  <div className="relative">
                    <div className="absolute -left-[20px] top-[4px] h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white" />
                    <p className="text-[9px] font-extrabold text-gray-700 dark:text-gray-300 leading-none">
                      {active === "Multilingual App" ? "7वीं मेन रोड, इंदिरा नगर" : "7th Main Rd, Indiranagar"}
                    </p>
                  </div>

                  {/* Destination Address */}
                  <div className="relative mt-0.5">
                    <div className="absolute -left-[20px] top-[4px] h-2.5 w-2.5 rounded-sm bg-red-500 border border-white" />
                    <p className="text-[9px] font-extrabold text-gray-700 dark:text-gray-300 leading-none">
                      {active === "Multilingual App" ? "कोरामंगला" : "Koramangala"}
                    </p>
                  </div>
                </div>

                {/* State messages */}
                {active && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800/80 text-[8px] font-extrabold uppercase tracking-wide text-left text-primary">
                    {active === "Pink Mode" && (
                      <span className="text-pink-600">✓ प्रिया एस. • महिला चालक सत्यापित</span>
                    )}
                    {active === "Emergency SOS" && (
                      <span className="text-red-600 animate-pulse">!! आपातकालीन अलर्ट: संपर्क एवं पुलिस को सूचित किया जा रहा है</span>
                    )}
                    {active === "PWD Accessibility" && (
                      <span className="text-blue-600">✓ रैंप युक्त वाहन एवं विशेष सहायता सक्रिय</span>
                    )}
                    {active === "Elderly Assistance" && (
                      <span className="text-amber-600">✓ द्वार तक सहायता सुनिश्चित की गई</span>
                    )}
                    {active === "AI Safe Routing" && (
                      <span className="text-indigo-600 animate-pulse">✦ मार्ग सुरक्षा: 99.8% - सभी संवेदनशील क्षेत्र बाईपास</span>
                    )}
                    {active === "Live Tracking" && (
                      <span className="text-emerald-600">✦ लाइव ट्रैकिंग सक्रिय - 3 संरक्षक जुड़े हैं</span>
                    )}
                    {active === "Verified Operators" && (
                      <span className="text-emerald-600">✓ पृष्ठभूमि जांच: 100% स्पष्ट</span>
                    )}
                    {active === "Multilingual App" && (
                      <span className="text-blue-600">✦ हिंदी भाषा सक्रिय</span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="welcome-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full z-30 flex flex-col justify-between"
            >
              {/* Background Image Slideshow with smooth cross-fade */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={slideshowImages[slideshowIndex]}
                    src={slideshowImages[slideshowIndex]}
                    alt="SafeGo Slide"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                  />
                </AnimatePresence>
                {/* Dynamic Overlay Gradient for perfect readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/85 z-10 pointer-events-none" />
              </div>

              {/* Top Header Section inside Phone */}
              <div className="relative z-10 px-5 pt-12 flex flex-col text-left">
                <div className="inline-flex items-center gap-1 bg-primary/20 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full w-fit mb-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: '2s' }} />
                  <span className="text-[7.5px] text-white font-extrabold uppercase tracking-widest">LIVE IN INDIA</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight font-display tracking-tight drop-shadow-md">
                  SafeGo India
                </h3>
                <p className="text-[10px] font-semibold text-white/80 leading-snug drop-shadow-sm mt-0.5">
                  Your Safest Journey starts here.
                </p>
              </div>



              {/* Spacer to keep welcome screen layout balanced and clean */}
              <div className="h-16 pb-12 w-full relative z-10" />
            </motion.div>
          )}

          {/* Home Button Bar inside Screen */}
          <div className="absolute bottom-1 inset-x-0 flex justify-center z-40">
            <div className="w-16 h-1 bg-gray-300 dark:bg-zinc-800 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* SVG Dotted lines behind phone curving elegantly to converge nicely near phone center */}
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 1000 720">
        {/* Left lines curving elegantly to converge nicely near phone center */}
        <path d="M 290 90 Q 320 90, 350 210" className="flow-line" {...getLineStyles("Pink Mode")} fill="none" />
        <path d="M 290 270 Q 320 270, 350 310" className="flow-line" {...getLineStyles("PWD Accessibility")} fill="none" />
        <path d="M 290 450 Q 320 450, 350 410" className="flow-line" {...getLineStyles("Elderly Assistance")} fill="none" />
        <path d="M 290 630 Q 320 630, 350 510" className="flow-line" {...getLineStyles("AI Safe Routing")} fill="none" />

        {/* Right lines curving elegantly to converge nicely near phone center */}
        <path d="M 710 90 Q 680 90, 650 210" className="flow-line" {...getLineStyles("Emergency SOS")} fill="none" />
        <path d="M 710 270 Q 680 270, 650 310" className="flow-line" {...getLineStyles("Live Tracking")} fill="none" />
        <path d="M 710 450 Q 680 450, 650 410" className="flow-line" {...getLineStyles("Verified Operators")} fill="none" />
        <path d="M 710 630 Q 680 630, 650 510" className="flow-line" {...getLineStyles("Multilingual App")} fill="none" />
      </svg>

      {/* Left Feature Cards - Re-engineered for high visibility */}
      {leftCards.map((card) => {
        const isSelected = selectedCard === card.title;
        const isHovered = hoveredCard === card.title;
        const isAnySelected = selectedCard !== null;
        const isAnyHovered = hoveredCard !== null;

        let opacity = 1;
        let scale = 1;
        let pointerEvents: "auto" | "none" = "auto";

        if (isAnySelected) {
          if (isSelected) {
            opacity = 1;
            scale = 1.15;
            pointerEvents = "auto";
          } else {
            opacity = 0;
            scale = 0.4;
            pointerEvents = "none";
          }
        } else if (isAnyHovered) {
          if (isHovered) {
            opacity = 1;
            scale = 1.1;
          } else {
            opacity = 0.35;
            scale = 0.95;
          }
        }

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity, x: 0, scale }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            onMouseEnter={() => !isAnySelected && setHoveredCard(card.title)}
            onMouseLeave={() => !isAnySelected && setHoveredCard(null)}
            onClick={() => {
              setSelectedCard(isSelected ? null : card.title);
              setHoveredCard(null);
            }}
            className={`absolute left-[10px] w-[280px] h-[105px] rounded-[1.6rem] p-4 border transition-all duration-300 z-30 flex items-center gap-4 cursor-pointer ${isSelected
              ? 'bg-white border-primary shadow-[0_20px_50px_rgba(79,70,229,0.25)] border-[2.5px]'
              : isHovered
                ? 'bg-white shadow-[0_20px_50px_rgba(79,70,229,0.18)] border-primary'
                : 'bg-white border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)]'
              }`}
            style={{
              top: card.top,
              transform: 'translateY(-50%)',
              pointerEvents,
              borderColor: isSelected || isHovered ? ACCENT_COLOR : undefined
            }}
          >
            {/* Left Circular Icon Container */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#fff1f2] dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex-shrink-0">
              {getCardIcon(card.title)}
            </div>

            {/* Right Left-Aligned Text Content */}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="font-extrabold text-[15px] mb-0.5 text-[#111827] dark:text-white transition-colors duration-300"
                style={{ color: isSelected || isHovered ? ACCENT_COLOR : undefined }}>
                {card.title}
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-[11.5px] leading-snug transition-colors duration-300 font-medium">
                {card.desc}
              </p>
            </div>
          </motion.div>
        );
      })}

      {/* Right Feature Cards - Re-engineered for high visibility */}
      {rightCards.map((card) => {
        const isSelected = selectedCard === card.title;
        const isHovered = hoveredCard === card.title;
        const isAnySelected = selectedCard !== null;
        const isAnyHovered = hoveredCard !== null;

        let opacity = 1;
        let scale = 1;
        let pointerEvents: "auto" | "none" = "auto";

        if (isAnySelected) {
          if (isSelected) {
            opacity = 1;
            scale = 1.15;
            pointerEvents = "auto";
          } else {
            opacity = 0;
            scale = 0.4;
            pointerEvents = "none";
          }
        } else if (isAnyHovered) {
          if (isHovered) {
            opacity = 1;
            scale = 1.1;
          } else {
            opacity = 0.35;
            scale = 0.95;
          }
        }

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity, x: 0, scale }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            onMouseEnter={() => !isAnySelected && setHoveredCard(card.title)}
            onMouseLeave={() => !isAnySelected && setHoveredCard(null)}
            onClick={() => {
              setSelectedCard(isSelected ? null : card.title);
              setHoveredCard(null);
            }}
            className={`absolute right-[10px] w-[280px] h-[105px] rounded-[1.6rem] p-4 border transition-all duration-300 z-30 flex items-center gap-4 cursor-pointer ${isSelected
              ? 'bg-white border-primary shadow-[0_20px_50px_rgba(79,70,229,0.25)] border-[2.5px]'
              : isHovered
                ? 'bg-white shadow-[0_20px_50px_rgba(79,70,229,0.18)] border-primary'
                : 'bg-white border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)]'
              }`}
            style={{
              top: card.top,
              transform: 'translateY(-50%)',
              pointerEvents,
              borderColor: isSelected || isHovered ? ACCENT_COLOR : undefined
            }}
          >
            {/* Left Circular Icon Container */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#fff1f2] dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex-shrink-0">
              {getCardIcon(card.title)}
            </div>

            {/* Right Left-Aligned Text Content */}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="font-extrabold text-[15px] mb-0.5 text-[#111827] dark:text-white transition-colors duration-300"
                style={{ color: isSelected || isHovered ? ACCENT_COLOR : undefined }}>
                {card.title}
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-[11.5px] leading-snug transition-colors duration-300 font-medium">
                {card.desc}
              </p>
            </div>
          </motion.div>
        );
      })}

    </div>
  );
};

// ─── Safety Dashboard Widget Component ───────────────────────────────────────────
const SafetyDashboardWidget = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [activeCheck, setActiveCheck] = useState("Sentinel AI Active");
  
  const checks = [
    "Analyzing street illumination...",
    "Scanning municipal safety reports...",
    "Monitoring active GPS coordinates...",
    "Verifying driver biometrics...",
    "Telemetry speed scan in progress...",
    "Continuous audio guard scanning...",
    "AI safe-routing optimized..."
  ];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    let idx = 0;
    const checkTimer = setInterval(() => {
      idx = (idx + 1) % checks.length;
      setActiveCheck(checks[idx]);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(checkTimer);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[480px] rounded-3xl border border-white/10 bg-[#0b0f19] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)] overflow-hidden text-left font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-50px] right-[-50px] h-[150px] w-[150px] rounded-full bg-primary/20 blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] h-[150px] w-[150px] rounded-full bg-rose-500/10 blur-[60px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-emerald-400 font-display">
              🛡️ Sentinel AI Active
            </h3>
            <p className="text-[9.5px] font-semibold text-white/50 mt-0.5 tracking-tight font-mono">
              {activeCheck}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-bold text-white/70 font-mono tracking-widest">{currentTime}</span>
        </div>
      </div>

      {/* Grid statistics metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "AI Safety Rating", val: "99.9%", color: "text-emerald-400" },
          { label: "Dispatch Response", val: "< 2.4 min", color: "text-primary" },
          { label: "Live Escort Hubs", val: "Active 24/7", color: "text-rose-400" }
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[9px] font-medium text-white/40 leading-tight uppercase tracking-wider">{stat.label}</span>
            <span className={`text-[14px] font-extrabold mt-1.5 ${stat.color}`}>{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Core Security Protocols List */}
      <div className="space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2 font-display">Automated Shield Protocols</h4>

        {[
          {
            icon: <Cpu className="text-emerald-400" size={16} />,
            title: "AI Safe-Route Navigation",
            desc: "Continuous calculation analyzing active road lights, police proximity, and regional safety statistics."
          },
          {
            icon: <Lock className="text-primary" size={16} />,
            title: "Live Biometric Shield",
            desc: "Continuous driver verification matching background and live face scans prior to passenger boarding."
          },
          {
            icon: <Navigation className="text-rose-400" size={16} />,
            title: "Dynamic Geofence Sentinel",
            desc: "Immediate command center alerts if the vehicle deviates from the optimal path by more than 100 meters."
          },
          {
            icon: <MessageSquare className="text-amber-400" size={16} />,
            title: "Opt-In Voice Guard",
            desc: "Real-time voice detection framework triggers silent SOS alerts if predetermined distress codes are recorded."
          }
        ].map((protocol, i) => (
          <div key={i} className="flex gap-3.5 items-start bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.02] p-3 rounded-xl transition-all duration-300">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
              {protocol.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-[12px] font-bold text-white tracking-tight">{protocol.title}</h5>
              <p className="text-[10px] text-white/50 leading-normal mt-0.5 font-medium">{protocol.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const [showCurtainBg, setShowCurtainBg] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowCurtainBg(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "100px 0px 100px 0px",
      }
    );

    if (curtainRef.current) {
      observer.observe(curtainRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const revealRef = useScrollReveal([activeMode]);
  const filtered = activeMode === "all" ? modes : modes.filter((m) => m.id === activeMode);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate tilt (max 8 degrees)
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const fullQuote = "True peace of mind is knowing that someone is looking out for you at every turn. We built this platform so you never have to ride alone.";
  const [displayedQuote, setDisplayedQuote] = useState("");

  useEffect(() => {
    const words = fullQuote.split(" ");
    let i = 0;
    const timer = setInterval(() => {
      if (i < words.length) {
        setDisplayedQuote(prev => (prev ? prev + " " : "") + words[i]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 120);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={revealRef} className="relative">
      {/* Fixed background image for curtain reveal effect */}
      <div 
        className="fixed top-[80px] inset-x-0 bottom-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none select-none transition-opacity duration-300"
        style={{ 
          backgroundImage: "url('/airport_taxis.jpg')",
          backgroundAttachment: "fixed",
          opacity: showCurtainBg ? 1 : 0,
          visibility: showCurtainBg ? "visible" : "hidden"
        }}
      />

      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[100vh] flex items-center bg-white dark:bg-background overflow-hidden pt-20 pb-12 z-10">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

        <div className="mx-auto flex w-full flex-col-reverse items-center gap-16 px-6 py-12 lg:flex-row lg:gap-20 sm:px-10 lg:px-16 relative z-10">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 text-center lg:text-left lg:-mt-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6">
              <ShieldCheck size={16} />
              <span>Premium Safety Standard</span>
            </div>
            <h1 className="font-display text-5xl font-black leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Elevate Your Journey
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-primary mx-auto lg:mx-0">
              SafeGo ensures every woman, elderly citizen, and differently-abled passenger travels with safety, dignity, and confidence.
            </p>
            <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground mx-auto lg:mx-0">
              SafeGo adapts to you with tailored routes, verified operators, and real-time monitoring. Premium safety, accessible for all.
            </p>


            {/* The SafeGo Promise Quote */}
            <div className="mt-8 max-w-xl hidden lg:block text-left">
              <p className="text-[17px] font-medium text-foreground italic leading-relaxed min-h-[50px]">
                {displayedQuote}
                <span className="inline-block w-1 h-5 bg-primary ml-1 animate-pulse" style={{ visibility: displayedQuote.length === fullQuote.length ? 'hidden' : 'visible' }} />
              </p>
              <p className="mt-4 text-xs font-bold tracking-widest text-primary uppercase">- THE SAFEGO PROMISE</p>
            </div>
          </motion.div>

          {/* Right Content - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 flex justify-center items-center py-10 lg:py-0 relative lg:-mt-20"
          >
            {/* Glowing background behind phone */}
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-75 opacity-50 pointer-events-none"></div>
            <div className="w-[400px] sm:w-[520px] md:w-[640px] lg:w-[738px] xl:w-[828px] h-[320px] sm:h-[415px] md:h-[515px] lg:h-[590px] xl:h-[660px] flex items-center justify-center overflow-visible shrink-0">
              <ServicesHeroGraphic />
            </div>
          </motion.div>

        </div>
      </section>

      {/* RIDE MODES */}
      <section className="section-padding bg-slate-50 dark:bg-zinc-900/60 relative z-10 border-t border-b border-border/10">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <div className="text-center scroll-reveal">
            <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Choose Your Safe Ride</h2>
            <p className="mt-3 text-lg text-muted-foreground">Tailored safety experiences for every passenger</p>
          </div>
          <div className="mt-10 scroll-reveal">
            <ModeFilterTabs active={activeMode} onSelect={setActiveMode} />
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {filtered.map((m) => (
              <div key={m.id} className="scroll-reveal">
                <ModeCard mode={m} hideCTA={true} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP SHOWCASE */}
      <section className="section-padding bg-white dark:bg-background relative z-10">
        <div className="mx-auto flex w-full flex-col items-center gap-16 lg:flex-row px-6 sm:px-10 lg:px-16">
          {/* Left text */}
          <div className="flex-1 scroll-reveal">
            <span className="caption-label">SEAMLESS MOBILE EXPERIENCE</span>
            <h2 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">Smart App. Smarter Safety.</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Track your ride live, access emergency SOS in one tap, and let AI monitor your safety in real-time.
            </p>
            <div className="mt-8 flex flex-col gap-6">
              {[
                { icon: Shield, title: "Real-Time AI Monitoring", desc: "Route safety analyzed continuously" },
                { icon: Bell, title: "Instant SOS Alerts", desc: "One tap to alert contacts and admin" },
                { icon: MapPin, title: "Live GPS Tracking", desc: "Share your location with family anytime" },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mode-teal-light">
                    <f.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{f.title}</p>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Safety Dashboard Widget */}
          <div className="relative flex flex-1 items-center justify-center scroll-reveal">
            <SafetyDashboardWidget />
          </div>
        </div>
      </section>

      {/* SCROLL REVEAL CURTAIN SECTION */}
      <section ref={curtainRef} className="relative h-[65vh] bg-transparent pointer-events-none select-none overflow-hidden">
        {/* Transparent section that acts as a viewport window to the fixed background image */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-auto">
          <div className="max-w-4xl px-6 text-center scroll-reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-sm mb-6 backdrop-blur-md">
              <Car size={14} className="text-primary-foreground" /> INDIA FLEET STRENGTH
            </span>
            <h2 className="font-display text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-lg">
              India's Largest <span className="text-primary">Verified</span> Fleet
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-200 font-bold leading-relaxed drop-shadow-md">
              Over 1,200+ top-rated, certified operators stationed at key hubs ready to assist you. 24/7 continuous coverage at airports, stations, and suburbs.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section-padding bg-slate-50 dark:bg-zinc-900/60 relative z-10 border-t border-b border-border/10 overflow-hidden">
        {/* Decorative background flow lines */}
        <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[300px] opacity-[0.03] pointer-events-none" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0 150 C 250 50, 750 250, 1000 150" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="12 12" />
        </svg>

        <div className="mx-auto w-full relative z-10 px-6 sm:px-10 lg:px-16">
          <div className="text-center scroll-reveal">
            <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl">How SafeGo Works</h2>
            <p className="mt-3 text-lg text-muted-foreground">From booking to arrival, every step is protected</p>
          </div>

          <div className="mt-20 relative">
            {/* Connecting line (Desktop only) */}
            <div className="hidden md:block absolute top-14 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-primary/30 z-0"></div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                { num: "01", icon: <CheckCircle className="text-foreground" size={24} />, color: "text-foreground", border: "border-foreground/10", title: "Select Your Mode", desc: "Choose the ride mode that fits your specific needs. Exclusive safety features and filters activate automatically based on your selection." },
                { num: "02", icon: <ShieldCheck className="text-primary" size={24} />, color: "text-primary", border: "border-primary/20", title: "AI Plans Your Route", desc: "Our machine learning model analyzes real-time crime data, street lighting, and historical road safety to select the absolute safest path." },
                { num: "03", icon: <MapPin className="text-mode-purple" size={24} />, color: "text-mode-purple", border: "border-mode-purple/20", title: "Ride with Protection", desc: "Real-time AI monitoring, verified driver tracking, emergency SOS alerts, and live family sharing remain active for your whole trip." },
              ].map((s, idx) => (
                <div key={s.num} className="relative scroll-reveal group">
                  {/* Arrow indicator for flow */}
                  {idx < 2 && (
                    <div className="hidden md:flex absolute -right-6 top-12 z-20 h-5 w-5 items-center justify-center text-primary/50 translate-x-1/2">
                      <ArrowRight size={20} />
                    </div>
                  )}

                  <div className={`safego-card relative overflow-hidden p-8 h-full z-10 bg-card border-2 ${s.border} hover:border-primary/40 transition-colors`}>
                    <span className="absolute -right-2 -top-4 font-display text-[80px] font-extrabold text-secondary/80 transition-transform group-hover:scale-110">{s.num}</span>

                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary font-display text-xl font-bold shadow-sm ${s.color}`}>
                        {s.icon}
                      </div>
                      <div className={`font-display text-xl font-bold ${s.color}`}>Step {s.num}</div>
                    </div>

                    <h3 className="relative z-10 mt-8 font-display text-2xl font-bold text-foreground">{s.title}</h3>
                    <p className="relative z-10 mt-3 text-[15px] leading-relaxed text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* TESTIMONIALS */}
      <section className="section-padding bg-white dark:bg-background relative z-10 overflow-hidden">
        <div className="text-center scroll-reveal mb-12">
          <h2 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Trusted by Thousands</h2>
          <p className="mt-3 text-lg text-muted-foreground">Real stories from real passengers</p>
        </div>

        {/* Marquee track */}
        <div
          className="relative w-full"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <div
            className="flex gap-6 w-max"
            style={{
              animation: "marquee-scroll 32s linear infinite",
            }}
            onMouseEnter={e => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={e => (e.currentTarget.style.animationPlayState = "running")}
          >
            {/* Render testimonials twice for seamless loop */}
            {[
              { mode: "Pink Mode", color: "hsl(var(--pink))", bg: "hsl(var(--pink-light))", quote: "As a woman commuting late at night, SafeGo's Pink Mode gives me genuine peace of mind. The verified female drivers and live tracking changed everything.", name: "Maria S.", city: "Manila" },
              { mode: "PWD Mode", color: "hsl(var(--purple))", bg: "hsl(var(--purple-light))", quote: "Finally a ride service that treats accessibility as a priority, not an afterthought. The voice navigation and pickup assistance are incredible.", name: "David L.", city: "Cebu" },
              { mode: "Elderly Mode", color: "hsl(var(--blue))", bg: "hsl(var(--blue-light))", quote: "My father uses SafeGo every week for his hospital visits. The patient drivers and door assistance make all the difference for our family.", name: "Ana R.", city: "Davao" },
              { mode: "Standard", color: "hsl(var(--teal))", bg: "hsl(var(--teal-light))", quote: "I love how SafeGo matches me with top-rated drivers every time. The app is smooth and the in-ride AI monitoring gives me real confidence.", name: "Carlo M.", city: "Quezon City" },
              { mode: "Pink Mode", color: "hsl(var(--pink))", bg: "hsl(var(--pink-light))", quote: "The SOS button saved me once during a sketchy route. Authorities were notified in seconds. SafeGo is not just an app — it's a safety net.", name: "Joyce T.", city: "Makati" },
              { mode: "PWD Mode", color: "hsl(var(--purple))", bg: "hsl(var(--purple-light))", quote: "As a wheelchair user, I struggled with regular ride apps. SafeGo's PWD Mode had a ramp-equipped driver at my door in under 10 minutes.", name: "Ben A.", city: "Pasig" },
              // Duplicate for loop
              { mode: "Pink Mode", color: "hsl(var(--pink))", bg: "hsl(var(--pink-light))", quote: "As a woman commuting late at night, SafeGo's Pink Mode gives me genuine peace of mind. The verified female drivers and live tracking changed everything.", name: "Maria S.", city: "Manila" },
              { mode: "PWD Mode", color: "hsl(var(--purple))", bg: "hsl(var(--purple-light))", quote: "Finally a ride service that treats accessibility as a priority, not an afterthought. The voice navigation and pickup assistance are incredible.", name: "David L.", city: "Cebu" },
              { mode: "Elderly Mode", color: "hsl(var(--blue))", bg: "hsl(var(--blue-light))", quote: "My father uses SafeGo every week for his hospital visits. The patient drivers and door assistance make all the difference for our family.", name: "Ana R.", city: "Davao" },
              { mode: "Standard", color: "hsl(var(--teal))", bg: "hsl(var(--teal-light))", quote: "I love how SafeGo matches me with top-rated drivers every time. The app is smooth and the in-ride AI monitoring gives me real confidence.", name: "Carlo M.", city: "Quezon City" },
              { mode: "Pink Mode", color: "hsl(var(--pink))", bg: "hsl(var(--pink-light))", quote: "The SOS button saved me once during a sketchy route. Authorities were notified in seconds. SafeGo is not just an app — it's a safety net.", name: "Joyce T.", city: "Makati" },
              { mode: "PWD Mode", color: "hsl(var(--purple))", bg: "hsl(var(--purple-light))", quote: "As a wheelchair user, I struggled with regular ride apps. SafeGo's PWD Mode had a ramp-equipped driver at my door in under 10 minutes.", name: "Ben A.", city: "Pasig" },
            ].map((t, i) => (
              <div
                key={i}
                className="w-[320px] flex-shrink-0 safego-card p-8 cursor-default transition-shadow hover:shadow-xl"
              >
                <span className="inline-block rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: t.bg, color: t.color }}>{t.mode}</span>
                <div className="mt-3 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-primary-foreground flex-shrink-0" style={{ backgroundColor: t.color }}>
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyframe injection */}
        <style>{`
          @keyframes marquee-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>



      {/* KEY FEATURES */}
      <section id="features" className="section-padding bg-slate-50 dark:bg-zinc-900/60 relative z-10 border-t border-b border-border/10 overflow-hidden">
        <div className="mx-auto w-full px-6 sm:px-10 lg:px-16">
          <div className="scroll-reveal text-center max-w-2xl mx-auto">
            <span className="caption-label">TAKING CARE OF EVERY CLIENT</span>
            <h2 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">Key Features</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We are all about our client's comfort and safety. That's why we provide the best service you can imagine, from start to finish.
            </p>
          </div>

          <div className="mt-16 relative">
            {/* Background connecting snake line for Flowchart (Desktop) */}
            <div className="hidden lg:block absolute top-[100px] left-[12%] right-[12%] bottom-0 pointer-events-none z-0">
              <svg width="100%" height="100%" preserveAspectRatio="none">
                <path d="M 0 0 C 300 0, 700 0, 1000 0" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" className="text-border" fill="none" />
              </svg>
            </div>

            <div className="grid gap-10 lg:gap-8 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {[
                { icon: Clock, title: "24/7 Car Delivery", bg: "bg-mode-teal-light", color: "text-primary", border: "border-primary", text: "Reserve a ride any time of the day or night. Our fleets are actively running during off-hours to make sure you never get stranded." },
                { icon: Lock, title: "Absolute Confidentiality", bg: "bg-secondary", color: "text-foreground", border: "border-border", text: "Your personal location data and contact info are securely encrypted. Drivers cannot access your real phone number through the app." },
                { icon: Zap, title: "Premium Ride Package", bg: "bg-mode-blue-light", color: "text-mode-blue", border: "border-mode-blue", text: "Enjoy complimentary Wi-Fi, phone chargers, and bottled water included standard on our verified Premium Fleet vehicles." },
                { icon: HelpCircle, title: "Dedicated Support", bg: "bg-mode-pink-light", color: "text-mode-pink", border: "border-mode-pink", text: "Got an issue? Hit the help button to connect instantly with a live human representative at our support center." },
              ].map((f, idx) => (
                <div key={f.title} className="relative scroll-reveal group">
                  {/* Flow Arrows */}
                  {idx < 3 && (
                    <div className="hidden lg:flex absolute -right-4 top-[32px] z-20 h-6 w-6 items-center justify-center text-muted-foreground translate-x-1/2 bg-background rounded-full border border-border shadow-sm">
                      <ArrowRight size={14} />
                    </div>
                  )}

                  <div className={`safego-card relative h-full flex flex-col p-8 transition-colors border-2 border-transparent hover:${f.border} bg-card/90 backdrop-blur-md`}>
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`flex shrink-0 h-16 w-16 items-center justify-center rounded-2xl ${f.bg} shadow-sm group-hover:scale-110 transition-transform`}>
                        <f.icon size={28} className={f.color} />
                      </div>
                      <span className="font-display font-extrabold text-3xl opacity-10">0{idx + 1}</span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-foreground">{f.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground flex-1">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DARK CTA BANNER */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white dark:bg-background relative z-10">
        <div className="relative mx-auto w-full overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-20 text-center sm:px-16 premium-shadow">
          {/* Decorative arcs */}
          <svg className="absolute right-0 top-0 h-full w-1/2 opacity-[0.06]" viewBox="0 0 200 200">
            <circle cx="200" cy="100" r="80" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="100" r="120" fill="none" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="100" r="160" fill="none" stroke="white" strokeWidth="0.5" />
          </svg>
          <h2 className="relative font-display text-3xl font-bold text-background sm:text-5xl">Start Riding Safer Today</h2>
          <p className="relative mt-4 text-background/70">Join thousands of passengers who trust SafeGo for every journey.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                if (downloaded || isDownloading) return;
                setIsDownloading(true);
                setTimeout(() => {
                  setIsDownloading(false);
                  setDownloaded(true);
                  setTimeout(() => setDownloaded(false), 3000);
                }, 1500);
              }}
              className={`rounded-full px-8 py-4 font-semibold transition-all ${downloaded ? 'bg-primary text-primary-foreground scale-100' : isDownloading ? 'bg-background/80 text-foreground/50 scale-95 cursor-wait' : 'bg-background text-foreground hover:scale-[1.02]'}`}
            >
              {isDownloading ? "Starting..." : downloaded ? "Check Downloads!" : "Download the App"}
            </button>
            <a href="#how" className="rounded-full border-2 border-background/30 px-8 py-4 font-semibold text-background transition-colors hover:border-background hover:bg-background/10">
              Learn More
            </a>
          </div>
        </div>
      </section>

      <div className="relative z-10 bg-background">
        <Footer />
      </div>
    </div>
  );
};

export default Home;
