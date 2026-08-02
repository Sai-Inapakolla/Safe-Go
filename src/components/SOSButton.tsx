import { ShieldAlert, X, Phone, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

interface Contact {
  _id: string;
  name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
  relation?: string; // fallback
}

interface SOSButtonProps {
  onTrigger?: () => void;
  contacts?: any[];
}

export const SOSButton = ({ onTrigger, contacts = [] }: SOSButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleBuzzerClick = () => {
    setOpen(true);
    const currentDest = localStorage.getItem('safego_current_booking_destination') || 'Ayala Triangle, Makati';
    const currentRideId = localStorage.getItem('safego_current_ride_id') || null;
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.VITE_API_URL || "";

    const triggerBackendSOS = async (latitude: number, longitude: number) => {
      if (!token) return;
      try {
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
            severity: "critical"
          })
        });
        if (response.ok) {
          const data = await response.json();
          // Broadcast SOS event to the global node network (detected by Admin Dashboard)
          localStorage.setItem('safego_new_sos', JSON.stringify({
            timestamp: new Date().toISOString(),
            userId: data.user_id,
            id: data._id || data.id || ('SOS_' + Math.floor(Math.random() * 1000)),
            destination: currentDest,
            latitude: latitude,
            longitude: longitude
          }));
          console.log("SOS Alert successfully stored in DB:", data);
        } else {
          console.error("Failed to store SOS in DB:", await response.text());
        }
      } catch (err) {
        console.error("Error storing SOS in DB:", err);
      }
    };

    // Get current location and trigger backend SOS
    if ("geolocation" in navigator) {
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

    // Set fallback local storage immediately for real-time reactivity
    localStorage.setItem('safego_new_sos', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: 'USER_882',
      id: 'SOS_' + Math.floor(Math.random() * 1000),
      destination: currentDest
    }));

    if (onTrigger) {
      onTrigger();
    }
  };

  return (
    <>
      <div className="relative flex items-center justify-center p-10">
        <div className="buzzer-shadow-ring animate-pulse" />
        <div
          onClick={handleBuzzerClick}
          className="buzzer-3d mx-auto group"
        >
          <div className="flex flex-col items-center">
            <span className="sos-label">SOS</span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] -mt-1 group-hover:text-white/80 transition-colors">Press to Alert</span>
          </div>
        </div>
      </div>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg rounded-[2.5rem] bg-background p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-6 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-pulse mb-6">
                  <ShieldAlert size={40} />
                </div>

                <h2 className="font-display text-3xl font-black tracking-tight text-foreground">Distress Signal Active</h2>
                <p className="mt-4 text-muted-foreground font-medium leading-relaxed">
                  Your live location has been broadcasted to authorities and your trusted circle.
                </p>

                <div className="mt-10 w-full space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 text-center">Emergency Contacts</h3>
                    <div className="grid gap-3">
                      {contacts.length > 0 ? (
                        contacts.map(contact => (
                          <a
                            key={contact._id || contact.id}
                            href={`tel:${contact.phone}`}
                            className="flex items-center justify-between bg-secondary/50 p-4 rounded-2xl border border-border/40 hover:bg-destructive hover:text-white transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-background text-foreground group-hover:bg-white/20 group-hover:text-white transition-colors">
                                <UserIcon size={18} />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-sm tracking-tight leading-none">{contact.name}</p>
                                <p className="text-[10px] font-bold uppercase mt-1 opacity-60 tracking-wider font-mono">{contact.relationship || contact.relation} • {contact.phone}</p>
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
                    <button className="flex w-full items-center justify-center gap-3 rounded-2xl bg-destructive py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-destructive/30 transition-all hover:brightness-110 active:scale-[0.98]">
                      <Phone size={18} />
                      Dispatch Authorities
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="w-full rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-secondary active:scale-[0.98]"
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
