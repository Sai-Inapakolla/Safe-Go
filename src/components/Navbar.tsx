import { Link, useLocation } from "react-router-dom";
import { SafeGoLogo } from "./SafeGoLogo";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";

export const Navbar = ({ fullWidth = true }: { fullWidth?: boolean }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: t('nav.home', 'Home'), to: "/home" },
    { label: t('nav.book', 'Book'), to: "/book/normal" },
    { label: t('nav.drive_with_us', 'Drive With Us'), to: "/drive-with-us" },
    { label: t('nav.safety', 'Safety'), to: "/safety" },
    { label: t('nav.dashboard', 'Dashboard'), to: "/dashboard" },
    { label: t('nav.about', 'About'), to: "/about" },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all ${scrolled ? "shadow-sm" : ""}`}
    >
      <div className={`relative flex h-20 w-full items-center ${fullWidth ? "px-6 sm:px-10 lg:px-16" : "max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12"}`}>
        {/* Logo */}
        <Link to="/home" className="flex-shrink-0">
          <SafeGoLogo size={24} />
        </Link>

        <div className="hidden items-center justify-center gap-10 md:flex absolute left-1/2 -translate-x-1/2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-[14px] font-bold tracking-tight transition-all hover:text-primary relative py-1 ${location.pathname === l.to ? "text-foreground after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-full after:bg-primary" : "text-muted-foreground"
                }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex ml-auto">
          <LanguageSwitcher />
          <ThemeToggle />
          {localStorage.getItem("token") ? (
            <>
              <button
                onClick={async () => {
                  await signOut(auth);
                  const keysToRemove = [
                    "token", "userRole", "safego_passenger_rides", 
                    "safego_driver_profile", "safego_driver_requests", "safego_driver_available", 
                    "safego_driver_history", "safego_driver_activity", "safego_accepted_rides", 
                    "safego_declined_rides", "safego_current_ride_id", "safego_new_booking", 
                    "safego_admin_stats", "safego_admin_users", "safego_admin_drivers", 
                    "safego_admin_rides", "safego_admin_sos"
                  ];
                  keysToRemove.forEach(k => localStorage.removeItem(k));
                  window.location.href = "/login";
                }}
                className="rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] premium-shadow"
              >
                {t('nav.signout', 'Sign Out')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('nav.login', 'Login')}
              </Link>
              <Link
                to="/signup"
                className="rounded-[1rem] bg-foreground px-6 py-2.5 text-sm font-bold text-background transition-all hover:bg-primary hover:text-white premium-shadow hover:-translate-y-0.5"
              >
                {t('nav.signup', 'Sign Up')}
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-3 text-[15px] font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-border pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Language</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">App Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex gap-3">
              {localStorage.getItem("token") ? (
                <>
                  <button
                    onClick={async () => {
                      await signOut(auth);
                      const keysToRemove = [
                        "token", "userRole", "safego_passenger_rides", 
                        "safego_driver_profile", "safego_driver_requests", "safego_driver_available", 
                        "safego_driver_history", "safego_driver_activity", "safego_accepted_rides", 
                        "safego_declined_rides", "safego_current_ride_id", "safego_new_booking", 
                        "safego_admin_stats", "safego_admin_users", "safego_admin_drivers", 
                        "safego_admin_rides", "safego_admin_sos"
                      ];
                      keysToRemove.forEach(k => localStorage.removeItem(k));
                      setOpen(false);
                      window.location.href = "/login";
                    }}
                    className="rounded-full bg-[#ef4444] hover:bg-[#dc2626] px-5 py-2 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('nav.signout', 'Logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="rounded-full border-2 border-foreground px-5 py-2 text-sm font-semibold">
                    {t('nav.login', 'Login')}
                  </Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                    {t('nav.signup', 'Sign Up')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
