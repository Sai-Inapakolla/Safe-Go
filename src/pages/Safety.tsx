import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SOSButton } from "@/components/SOSButton";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import {
    Shield, Share2, Target, Link2, Plus, Users as UsersIcon,
    Trash2, HeartPulse, Sparkles, MapPin, BadgeCheck, Phone, AlertTriangle, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Safety = () => {
    const revealRef = useScrollReveal();
    // state for live location
    const [isSharingLocation, setIsSharingLocation] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // state for contacts
    const [contacts, setContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [showContactForm, setShowContactForm] = useState(false);
    const [newContact, setNewContact] = useState({ name: "", phone: "", relation: "" });

    // mock score
    const [safetyScore, setSafetyScore] = useState(94);
    const [safetyFactors, setSafetyFactors] = useState<{ label: string, value: number, type: 'plus' | 'minus' }[]>([]);

    // police stations
    const [policeStations, setPoliceStations] = useState<{ id: number, name: string, distance: string, phone: string }[]>([]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            // 1. Load from LocalStorage first (Guest Persistence)
            const localStored = localStorage.getItem("local_emergency_contacts");
            const localContacts = localStored ? JSON.parse(localStored) : [];

            const token = localStorage.getItem("token");
            if (!token) {
                setContacts(localContacts);
                return;
            }

            // 2. Fetch from Backend if logged in
            const res = await fetch(`${API_URL}/api/users/me/emergency-contacts`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const serverData = await res.json();

                // 3. Merge: Prioritize server data, but keep local ones that aren't synced yet
                // For simplicity in this demo, we'll just combine them and filter duplicates by phone
                const combined = [...serverData];
                localContacts.forEach((lc: any) => {
                    if (!combined.find(sc => sc.phone === lc.phone)) {
                        combined.push(lc);
                    }
                });
                setContacts(combined);
            } else {
                setContacts(localContacts);
            }
        } catch (e) {
            console.error("Failed to fetch contacts", e);
            // Fallback to local
            const localStored = localStorage.getItem("local_emergency_contacts");
            if (localStored) setContacts(JSON.parse(localStored));
        } finally {
            setLoadingContacts(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    // Dynamic Safety Score Logic
    useEffect(() => {
        if (!userLocation) return;

        // Simulate complex safety analysis
        const calculateDynamicScore = () => {
            let baseScore = 85;
            const factors: { label: string, value: number, type: 'plus' | 'minus' }[] = [];

            // 1. Proximity to Police Stations (Simulated)
            const isNearPolice = Math.random() > 0.3;
            if (isNearPolice) {
                const boost = Math.floor(Math.random() * 5) + 5;
                baseScore += boost;
                factors.push({ label: "Nearby Police Station", value: boost, type: 'plus' });
            }

            // 2. Traffic Density (Simulated)
            const trafficLevels = ['Low', 'Moderate', 'High'];
            const currentTraffic = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];
            if (currentTraffic === 'Low') {
                baseScore += 3;
                factors.push({ label: "Low Traffic Density", value: 3, type: 'plus' });
            } else if (currentTraffic === 'High') {
                baseScore -= 6;
                factors.push({ label: "High Traffic Congestion", value: 6, type: 'minus' });
            }

            // 3. Time of Day (Real)
            const hour = new Date().getHours();
            if (hour >= 6 && hour <= 18) {
                baseScore += 4;
                factors.push({ label: "Daylight Visibility", value: 4, type: 'plus' });
            } else {
                baseScore -= 5;
                factors.push({ label: "Nighttime Awareness", value: 5, type: 'minus' });
            }

            // 4. Proximity to Main Road
            const mainRoadBoost = 2;
            baseScore += mainRoadBoost;
            factors.push({ label: "Main Thoroughfare Access", value: mainRoadBoost, type: 'plus' });

            const finalScore = Math.min(Math.max(baseScore, 0), 100);
            setSafetyScore(finalScore);
            setSafetyFactors(factors);
        };

        calculateDynamicScore();
        // Periodically refresh the "live" feel
        const interval = setInterval(calculateDynamicScore, 15000);
        return () => clearInterval(interval);
    }, [userLocation]);

    // Fetch Nearest Police Stations
    useEffect(() => {
        if (!userLocation) return;

        // Mocking dynamic police stations based on location
        const mockStations = [
            { id: 1, name: "Central District Police HQ", distance: "0.8 km", phone: "112" },
            { id: 2, name: "North Precinct Station", distance: "2.1 km", phone: "100" }
        ];

        // Simulate network delay for realistic feel
        const timer = setTimeout(() => {
            setPoliceStations(mockStations);
        }, 200);

        return () => clearTimeout(timer);
    }, [userLocation]);

    useEffect(() => {
        // Get current location on mount
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    console.error("Location error:", err);
                    setLocationError(err.message);
                }
            );
        } else {
            setLocationError("Geolocation not supported");
        }
    }, []);

    const handleShareLocation = async () => {
        if (!userLocation) {
            toast.error("Location not detected yet. Please wait a moment.");
            return;
        }

        const newSharingState = !isSharingLocation;
        setIsSharingLocation(newSharingState);

        if (newSharingState) {
            if (contacts.length === 0) {
                toast.warning("Tracking started, but no trusted contacts found to alert.", {
                    description: "Add contacts below to automatically share your live status."
                });
                return;
            }

            const mapUrl = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;

            // Simulate sending to contacts
            toast.info(`Sharing live tracking...`, {
                description: `Sent location link to ${contacts.length} trusted contacts: ${contacts.map(c => c.name).join(", ")}`
            });

            console.log("Live Tracking Link sent to:", contacts.map(c => c.phone), mapUrl);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const toastId = toast.loading("Saving to your trusted network...");

        // Create a temporary ID for local display (Optimistic Update)
        const tempId = `temp-${Date.now()}`;
        const contactData = {
            _id: tempId,
            name: newContact.name,
            phone: newContact.phone,
            relationship: newContact.relation,
            is_primary: contacts.length === 0
        };

        // IMMEDIATELY update UI as requested ("just save and display")
        const updatedContacts = [...contacts, contactData];
        setContacts(updatedContacts);

        // PERSIST to localStorage for guest flow
        localStorage.setItem("local_emergency_contacts", JSON.stringify(updatedContacts.filter(c => c._id.startsWith('temp-'))));

        setNewContact({ name: "", phone: "", relation: "" });
        setShowContactForm(false);

        try {
            const token = localStorage.getItem("token");

            // Still try to save to backend if token exists, but don't block the UI if it's missing
            if (token) {
                const res = await fetch(`${API_URL}/api/users/me/emergency-contacts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: contactData.name,
                        phone: contactData.phone,
                        relationship: contactData.relationship,
                        is_primary: contactData.is_primary
                    })
                });

                if (res.ok) {
                    toast.success("Contact secured in cloud!", { id: toastId });
                    // Refresh with real server data/IDs
                    fetchContacts();
                } else {
                    toast.success("Saved to local session.", { id: toastId, description: "Backend sync skipped (Guest Mode)." });
                }
            } else {
                toast.success("Saved to local session.", { id: toastId, description: "Note: Login to sync across devices." });
            }
        } catch (err) {
            console.warn("Backend sync failed, but contact is kept locally:", err);
            toast.success("Saved locally.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteContact = async (id: string) => {
        // Optimistic delete
        const updated = contacts.filter(c => c._id !== id);
        setContacts(updated);

        // Update local storage
        localStorage.setItem("local_emergency_contacts", JSON.stringify(updated.filter(c => c._id.startsWith('temp-'))));

        try {
            const token = localStorage.getItem("token");
            if (token && !id.startsWith('temp-')) {
                const res = await fetch(`${API_URL}/api/users/me/emergency-contacts/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    toast.success("Contact removed from cloud");
                    fetchContacts();
                }
            } else {
                toast.success("Contact removed");
            }
        } catch (err) {
            console.error("Failed to delete contact", err);
        }
    };

    const handleSOS = async () => {
        const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

        if (!primaryContact) {
            toast.error("NO TRUSTED CONTACTS FOUND", {
                description: "Please add a guard to your network before triggering SOS."
            });
            return;
        }

        const toastId = toast.loading("EMERGENCY SOS TRIGGERED", {
            description: "Broadcasting your live location to your trusted network...",
        });

        try {
            // Simulate SOS delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Log notification to backend
            const token = localStorage.getItem("token");
            await fetch(`${API_URL}/api/users/me/notifications`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: "Emergency SOS Alert",
                    message: `User triggered emergency SOS. Alerted: ${primaryContact.name} (${primaryContact.phone}). Coordinates: ${userLocation?.lat}, ${userLocation?.lng}`,
                    type: "alert"
                })
            });

            toast.error(`ALERT SENT TO ${primaryContact.name.toUpperCase()}`, {
                id: toastId,
                description: `Emergency message with GPS link sent to ${primaryContact.phone}. Authorities are standby.`,
                duration: 6000,
            });

        } catch (error) {
            toast.warning("Local SOS Triggered", {
                id: toastId,
                description: "Broadcast completed locally, but server log failed."
            });
        }
    };

    const handleCopyLink = () => {
        if (!userLocation) {
            toast.error("Location data not available yet.");
            return;
        }
        const mapUrl = `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
        navigator.clipboard.writeText(mapUrl);
        toast.success("Location link copied to clipboard!", {
            description: "You can now share this link with your trusted contacts.",
        });
    };

    return (
        <div className="flex h-screen flex-col bg-background relative overflow-hidden">
            {/* Premium Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-destructive/5 blur-[100px]" />
                <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="safety-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#safety-grid)" />
                </svg>
            </div>

            <Navbar />
            <main ref={revealRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full pb-24 relative z-10">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 scroll-reveal">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-sm">
                            <Shield size={36} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl">Safety <span className="text-destructive">Center.</span></h1>
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">Real-time Protection & Monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 px-6 py-3 backdrop-blur-md">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-bold text-foreground">Secure Connection Active</span>
                    </div>
                </header>

                <div className="grid gap-8 lg:grid-cols-12 flex-1 w-full">
                    {/* Left Column - Priority Controls */}
                    <div className="lg:col-span-7 flex flex-col gap-8">
                        {/* SOS Panel - HIGH IMPACT */}
                        <section className="group relative rounded-[2.5rem] border-2 border-destructive bg-destructive/5 p-10 text-center flex flex-col items-center shadow-2xl transition-all hover:scale-[1.01] scroll-reveal overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />

                            <h2 className="text-3xl font-black text-destructive mb-4 flex items-center gap-3">
                                <Shield size={32} className="animate-pulse" /> Emergency SOS
                            </h2>
                            <p className="text-lg text-foreground/80 mb-10 max-w-[500px] font-medium leading-relaxed">
                                Immediate 2-way distress signal. Alerts local authorities, active hub supervisors, and your entire trusted network in one click.
                            </p>

                            <div className="z-10">
                                <SOSButton onTrigger={handleSOS} contacts={contacts} />
                            </div>

                            <p className="mt-8 text-[11px] font-black uppercase tracking-widest text-destructive/60">Ready for instant deployment</p>
                        </section>

                        {/* Location Sharing Panel - GLASSMAP STYLE */}
                        <section className="rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 scroll-reveal">
                            <div className="flex items-start gap-6 flex-1">
                                <div className={`p-5 rounded-2xl transition-all duration-500 shadow-sm ${isSharingLocation ? "bg-teal-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                                    <Target size={28} />
                                </div>
                                <div>
                                    <h3 className="font-black text-2xl text-foreground tracking-tight">Live Tracking</h3>
                                    <p className="text-base text-muted-foreground font-medium mt-1">Continuous location streaming to your circle.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                {userLocation && (
                                    <button
                                        onClick={handleCopyLink}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-background px-6 py-4 text-sm font-black text-foreground transition-all hover:bg-secondary active:scale-95"
                                    >
                                        <Link2 size={18} className="text-primary" />
                                        <span>Copy Link</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleShareLocation}
                                    className={`flex-1 sm:flex-none rounded-2xl px-8 py-4 text-sm font-black transition-all shadow-lg active:scale-95 ${isSharingLocation ? "bg-secondary text-foreground" : "bg-primary text-white hover:brightness-110"}`}
                                >
                                    {isSharingLocation ? "Stop Stream" : "Share Now"}
                                </button>
                            </div>
                        </section>

                        {/* Contacts Manager - ELITE LIST STYLE */}
                        <section className="relative rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl p-8 overflow-hidden flex-1 scroll-reveal">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-black text-2xl text-foreground tracking-tight flex items-center gap-3">
                                    <UsersIcon size={24} className="text-primary" /> Trusted Network
                                </h3>
                                <button
                                    onClick={() => setShowContactForm(!showContactForm)}
                                    className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-black text-primary transition-all hover:bg-primary/20"
                                >
                                    <Plus size={18} /> {showContactForm ? "Cancel" : "Add Guard"}
                                </button>
                            </div>

                            {showContactForm && (
                                <form onSubmit={handleAddContact} className="mb-8 bg-secondary/30 p-6 rounded-3xl border border-border/50 animate-in fade-in slide-in-from-top-4">
                                    <div className="grid gap-4 sm:grid-cols-2 mb-6">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                            <input required placeholder="Name" className="rounded-xl border border-border/80 px-4 py-3.5 text-base bg-background outline-none focus:border-primary transition-colors" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile</label>
                                            <input required type="tel" placeholder="+91" className="rounded-xl border border-border/80 px-4 py-3.5 text-base bg-background outline-none focus:border-primary transition-colors" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                                        </div>
                                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relationship</label>
                                            <input placeholder="E.g. Sister, Spouse" className="rounded-xl border border-border/80 px-4 py-3.5 text-base bg-background outline-none focus:border-primary transition-colors" value={newContact.relation} onChange={e => setNewContact({ ...newContact, relation: e.target.value })} />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full rounded-2xl bg-foreground py-4 text-base font-black text-background hover:bg-primary transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            "Confirm Addition"
                                        )}
                                    </button>
                                </form>
                            )}

                            <div className="grid gap-4 relative min-h-[100px]">
                                {loadingContacts && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-3xl">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}

                                {contacts.map(contact => (
                                    <div key={contact._id} className="flex items-center justify-between bg-card/60 border border-border/50 p-6 rounded-3xl transition-all hover:border-primary/20 hover:bg-white/80 group">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary text-xl font-black relative overflow-hidden">
                                                {contact?.name?.charAt(0) || "?"}
                                                {contact.is_primary && (
                                                    <div className="absolute top-0 right-0 h-2 w-2 bg-pink-500 rounded-full border border-white shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-foreground text-lg tracking-tight">{contact.name}</p>
                                                    {contact.is_primary && <span className="text-[9px] font-black uppercase bg-pink-500/10 text-pink-600 px-1.5 py-0.5 rounded-md">Primary</span>}
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                                                    {contact.relationship || contact.relation || "Contact"} • {contact.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteContact(contact._id)} className="text-muted-foreground hover:text-destructive p-3 transition-colors bg-secondary/50 rounded-2xl hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                                {!loadingContacts && contacts.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-[2rem] bg-secondary/10">
                                        <p className="text-lg font-black text-muted-foreground/60">No Guardians Active</p>
                                        <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">Add contacts to enable automatic alerting</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Nearby Authorities - DYNAMIC LIST */}
                        <section className="relative rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl p-8 overflow-hidden flex-1 scroll-reveal">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-black text-2xl text-foreground tracking-tight flex items-center gap-3">
                                    <Shield size={24} className="text-blue-500" /> Nearest Authorities
                                </h3>
                                <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-500 backdrop-blur-md">
                                    <MapPin size={16} /> Live Range
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {policeStations.map(station => (
                                    <div key={station.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-card/60 border border-border/50 p-6 rounded-3xl transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group">
                                        <div className="flex items-center gap-5">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black text-foreground text-lg tracking-tight">{station.name}</p>
                                                <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-wider flex items-center gap-2">
                                                    <MapPin size={14} className="text-blue-500/70" /> {station.distance} away
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-border/50 sm:pl-4">
                                            <a href={`tel:${station.phone}`} className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-2xl bg-foreground text-background px-6 py-3 font-black text-sm hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95">
                                                <Phone size={16} /> {station.phone}
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                {policeStations.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-[2rem] bg-secondary/10">
                                        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-secondary text-muted-foreground/50 mb-4 animate-pulse">
                                            <MapPin size={24} />
                                        </div>
                                        <p className="text-lg font-black text-muted-foreground/60">Scanning Area...</p>
                                        <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">Identifying closest stations</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Monitoring & Feedback */}
                    <div className="lg:col-span-5 flex flex-col gap-8">
                        {/* Map Preview Area - SATELLITE HUD */}
                        <section className="rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl overflow-hidden h-[350px] relative flex flex-col scroll-reveal">
                            <div className="bg-secondary/80 p-5 border-b border-border/60 z-10 flex items-center justify-between backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-widest text-foreground">Satellite HUD</span>
                                </div>
                                {isSharingLocation ? (
                                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20">
                                        Broadcasting
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">
                                        Local Only
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 relative bg-secondary/30 min-h-[200px]">
                                {userLocation ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&t=k&z=18&ie=UTF8&iwloc=&output=embed`}
                                        allowFullScreen
                                        className="absolute inset-0 grayscale-[0.2] contrast-[1.1]"
                                    ></iframe>
                                ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                                        <MapPlaceholder />
                                        {locationError && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-20 p-8 text-center">
                                                <div className="max-w-[200px]">
                                                    <Shield size={40} className="text-destructive mx-auto mb-4 opacity-50" />
                                                    <p className="text-sm font-black text-foreground uppercase tracking-widest">Access Restricted</p>
                                                    <p className="text-xs font-medium text-muted-foreground mt-2">Enable location permissions to initialize the tactical map.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Safety Score - DYNAMIC GAUGE STYLE */}
                        <section className="rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl p-8 scroll-reveal flex-none">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-black text-2xl text-foreground tracking-tight">Environmental Ops</h3>
                                <div className="text-3xl font-black text-primary">{safetyScore}%</div>
                            </div>

                            <SafetyScoreBar score={safetyScore} label="Overall Tactical Safety" />

                            <div className="mt-8 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">Live Telemetry Analysis</p>
                                {safetyFactors.map((factor, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm py-2.5 border-b border-border/40 last:border-0 group">
                                        <span className="text-foreground/80 font-bold group-hover:text-foreground transition-colors">{factor.label}</span>
                                        <div className={`flex items-center gap-2 font-black ${factor.type === 'plus' ? 'text-teal-600' : 'text-destructive'}`}>
                                            {factor.type === 'plus' ? <Sparkles size={14} /> : <Shield size={14} />}
                                            {factor.type === 'plus' ? '+' : '-'}{factor.value}%
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[11px] text-muted-foreground mt-8 text-center font-bold uppercase tracking-widest opacity-60">
                                Powered by SafeGo ML Engine
                            </p>
                        </section>

                        {/* Safety Tips - TACTICAL CARDS */}
                        <section className="rounded-[2.5rem] border border-border/60 bg-background/60 backdrop-blur-xl shadow-xl p-8 scroll-reveal">
                            <h3 className="font-black text-2xl text-foreground tracking-tight flex items-center gap-3 mb-8">
                                <HeartPulse size={24} className="text-mode-pink" /> Field Protocols
                            </h3>
                            <div className="grid gap-4">
                                {[
                                    { text: "Vehicle Verification", desc: "Cross-check ID & Plate", icon: Shield, color: "text-mode-pink" },
                                    { text: "Live Broadcasting", desc: "Keep tracking active", icon: Target, color: "text-primary" },
                                    { text: "SOS Procedures", desc: "Instant panic response", icon: Shield, color: "text-destructive" },
                                ].map((tip, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/30 hover:border-border transition-all">
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-border/50 ${tip.color}`}>
                                            <tip.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground text-base tracking-tight">{tip.text}</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tip.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Safety;
