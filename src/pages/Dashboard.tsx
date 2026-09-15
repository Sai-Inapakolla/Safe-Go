import { SafeGoLogo } from "@/components/SafeGoLogo";
import { StatsCard } from "@/components/StatsCard";
import { modes } from "@/config/modeConfig";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signOut, deleteUser, updatePassword } from "firebase/auth";
import {
  LayoutDashboard, Car, Shield, Users, Settings,
  Star, TrendingUp, ArrowRight, User, Lock, Bell, Moon, MapPin,
  Accessibility, Mic, Check, Trash2, Loader2, Plus, X, Eye, EyeOff,
  ShieldAlert, AlertCircle, Calendar, Clock, KeyRound, CheckCircle2, Info,
  Sparkles, Leaf
} from "lucide-react";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useElderMode } from "@/contexts/ElderModeContext";
import { getApiUrl } from "@/lib/api";

const API_URL = getApiUrl();

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Car, label: "My Rides", to: "/dashboard" },
  { icon: Shield, label: "Safety Reports", to: "/dashboard" },
  { icon: Users, label: "Emergency Contacts", to: "/dashboard" },
  { icon: Settings, label: "Settings", to: "/dashboard" },
];

const defaultSampleRides = [
  { _id: "ride_sample_1", id: "1", mode: "Pink", pickup_address: "Forum Mall, Koramangala", destination_address: "HSR Layout Sector 1", route: "Forum Mall → HSR Layout", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), driver: { user: { full_name: "Ananya M." } }, status: "completed", rating: 5, fare: "₹240" },
  { _id: "ride_sample_2", id: "2", mode: "Normal", pickup_address: "Indiranagar 100ft Rd", destination_address: "Marathahalli Bridge", route: "Indiranagar → Marathahalli", created_at: new Date(Date.now() - 86400000 * 3).toISOString(), driver: { user: { full_name: "Aarav Sharma" } }, status: "completed", rating: 4, fare: "₹180" },
  { _id: "ride_sample_3", id: "3", mode: "PWD", pickup_address: "Whitefield Main Rd", destination_address: "Manipal Hospital HAL", route: "Whitefield → Manipal Hospital", created_at: new Date(Date.now() - 86400000 * 5).toISOString(), driver: { user: { full_name: "Carlos R." } }, status: "completed", rating: 5, fare: "₹150" },
];

const statusColors: Record<string, string> = {
  Completed: "bg-primary/10 text-primary",
  completed: "bg-primary/10 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  "In Progress": "bg-amber-500/10 text-amber-500",
  "in_progress": "bg-amber-500/10 text-amber-500",
  "searching": "bg-blue-500/10 text-blue-500",
  "matched": "bg-teal-500/10 text-teal-500",
  "driver_arriving": "bg-purple-500/10 text-purple-500",
};

const Dashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isElderMode, toggleElderMode } = useElderMode();
  const [activeTab, setActiveTab] = useState("Dashboard");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const [myRides, setMyRides] = useState<any[]>(() => {
    try {
      const c = localStorage.getItem("safego_passenger_rides") || localStorage.getItem("safego_rides");
      if (!c) return defaultSampleRides;
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return defaultSampleRides;
    } catch {
      return defaultSampleRides;
    }
  });
  const [loadingRides, setLoadingRides] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", relation: "", phone: "", isEmergency: false });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [profile, setProfile] = useState(() => {
    const rawStoredPhone = localStorage.getItem("safego_user_phone");
    const cleanStoredPhone = (rawStoredPhone && !rawStoredPhone.startsWith("fb-")) ? rawStoredPhone : "";
    return {
      name: localStorage.getItem("safego_user_name") || "",
      phone: cleanStoredPhone,
      email: localStorage.getItem("safego_user_email") || ""
    };
  });
  const [penaltyBalance, setPenaltyBalance] = useState<number>(() => {
    const p = localStorage.getItem("safego_penalty_balance");
    return p ? Number(p) : 0;
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [selectedRides, setSelectedRides] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Change Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");

  // Ride Preference state
  const [defaultRideMode, setDefaultRideMode] = useState<string>(() => {
    return localStorage.getItem("safego_default_ride_mode") || "normal";
  });
  const [pinkDriverPref, setPinkDriverPref] = useState<string>(() => {
    return localStorage.getItem("safego_pink_driver_pref") || "Female Driver Required";
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to update your password");
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          password: newPassword,
          confirm_password: confirmPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update password");
      }

      // Sync with Firebase if user is logged into Firebase
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
        }
      } catch (fbErr) {
        console.warn("Firebase password sync note:", fbErr);
      }

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      setPasswordSuccessMessage("Updated just now");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const savedName = localStorage.getItem("safego_user_name") || "";
      const rawSavedPhone = localStorage.getItem("safego_user_phone") || "";
      const savedPhone = (rawSavedPhone && !rawSavedPhone.startsWith("fb-")) ? rawSavedPhone : "";
      const savedEmail = localStorage.getItem("safego_user_email") || "";

      if (!token) {
        setProfile({ name: savedName, phone: savedPhone, email: savedEmail });
        return;
      }

      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const finalName = data.full_name || savedName;
        const rawPhone = data.phone || savedPhone;
        const finalPhone = (rawPhone && !rawPhone.startsWith("fb-")) ? rawPhone : "";
        const finalEmail = data.email || savedEmail;
        setProfile({ name: finalName, phone: finalPhone, email: finalEmail });
        localStorage.setItem("safego_user_name", finalName);
        localStorage.setItem("safego_user_phone", finalPhone);
        localStorage.setItem("safego_user_email", finalEmail);
        if (data.penalty_balance !== undefined) {
          setPenaltyBalance(data.penalty_balance);
          localStorage.setItem("safego_penalty_balance", String(data.penalty_balance));
        }
      } else {
        setProfile({ name: savedName, phone: savedPhone, email: savedEmail });
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
      const savedName = localStorage.getItem("safego_user_name") || "";
      const rawSavedPhone = localStorage.getItem("safego_user_phone") || "";
      const savedPhone = (rawSavedPhone && !rawSavedPhone.startsWith("fb-")) ? rawSavedPhone : "";
      const savedEmail = localStorage.getItem("safego_user_email") || "";
      setProfile({ name: savedName, phone: savedPhone, email: savedEmail });
    }
  };

  const [selectedRideModal, setSelectedRideModal] = useState<any | null>(null);

  const fetchRides = async () => {
    setLoadingRides(true);
    try {
      const token = localStorage.getItem("token");
      let remoteRides: any[] = [];
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/rides/me`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) remoteRides = data;
            else if (Array.isArray(data?.rides) && data.rides.length > 0) remoteRides = data.rides;
          }
        } catch (e) {
          console.warn("Backend rides fetch fallback:", e);
        }
      }

      let localRides: any[] = [];
      try {
        const local = localStorage.getItem("safego_passenger_rides") || localStorage.getItem("safego_rides");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) localRides = parsed;
        }
      } catch (e) {}

      // Check if there is an unhandled cancellation event
      try {
        const rawCancel = localStorage.getItem("safego_cancellation_data") || localStorage.getItem("safego_ride_cancelled_event");
        if (rawCancel) {
          const cData = JSON.parse(rawCancel);
          const cRideId = cData.rideId || cData.id || ("ride_cancel_" + (cData.timestamp || Date.now()));
          const existsInLocal = localRides.some(r => r._id === cRideId || r.id === cRideId);
          if (!existsInLocal) {
            const isVio = cData.type === "pink_mode_violation" || Boolean(cData.penalty && cData.penalty > 0);
            const injectedCancel = {
              _id: cRideId,
              id: cRideId,
              mode: "Pink",
              pickup_address: localStorage.getItem("safego_pickup_address") || "Pickup Point",
              destination_address: localStorage.getItem("safego_current_booking_destination") || "Drop-off Point",
              route: `${localStorage.getItem("safego_pickup_address") || "Pickup Point"} → ${localStorage.getItem("safego_current_booking_destination") || "Drop-off Point"}`,
              status: "cancelled",
              cancel_reason: cData.reason || cData.notes || (isVio ? "Policy Violation: Solo Male Passenger in Pink Mode" : "Trip Cancelled"),
              is_penalty_applied: isVio,
              penalty_amount: cData.penalty || (isVio ? 750 : 0),
              penalty_reason: cData.notes || cData.reason || "Solo Male Booking Policy Violation",
              driver_compensation_amount: cData.driverCompensation || 200,
              driver: {
                user: {
                  full_name: cData.driverName || "Female Safety Pilot"
                }
              },
              created_at: new Date(cData.timestamp || Date.now()).toISOString(),
              cancelled_at: new Date(cData.timestamp || Date.now()).toISOString()
            };
            localRides = [injectedCancel, ...localRides];
          }
        }
      } catch (_) {}

      // Merge: Map by ID, giving precedence to cancelled status and richer incident fields
      const mergedMap = new Map<string, any>();
      for (const r of remoteRides) {
        const key = String(r._id || r.id);
        mergedMap.set(key, r);
      }
      for (const r of localRides) {
        const key = String(r._id || r.id);
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, { ...existing, ...r });
      }

      const mergedList = Array.from(mergedMap.values());
      // Sort newest at the top
      mergedList.sort((a, b) => {
        const timeA = new Date(a.cancelled_at || a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.cancelled_at || b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      const finalRides = mergedList.length > 0 ? mergedList : defaultSampleRides;
      setMyRides(finalRides);
      try {
        localStorage.setItem("safego_passenger_rides", JSON.stringify(finalRides));
      } catch (e) {
        console.warn("Failed to cache rides to localStorage", e);
      }
    } catch (err) {
      console.error("Failed to fetch rides", err);
    } finally {
      setLoadingRides(false);
    }
  };

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
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      // Fallback to local
      const localStored = localStorage.getItem("local_emergency_contacts");
      if (localStored) setContacts(JSON.parse(localStored));
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/api/users/me/notifications`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchRides();
    fetchContacts();
    fetchNotifications();

    // Listen to real-time cancellations and cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "safego_passenger_rides" ||
        e.key === "safego_rides" ||
        e.key === "safego_ride_cancelled_event" ||
        e.key === "safego_cancellation_data" ||
        e.key === "safego_current_ride_cancelled" ||
        e.key === "safego_penalty_balance"
      ) {
        fetchRides();
        fetchProfile();
      }
    };

    const handleCustomCancellation = () => {
      fetchRides();
      fetchProfile();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("safego_ride_cancelled", handleCustomCancellation);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("safego_ride_cancelled", handleCustomCancellation);
    };
  }, []);

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your ride history? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/rides/history`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success("Ride history cleared successfully!");
        setMyRides([]);
        setSelectedRides(new Set());
        try {
          localStorage.removeItem("safego_passenger_rides");
        } catch (e) {
          console.warn("Failed to remove cached rides", e);
        }
      } else {
        toast.error("Failed to clear history");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleTriggerSOS = async () => {
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

    if (!primaryContact) {
      toast.error("No emergency contacts found! Please add one in the Emergency Contacts tab.");
      setActiveTab("Emergency Contacts");
      return;
    }

    const toastId = toast.loading(`Triggering SOS Alert to ${primaryContact.name}...`);

    try {
      const token = localStorage.getItem("token");
      const currentRideId = localStorage.getItem("safego_current_ride_id") || null;
      
      const response = await fetch(`${API_URL}/api/safety/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ride_id: currentRideId,
          latitude: 11.2189,
          longitude: 78.1672,
          location_address: "Namakkal, Tamil Nadu, India",
          severity: "critical"
        })
      });

      if (!response.ok) {
        throw new Error("SOS trigger failed");
      }

      const data = await response.json();

      toast.success(`SOS Alert sent successfully to ${primaryContact.name} (${primaryContact.phone})! Emergency services have been notified.`, {
        id: toastId,
        duration: 5000
      });

      // Add a notification to the log locally for immediate feedback
      const newNotif = {
        _id: data._id,
        title: "SOS Alert Triggered",
        message: `Emergency SOS alert manually triggered by user. Notified: ${primaryContact.name} (${primaryContact.phone}). Location coordinates broadcasted.`,
        type: "alert",
        created_at: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);

    } catch (err) {
      toast.error("Failed to send SOS alert. Please try calling emergency services directly.", { id: toastId });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRides.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedRides.size} selected rides?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/rides/history/bulk`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(Array.from(selectedRides))
      });

      if (res.ok) {
        toast.success("Selected rides deleted successfully!");
        fetchRides();
        setSelectedRides(new Set());
      } else {
        toast.error("Failed to delete selected rides");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const toggleRideSelection = (rideId: string) => {
    const newSelected = new Set(selectedRides);
    if (newSelected.has(rideId)) {
      newSelected.delete(rideId);
    } else {
      newSelected.add(rideId);
    }
    setSelectedRides(newSelected);
  };

  const toggleAllRides = () => {
    if (selectedRides.size === myRides.length && myRides.length > 0) {
      setSelectedRides(new Set());
    } else {
      setSelectedRides(new Set(myRides.map(r => r._id)));
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    localStorage.setItem("safego_user_name", profile.name);
    localStorage.setItem("safego_user_phone", profile.phone);
    localStorage.setItem("safego_user_email", profile.email);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch(`${API_URL}/api/users/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            full_name: profile.name,
            phone: profile.phone
          })
        });
        if (res.ok) {
          toast.success("Profile updated successfully!");
          fetchProfile();
          return;
        }
      }
      toast.success("Profile updated!");
    } catch (err) {
      toast.success("Profile updated locally");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!confirmDelete) return;

    const toastId = toast.loading("Deleting your account and data...");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to delete account from database");
      }

      // Clean up Firebase Auth user if authenticated
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }
      } catch (firebaseErr) {
        console.warn("Could not delete Firebase Auth user. Signing out instead.", firebaseErr);
        await signOut(auth);
      }

      // Clear local storage overrides
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("safego_accepted_rides");
      localStorage.removeItem("safego_declined_rides");

      toast.success("Account deleted successfully", { id: toastId });
      navigate("/signup");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during account deletion", { id: toastId });
    }
  };

  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone || isSubmittingContact) return;

    setIsSubmittingContact(true);
    const toastId = toast.loading(editIndex !== null ? "Updating contact..." : "Saving contact...");

    // Local state update for immediate feedback
    const tempId = editIndex !== null ? contacts[editIndex]._id : `temp-${Date.now()}`;
    const contactData = {
      _id: tempId,
      name: newContact.name,
      phone: newContact.phone,
      contact_relationship: newContact.relation,
      is_primary: newContact.isEmergency
    };

    if (editIndex === null) {
      const updated = [...contacts, contactData];
      setContacts(updated);
      localStorage.setItem("local_emergency_contacts", JSON.stringify(updated.filter(c => c._id.startsWith('temp-'))));
    } else {
      const updated = contacts.map((c, i) => i === editIndex ? { ...c, ...contactData } : c);
      setContacts(updated);
      localStorage.setItem("local_emergency_contacts", JSON.stringify(updated.filter(c => c._id.startsWith('temp-'))));
    }

    setNewContact({ name: "", relation: "", phone: "", isEmergency: false });
    setShowContactForm(false);
    setEditIndex(null);

    try {
      const token = localStorage.getItem("token");
      if (token) {
        let res;
        if (editIndex !== null) {
          res = await fetch(`${API_URL}/api/users/me/emergency-contacts/${tempId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: contactData.name,
              phone: contactData.phone,
              relationship: contactData.contact_relationship,
              is_primary: contactData.is_primary
            })
          });
        } else {
          res = await fetch(`${API_URL}/api/users/me/emergency-contacts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              name: contactData.name,
              phone: contactData.phone,
              relationship: contactData.contact_relationship,
              is_primary: contactData.is_primary
            })
          });
        }

        if (res.ok) {
          toast.success("Contact synced to cloud", { id: toastId });
          fetchContacts();
        } else {
          toast.success("Saved to local session", { id: toastId });
        }
      } else {
        toast.success("Saved to local session", { id: toastId });
      }
    } catch (err) {
      toast.success("Saved locally", { id: toastId });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleEditContact = (index: number) => {
    const c = contacts[index];
    setNewContact({
      name: c.name,
      relation: c.contact_relationship || "",
      phone: c.phone,
      isEmergency: c.is_primary
    });
    setEditIndex(index);
    setShowContactForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact?")) return;

    // Optimistic delete
    const updated = contacts.filter(c => c._id !== contactId);
    setContacts(updated);
    localStorage.setItem("local_emergency_contacts", JSON.stringify(updated.filter(c => c._id.startsWith('temp-'))));

    try {
      const token = localStorage.getItem("token");
      if (token && !contactId.startsWith('temp-')) {
        const res = await fetch(`${API_URL}/api/users/me/emergency-contacts/${contactId}`, {
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
      toast.error("Failed to delete contact");
    }
  };

  const { setVoiceEnabled } = useVoiceAssistant();

  const handleEnablePWD = () => {
    setVoiceEnabled(true);
    navigate("/pwd-mode");
  };

  if (!profile.name) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-lg font-bold tracking-wider animate-pulse">Synchronizing SafeGo User Node...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-background p-4 lg:flex">
        <SafeGoLogo size={22} className="px-2" />
        <div className="mt-6 flex items-center gap-3 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {profile?.name ? profile.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JD'}
          </div>
          <div>
            <p className="font-display text-sm font-bold">Good morning, {profile?.name ? profile.name.split(' ')[0] : 'User'}</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Passenger</span>
          </div>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === item.label
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              <item.icon size={18} /> {t(`dashboard.nav.${item.label.toLowerCase().replace(" ", "_")}`, item.label)}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-border/50">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center justify-center gap-3 rounded-xl bg-primary hover:bg-primary/90 px-3 py-3 text-sm font-bold text-primary-foreground transition-all shadow-[0_4px_12px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-[0.97] w-full"
          >
            <ArrowRight size={18} className="rotate-180" /> Back to Home
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-secondary p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">{t(`dashboard.tabs.${activeTab.toLowerCase().replace(" ", "_")}`, activeTab)}</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Small network preview */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Trusted Network</span>
              <div className="flex -space-x-2">
                {contacts.slice(0, 4).map((c, i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shadow-sm" title={c.name}>
                    {c?.name?.[0] || "?"}
                  </div>
                ))}
                {contacts.length > 4 && (
                  <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    +{contacts.length - 4}
                  </div>
                )}
                {contacts.length === 0 && (
                  <div className="text-[10px] text-muted-foreground italic">No contacts linked</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {activeTab === "Dashboard" && (
          <>
            {/* Outstanding Penalty Alert Banner */}
            {penaltyBalance > 0 && (
              <div className="mb-6 rounded-3xl border-2 border-rose-500/40 bg-rose-500/10 p-6 shadow-xl animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-rose-500 text-white shrink-0 shadow-lg shadow-rose-500/30">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-sm uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Outstanding Safety Policy Penalty
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                          Action Required
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                        A penalty fee has been charged to your account due to a reported SafeGo Pink Mode policy violation (Solo Male Booking / No Accompanying Female Traveler Present).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-rose-500/20 sm:pl-6">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount Due</span>
                      <p className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{penaltyBalance}</p>
                    </div>
                    <button
                      onClick={() => {
                        toast.success(`SafeGo Secure Pay gateway opened for ₹${penaltyBalance} penalty settlement.`);
                      }}
                      className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-xl shadow-rose-600/25 transition-all active:scale-95"
                    >
                      Pay & Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard icon={Car} value={String(myRides?.length || 0)} label="Total Rides" />
              <StatsCard icon={Shield} value="92%" label="Safety Score" iconColor="hsl(var(--teal))" />
              <StatsCard icon={Star} value="Pink" label="Most Used Mode" iconColor="hsl(var(--pink))" iconBg="hsl(var(--pink-light))" />
              <StatsCard icon={TrendingUp} value="8" label="This Month" />
            </div>


            {/* Quick book */}
            <div className="mt-8">
              <h3 className="font-display text-lg font-bold text-foreground">Quick Book</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {modes.map((m) => (
                  <Link key={m.id} to={`/book/${m.id}`} className="safego-card flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: m.lightBg }}>
                      <m.icon size={18} style={{ color: m.accent }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{m.name.replace(" Mode", "")}</p>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Safety Network */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Safety Trusted Network</h3>
                <button
                  onClick={() => setActiveTab("Emergency Contacts")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Manage All
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loadingContacts ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="safego-card h-[72px] animate-pulse bg-secondary/50"></div>
                  ))
                ) : contacts.length === 0 ? (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
                    No trusted contacts added.
                  </div>
                ) : (
                  contacts.slice(0, 5).map((contact, i) => (
                    <div key={i} className="safego-card flex items-center gap-3 p-4 hover:border-primary/30 transition-all">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {contact?.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-foreground truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.relation || "Trusted"} • {contact.phone}</p>
                      </div>
                      {contact.is_primary && (
                        <div className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" title="Primary SOS"></div>
                      )}
                    </div>
                  ))
                )}
                {contacts.length < 5 && (
                  <button
                    onClick={() => {
                      setActiveTab("Emergency Contacts");
                      setShowContactForm(true);
                    }}
                    className="safego-card flex items-center justify-center gap-2 p-4 border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all group"
                  >
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">Add New</span>
                  </button>
                )}
              </div>
            </div>

            {/* Recent rides */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Recent Rides</h3>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Driver</th>
                      <th className="px-4 py-3">Status & Cause</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!Array.isArray(myRides) || myRides.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                          No recent rides found.
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(myRides) ? myRides : []).slice(0, 5).map((r, i) => {
                        const isCancelled = r.status === "cancelled" || r.status === "failed";
                        const isViolation = isCancelled && Boolean(
                          r.is_penalty_applied ||
                          (r.cancel_reason && (
                            r.cancel_reason.toLowerCase().includes("violation") ||
                            r.cancel_reason.toLowerCase().includes("policy") ||
                            r.cancel_reason.toLowerCase().includes("male")
                          ))
                        );
                        const isOtpMismatch = isCancelled && Boolean(
                          r.cancel_reason && (
                            r.cancel_reason.toLowerCase().includes("otp") ||
                            r.cancel_reason.toLowerCase().includes("pin")
                          )
                        );

                        return (
                          <tr key={r._id || r.id || i} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/40" : ""} hover:bg-primary/5 transition-colors`}>
                            <td className="px-4 py-3 text-muted-foreground">{(Array.isArray(myRides) ? myRides.length : 0) - i}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                  r.mode === "Pink" || r.mode === "pink" ? "bg-pink-500/10 text-pink-600 border border-pink-500/20" : "bg-secondary text-foreground"
                                }`}>
                                  {r.mode || "Normal"}
                                </span>
                                {(r.is_split_active || r.split_status === "active" || r.is_split_allowed) && (
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                    <Users size={10} /> Split
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              <div className="flex flex-col max-w-[240px]">
                                <span className="font-semibold truncate">{r.route || `${(r.pickup_address || "Pickup").substring(0, 20)} → ${(r.destination_address || "Drop-off").substring(0, 20)}`}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Today"}
                            </td>
                            <td className="px-4 py-3 text-foreground text-xs font-semibold">
                              {r.driver?.user?.full_name || "Female Safety Pilot"}
                            </td>
                            <td className="px-4 py-3">
                              {!isCancelled ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 capitalize">
                                  <CheckCircle2 size={12} /> {r.status || "Completed"}
                                </span>
                              ) : isViolation ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                    <ShieldAlert size={11} /> Policy Violation
                                  </span>
                                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                    Solo Male • ₹{r.penalty_amount || 750} Fine
                                  </span>
                                </div>
                              ) : isOtpMismatch ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                    <Lock size={11} /> PIN Mismatch
                                  </span>
                                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                    3 Failed Attempts
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                    <X size={11} /> Cancelled
                                  </span>
                                  {r.cancel_reason && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={r.cancel_reason}>
                                      {r.cancel_reason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedRideModal(r)}
                                className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs font-bold transition-all shadow-sm"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab Specific Views */}
        {activeTab === "My Rides" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Ride History</h3>
                <p className="text-xs text-muted-foreground">Complete log of all requested, completed, and cancelled trips</p>
              </div>
              <button
                onClick={fetchRides}
                disabled={loadingRides}
                className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground flex items-center gap-2 transition-all shadow-sm"
              >
                <Loader2 size={13} className={loadingRides ? "animate-spin" : ""} /> Refresh Log
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Route Details</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Pilot / Driver</th>
                    <th className="px-4 py-3">Status & Specific Cause</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRides ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p>Loading your rides...</p>
                        </div>
                      </td>
                    </tr>
                  ) : (!Array.isArray(myRides) || myRides.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        No ride history found.
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(myRides) ? myRides : []).map((r, i) => {
                      const isCancelled = r.status === "cancelled" || r.status === "failed";
                      const isViolation = isCancelled && Boolean(
                        r.is_penalty_applied ||
                        (r.cancel_reason && (
                          r.cancel_reason.toLowerCase().includes("violation") ||
                          r.cancel_reason.toLowerCase().includes("policy") ||
                          r.cancel_reason.toLowerCase().includes("male")
                        ))
                      );
                      const isOtpMismatch = isCancelled && Boolean(
                        r.cancel_reason && (
                          r.cancel_reason.toLowerCase().includes("otp") ||
                          r.cancel_reason.toLowerCase().includes("pin")
                        )
                      );

                      return (
                        <tr key={r._id || r.id || i} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-secondary/40" : ""} hover:bg-primary/5 transition-colors`}>
                          <td className="px-4 py-3 text-muted-foreground">{(Array.isArray(myRides) ? myRides.length : 0) - i}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                r.mode === "Pink" || r.mode === "pink" ? "bg-pink-500/10 text-pink-600 border border-pink-500/20" : "bg-secondary text-foreground"
                              }`}>
                                {r.mode || "Normal"}
                              </span>
                              {(r.is_split_active || r.split_status === "active" || r.is_split_allowed) && (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                  <Users size={10} /> Split
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            <div className="flex flex-col max-w-[260px]">
                              <span className="text-[11px] text-muted-foreground font-semibold truncate">From: {r.pickup_address || "Pickup Point"}</span>
                              <span className="text-xs font-bold truncate">To: {r.destination_address || "Drop-off Point"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Today"}
                          </td>
                          <td className="px-4 py-3 text-foreground text-xs font-semibold">
                            {r.driver?.user?.full_name || "Female Safety Pilot"}
                          </td>
                          <td className="px-4 py-3">
                            {!isCancelled ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 capitalize">
                                <CheckCircle2 size={12} /> {r.status || "Completed"}
                              </span>
                            ) : isViolation ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-500/30">
                                  <ShieldAlert size={11} /> Policy Violation
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 leading-tight">
                                  Solo Male • ₹{r.penalty_amount || 750} Fine
                                </span>
                              </div>
                            ) : isOtpMismatch ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                  <Lock size={11} /> PIN Mismatch
                                </span>
                                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                  3 Failed Attempts
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                  <X size={11} /> Cancelled
                                </span>
                                {r.cancel_reason && (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={r.cancel_reason}>
                                    {r.cancel_reason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedRideModal(r)}
                              className="px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs font-bold transition-all shadow-sm"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Safety Reports" && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Safety Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display font-bold text-teal-500">92</span>
                  <span className="text-sm text-muted-foreground mb-1">/100</span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Alerts</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display font-bold text-primary">0</span>
                  <span className="text-sm text-muted-foreground mb-1">Current</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Check size={12} className="text-teal-500" /> System secured
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Reports</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display font-bold text-foreground">{notifications.length || 2}</span>
                  <span className="text-sm text-muted-foreground mb-1">Logged</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground italic">Last 30 days</p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary" /> Safety Trusted Network
              </h3>
              <div className="flex flex-wrap gap-4">
                {loadingContacts ? (
                  <div className="flex gap-4">
                    <div className="h-10 w-32 rounded-full bg-secondary animate-pulse"></div>
                    <div className="h-10 w-32 rounded-full bg-secondary animate-pulse"></div>
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full border border-border">No trusted contacts linked.</p>
                ) : (
                  contacts.map((contact, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-full py-2 pl-2 pr-4 shadow-sm hover:border-primary/30 transition-all">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {contact?.name?.[0] || "?"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground leading-tight">{contact.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{contact.phone}</span>
                      </div>
                      {contact.is_primary && (
                        <div className="ml-1 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]" title="Primary SOS"></div>
                      )}
                    </div>
                  ))
                )}
                <button
                  onClick={() => setActiveTab("Emergency Contacts")}
                  className="flex items-center gap-2 bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border hover:border-primary/30 rounded-full py-2 px-4 shadow-sm transition-all group"
                >
                  <Plus size={14} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Manage Network</span>
                </button>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Safety Operations Log</h3>
              <div className="grid gap-4">
                {loadingNotifications ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p>Fetching safety logs...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <>
                    {[
                      { id: "REP-0824", date: "Mar 8, 2025", type: "Route Deviation Alert", status: "Resolved", details: "Driver took an unmapped alternative route. SafeGo AI confirmed it was due to heavy traffic. Passenger arrived safely." },
                      { id: "REP-0811", date: "Mar 5, 2025", type: "SOS Setup Test", status: "Verified", details: "User successfully configured and tested the auto-SOS function for Pink Mode." }
                    ].map(report => (
                      <div key={report.id} className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600">
                              <Shield size={20} />
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{report.type}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{report.id}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">{report.date}</span>
                            <span className="inline-block mt-1 rounded-full bg-teal-500/10 text-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase">{report.status}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-13">{report.details}</p>
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            View full analysis
                          </button>
                          <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full border-2 border-background bg-primary/20"></div>
                            <div className="h-6 w-6 rounded-full border-2 border-background bg-teal-500/20"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notif.type === 'alert' ? 'bg-primary/10 text-primary' : 'bg-teal-500/10 text-teal-600'}`}>
                            <Shield size={20} />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{notif.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">NOTIF-{String(notif._id || notif.id || '0000').substring(0, 4).toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">{new Date(notif.created_at).toLocaleDateString()}</span>
                          <span className="inline-block mt-1 rounded-full bg-teal-500/10 text-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase">Log Recorded</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed pl-13">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Emergency Contacts" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Trusted Contacts</h3>
              <button
                onClick={() => {
                  if (showContactForm) {
                    setShowContactForm(false);
                    setEditIndex(null);
                    setNewContact({ name: "", relation: "", phone: "", isEmergency: false });
                  } else {
                    setShowContactForm(true);
                  }
                }}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110 transition-all"
              >
                {showContactForm ? "Cancel" : "Add Contact"}
              </button>
            </div>

            {showContactForm && (
              <form onSubmit={handleAddContact} className="mb-6 rounded-2xl border border-border bg-background p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
                <h4 className="font-semibold text-foreground mb-4">{editIndex !== null ? "Edit Contact" : "New Contact Form"}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={newContact.name}
                    onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Full Name"
                    className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={newContact.phone}
                    onChange={e => {
                      const val = e.target.value;
                      const sanitized = val.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '');
                      setNewContact({ ...newContact, phone: sanitized });
                    }}
                    placeholder="Phone Number"
                    className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <input
                    value={newContact.relation}
                    onChange={e => setNewContact({ ...newContact, relation: e.target.value })}
                    placeholder="Relation (e.g., Mother, Boss)"
                    className="rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 hover:bg-secondary cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={newContact.isEmergency}
                      onChange={e => setNewContact({ ...newContact, isEmergency: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-pink-500 focus:ring-pink-500 accent-pink-500"
                    />
                    <span className="text-sm font-medium text-foreground">Set as Primary SOS</span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmittingContact && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editIndex !== null ? "Update Contact" : "Save Contact"}
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {loadingContacts ? (
                <div className="sm:col-span-2 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading contacts...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="sm:col-span-2 py-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                  No trusted contacts added yet.
                </div>
              ) : (
                contacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-background p-5 shadow-sm">
                    <div>
                      <h4 className="font-semibold text-foreground">{contact.name}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{contact.contact_relationship} • {contact.phone}</p>
                      {contact.is_primary && <span className="inline-block rounded-full bg-pink-500/10 text-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Primary SOS</span>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleEditContact(i)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Edit</button>
                      <button onClick={() => handleDeleteContact(contact._id)} className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="mt-6 max-w-4xl space-y-8">
            <h3 className="font-display text-2xl font-bold text-foreground mb-6">Account Settings</h3>
            <div className="flex flex-col gap-8">
              {/* Profile Settings */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h4 className="flex items-center gap-2 text-lg font-bold text-foreground">
                    <User size={20} className="text-primary" /> Profile Info
                  </h4>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
                <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-6 border-b border-border pb-6">
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                      {profile?.name ? profile.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JD'}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-foreground text-lg">{profile.name || 'User'}</h5>
                      <p className="text-sm text-muted-foreground">Passenger Account</p>
                    </div>
                    <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors">Change Photo</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Full Name</label>
                      <input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Phone Number</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={profile.phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          const sanitized = val.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '');
                          setProfile({ ...profile, phone: sanitized });
                        }}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                        placeholder="+91 91234 56789"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Email Address</label>
                      <input
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Password & Security */}
              <section>
                <h4 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <Lock size={20} className="text-primary" /> Password & Security
                </h4>
                <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden divide-y divide-border">
                  <div className="p-5 hover:bg-secondary/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-semibold text-foreground">Change Password</h5>
                        <p className="text-sm text-muted-foreground">
                          {passwordSuccessMessage || "Last changed 3 months ago"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingPassword(!isChangingPassword);
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {isChangingPassword ? "Cancel" : "Update"}
                      </button>
                    </div>

                    {isChangingPassword && (
                      <form onSubmit={handleUpdatePassword} className="mt-4 pt-4 border-t border-border space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                              New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                              Confirm Password
                            </label>
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              required
                              minLength={6}
                              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-xs font-medium text-destructive">Passwords do not match</p>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={passwordLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {passwordLoading ? (
                              <>
                                <Loader2 size={16} className="animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Check size={16} /> Save New Password
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="rounded-xl border border-border bg-secondary/50 px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                  <div className="p-5 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center hover:bg-secondary/50 transition-colors">
                    <div>
                      <h5 className="font-semibold text-foreground">Two-Factor Authentication</h5>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </section>

              {/* Safety Preferences */}
              <section>
                <h4 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <Shield size={20} className="text-teal-500" /> Safety Preferences
                </h4>
                <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden divide-y divide-border">
                  {[
                    { title: "Automatic SOS Detection", desc: "AI will analyze sudden stops or deviations to trigger emergency protocols.", defaultOn: true },
                    { title: "Live Ride Sharing", desc: "Automatically share journey link with emergency contacts when ride begins.", defaultOn: true },
                    { title: "In-Ride Safety Alerts", desc: "Receive notifications about route risks or severe weather changes.", defaultOn: false }
                  ].map((pref, i) => (
                    <div key={i} className="p-5 flex justify-between items-center hover:bg-secondary/50 transition-colors">
                      <div className="pr-4">
                        <h5 className="font-semibold text-foreground">{pref.title}</h5>
                        <p className="text-sm text-muted-foreground">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" defaultChecked={pref.defaultOn} className="sr-only peer" />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              {/* Ride Preferences */}
              <section>
                <h4 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <Car size={20} className="text-primary" /> Default Ride Preferences
                </h4>
                <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                  <div className={`grid gap-6 ${defaultRideMode === "pink" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Default Ride Mode</label>
                      <select
                        value={defaultRideMode}
                        onChange={(e) => {
                          const mode = e.target.value;
                          setDefaultRideMode(mode);
                          localStorage.setItem("safego_default_ride_mode", mode);
                          toast.success(`Default ride mode set to ${mode.toUpperCase()}`);
                        }}
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary text-foreground"
                      >
                        <option value="normal">Normal Mode</option>
                        <option value="pink">Pink Mode</option>
                        <option value="pwd">PWD Mode</option>
                        <option value="elderly">Elderly Mode</option>
                      </select>
                    </div>

                    {defaultRideMode === "pink" && (
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-2 block font-bold">
                          Driver Preference (Pink Mode)
                        </label>
                        <select
                          value={pinkDriverPref}
                          onChange={(e) => {
                            const pref = e.target.value;
                            setPinkDriverPref(pref);
                            localStorage.setItem("safego_pink_driver_pref", pref);
                          }}
                          className="w-full rounded-xl border border-rose-200 dark:border-rose-900/40 bg-secondary px-4 py-2.5 text-sm outline-none focus:border-rose-500 text-foreground"
                        >
                          <option>Female Driver Required</option>
                          <option>Female Driver Preferred</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Accessibility & Vision Preferences */}
              <section>
                <h4 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                  <Accessibility size={20} className="text-amber-500" /> Accessibility & Vision
                </h4>
                <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden divide-y divide-border">
                  <div className="p-5 flex justify-between items-center hover:bg-secondary/50 transition-colors">
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-foreground">Senior / Elder Vision Mode</h5>
                        {isElderMode && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">Enlarges typography, emphasizes high contrast, and increases button touch targets for effortless reading.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isElderMode}
                        onChange={(e) => toggleElderMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              </section>

              {/* Account Actions */}
              <section className="mt-4 pt-8 border-t border-border">
                <h4 className="text-lg font-bold text-destructive mb-4">Danger Zone</h4>
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h5 className="font-semibold text-foreground">Delete Account</h5>
                    <p className="text-sm text-muted-foreground">Permanently delete your personal data, rides, and SOS contacts.</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="rounded-xl bg-destructive px-6 py-2.5 text-sm font-bold text-destructive-foreground hover:brightness-110 shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Safety Analysis Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute right-4 top-4 rounded-full bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                  <Shield size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground">{selectedReport.type || selectedReport.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReport.date || new Date(selectedReport.created_at).toLocaleDateString()} • {selectedReport.id || `NOTIF-${selectedReport._id.substring(0, 4).toUpperCase()}`}</p>
                </div>
              </div>

              <div className="grid gap-6">
                <section>
                  <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div> Incident Summary
                  </h4>
                  <div className="rounded-2xl bg-secondary/50 p-4 border border-border">
                    <p className="text-sm text-foreground leading-relaxed">{selectedReport.details || selectedReport.message}</p>
                  </div>
                </section>

                <div className="grid sm:grid-cols-2 gap-4">
                  <section>
                    <h4 className="text-sm font-bold text-foreground mb-2">AI Risk Assessment</h4>
                    <div className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Confidence Level</span>
                        <span className="text-xs font-bold text-teal-500">98.2%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: '98%' }}></div>
                      </div>
                      <p className="mt-3 text-[10px] text-muted-foreground">SafeGo AI verified deviation was traffic-related via real-time Google Maps integration.</p>
                    </div>
                  </section>
                  <section>
                    <h4 className="text-sm font-bold text-foreground mb-2">Status History</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-px bg-border relative">
                          <div className="absolute top-0 -left-[3px] h-2 w-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[11px] font-bold text-foreground leading-none">Alert Resolved</p>
                          <p className="text-[9px] text-muted-foreground">System auto-verified safety</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-px bg-border relative">
                          <div className="absolute top-0 -left-[3px] h-2 w-2 rounded-full bg-muted"></div>
                        </div>
                        <div className="pb-1">
                          <p className="text-[11px] font-bold text-muted-foreground leading-none">Incident Logged</p>
                          <p className="text-[9px] text-muted-foreground">Deviation detected at KM 12.4</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex gap-3 mt-4 pt-6 border-t border-border">
                  <button onClick={() => setSelectedReport(null)} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:brightness-110 transition-all">
                    Acknowledge Report
                  </button>
                  <button className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-foreground hover:bg-secondary transition-all">
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Ride Details & Policy Violation Breakdown Modal */}
        {selectedRideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    selectedRideModal.mode === "Pink" || selectedRideModal.mode === "pink"
                      ? "bg-pink-500/10 text-pink-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <Car size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display text-foreground">
                      {selectedRideModal.mode || "Normal"} Mode Trip Log
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedRideModal.created_at ? new Date(selectedRideModal.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Today"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRideModal(null)}
                  className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status & Cancellation Breakdown Banner */}
              {selectedRideModal.status === "cancelled" || selectedRideModal.status === "failed" ? (
                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border text-left space-y-2 ${
                    selectedRideModal.is_penalty_applied || (selectedRideModal.cancel_reason && selectedRideModal.cancel_reason.toLowerCase().includes("violation")) || (selectedRideModal.cancel_reason && selectedRideModal.cancel_reason.toLowerCase().includes("male"))
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                      : (selectedRideModal.cancel_reason && (selectedRideModal.cancel_reason.toLowerCase().includes("otp") || selectedRideModal.cancel_reason.toLowerCase().includes("pin")))
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                      : "bg-destructive/10 border-destructive/30 text-destructive-foreground"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Cancellation Incident Cause
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                        {selectedRideModal.is_penalty_applied ? "Policy Violation" : "Cancelled"}
                      </span>
                    </div>

                    <div className="font-bold text-sm text-foreground">
                      {selectedRideModal.penalty_reason || selectedRideModal.cancel_reason || "Driver cancelled the trip upon arrival."}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                      {selectedRideModal.is_penalty_applied || (selectedRideModal.cancel_reason && selectedRideModal.cancel_reason.toLowerCase().includes("male"))
                        ? "SafeGo Pink Mode is strictly reserved for female solo passengers or mixed groups with an accompanying verified female passenger. Violating bookings result in automatic cancellation and penalty."
                        : "Trip was cancelled and logged on the SafeGo security network."}
                    </p>
                  </div>

                  {/* Financial & Penalty Breakdown */}
                  {(selectedRideModal.is_penalty_applied || selectedRideModal.penalty_amount > 0) && (
                    <div className="p-4 rounded-2xl bg-secondary/60 border border-border/80 text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Violation Fine Charged:</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                          ₹{selectedRideModal.penalty_amount || 750}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Pilot Inconvenience Credit:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +₹{selectedRideModal.driver_compensation_amount || 200} (Credited to Pilot)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                  <span>Trip completed safely with SafeGo verified safety protocols.</span>
                </div>
              )}

              {/* Route & Driver Card */}
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-3 text-left text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Pickup Location</span>
                  <p className="text-foreground font-bold truncate">{selectedRideModal.pickup_address || "Pickup Location"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Destination</span>
                  <p className="text-foreground font-bold truncate">{selectedRideModal.destination_address || "Drop-off Location"}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-muted-foreground">
                  <span>Assigned Pilot:</span>
                  <span className="text-foreground font-bold">{selectedRideModal.driver?.user?.full_name || "Female Safety Pilot"}</span>
                </div>
                {selectedRideModal.fare_amount && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Estimated Fare:</span>
                    <span className="text-foreground font-bold">₹{selectedRideModal.fare_amount}</span>
                  </div>
                )}
              </div>

              {/* SafeGo Split Shared Ride Details */}
              {(selectedRideModal.is_split_active || selectedRideModal.split_status === "active" || selectedRideModal.split_discount_amount > 0 || selectedRideModal.is_split_allowed) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border-2 border-indigo-500/30 text-left space-y-2.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Users size={14} /> SafeGo Split • Shared Ride Savings
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      40% OFF Applied
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Original Direct Fare:</span>
                      <span className="line-through font-semibold">₹{selectedRideModal.original_fare || 100}.00</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1"><Sparkles size={12} /> SafeGo Split Discount:</span>
                      <span>-₹{selectedRideModal.split_discount_amount || 40}.00</span>
                    </div>
                    <div className="flex items-center justify-between text-foreground font-black text-sm pt-1 border-t border-border/50">
                      <span>Final Billed Fare:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">₹{selectedRideModal.discounted_fare || selectedRideModal.fare_amount || 60}.00</span>
                    </div>
                  </div>

                  {selectedRideModal.split_passenger_name && (
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Co-Rider:</span>
                      <span className="font-bold text-foreground flex items-center gap-1">
                        {selectedRideModal.split_passenger_name}
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified</span>
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <Leaf size={14} className="text-emerald-600 shrink-0" />
                    <span>Eco Impact: {selectedRideModal.co2_saved_kg || 1.8} kg CO₂ emissions prevented by carpooling!</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                {(selectedRideModal.status === "cancelled" && (selectedRideModal.mode === "Pink" || selectedRideModal.mode === "pink")) ? (
                  <button
                    onClick={() => {
                      const p = selectedRideModal.pickup_address || "";
                      const d = selectedRideModal.destination_address || "";
                      setSelectedRideModal(null);
                      navigate("/booking/normal", { state: { pickup: p, destination: d } });
                    }}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Car size={15} /> Switch & Book Normal Mode
                  </button>
                ) : null}
                <button
                  onClick={() => setSelectedRideModal(null)}
                  className="flex-1 py-3.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
