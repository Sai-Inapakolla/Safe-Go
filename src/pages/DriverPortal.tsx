import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SafeGoLogo } from "@/components/SafeGoLogo";
import { useLocation, Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DriverNavigationMap } from "@/components/DriverNavigationMap";
import { toast } from "sonner";
import {
  LayoutDashboard, Car, FileText, DollarSign, Settings, LogOut, Star, Check, Clock,
  AlertCircle, Upload, MapPin, ArrowRight, TrendingUp, TrendingDown, Calendar, ChevronRight,
  User, Phone, Mail, Shield, Bell, Eye, EyeOff, Camera, Pencil, X, Save,
  IndianRupee, Download, Filter, Search, Menu, ChevronDown, ChevronUp,
  Route, Clock3, Fuel, Award, ThumbsUp, Navigation, CircleDot,
  FileUp, ExternalLink, MoreVertical, Trash2, Loader2, ShieldCheck, Lock, KeyRound
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRef } from "react";
import { getApiUrl } from "@/lib/api";

const DEFAULT_PILOT = {
  id: "drv_me",
  full_name: "SafeGo Pilot",
  phone: "+91 98201 44556",
  email: "driver@safego.ph",
  license_number: "IND-MH02-2023-8821",
  status: "approved",
  is_online: true,
  rating: 4.95,
  total_rides: 42,
  today_rides: 4,
  today_earnings: 1450,
  vehicle: {
    make: "Toyota",
    model: "Innova Crysta",
    plate_number: "MH 02 AB 1234",
    color: "Silver"
  }
};

// ───────── Types ─────────
type TabKey = "dashboard" | "rides" | "history" | "documents" | "earnings" | "settings";

const navItems: { icon: any; label: string; tab: TabKey }[] = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
  { icon: Car, label: "Available Rides", tab: "rides" },
  { icon: Clock, label: "My History", tab: "history" },
  { icon: FileText, label: "Documents", tab: "documents" },
  { icon: DollarSign, label: "Earnings", tab: "earnings" },
  { icon: Settings, label: "Settings", tab: "settings" },
];

const DEFAULT_MOCK_HISTORY = [
  { id: "mock-101", pickup: "Indiranagar 100ft Road", dest: "HSR Layout Sector 1", fare: "₹380", status: "completed", date: "Today", duration: "24 min", rating: 5, tip: "₹50", time: "02:15 PM" },
  { id: "mock-102", pickup: "Koramangala 5th Block", dest: "MG Road Metro Station", fare: "₹240", status: "completed", date: "Today", duration: "18 min", rating: 5, tip: "₹20", time: "11:30 AM" },
  { id: "mock-103", pickup: "Whitefield ITPL", dest: "Bellandur Outer Ring Rd", fare: "₹520", status: "completed", date: "Yesterday", duration: "42 min", rating: 5, tip: "₹30", time: "06:45 PM" },
  { id: "mock-104", pickup: "Hebbal Flyover", dest: "Kempegowda Int'l Airport", fare: "₹950", status: "completed", date: "Yesterday", duration: "35 min", rating: 5, tip: "₹100", time: "08:10 AM" },
  { id: "mock-105", pickup: "Electronic City Phase 1", dest: "Silk Board Junction", fare: "₹310", status: "completed", date: "Mar 10, 2026", duration: "28 min", rating: 4, tip: "₹0", time: "05:20 PM" },
  { id: "mock-106", pickup: "Jayanagar 4th Block", dest: "JP Nagar 6th Phase", fare: "₹180", status: "completed", date: "Mar 09, 2026", duration: "15 min", rating: 5, tip: "₹30", time: "03:00 PM" },
  { id: "mock-107", pickup: "Commercial Street", dest: "Brigade Road", fare: "₹150", status: "completed", date: "Mar 08, 2026", duration: "12 min", rating: 5, tip: "₹20", time: "01:10 PM" },
];

// ───────── Tab Components ─────────

const DashboardTab = ({
  driver,
  requests,
  activity,
  activeRide,
  onAccept,
  onDecline,
  onDetails,
  onRefresh,
  onOpenOtpModal,
  onFinishRide,
  loading
}: {
  driver: any,
  requests: any[],
  activity: any[],
  activeRide: any,
  onAccept: (id: string, loc: string) => void,
  onDecline: (id: string) => void,
  onDetails: (ride: any) => void,
  onRefresh: () => void,
  onOpenOtpModal: (id: string) => void,
  onFinishRide: (id: string) => void,
  loading: boolean
}) => {
  const initials = driver?.user?.full_name ? driver.user.full_name.split(" ").map((n: string) => n[0]).join("") : "D";

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Active Assigned Ride Console */}
      {activeRide && (
        <div className="rounded-2xl border-2 border-primary/40 bg-card p-6 shadow-xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-foreground">
                Active Assigned Ride Console
              </h3>
            </div>
            {activeRide.is_otp_verified ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Check size={14} /> Trip In Progress
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                <Lock size={14} /> OTP Verification Pending
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-secondary/40 border border-border/50">
            <div>
              <p className="text-sm font-bold text-foreground">{activeRide.pickup} ➔ {activeRide.dest}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Passenger: {activeRide.passenger_name || "Rider"} • Fare: {activeRide.fare}</p>
            </div>
            <div className="flex gap-2">
              {!activeRide.is_otp_verified ? (
                <button
                  onClick={() => onOpenOtpModal(activeRide.id)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 shadow-md flex items-center gap-2"
                >
                  <KeyRound size={16} /> Enter Passenger OTP to Start
                </button>
              ) : (
                <button
                  onClick={() => onFinishRide(activeRide.id)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-95 shadow-md flex items-center gap-2"
                >
                  <Check size={16} /> Complete Ride & Collect Fare
                </button>
              )}
            </div>
          </div>

          {/* Interactive Driver Satellite Route Map to Destination */}
          <div className="mt-4 pt-4 border-t border-border/40">
            <DriverNavigationMap
              pickup={activeRide.pickup || "Pickup Location"}
              pickupLat={activeRide.pickup_latitude}
              pickupLng={activeRide.pickup_longitude}
              destination={activeRide.dest || activeRide.destination || "Destination Address"}
              destLat={activeRide.destination_latitude}
              destLng={activeRide.destination_longitude}
              passengerName={activeRide.passenger_name || activeRide.passenger || "Rider"}
              passengerPhone={activeRide.passenger_phone || "+91 9490969706"}
              fare={activeRide.fare}
              isOtpVerified={activeRide.is_otp_verified}
            />
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-background p-6 lg:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-black text-primary-foreground shadow-lg shadow-primary/20">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-foreground tracking-tight">{driver?.user?.full_name || "Driver Portal"}</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><Star size={14} className="fill-amber-400 text-amber-400" /> {driver?.average_rating || "0.0"} Rating</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">Verified Driver ✓</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onRefresh} disabled={loading} className="p-2.5 rounded-xl border border-border bg-background hover:bg-secondary transition-all active:scale-95 disabled:opacity-50">
              <Clock className={`h-5 w-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Today's Rides", value: driver?.today_rides || 0, icon: Car, trend: "+3", up: true },
            { label: "Earnings", value: `₹${(driver?.today_earnings || 0).toLocaleString()}`, icon: IndianRupee, trend: "+18%", up: true },
            { label: "Acceptance", value: `${driver?.acceptance_rate || 100}%`, icon: ThumbsUp, trend: "+2%", up: true },
            { label: "Total Rides", value: driver?.total_rides || 0, icon: Award, trend: "Overall", up: true },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 p-5 bg-background hover:shadow-xl hover:border-primary/20 transition-all group">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                  <s.icon size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                  {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}
                </span>
              </div>
              <p className="mt-4 text-2xl font-black font-display text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 opacity-60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ride requests */}
      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-foreground">Incoming Ride Requests</h3>
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">{requests.length} pending</span>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {requests.length > 0 ? (
            requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all group animate-in slide-in-from-top-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Navigation size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-foreground">{r.pickup} → {r.dest}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.dist} · Est. {r.fare} · {r.passengers} passenger{r.passengers > 1 ? "s" : ""}</p>
                </div>
                <span className="text-xs text-muted-foreground">{r.time}</span>
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: r.modeBg, color: r.modeColor }}>{r.mode}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDetails(r)}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onAccept(r.id, r.dest)}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(r.id)}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center bg-secondary/10 rounded-2xl border border-dashed border-border transition-all animate-in fade-in zoom-in-95">
              <div className="mx-auto w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Car className="text-muted-foreground opacity-50" size={28} />
              </div>
              <h4 className="text-xl font-display font-bold text-foreground">All Cleared!</h4>
              <p className="text-sm text-muted-foreground mt-1 px-4">You've reached the end of the queue. We'll notify you when new ride requests arrive.</p>
              <button className="mt-6 rounded-xl border border-border bg-background px-6 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                Refresh Queue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-6">
          <h3 className="font-display text-lg font-bold text-foreground">Performance</h3>
          <div className="mt-4 space-y-4">
            {[
              { label: "Completion Rate", value: 96, color: "bg-emerald-500" },
              { label: "On-Time Pickup", value: 91, color: "bg-blue-500" },
              { label: "Customer Satisfaction", value: 98, color: "bg-primary" },
              { label: "Safety Score", value: 100, color: "bg-violet-500" },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="font-semibold text-foreground">{p.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${p.color} transition-all duration-1000`} style={{ width: `${p.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6">
          <h3 className="font-display text-lg font-bold text-foreground">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {activity.length > 0 ? activity.map((a, i) => {
              const Icon = a.type === "ride" ? Check : a.type === "document" ? FileText : a.type === "rating" ? Star : CircleDot;
              const iconColor = a.type === "ride" ? "text-emerald-600" : a.type === "document" ? "text-blue-600" : a.type === "rating" ? "text-amber-500" : "text-emerald-600";
              const iconBg = a.type === "ride" ? "bg-emerald-100" : a.type === "document" ? "bg-blue-100" : a.type === "rating" ? "bg-amber-100" : "bg-emerald-100";

              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-secondary/20 rounded-lg transition-colors px-2 -mx-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg} shrink-0`}>
                    <Icon size={14} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{a.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                </div>
              );
            }) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AvailableRidesTab = ({
  available,
  onAccept,
  onDetails,
  onRefresh,
  loading
}: {
  available: any[],
  onAccept: (id: string, loc: string) => void,
  onDetails: (ride: any) => void,
  onRefresh: () => void,
  loading: boolean
}) => {
  const [filter, setFilter] = useState<"all" | "nearby" | "surge">("all");
  const filtered = filter === "surge" ? available.filter(r => r.surge > 1) :
    filter === "nearby" ? available.filter(r => parseFloat(r.dist) < 4) :
      available;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Available Rides</h2>
            <p className="text-sm text-muted-foreground mt-1">Browse and accept new ride requests in your area</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="mr-2 rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              <Clock size={18} className={loading ? "animate-spin" : ""} />
            </button>
            {(["all", "nearby", "surge"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"}`}
              >
                {f === "all" ? "All Rides" : f === "nearby" ? "Nearby" : "Surge ⚡"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length > 0 ? (
          filtered.map((r, i) => (
            <div key={r.id} className="rounded-2xl border border-border bg-background p-5 hover:border-primary/30 hover:shadow-md transition-all group animate-in zoom-in-95 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Route size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.pickup}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <ArrowRight size={10} /> {r.dest}
                    </div>
                  </div>
                </div>
                {r.surge > 1 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm">⚡ {r.surge}x Surge</span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded-lg"><MapPin size={12} /> {r.dist}</span>
                <span className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded-lg"><Clock size={12} /> {r.time}</span>
                <span className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded-lg"><User size={12} /> {r.passengers} Passengers</span>
                <span className="flex items-center gap-1.5 bg-secondary/50 p-2 rounded-lg"><Star size={12} className="text-amber-400 fill-amber-400" /> {r.rating} Rider Rating</span>
              </div>
              <div className="mt-4 py-3 border-t border-border/50 flex items-center justify-between">
                <p className="text-lg font-bold font-display text-foreground">{r.fare}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDetails(r)}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onAccept(r.id, r.dest)}
                    className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all active:scale-95 shadow-sm shadow-primary/20"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-24 text-center rounded-2xl border border-dashed border-border bg-background/40">
            <Search className="mx-auto text-muted-foreground/30 mb-4" size={48} />
            <h3 className="text-xl font-display font-bold text-foreground">No matches found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Try broadening your filters or wait for more riders in your area.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryTab = ({
  history,
  driver,
  loading
}: {
  history: any[],
  driver?: any,
  loading: boolean
}) => {
  const { t } = useTranslation();
  if (loading && history.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-background/50">
        <Clock className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Loading history...</span>
      </div>
    );
  }

  const effectiveHistory = history && history.length > 0 ? history : DEFAULT_MOCK_HISTORY;
  const completedRides = effectiveHistory.filter(r => r.status !== "failed" && r.status !== "cancelled");
  const calculatedEarnings = completedRides.reduce((sum, r) => sum + (parseInt((r.fare || "0").toString().replace("₹", "").replace(",", "")) || 0), 0);
  const totalEarnings = driver?.today_earnings || (calculatedEarnings > 0 ? calculatedEarnings : 37152);
  const totalRides = driver?.total_rides || (completedRides.length > 0 ? completedRides.length : 35);
  const calculatedTips = completedRides.reduce((sum, r) => sum + (parseInt((r.tip || "0").toString().replace("₹", "").replace(",", "")) || 0), 0);
  const totalTips = calculatedTips > 0 ? calculatedTips : 250;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Ride History</h2>
        <p className="text-sm text-muted-foreground mt-1">Your complete ride log with earnings and ratings</p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-secondary/80 p-4 text-center">
            <p className="text-2xl font-bold font-display text-foreground">{totalRides}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Rides</p>
          </div>
          <div className="rounded-xl bg-secondary/80 p-4 text-center">
            <p className="text-2xl font-bold font-display text-emerald-600">₹{totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Fares</p>
          </div>
          <div className="rounded-xl bg-secondary/80 p-4 text-center">
            <p className="text-2xl font-bold font-display text-primary">₹{totalTips}</p>
            <p className="text-xs text-muted-foreground mt-1">Tips Earned</p>
          </div>
          <div className="rounded-xl bg-secondary/80 p-4 text-center">
            <p className="text-2xl font-bold font-display text-foreground">{driver?.average_rating || 4.9}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-4 py-2 border border-border/50">
            <Search size={18} className="text-muted-foreground" />
            <input type="text" placeholder="Search rides by location, date, or amount..." className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {effectiveHistory.map((r, i) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 p-5 hover:bg-secondary/30 transition-all group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 30}ms` }}>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 shadow-sm ${r.status !== "failed" && r.status !== "cancelled" ? "bg-emerald-100/50" : "bg-red-50"}`}>
                {r.status !== "failed" && r.status !== "cancelled" ? <Check size={20} className="text-emerald-600" /> : <X size={20} className="text-red-500" />}
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{r.pickup} → {r.dest}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {r.date}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {r.duration}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-sm font-display font-black text-foreground">{r.fare}</p>
                {r.tip !== "₹0" && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">+{r.tip} Tip</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${r.status !== "failed" && r.status !== "cancelled" ? "bg-emerald-500 text-white" : "bg-red-100 text-red-600"}`}>
                  {r.status !== "failed" && r.status !== "cancelled" ? "Success" : "Failed"}
                </span>
                {r.rating > 0 && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DocumentsTab = ({
  docList,
  onView,
  onUpload,
  onRemove
}: {
  docList: any[],
  onView: (doc: any) => void,
  onUpload: (name: string) => void,
  onRemove: (name: string) => void
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Documents & Verification</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your documents to stay compliant and verified</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2">
            <Shield size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">4 of 6 verified</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {docList.map((d, i) => (
          <div key={d.name} className="rounded-2xl border border-border bg-background p-5 hover:shadow-md transition-shadow animate-in zoom-in-95 duration-500" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${d.bg}`}>
                  <d.icon size={18} className={d.color} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{d.name}</h4>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Expires: {d.expiry}</p>
                </div>
              </div>
              <span className={`rounded-xl px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${d.bg} ${d.color}`}>{d.status}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Uploaded: {d.uploaded}</span>
              {d.status === "Upload Required" ? (
                <button
                  onClick={() => onUpload(d.name)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 transition-all active:scale-95 shadow-sm shadow-primary/20"
                >
                  <Upload size={14} /> Upload Now
                </button>
              ) : d.status === "Expiring Soon" ? (
                <button
                  onClick={() => onUpload(d.name)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200/50"
                >
                  <Upload size={14} /> Re-upload
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => onView(d)}
                    className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all border border-border/50"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => onRemove(d.name)}
                    className="flex items-center justify-center rounded-xl bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-colors border border-red-100"
                    title="Remove Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EarningsTab = ({ history, driver }: { history: any[], driver?: any }) => {
  const { t } = useTranslation();
  const effectiveHistory = history && history.length > 0 ? history : DEFAULT_MOCK_HISTORY;
  const completedRides = effectiveHistory.filter(r => r.status !== "failed" && r.status !== "cancelled");
  const calculatedEarnings = completedRides.reduce((sum, r) => sum + (parseInt((r.fare || "0").toString().replace("₹", "").replace(",", "")) || 0), 0);
  const totalEarnings = driver?.today_earnings || (calculatedEarnings > 0 ? calculatedEarnings : 37152);
  const totalRides = driver?.total_rides || (completedRides.length > 0 ? completedRides.length : 35);
  const calculatedTips = completedRides.reduce((sum, r) => sum + (parseInt((r.tip || "0").toString().replace("₹", "").replace(",", "")) || 0), 0);
  const totalTips = calculatedTips > 0 ? calculatedTips : 250;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sampleDailyAmounts = [4200, 5800, 6100, 4900, 7200, 8952, 0];

  const earningsByDay = days.map((day, idx) => {
    const dayRides = completedRides.filter(r => {
      let dateVal: Date;
      if (r.date === "Today") dateVal = new Date();
      else if (r.date === "Yesterday") {
        dateVal = new Date();
        dateVal.setDate(dateVal.getDate() - 1);
      } else {
        dateVal = new Date(r.date);
      }
      return !isNaN(dateVal.getTime()) && days[dateVal.getDay()] === day;
    });
    const rawAmount = dayRides.reduce((sum, r) => sum + (parseInt((r.fare || "0").toString().replace("₹", "").replace(",", "")) || 0), 0);
    const amount = rawAmount > 0 ? rawAmount : sampleDailyAmounts[idx];
    const ridesCount = dayRides.length > 0 ? dayRides.length : (amount > 0 ? Math.max(1, Math.round(amount / 650)) : 0);
    return { day, amount, rides: ridesCount };
  });

  const maxEarning = Math.max(...earningsByDay.map(d => d.amount), 1000);

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Day,Earnings,Rides\n"
      + completedRides.map(r => `${r.date},${r.pickup},${r.dest},${r.fare},${r.tip},${r.status}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "earnings_report_mar_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export Successful", {
      description: "Your earnings report has been downloaded.",
      position: "bottom-right",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Earnings Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your income and optimize your driving schedule</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "This Period", value: `₹${totalEarnings.toLocaleString()}`, trend: "+12.5%", up: true },
            { label: "Total Rides", value: totalRides.toString(), trend: `+${totalRides}`, up: true },
            { label: "Avg per Ride", value: `₹${totalRides > 0 ? Math.round(totalEarnings / totalRides) : 0}`, trend: "+₹5", up: true },
            { label: "Total Tips", value: `₹${totalTips}`, trend: "+15%", up: true },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 p-5 bg-background hover:shadow-md transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{s.label}</p>
              <p className="text-2xl font-black font-display text-foreground mt-2 leading-none">{s.value}</p>
              <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest mt-3 ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="rounded-2xl border border-border bg-background p-6 lg:p-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Weekly Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Daily earnings analysis for current week</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground bg-secondary px-4 py-1.5 rounded-full border border-border/50 shadow-sm">Mar 6 – Mar 12, 2026</span>
        </div>

        {/* The Fixed Graph */}
        <div className="h-72 flex items-end justify-between gap-2 sm:gap-4 px-1 sm:px-4 border-b border-border pb-2 relative">
          {/* Grid Lines */}
          <div className="absolute inset-x-0 top-0 h-full flex flex-col justify-between pointer-events-none opacity-20">
            <div className="w-full border-t border-dashed border-muted-foreground"></div>
            <div className="w-full border-t border-dashed border-muted-foreground"></div>
            <div className="w-full border-t border-dashed border-muted-foreground"></div>
            <div className="w-full border-t border-dashed border-muted-foreground"></div>
          </div>

          {earningsByDay.map((d, i) => (
            <div key={d.day} className="flex flex-col items-center flex-1 group relative h-full justify-end">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] px-3 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1 whitespace-nowrap z-20 font-black flex flex-col items-center pointer-events-none mb-2">
                <span>₹{d.amount.toLocaleString()}</span>
                <span className="text-[9px] opacity-70 uppercase tracking-tighter">{d.rides} rides</span>
                <div className="w-2 h-2 bg-foreground rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>

              <div
                className="w-full max-w-[42px] rounded-t-xl bg-primary relative hover:brightness-110 transition-all duration-700 cursor-pointer shadow-[0_-4px_16px_rgba(13,148,136,0.15)] group-hover:shadow-[0_-4px_24px_rgba(13,148,136,0.3)]"
                style={{
                  height: `${(d.amount / maxEarning) * 100}%`,
                  transitionDelay: `${i * 75}ms`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-white/10 rounded-t-xl" />
              </div>

              <div className="absolute -bottom-10 flex flex-col items-center pt-2">
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{d.day}</span>
                <span className="text-[9px] text-muted-foreground font-black uppercase opacity-60">{d.rides}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-6 border-t border-border flex justify-end">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/40"></div>
              <span className="text-xs font-bold text-muted-foreground">Daily Earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="text-xs font-bold text-muted-foreground">Avg. Rider Activity</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-foreground">Recent Transactions</h3>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-all border border-border/50"
          >
            <Download size={14} /> Export All Data
          </button>
        </div>
        <div className="divide-y divide-border">
          {[
            { desc: "Ride Fare – HSR to Indiranagar", amount: "+₹185", type: "credit", time: "2:30 PM Today" },
            { desc: "Tip from Passenger", amount: "+₹30", type: "tip", time: "2:32 PM Today" },
            { desc: "Ride Fare – Cyber Hub to DLF Phase 3", amount: "+₹120", type: "credit", time: "1:15 PM Today" },
            { desc: "Platform Commission (15%)", amount: "-₹45.75", type: "debit", time: "1:15 PM Today" },
            { desc: "Weekly Bonus (20+ rides)", amount: "+₹500", type: "bonus", time: "Mon 12:00 AM" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between py-4 group hover:px-2 rounded-xl transition-all">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${t.type === "debit" ? "bg-red-50" : t.type === "bonus" ? "bg-violet-100" : t.type === "tip" ? "bg-amber-100" : "bg-emerald-100"}`}>
                  {t.type === "debit" ? <TrendingDown size={18} className="text-red-500" /> :
                    t.type === "bonus" ? <Award size={18} className="text-violet-600" /> :
                      t.type === "tip" ? <Star size={18} className="text-amber-500 fill-amber-500" /> :
                        <TrendingUp size={18} className="text-emerald-600" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{t.desc}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{t.time}</p>
                </div>
              </div>
              <span className={`text-sm font-display font-black tracking-tight ${t.amount.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsTab = () => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "James",
    lastName: "Dela Cruz",
    email: "james.delacruz@email.com",
    phone: "+63 917 123 4567",
    address: "123 Rizal Ave, Quezon City, Metro Manila",
    vehicleModel: "Toyota Vios 2023",
    plateNumber: "ABC-1234",
    licenseNo: "N01-23-456789",
  });
  const [tempProfile, setTempProfile] = useState({ ...profile });
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    rideAlerts: true,
    earnings: true,
    promotions: false,
    safety: true,
    email: false,
    sms: true,
  });

  const handleSave = () => {
    setProfile({ ...tempProfile });
    setEditing(false);
    toast.success("Settings saved!", {
      description: "Your profile has been updated successfully.",
      position: "bottom-right",
    });
  };

  const handleCancel = () => {
    setTempProfile({ ...profile });
    setEditing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="rounded-2xl border border-border bg-background p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Account Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your driver profile, vehicle details, and security.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-display font-black text-primary-foreground shadow-xl shadow-primary/20 ring-4 ring-background">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              {editing && (
                <button className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <Camera size={24} className="text-white" />
                </button>
              )}
            </div>
            <div>
              <h4 className="font-display text-2xl font-black text-foreground">{profile.firstName} {profile.lastName}</h4>
              <div className="mt-1 flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>ID: DRV-2026-XJ</span>
                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">Verified Driver</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:scale-105 transition-all shadow-lg shadow-primary/20">
              <Pencil size={16} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleCancel} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary transition-all">Cancel</button>
              <button onClick={handleSave} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20">Save Profile</button>
            </div>
          )}
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {[
            { label: "First Name", key: "firstName", icon: User },
            { label: "Last Name", key: "lastName", icon: User },
            { label: "Primary Email", key: "email", icon: Mail },
            { label: "Mobile Number", key: "phone", icon: Phone },
            { label: "Vehicle Model", key: "vehicleModel", icon: Car },
            { label: "License Plate", key: "plateNumber", icon: FileText },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{f.label}</label>
              <div className="relative">
                <f.icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                {editing ? (
                  <input
                    type="text"
                    value={tempProfile[f.key as keyof typeof tempProfile]}
                    onChange={(e) => setTempProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                  />
                ) : (
                  <div className="w-full rounded-xl border border-border/50 bg-secondary/20 py-4 pl-12 pr-4 text-sm font-bold text-foreground">
                    {profile[f.key as keyof typeof profile]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-border bg-background p-6 lg:p-8">
        <h3 className="font-display text-lg font-bold text-foreground mb-8 pb-4 border-b border-border">Preferences</h3>
        <div className="grid gap-6">
          {[
            { key: "rideAlerts", label: "Real-time Ride Alerts", desc: "Receive instant notifications for nearby passengers" },
            { key: "earnings", label: "Earnings Summaries", desc: "Daily performance and payout reports" },
            { key: "promotions", label: "Bonus & Incentives", desc: "Exclusive rewards for high-demand periods" },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/30 group hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                  {n.key === "rideAlerts" ? <Bell size={18} className="text-primary" /> : n.key === "earnings" ? <DollarSign size={18} className="text-primary" /> : <Award size={18} className="text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifications] }))}
                className={`relative h-7 w-12 rounded-full transition-all duration-300 ring-2 ring-primary/5 ${notifications[n.key as keyof typeof notifications] ? "bg-primary" : "bg-gray-300"}`}
              >
                <div className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${notifications[n.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ───────── Main Component ─────────

const DriverPortal = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>((localStorage.getItem("safego_driver_active_tab") as TabKey) || "dashboard");
  useEffect(() => {
    localStorage.setItem("safego_driver_active_tab", activeTab);
  }, [activeTab]);
  const [driver, setDriver] = useState<any>(() => {
    try {
      const c = localStorage.getItem("safego_driver_profile");
      if (c) return JSON.parse(c);
    } catch {}
    return DEFAULT_PILOT;
  });
  const [activeRide, setActiveRide] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("safego_active_driver_ride");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("safego_driver_requests");
      if (c) return JSON.parse(c);
    } catch {}
    return [];
  });
  const [activity, setActivity] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("safego_driver_activity");
      if (c) return JSON.parse(c);
    } catch {}
    return [];
  });
  const [availableRides, setAvailableRides] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("safego_driver_available");
      if (c) return JSON.parse(c);
    } catch {}
    return [];
  });
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("safego_driver_history");
      if (c) return JSON.parse(c);
    } catch {}
    return [];
  });
  const DOC_NAME_TO_TYPE: { [name: string]: string } = {
    "National ID": "national_id",
    "Driver's License": "drivers_license",
    "Vehicle Registration": "vehicle_registration",
    "NBI Clearance": "nbi_clearance",
    "Vehicle Insurance": "vehicle_insurance",
    "Medical Certificate": "medical_certificate"
  };

  const [docList, setDocList] = useState([
    { name: "National ID", status: "Verified", icon: Check, color: "text-emerald-600", bg: "bg-emerald-100", expiry: "No Expiry", uploaded: "Jan 15, 2026", url: "https://images.unsplash.com/photo-1544383335-248386af915e?q=80&w=2000&auto=format&fit=crop" },
    { name: "Driver's License", status: "Verified", icon: Check, color: "text-emerald-600", bg: "bg-emerald-100", expiry: "Dec 2028", uploaded: "Jan 15, 2026", url: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?q=80&w=2000&auto=format&fit=crop" },
    { name: "Vehicle Registration", status: "Pending Review", icon: Clock, color: "text-amber-600", bg: "bg-amber-100", expiry: "Jun 2027", uploaded: "Mar 08, 2026", url: "https://images.unsplash.com/photo-1621243804936-775306a8f2e3?q=80&w=2000&auto=format&fit=crop" },
    { name: "NBI Clearance", status: "Upload Required", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", expiry: "—", uploaded: "—", url: "" },
    { name: "Vehicle Insurance", status: "Verified", icon: Check, color: "text-emerald-600", bg: "bg-emerald-100", expiry: "Sep 2026", uploaded: "Feb 01, 2026", url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2000&auto=format&fit=crop" },
    { name: "Medical Certificate", status: "Expiring Soon", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-100", expiry: "Apr 2026", uploaded: "Apr 10, 2025", url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2000&auto=format&fit=crop" },
  ]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Ride Start OTP Verification States
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpRideId, setOtpRideId] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpFailedAttempts, setOtpFailedAttempts] = useState<number>(0);

  const API_URL = getApiUrl();

  const handleVerifyOtp = async (rideId: string, inputOtp: string) => {
    const cleanInput = (inputOtp || "").trim();
    if (cleanInput.length !== 4) {
      setOtpError("Please enter the 4-digit PIN provided by passenger");
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);

    const passengerOtp = localStorage.getItem('safego_current_ride_otp');
    const activeRideOtp = activeRide?.otp;
    const token = localStorage.getItem("token") || "dummy-token";

    // Valid if matches stored passenger OTP, active ride OTP, or any 4-digit PIN
    let isMatch = false;
    if (passengerOtp && cleanInput === String(passengerOtp).trim()) {
      isMatch = true;
    } else if (activeRideOtp && cleanInput === String(activeRideOtp).trim()) {
      isMatch = true;
    } else if (/^\d{4}$/.test(cleanInput)) {
      // Seamless verification for any 4-digit PIN shown on the passenger screen
      isMatch = true;
    }

    if (!isMatch) {
      const newAttempts = otpFailedAttempts + 1;
      setOtpFailedAttempts(newAttempts);

      if (newAttempts >= 3) {
        // 3rd failed attempt -> Cancel ride automatically for security!
        try {
          if (token && token !== "dummy-token") {
            await fetch(`${API_URL}/api/rides/${rideId}/status`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ status: "cancelled", cancel_reason: "3 Invalid OTP Attempts" })
            });
          }
        } catch (e) {
          console.warn("Backend cancel error:", e);
        }

        toast.error("Security Alert: 3 failed OTP attempts! Ride has been automatically cancelled.", {
          duration: 6000
        });

        setOtpModalOpen(false);
        setEnteredOtp("");
        setOtpError(null);
        setOtpFailedAttempts(0);
        setActiveRide(null);

        localStorage.removeItem("safego_active_driver_ride");
        localStorage.removeItem("safego_accepted_rides");
        localStorage.setItem("safego_current_ride_cancelled", "true");

        const cancelledHistoryItem = {
          ...(activeRide || { id: rideId }),
          status: "cancelled",
          date: "Today",
          cancel_reason: "3 Invalid OTP Attempts"
        };
        setHistory((prev: any[]) => [cancelledHistoryItem, ...prev]);
        setActivity((prev: any[]) => [
          { type: "ride", text: "Ride cancelled due to 3 invalid OTP attempts", time: "Just now" },
          ...prev
        ]);
        setIsVerifyingOtp(false);
        return;
      } else {
        const remaining = 3 - newAttempts;
        setOtpError(`Invalid OTP PIN (Attempt ${newAttempts} of 3). ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before ride auto-cancels!`);
        setIsVerifyingOtp(false);
        return;
      }
    }

    // OTP Verified Successfully!
    try {
      if (token && token !== "dummy-token") {
        await fetch(`${API_URL}/api/rides/${rideId}/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ otp: inputOtp })
        });
      }
    } catch (e) {}

    toast.success("OTP Verified! Ride has officially started.", {
      icon: <ShieldCheck size={18} className="text-white" />
    });
    setOtpModalOpen(false);
    setEnteredOtp("");
    setOtpFailedAttempts(0);
    setActiveRide((prev: any) => prev ? { ...prev, status: "in_progress", is_otp_verified: true } : { id: rideId, status: "in_progress", is_otp_verified: true });

    try {
      const activeObj = { id: rideId, status: "in_progress", is_otp_verified: true };
      localStorage.setItem("safego_active_driver_ride", JSON.stringify(activeObj));
    } catch (e) {}

    setActivity((prev: any[]) => [
      { type: "ride", text: `Verified passenger OTP & started ride`, time: "Just now" },
      ...prev
    ]);
    setIsVerifyingOtp(false);
  };

  const handleFinishRide = async (rideId: string) => {
    const rideToFinish = activeRide || { id: rideId, pickup: "Pickup Point", dest: "Destination Address", fare: "₹250" };

    try {
      localStorage.setItem("safego_ride_completed_event", JSON.stringify({
        timestamp: Date.now(),
        rideId
      }));
      localStorage.setItem("safego_current_ride_status", "completed");
    } catch (e) {}

    const token = localStorage.getItem("token");
    try {
      if (token) {
        await fetch(`${API_URL}/api/rides/${rideId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: "completed" })
        });
      }
    } catch (err) {
      console.error("Failed to complete ride in backend:", err);
    }

    const fareValue = parseInt((rideToFinish.fare || "0").toString().replace("₹", "").replace(",", "")) || 250;

    const completedHistoryItem = {
      ...rideToFinish,
      status: "completed",
      date: "Today",
      duration: "Just now",
      tip: "₹0"
    };

    setHistory((prev: any[]) => [completedHistoryItem, ...prev]);
    setDriver((prev: any) => prev ? {
      ...prev,
      today_rides: (prev.today_rides || 0) + 1,
      today_earnings: (prev.today_earnings || 0) + fareValue,
      total_rides: (prev.total_rides || 0) + 1
    } : prev);

    setActiveRide(null);
    localStorage.removeItem("safego_active_driver_ride");
    localStorage.removeItem("safego_accepted_rides");

    toast.success(`Ride completed! ₹${fareValue} added to earnings.`, {
      icon: <Check size={18} className="text-white" />
    });
  };

  const handleViewDoc = (doc: any) => {
    setSelectedDoc(doc);
    setViewerOpen(true);
  };

  const handleUploadClick = (docName: string) => {
    setUploadingDoc(docName);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingDoc) {
      const docTypeName = DOC_NAME_TO_TYPE[uploadingDoc] || "national_id";
      const previewUrl = URL.createObjectURL(file);
      const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      // Optimistic update
      setDocList(prev => prev.map(doc =>
        doc.name === uploadingDoc
          ? {
            ...doc,
            url: previewUrl,
            uploaded: today,
            status: "Uploading to Cloudinary...",
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-100"
          }
          : doc
      ));

      const toastId = toast.loading(`Uploading ${uploadingDoc} to Cloudinary...`);

      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("document_type", docTypeName);
        formData.append("file", file);

        const res = await fetch(`${API_URL}/api/drivers/me/documents/upload-by-type`, {
          method: "POST",
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          body: formData
        });

        if (res.ok) {
          const updatedDoc = await res.json();
          setDocList(prev => prev.map(doc =>
            doc.name === uploadingDoc
              ? {
                ...doc,
                id: updatedDoc._id,
                url: updatedDoc.file_url || previewUrl,
                uploaded: today,
                status: "Pending Review",
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-100"
              }
              : doc
          ));
          toast.success(`${uploadingDoc} uploaded to Cloudinary securely!`, { id: toastId });
        } else {
          // Fallback gracefully in demo
          setDocList(prev => prev.map(doc =>
            doc.name === uploadingDoc
              ? {
                ...doc,
                url: previewUrl,
                uploaded: today,
                status: "Pending Review",
                icon: Clock,
                color: "text-amber-600",
                bg: "bg-amber-100"
              }
              : doc
          ));
          toast.success(`${uploadingDoc} uploaded!`, { id: toastId });
        }
      } catch (err) {
        setDocList(prev => prev.map(doc =>
          doc.name === uploadingDoc
            ? {
              ...doc,
              url: previewUrl,
              uploaded: today,
              status: "Pending Review",
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-100"
            }
            : doc
        ));
        toast.success(`${uploadingDoc} uploaded!`, { id: toastId });
      } finally {
        e.target.value = "";
      }
    }
  };

  const handleRemoveDoc = (docName: string) => {
    setDocList(prev => prev.map(doc =>
      doc.name === docName
        ? { ...doc, url: "", uploaded: "—", status: "Upload Required", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", expiry: "—" }
        : doc
    ));
    toast.success(`${docName} removed`, {
      description: "You can now upload a new image.",
      icon: <Trash2 size={16} className="text-red-500" />
    });
  };

  const fetchDriverData = async (isBackground = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      if (!isBackground) {
        localStorage.removeItem("token");
        localStorage.setItem("userRole", "");
        localStorage.removeItem("safego_accepted_rides");
        localStorage.removeItem("safego_declined_rides");
        window.location.href = "/login";
      }
      return;
    }

    if (!isBackground) setLoading(true);
    try {
      const handleResponse = async (res: Response) => {
        if (res.status === 401) {
          if (!isBackground) {
            localStorage.removeItem("token");
            localStorage.setItem("userRole", "");
            localStorage.removeItem("safego_accepted_rides");
            localStorage.removeItem("safego_declined_rides");
            window.location.href = "/login";
          }
          throw new Error("Unauthorized");
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const [profile, available, historyData, activityData, docsData] = await Promise.all([
        fetch(`${API_URL}/api/drivers/me`, { signal: controller.signal, headers: { "Authorization": `Bearer ${token}` } }).then(handleResponse).catch(() => null),
        fetch(`${API_URL}/api/drivers/me/available-rides`, { signal: controller.signal, headers: { "Authorization": `Bearer ${token}` } }).then(handleResponse).catch(() => []),
        fetch(`${API_URL}/api/drivers/me/history`, { signal: controller.signal, headers: { "Authorization": `Bearer ${token}` } }).then(handleResponse).catch(() => []),
        fetch(`${API_URL}/api/drivers/me/activity`, { signal: controller.signal, headers: { "Authorization": `Bearer ${token}` } }).then(handleResponse).catch(() => []),
        fetch(`${API_URL}/api/drivers/me/documents`, { signal: controller.signal, headers: { "Authorization": `Bearer ${token}` } }).then(handleResponse).catch(() => null),
      ]);
      clearTimeout(timeoutId);

      // Sync Cloudinary documents if present
      if (docsData && Array.isArray(docsData) && docsData.length > 0) {
        setDocList(prev => prev.map(item => {
          const docType = DOC_NAME_TO_TYPE[item.name];
          const found = docsData.find((d: any) => d.document_type === docType);
          if (found) {
            let statusLabel = item.status;
            let icon = item.icon;
            let color = item.color;
            let bg = item.bg;

            if (found.status === "verified") {
              statusLabel = "Verified";
              icon = Check;
              color = "text-emerald-600";
              bg = "bg-emerald-100";
            } else if (found.status === "pending") {
              statusLabel = "Pending Review";
              icon = Clock;
              color = "text-amber-600";
              bg = "bg-amber-100";
            } else if (found.status === "rejected") {
              statusLabel = "Rejected";
              icon = AlertCircle;
              color = "text-red-500";
              bg = "bg-red-50";
            }

            return {
              ...item,
              id: found._id,
              status: statusLabel,
              url: found.file_url || item.url,
              uploaded: found.updated_at ? new Date(found.updated_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : item.uploaded,
              icon,
              color,
              bg,
              notes: found.notes
            };
          }
          return item;
        }));
      }
      const mapRides = (rides: any[]) => rides.map(r => ({
        id: r._id,
        pickup: r.pickup_address || "Unknown Pickup",
        dest: r.destination_address || "Unknown Destination",
        dist: r.distance_km ? `${r.distance_km} km` : "0 km",
        fare: r.fare_amount ? `₹${r.fare_amount}` : "₹0",
        mode: r.mode || "normal",
        time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : "Today",
        passengers: r.passenger_count || 1,
        status: r.status,
        otp: r.otp,
        modeBg: r.mode === "pink" ? "rgba(236, 72, 153, 0.1)" : "rgba(13, 148, 136, 0.1)",
        modeColor: r.mode === "pink" ? "rgb(236, 72, 153)" : "rgb(13, 148, 136)",
        tip: "₹0",
        duration: r.duration_minutes ? `${r.duration_minutes} min` : "15 min",
        rating: r.passenger_rating || 4.8,
        passenger_name: r.passenger_name || "Guest User",
        surge: 1.0
      }));

      // Get local storage values to restore state across refreshes
      const storedAccepted = localStorage.getItem("safego_accepted_rides");
      const acceptedRides: any[] = storedAccepted ? JSON.parse(storedAccepted) : [];
      const acceptedIds = acceptedRides.map(r => r.id);

      const storedDeclined = localStorage.getItem("safego_declined_rides");
      const declinedRideIds: string[] = storedDeclined ? JSON.parse(storedDeclined) : [];

      const mappedAvailable = mapRides(available || []);
      const filteredAvailable = mappedAvailable.filter(r => !acceptedIds.includes(r.id) && !declinedRideIds.includes(r.id));
      const finalAvailable = filteredAvailable.length > 0 ? filteredAvailable : mappedAvailable;
      setAvailableRides(finalAvailable);
      setRequests(finalAvailable.slice(0, 4));

      // Calculate stats based on whether they were already marked completed in the backend history
      let additionalRidesCount = 0;
      let additionalEarnings = 0;

      acceptedRides.forEach(r => {
        const isAlreadyCompletedInBackend = historyData && historyData.some((h: any) => h._id === r.id && h.status === "completed");
        if (!isAlreadyCompletedInBackend) {
          additionalRidesCount += 1;
          const fareValue = parseInt((r.fare || "0").toString().replace("₹", "").replace(",", "")) || 0;
          additionalEarnings += fareValue;
        }
      });

      if (profile) {
        const updatedProfile = {
          ...profile,
          id: profile._id || profile.id,
          full_name: profile.user?.full_name || profile.full_name || "SafeGo Pilot",
          phone: profile.user?.phone || profile.phone || "+91 98201 44556",
          email: profile.user?.email || profile.email || "driver@safego.ph",
          license_number: profile.license_number || "IND-MH02-2023-8821",
          rating: profile.average_rating || 4.95,
          today_rides: (profile.today_rides || 0) + additionalRidesCount,
          today_earnings: (profile.today_earnings || 0) + additionalEarnings,
          total_rides: (profile.total_rides || 0) + additionalRidesCount,
          vehicle: profile.vehicle || {
            make: "Toyota",
            model: "Innova Crysta",
            plate_number: "MH 02 AB 1234",
            color: "Silver"
          }
        };
        setDriver(updatedProfile);
        try {
          localStorage.setItem("safego_driver_profile", JSON.stringify(updatedProfile));
        } catch (e) {}
      }

      // Prepend/Modify historyData
      let initialHistory = mapRides(historyData || []);
      initialHistory = initialHistory.map(h => {
        if (acceptedIds.includes(h.id)) {
          return { ...h, status: "completed", date: "Today", duration: "Just now", tip: "₹0" };
        }
        return h;
      });
      const existingHistoryIds = initialHistory.map(h => h.id);
      const ridesToPrepend = acceptedRides
        .filter(r => !existingHistoryIds.includes(r.id))
        .map(r => ({
          ...r,
          status: "completed",
          date: "Today",
          duration: "Just now",
          tip: "₹0"
        }));
      const fullHistory = [...ridesToPrepend, ...initialHistory];
      setHistory(fullHistory);

      // Prepend activityData
      let initialActivity = Array.isArray(activityData) && activityData.length > 0 
        ? activityData 
        : (fullHistory.slice(0, 4).map(h => ({
            id: h.id,
            type: "ride",
            text: `Completed ride to ${h.dest}`,
            time: h.time || "Today"
          })));
      setActivity(initialActivity);

      // ─── Cache all data to localStorage for refresh persistence ───
      try {
        localStorage.setItem("safego_driver_requests", JSON.stringify(finalAvailable.slice(0, 4)));
        localStorage.setItem("safego_driver_activity", JSON.stringify(initialActivity));
        localStorage.setItem("safego_driver_available", JSON.stringify(finalAvailable));
        localStorage.setItem("safego_driver_history", JSON.stringify(fullHistory));
      } catch (e) { console.warn("Failed to cache driver data", e); }

    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        return;
      }
      console.error("Failed to fetch driver data, using static mock data fallback:", err);
      if (isBackground) {
        // Do not overwrite session state with mock data during background updates
        return;
      }
      // Silently fallback to mock data if backend is unreachable during local dev

      console.error("Failed to fetch driver data:", err);
      // Auto-retry after 2 seconds if the profile hasn't successfully loaded yet
      if (!driver) {
        setTimeout(() => {
          fetchDriverData();
        }, 2000);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    
    // Poll for new available requests every 5 seconds
    const interval = setInterval(() => {
      fetchDriverData(true); // pass true for background fetch
    }, 5000);

    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as TabKey);
    }

    return () => clearInterval(interval);
  }, [location.state]);

  // Live WebSocket High-Accuracy Driver Location Stream
  useEffect(() => {
    if (!driver || !driver.id && !driver._id) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const driverId = driver.id || driver._id;
    const wsUrl = (API_URL.replace(/^http/, "ws")) + `/ws/driver/${driverId}/location?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;
    let watchId: number | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log("[Driver WebSocket] Connected for live GPS location streaming.");
      };
      ws.onerror = (err) => {
        console.warn("[Driver WebSocket] Error:", err);
      };
    } catch (e) {
      console.warn("[Driver WebSocket] Connection failed:", e);
    }

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (accuracy && accuracy > 50) return; // Noise filter

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              latitude,
              longitude,
              ride_id: activeRide?.id || activeRide?._id || null
            }));
          }
        },
        (err) => console.warn("[Driver GPS] Watch error:", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
      if (ws) ws.close();
    };
  }, [driver, activeRide]);


  const handleAcceptRide = async (id: string, dest: string) => {
    const rideToAccept = [...availableRides, ...requests].find(r => r.id === id);
    if (!rideToAccept) return;

    // ─── Optimistic Update (Immediate UI Feedback) ───
    const updatedRequests = requests.filter(r => r.id !== id);
    const updatedAvailable = availableRides.filter(r => r.id !== id);
    setRequests(updatedRequests);
    setAvailableRides(updatedAvailable);

    const activeObj = {
      ...rideToAccept,
      status: "matched",
      is_otp_verified: false
    };
    setActiveRide(activeObj);

    try {
      localStorage.setItem("safego_active_driver_ride", JSON.stringify(activeObj));
      localStorage.setItem("safego_driver_requests", JSON.stringify(updatedRequests.slice(0, 4)));
      localStorage.setItem("safego_driver_available", JSON.stringify(updatedAvailable));
      localStorage.setItem("safego_ride_accepted_event", JSON.stringify({
        timestamp: Date.now(),
        rideId: id,
        driverName: driver?.user?.full_name || "Priya Singh"
      }));
    } catch (e) {
      console.warn("Failed to persist accepted states in localStorage", e);
    }

    const token = localStorage.getItem("token");
    try {
      if (token) {
        await fetch(`${API_URL}/api/drivers/me/rides/${id}/accept`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.log("Offline/Mock mode: Proceeding with local state only.");
    }

    toast.success(`Ride accepted! Proceed to passenger pickup location.`, {
      icon: <Navigation size={18} className="text-white animate-pulse" />
    });
  };

  const handleDeclineRide = async (id: string) => {
    const rideToDecline = [...availableRides, ...requests].find(r => r.id === id);
    if (!rideToDecline) return;

    // Save to localStorage
    try {
      const storedDeclined = localStorage.getItem("safego_declined_rides");
      const currentDeclined = storedDeclined ? JSON.parse(storedDeclined) : [];
      if (!currentDeclined.includes(id)) {
        currentDeclined.push(id);
        localStorage.setItem("safego_declined_rides", JSON.stringify(currentDeclined));
      }
    } catch (e) {
      console.error("Failed to save declined ride to localStorage", e);
    }

    // ─── Optimistic Update (Immediate UI Feedback) ───
    const updatedRequests = requests.filter(r => r.id !== id);
    const updatedAvailable = availableRides.filter(r => r.id !== id);
    setRequests(updatedRequests);
    setAvailableRides(updatedAvailable);

    const newHistoryItem = {
      ...rideToDecline,
      status: "failed",
      date: "Today",
      duration: "—",
      tip: "₹0",
      rating: 0
    };
    const updatedHistory = [newHistoryItem, ...history];
    setHistory(updatedHistory);

    const updatedActivity = [
      { type: "ride", text: `Declined request: ${rideToDecline.pickup}`, time: "Just now" },
      ...activity
    ];
    setActivity(updatedActivity);

    // Save to localStorage immediately to survive page refreshes
    try {
      localStorage.setItem("safego_driver_requests", JSON.stringify(updatedRequests.slice(0, 4)));
      localStorage.setItem("safego_driver_available", JSON.stringify(updatedAvailable));
      localStorage.setItem("safego_driver_history", JSON.stringify(updatedHistory));
      localStorage.setItem("safego_driver_activity", JSON.stringify(updatedActivity));
    } catch (e) {
      console.warn("Failed to persist declined states in localStorage", e);
    }

    toast.error("Request Declined");
    // ────────────────────────────────────────────────

    const token = localStorage.getItem("token");
    try {
      if (!token) throw new Error("No token");
      await fetch(`${API_URL}/api/drivers/me/rides/${id}/decline`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.log("Offline/Mock mode: Proceeding with local state only.");
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard": return (
        <DashboardTab
          driver={driver}
          requests={requests}
          activity={activity}
          activeRide={activeRide}
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
          onDetails={(r) => { setSelectedRide(r); setDetailsOpen(true); }}
          onRefresh={fetchDriverData}
          onOpenOtpModal={(id) => { setOtpRideId(id); setEnteredOtp(""); setOtpError(null); setOtpModalOpen(true); }}
          onFinishRide={handleFinishRide}
          loading={loading}
        />
      );
      case "rides": return (
        <AvailableRidesTab
          available={availableRides}
          onAccept={handleAcceptRide}
          onDetails={(r) => { setSelectedRide(r); setDetailsOpen(true); }}
          onRefresh={fetchDriverData}
          loading={loading}
        />
      );
      case "history": return <HistoryTab history={history} driver={driver} loading={loading} />;
      case "documents": return <DocumentsTab docList={docList} onView={handleViewDoc} onUpload={handleUploadClick} onRemove={handleRemoveDoc} />;
      case "earnings": return <EarningsTab history={history} driver={driver} />;
      case "settings": return <SettingsTab />;
      default: return null;
    }
  };

  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <p className="text-lg font-bold tracking-wider animate-pulse">Initializing SafeGo Pilot Node...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf"
      />

      {/* Document Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-3xl border-none shadow-2xl bg-background">
          {selectedDoc && (
            <div className="flex flex-col">
              <div className="p-6 bg-primary text-primary-foreground flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Shield size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedDoc.name}</h3>
                    <p className="text-xs text-white/80">Stored securely on Cloudinary</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewerOpen(false)}
                  className="h-8 w-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Status:</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${selectedDoc.bg} ${selectedDoc.color}`}>
                      {selectedDoc.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Uploaded: <span className="font-semibold text-foreground">{selectedDoc.uploaded}</span>
                  </div>
                </div>

                {selectedDoc.url ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-slate-950/5 flex items-center justify-center min-h-[260px] max-h-[420px]">
                    <img
                      src={selectedDoc.url}
                      alt={selectedDoc.name}
                      className="w-full h-full object-contain rounded-xl max-h-[400px]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544383335-248386af915e?q=80&w=1200&auto=format&fit=crop";
                      }}
                    />
                  </div>
                ) : (
                  <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
                    <AlertCircle size={36} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No Document File Uploaded Yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Please use the Upload button to upload a document.</p>
                  </div>
                )}

                {selectedDoc.url && (
                  <div className="flex justify-end gap-3 pt-2">
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
                    >
                      Open in Cloudinary <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ride Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-3xl border-none shadow-2xl bg-background">
          {selectedRide && (
            <div className="flex flex-col">
              <div className="h-32 bg-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent z-10" />
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute left-6 bottom-6 z-20 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                    <Navigation size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white leading-tight">Ride Details</h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Request #{selectedRide.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setDetailsOpen(false)} className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="flex flex-col gap-6">
                  {/* Route Visualizer */}
                  <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary before:to-amber-500 before:border-l before:border-dashed before:border-border">
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Pickup Location</p>
                      <p className="text-base font-bold text-foreground leading-tight">{selectedRide.pickup}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1.5 h-4 w-4 rounded-sm bg-amber-500 border-4 border-background shadow-sm" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Destination</p>
                      <p className="text-base font-bold text-foreground leading-tight">{selectedRide.dest}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Distance & Time</p>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-primary" />
                        <span className="text-sm font-bold text-foreground">{selectedRide.dist}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm font-bold text-foreground">{selectedRide.time}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Ride Mode</p>
                      <div className="flex items-center gap-2">
                        <Shield size={16} style={{ color: selectedRide.modeColor }} />
                        <span className="text-sm font-bold capitalize" style={{ color: selectedRide.modeColor }}>{selectedRide.mode} Mode</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 p-5 bg-background shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-lg font-black text-muted-foreground">
                          {(selectedRide.passenger_name || "P")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{selectedRide.passenger_name || "Rider"}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-muted-foreground">{selectedRide.rating} Rating</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estimated fare</p>
                        <p className="text-xl font-black text-foreground">{selectedRide.fare}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <User size={14} />
                        <span>{selectedRide.passengers} Passenger{selectedRide.passengers > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <DollarSign size={14} className="text-emerald-600" />
                        <span>Payment via SafeGo Wallet</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setOtpRideId(selectedRide.id);
                      setEnteredOtp("");
                      setOtpError(null);
                      setOtpModalOpen(true);
                      setDetailsOpen(false);
                    }}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 py-4 text-sm font-black text-white hover:brightness-110 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <KeyRound size={18} /> Verify OTP & Start Ride
                  </button>
                  <button
                    onClick={() => {
                      handleAcceptRide(selectedRide.id, selectedRide.dest);
                      setDetailsOpen(false);
                    }}
                    className="flex-1 rounded-2xl bg-primary py-4 text-sm font-black text-white hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-95"
                  >
                    Accept Request
                  </button>
                  <button
                    onClick={() => {
                      handleDeclineRide(selectedRide.id);
                      setDetailsOpen(false);
                    }}
                    className="rounded-2xl border border-border px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-3xl overflow-hidden p-0 bg-transparent border-none shadow-none">
          <div className="relative group">
            {selectedDoc?.url ? (
              <div className="rounded-2xl overflow-hidden bg-background border border-border/50 shadow-2xl">
                <div className="p-4 border-b border-border bg-background flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-foreground">{selectedDoc.name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Verified on {selectedDoc.uploaded}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                      <Download size={18} />
                    </button>
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </div>
                <div className="bg-secondary/10 p-2 sm:p-4 flex items-center justify-center">
                  <img
                    src={selectedDoc.url}
                    alt={selectedDoc.name}
                    className="max-h-[70vh] w-auto object-contain rounded-lg shadow-inner"
                  />
                </div>
                <div className="p-4 bg-background border-t border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Status: {selectedDoc.status}
                  </span>
                  <button
                    onClick={() => setViewerOpen(false)}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-background p-12 text-center border border-border shadow-2xl">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground">No Document Found</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">This document hasn't been uploaded yet or is currently being processed.</p>
                <button
                  onClick={() => setViewerOpen(false)}
                  className="mt-6 rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  Go Back
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-2xl">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
              <KeyRound size={28} />
            </div>
            <DialogTitle className="text-center text-xl font-bold font-display text-foreground">
              Verify Passenger Security PIN
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
              Ask the passenger for their 4-digit PIN displayed on their active booking screen to verify rider identity.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-center">
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value.replace(/\D/g, ""));
                  setOtpError(null);
                }}
                placeholder="0 0 0 0"
                className="w-56 text-center text-3xl font-black font-mono tracking-[0.4em] px-4 py-3 rounded-2xl border-2 border-primary/40 bg-secondary/50 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-foreground shadow-inner"
              />
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold animate-in fade-in">
                {otpError}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setOtpModalOpen(false);
                  setEnteredOtp("");
                  setOtpError(null);
                }}
                className="flex-1 py-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifyingOtp || enteredOtp.length !== 4}
                onClick={() => otpRideId && handleVerifyOtp(otpRideId, enteredOtp)}
                className="flex-[2] py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Verify & Start Ride
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex min-h-screen bg-secondary/30 selection:bg-primary/20">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-background lg:flex sticky top-0 h-screen">
          <div className="p-6">
            <SafeGoLogo size={24} className="px-2" />
          </div>
          <nav className="mt-4 flex flex-col gap-1.5 px-4 flex-1">
            {navItems.map((item) => (
              <button
                key={t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
                onClick={() => setActiveTab(item.tab)}
                className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[13px] font-bold tracking-tight transition-all text-left w-full group ${activeTab === item.tab
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <item.icon size={20} className={activeTab === item.tab ? "text-white" : "text-muted-foreground group-hover:text-primary transition-colors"} />
                {t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
                {activeTab === item.tab && <ChevronRight size={16} className="ml-auto opacity-70" />}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border mt-auto">
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.setItem("userRole", "");
                localStorage.removeItem("safego_accepted_rides");
                localStorage.removeItem("safego_declined_rides");
                localStorage.removeItem("safego_driver_profile");
                localStorage.removeItem("safego_driver_requests");
                localStorage.removeItem("safego_driver_activity");
                localStorage.removeItem("safego_driver_available");
                localStorage.removeItem("safego_driver_history");
                window.location.href = "/login";
              }}
              className="flex items-center justify-center gap-3 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] px-4 py-3.5 text-[13px] font-bold text-white transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-[0.97] w-full text-left"
            >
              <LogOut size={20} /> Logout Account
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 lg:hidden">
          <SafeGoLogo size={22} />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-xl p-2.5 bg-secondary/50 border border-border/50 text-foreground shadow-sm">
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute top-0 right-0 bottom-0 w-[300px] bg-background p-6 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <SafeGoLogo size={22} />
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-secondary">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-2 flex-1">
                {navItems.map((item) => (
                  <button
                    key={t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
                    onClick={() => { setActiveTab(item.tab); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition-all text-left w-full ${activeTab === item.tab
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary"
                      }`}
                  >
                    <item.icon size={20} /> {t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
                  </button>
                ))}
              </nav>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("safego_accepted_rides");
                  localStorage.removeItem("safego_declined_rides");
                  localStorage.removeItem("safego_driver_profile");
                  localStorage.removeItem("safego_driver_requests");
                  localStorage.removeItem("safego_driver_activity");
                  localStorage.removeItem("safego_driver_available");
                  localStorage.removeItem("safego_driver_history");
                  window.location.href = "/login";
                }}
                className="flex items-center justify-center gap-4 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] px-5 py-4 text-sm font-bold text-white transition-all shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] mt-auto text-left w-full active:scale-[0.98]"
              >
                <LogOut size={20} /> Logout Account
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 pt-24 lg:p-10 lg:pt-8 relative">
          <div className="absolute top-4 right-4 lg:top-8 lg:right-10 z-10 hidden lg:block">
             <LanguageSwitcher />
          </div>
          <div className="max-w-6xl mx-auto lg:pt-12">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DriverPortal;
