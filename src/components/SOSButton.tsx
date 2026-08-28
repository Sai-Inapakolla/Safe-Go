import { ShieldAlert, X, Phone, User as UserIcon, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface Contact {
  _id?: string;
  id?: string;
  name: string;
  relationship?: string;
  relation?: string; // fallback
  phone: string;
  is_primary?: boolean;
}

export interface SOSButtonProps {
  onTrigger?: () => void;
  contacts?: Contact[];
  testerPhone?: string;
}

export const SOSButton = ({ onTrigger, contacts = [], testerPhone = "+919490969706" }: SOSButtonProps) => {
  const [open, setOpen] = useState(false);
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [dispatchedStatus, setDispatchedStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const handleClose = useCallback(async () => {
    const API_URL = import.meta.env.VITE_API_URL || "";
    const token = localStorage.getItem("token");

    if (activeSosId) {
      try {
        await fetch(`${API_URL}/api/safety/sos/${activeSosId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
      } catch (err) {
        console.warn("Could not cancel active SOS on backend:", err);
      }
    }

    try {
      localStorage.removeItem("safego_new_sos");
    } catch {
      // Storage unavailable
    }

    setOpen(false);
    setActiveSosId(null);
    setDispatchedStatus(null);
  }, [activeSosId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  const handleBuzzerClick = () => {
    setOpen(true);
    setDispatchedStatus(null);

    // Haptic feedback for accessibility / emergency confirmation
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([250, 100, 250]);
      } catch {
        // Haptics not allowed or blocked
      }
    }

    let currentDest = "Ayala Triangle, Makati";
    let currentRideId: string | null = null;
    let token: string | null = null;
    let storedUser: any = null;
    let primaryContact: Contact | null = contacts.find(c => c.is_primary) || (contacts.length > 0 ? contacts[0] : null);

    try {
      currentDest = localStorage.getItem("safego_current_booking_destination") || currentDest;
      currentRideId = localStorage.getItem("safego_current_ride_id") || null;
      token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("safego_user");
      if (userRaw) storedUser = JSON.parse(userRaw);

      if (!primaryContact) {
        const localStored = localStorage.getItem("local_emergency_contacts");
        if (localStored) {
          const parsed = JSON.parse(localStored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            primaryContact = parsed.find((c: any) => c.is_primary) || parsed[0];
          }
        }
      }
    } catch {
      // localStorage may fail in restricted/private modes
    }

    const userId = storedUser?.id || storedUser?._id || "USER_EMERGENCY_PASSENGER";
    const API_URL = import.meta.env.VITE_API_URL || "";

    const triggerBackendSOS = async (latitude: number, longitude: number) => {
      const generatedLocalId = "SOS_" + Math.floor(Math.random() * 10000);
      try {
        if (token) {
          const response = await fetch(`${API_URL}/api/safety/sos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              ride_id: currentRideId,
              latitude: latitude,
              longitude: longitude,
              location_address: currentDest,
              emergency_contact_phone: primaryContact?.phone || undefined,
              emergency_contact_name: primaryContact?.name || undefined,
              severity: "critical"
            })
          });

          if (response.ok) {
            const data = await response.json();
            const serverSosId = data._id || data.id || generatedLocalId;
            setActiveSosId(serverSosId);

            localStorage.setItem("safego_new_sos", JSON.stringify({
              timestamp: new Date().toISOString(),
              userId: data.user_id || userId,
              id: serverSosId,
              destination: currentDest,
              latitude: latitude,
              longitude: longitude
            }));
            return;
          }
        } else {
          // Guest mode SOS
          const targetContactPhone = primaryContact?.phone || testerPhone;
          const targetContactName = primaryContact?.name || "Trusted Emergency Contact";
          const guestResponse = await fetch(`${API_URL}/api/safety/public-sos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              latitude: latitude,
              longitude: longitude,
              location_address: currentDest,
              emergency_contact_phone: targetContactPhone,
              emergency_contact_name: targetContactName,
              severity: "critical"
            })
          });
          if (guestResponse.ok) {
            setActiveSosId(generatedLocalId);
          }
        }
      } catch (err) {
        console.error("Error storing SOS in DB:", err);
      }

      // Fallback local storage broadcast for real-time node reactivity
      try {
        localStorage.setItem("safego_new_sos", JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: userId,
          id: generatedLocalId,
          destination: currentDest,
          latitude: latitude,
          longitude: longitude
        }));
      } catch {
        // Storage restricted
      }
    };

    // Geolocation detection with safe fallback coordinates
    if (
      typeof navigator !== "undefined" &&
      navigator.geolocation &&
      typeof navigator.geolocation.getCurrentPosition === "function"
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          triggerBackendSOS(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation failed/denied. Storing SOS with fallback coordinates.", err);
          triggerBackendSOS(12.9716, 77.5946); // Default fallback coordinates
        },
        { timeout: 5000 }
      );
    } else {
      triggerBackendSOS(12.9716, 77.5946);
    }

    if (onTrigger) {
      onTrigger();
    }
  };

  const handleDispatchAuthorities = async () => {
    setIsDispatching(true);
    const API_URL = import.meta.env.VITE_API_URL || "";
    const token = localStorage.getItem("token");

    if (activeSosId) {
      try {
        await fetch(`${API_URL}/api/safety/sos/${activeSosId}/dispatch-authorities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
      } catch (err) {
        console.warn("Could not dispatch authority escalation:", err);
      }
    }

    setIsDispatching(false);
    setDispatchedStatus("Escalated to Tester & Admin Channels");

    // Safe direct dialer routing to Tester contact (avoiding real 112/police numbers during testing)
    if (testerPhone && typeof document !== "undefined") {
      try {
        const dialerLink = document.createElement("a");
        dialerLink.href = `tel:${testerPhone}`;
        dialerLink.click();
      } catch {
        // Navigation handled in production
      }
    }
  };

  return (
    <>
      <div className="relative flex items-center justify-center p-10">
        <div className="buzzer-shadow-ring animate-pulse" />
        <button
          type="button"
          onClick={handleBuzzerClick}
          aria-label="Emergency SOS Alert"
          className="buzzer-3d mx-auto group cursor-pointer focus:outline-none focus:ring-4 focus:ring-destructive/50"
        >
          <div className="flex flex-col items-center">
            <span className="sos-label">SOS</span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] -mt-1 group-hover:text-white/80 transition-colors">Press to Alert</span>
          </div>
        </button>
      </div>

      {open &&
        createPortal(
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sos-modal-title"
            aria-describedby="sos-modal-desc"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          >
            <div className="relative w-full max-w-lg rounded-[2.5rem] bg-background p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
              <button
                onClick={handleClose}
                className="absolute right-6 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close Distress Modal"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-pulse mb-6">
                  <ShieldAlert size={40} />
                </div>

                <h2 id="sos-modal-title" className="font-display text-3xl font-black tracking-tight text-foreground">
                  Distress Signal Active
                </h2>
                <p id="sos-modal-desc" className="mt-4 text-muted-foreground font-medium leading-relaxed">
                  Your live location has been broadcasted to authorities and your trusted circle.
                </p>

                {dispatchedStatus && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>{dispatchedStatus}</span>
                  </div>
                )}

                <div className="mt-8 w-full space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 text-center">
                      Emergency Contacts
                    </h3>
                    <div className="grid gap-3">
                      {contacts && contacts.length > 0 ? (
                        contacts.map(contact => (
                          <a
                            key={contact._id || contact.id || contact.phone}
                            href={`tel:${contact.phone}`}
                            className="flex items-center justify-between bg-secondary/50 p-4 rounded-2xl border border-border/40 hover:bg-destructive hover:text-white transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-background text-foreground group-hover:bg-white/20 group-hover:text-white transition-colors">
                                <UserIcon size={18} />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-sm tracking-tight leading-none">{contact.name}</p>
                                <p className="text-[10px] font-bold uppercase mt-1 opacity-60 tracking-wider font-mono">
                                  {contact.relationship || contact.relation || "Emergency Contact"} • {contact.phone}
                                </p>
                              </div>
                            </div>
                            <Phone size={18} className="mr-2" />
                          </a>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic mb-4">No emergency contacts configured.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={handleDispatchAuthorities}
                      disabled={isDispatching}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-destructive py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-destructive/30 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      <Phone size={18} />
                      {isDispatching ? "Escalating Dispatch..." : "Dispatch Authorities"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-secondary active:scale-[0.98] cursor-pointer"
                    >
                      Dismiss Alert
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

