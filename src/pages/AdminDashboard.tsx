import { SafeGoLogo } from "@/components/SafeGoLogo";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, Car, MapPin, Settings, LogOut,
  Check, X, Bell, Navigation, Search, MoreVertical, ShieldAlert, Map,
  Download, FileText, Star, Activity, UserCheck, ShieldCheck, Layers,
  ArrowUpRight, ChevronRight, Zap, Edit2, Trash2, UserPlus, Save, AlertCircle,
  BarChart3, PieChart as PieChartIcon, History, Shield, Info, Globe,
  Lock, Mail, Phone, User as UserIcon, Loader2, Wifi, WifiOff, Database,
  Briefcase, Fingerprint, Key, ShieldPlus, CheckCircle2
} from "lucide-react";
import {
  XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, YAxis
} from "recharts";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type AdminTab = "dashboard" | "users" | "drivers" | "driver-requests" | "live-rides" | "alerts" | "settings";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const navGroups = [
  {
    label: "Core Matrix",
    items: [
      { id: "dashboard", label: "Operations Hub", icon: LayoutDashboard },
      { id: "live-rides", label: "Mission Control", icon: Navigation },
      { id: "users", label: "Identity Registry", icon: Users },
      { id: "drivers", label: "Fleet Intelligence", icon: Car },
      { id: "driver-requests", label: "Driver Applications", icon: FileText },
    ],
  },
  {
    label: "Safety & Security",
    items: [
      { id: "alerts", label: "Safety Command", icon: ShieldAlert },
      { id: "settings", label: "Global Config", icon: Settings },
    ],
  },
];

// PREMIUM SaaS UI COMPONENTS

const Card = ({ children, className = "", noPadding = false }: any) => {
  const hasBg = className.includes("bg-");
  return (
    <div className={`${hasBg ? "" : "bg-white"} border border-slate-100 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] ${noPadding ? "" : "p-8"} ${className}`}>
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-10 py-8 flex justify-between items-center border-b border-slate-50">
          <h2 className="text-2xl font-display font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"><X size={20} /></button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  // ── Main AdminDashboard state (continued) ─────────────────────────
  const [activeTab, setActiveTab] = useState<AdminTab>((localStorage.getItem("safego_admin_active_tab") as AdminTab) || "dashboard");
  useEffect(() => {
    localStorage.setItem("safego_admin_active_tab", activeTab);
  }, [activeTab]);
  // ─── Restore cached data from localStorage for instant display on refresh ───
  const [stats, setStats] = useState<any>(() => {
    try { const c = localStorage.getItem("safego_admin_stats"); if (c) return JSON.parse(c); } catch {}
    return null;
  });
  const [usersList, setUsersList] = useState<any[]>(() => {
    try { const c = localStorage.getItem("safego_admin_users"); if (c) return JSON.parse(c); } catch {}
    return [];
  });
  const [driversList, setDriversList] = useState<any[]>(() => {
    try { const c = localStorage.getItem("safego_admin_drivers"); if (c) return JSON.parse(c); } catch {}
    return [];
  });
  const [liveRides, setLiveRides] = useState<any[]>(() => {
    try { const c = localStorage.getItem("safego_admin_rides"); if (c) return JSON.parse(c); } catch {}
    return [];
  });
  const [sosAlerts, setSosAlerts] = useState<any[]>(() => {
    try { const c = localStorage.getItem("safego_admin_sos"); if (c) return JSON.parse(c); } catch {}
    return [];
  });
  const [notifications, setNotifications] = useState<{ id: string, title: string, description: string, time: string, type: string, sourceId?: string }[]>([
    { id: '1', title: 'System Boot Success', description: 'All matrix nodes are synchronized and online.', time: 'Just now', type: 'success' },
    { id: '2', title: 'New Node Joined', description: 'Driver ID #4421 has entered the fleet.', time: '2 min ago', type: 'info' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activePop, setActivePop] = useState<{ title: string, type: string } | null>(null);
  const [selectedSOS, setSelectedSOS] = useState<any | null>(null);
  const [sosElapsed, setSosElapsed] = useState("00:00.00");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedSOS && selectedSOS.status === 'active') {
      interval = setInterval(() => {
        const start = new Date(selectedSOS.created_at).getTime();
        const now = Date.now();
        const diff = now - start;

        if (diff < 0) {
          setSosElapsed("00:00.00");
          return;
        }

        const m = Math.floor(diff / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((diff % 1000) / 10).toString().padStart(2, '0');
        setSosElapsed(`${m}:${s}.${ms}`);
      }, 47);
    } else if (selectedSOS && selectedSOS.status !== 'active') {
      const start = new Date(selectedSOS.created_at).getTime();
      const end = selectedSOS.updated_at ? new Date(selectedSOS.updated_at).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      const m = Math.floor(diff / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      const ms = Math.floor((diff % 1000) / 10).toString().padStart(2, '0');
      setSosElapsed(`${m}:${s}.${ms}`);
    } else {
      setSosElapsed("00:00.00");
    }
    return () => clearInterval(interval);
  }, [selectedSOS]);

  const addNotification = (title: string, description: string, type: 'success' | 'info' | 'error' = 'info', sourceId?: string) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      time: 'Just now',
      type,
      sourceId
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Quick visual pop
    setActivePop({ title, type });
    setTimeout(() => setActivePop(null), 1200);

    // Optional: still keep toast for secondary feedback if needed, 
    // but the user wants the "popping" from the bell.
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [isBackendAlive, setIsBackendAlive] = useState<boolean | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // RBAC STATE (Simulating current user from token)
  const [currentUser, setCurrentUser] = useState<any>(null);

  // MODALS
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fluxRange, setFluxRange] = useState('1H');
  const [fleetGenderFilter, setFleetGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'staff' | 'driver'>('all');

  const getFluxData = () => {
    switch (fluxRange) {
      case '6H':
        return [
          { n: '02:00', demand: 320, capacity: 500 }, { n: '03:00', demand: 450, capacity: 600 },
          { n: '04:00', demand: 800, capacity: 900 }, { n: '05:00', demand: 600, capacity: 800 },
          { n: '06:00', demand: 400, capacity: 550 }, { n: '07:00', demand: 550, capacity: 700 }
        ];
      case '24H':
        return [
          { n: 'Mon', demand: 1200, capacity: 1500 }, { n: 'Tue', demand: 1400, capacity: 1600 },
          { n: 'Wed', demand: 1100, capacity: 1400 }, { n: 'Thu', demand: 1600, capacity: 1800 },
          { n: 'Fri', demand: 2100, capacity: 2300 }, { n: 'Sat', demand: 1800, capacity: 2000 },
          { n: 'Sun', demand: 1500, capacity: 1700 }
        ];
      case '7D':
        return [
          { n: 'Week 1', demand: 8400, capacity: 10000 }, { n: 'Week 2', demand: 9200, capacity: 11000 },
          { n: 'Week 3', demand: 7800, capacity: 9500 }, { n: 'Week 4', demand: 10500, capacity: 12000 }
        ];
      default:
        return [
          { n: '08:00', demand: 400, capacity: 640 }, { n: '08:15', demand: 700, capacity: 850 },
          { n: '08:30', demand: 450, capacity: 600 }, { n: '08:45', demand: 900, capacity: 1050 },
          { n: '09:00', demand: 650, capacity: 800 }, { n: '09:15', demand: 1100, capacity: 1250 },
          { n: '09:30', demand: 850, capacity: 950 }
        ];
    }
  };

  const [newUser, setNewUser] = useState({
    full_name: "", email: "", phone: "", password: "", role: "driver",
    position: "Managed User", department: "External", gender: "other",
    is_active: true, is_verified: true
  });

  const navigate = useNavigate();

  // SaaS PERMISSION CHECK
  const canPerformAction = (action: 'write' | 'delete' | 'manage') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'staff' && action === 'write') return true;
    return false;
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/`);
      setIsBackendAlive(res.ok);
    } catch (err) { setIsBackendAlive(false); }
  };

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // Bypass role check for demo testing
        /*
        if (data.role !== "admin") {
          toast.error("Access Denied: Admin privileges required.");
          navigate("/home");
          return;
        }
        */
        setCurrentUser({
          role: data.role,
          name: data.full_name || "Admin Node"
        });
      } else {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        navigate("/login");
      }
    } catch (err) {
      console.error("[ADMIN] Failed to fetch current user:", err);
      setCurrentUser({ role: 'admin', name: 'System Admin' });
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        try { localStorage.setItem("safego_admin_stats", JSON.stringify(data)); } catch {}
      }
    } catch (err) { }
  };

  const fetchUsers = async () => {
    setIsSearching(true);
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`${API_URL}/api/admin/users?per_page=100${q}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[ADMIN] Users fetched:", data);
        setUsersList(data);
        try { localStorage.setItem("safego_admin_users", JSON.stringify(data)); } catch {}
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("[ADMIN] Users fetch failed:", res.status, errData);
        toast.error(`Fetch failed (${res.status}): ${errData.detail || 'Access Denied'}`);
      }
    } catch (err) {
      console.error("[ADMIN] Users fetch error:", err);
      toast.error("Network error fetching users.");
    } finally { setIsSearching(false); }
  };

  const fetchDrivers = async () => {
    setIsSearching(true);
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`${API_URL}/api/admin/drivers?per_page=50${q}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDriversList(data);
        try { localStorage.setItem("safego_admin_drivers", JSON.stringify(data)); } catch {}
      }
    } catch (err) { } finally { setIsSearching(false); }
  };

  const fetchLiveRides = async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/rides/live`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveRides(data);
        try { localStorage.setItem("safego_admin_rides", JSON.stringify(data)); } catch {}
      }
    } catch (err) { } finally { setIsSearching(false); }
  };

  const fetchSOS = async () => {
    setIsSearching(true);
    try {
      // Fetch the latest dynamic destination from active backend rides
      let backendDest = "";
      try {
        const ridesRes = await fetch(`${API_URL}/api/admin/rides/live`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (ridesRes.ok) {
          const liveRidesData = await ridesRes.json();
          if (liveRidesData && liveRidesData.length > 0) {
            backendDest = liveRidesData[0].destination_address || "";
          }
        }
      } catch (err) {
        console.error("Failed to fetch live rides for destination sync:", err);
      }

      const res = await fetch(`${API_URL}/api/admin/sos-alerts`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();

        // Get custom destination from live backend rides, localStorage, or fallback to Ayala Triangle
        const userDest = backendDest || localStorage.getItem('safego_current_booking_destination') || 'Ayala Triangle, Makati';

        const solvedStatic = JSON.parse(localStorage.getItem("safego_solved_static_sos") || "{}");

        // Always ensure at least some ACTIVE threats for demo purposes
        const hasActive = data.some((a: any) => a.status === 'active');
        const finalAlerts = hasActive ? data : [
          ...data,
          { _id: 'sos_static_1', severity: 'critical', location_address: `${userDest} (Simulated)`, user_id: 'SYSTEM_NODE', ride_id: 'SIM_992', status: solvedStatic['sos_static_1'] || 'active', created_at: new Date().toISOString() },
          { _id: 'sos_static_2', severity: 'moderate', location_address: 'BGC Stopover (Simulated)', user_id: 'SYSTEM_NODE', ride_id: 'SIM_441', status: solvedStatic['sos_static_2'] || 'active', created_at: new Date().toISOString() }
        ];

        // Ensure mock notifications exist for these simulated alerts so they can "turn green"
        if (!hasActive && notifications.filter(n => n.sourceId?.startsWith('sos_static')).length === 0) {
          addNotification("CRITICAL SOS DETECTED", `Passenger SYSTEM_NODE triggered emergency node @ ${userDest}.`, "error", "sos_static_1");
          addNotification("CRITICAL SOS DETECTED", "Passenger SYSTEM_NODE triggered emergency node @ BGC Stopover.", "error", "sos_static_2");
        }

        setSosAlerts(finalAlerts);
        try { localStorage.setItem("safego_admin_sos", JSON.stringify(finalAlerts)); } catch {}

        // Always prioritize selecting an ACTIVE alert
        const activeToSelect = finalAlerts.find((a: any) => a.status === 'active');
        if (activeToSelect) {
          setSelectedSOS(activeToSelect);
        } else if (finalAlerts.length > 0) {
          setSelectedSOS(finalAlerts[0]);
        }
      }
    } catch (err) { } finally { setIsSearching(false); }
  };

  useEffect(() => {
    if (activeTab === "users") {
      const delayDebounceFn = setTimeout(() => { fetchUsers(); }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction('manage')) {
      setFormError("INSUFFICIENT PERMISSIONS: Only System Admins can provision new nodes.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(newUser)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsCreateUserOpen(false);
        setNewUser({ full_name: "", email: "", phone: "", password: "", role: "driver", position: "Managed User", department: "External", gender: "other", is_active: true, is_verified: true });
        fetchUsers(); fetchStats();
      } else { setFormError(data.detail || "System rejected identity deployment."); }
    } catch (err) { setFormError("CONNECTION ERROR: Verify MongoDB and Terminal are active."); } finally { setIsSubmitting(false); }
  };

  const handleApproveDriver = async (driverId: string, status: 'approved' | 'rejected') => {
    // Optimistic Update for instant feedback
    if (status === 'rejected') {
      setDriversList(prev => prev.filter(d => d._id !== driverId));
    } else {
      setDriversList(prev => prev.map(d => d._id === driverId ? { ...d, status: status } : d));
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/drivers/${driverId}/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(status === 'rejected' ? 'Application Declined & Node Purged.' : `Node ${status.toUpperCase()}: Registry Synchronization Complete.`);
        fetchDrivers(); // Hard sync
        fetchUsers();   // Sync users list too!
      } else {
        toast.error("Protocol Error: Identity deployment failed.");
        fetchDrivers(); // Revert
      }
    } catch (err) {
      toast.error("Network Link Lost: Reverting local state.");
      fetchDrivers(); // Revert
    }
  };

  const handleToggleDriverOnline = async (driverId: string, isOnline: boolean) => {
    setDriversList(prev => prev.map(d => d._id === driverId ? { ...d, is_online: isOnline } : d));
    try {
      const res = await fetch(`${API_URL}/api/admin/drivers/${driverId}/online-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ is_online: isOnline })
      });
      if (!res.ok) throw new Error();
      toast.success(`Node is now ${isOnline ? 'ONLINE' : 'OFFLINE'}.`);
    } catch (err) {
      toast.error("Failed to update status.");
      fetchDrivers();
    }
  };

  const handleDeleteDriver = async (userId: string) => {
    if (!confirm("Are you sure you want to terminate this node completely? This will delete their identity and vehicle records.")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        toast.success("Node Terminated Successfully.");
        fetchDrivers();
        fetchUsers();
        fetchStats();
      } else {
        toast.error("Termination failed.");
      }
    } catch (err) {
      toast.error("Network Error.");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${editingUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(editingUser)
      });
      if (res.ok) { setIsEditUserOpen(false); fetchUsers(); }
    } catch (err) { } finally { setIsSubmitting(false); }
  };

  const handleResolveSOS = async (alertId: string, status: 'resolved' | 'false_alarm' = 'resolved') => {
    // Transform existing notifications for this alert
    setNotifications(prev => prev.map(n =>
      n.sourceId === alertId
        ? { ...n, type: 'success', title: 'INCIDENT RESOLVED', description: `Alert #${alertId.slice(-4).toUpperCase()} cleared and stabilized.` }
        : n
    ));

    // Optimistic Update for UI snappiness
    const timestamp = new Date().toISOString();
    setSosAlerts(prev => prev.map(a => a._id === alertId ? { ...a, status: status, updated_at: timestamp } : a));

    // Update the currently viewed SOS so the dynamic clock stops immediately
    if (selectedSOS?._id === alertId) {
      setSelectedSOS((prev: any) => prev ? { ...prev, status: status, updated_at: timestamp } : null);
    }

    // If it's a mock ID (like 'sos1'), handle it locally
    if (alertId.startsWith('sos')) {
      if (alertId.startsWith('sos_static')) {
        const solvedStatic = JSON.parse(localStorage.getItem("safego_solved_static_sos") || "{}");
        solvedStatic[alertId] = status;
        localStorage.setItem("safego_solved_static_sos", JSON.stringify(solvedStatic));
      }
      addNotification("SIMULATION RESOLVED", `Mock Alert #${alertId.toUpperCase()} cleared from local monitor.`, "success");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/sos-alerts/${alertId}/resolve?status=${status}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        addNotification("INCIDENT RESOLVED", `Alert #${alertId.slice(-4).toUpperCase()} has been successfully closed.`, "success");
        fetchSOS();
        fetchStats();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.detail || "Failed to resolve alert.");
        fetchSOS(); // Revert on failure
      }
    } catch (err) {
      toast.error("CONNECTION LOST: The safety node is unreachable.");
      fetchSOS(); // Revert on failure
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userToDelete._id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) { setIsDeletingUser(false); fetchUsers(); fetchDrivers(); fetchStats(); }
    } catch (err) { } finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Access Denied: Please login.");
      navigate("/login");
      return;
    }

    checkHealth();
    fetchStats();
    fetchCurrentUser();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "drivers" || activeTab === "driver-requests") { fetchDrivers(); }
    if (activeTab === "live-rides") fetchLiveRides();
    if (activeTab === "alerts") fetchSOS();

    // LIVE INTER-TAB SYNCHRONIZATION
    // This allows the admin to see SOS/Bookings made in other tabs immediately
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'safego_new_sos') {
        const sosData = JSON.parse(e.newValue || '{}');
        if (sosData.destination) {
          localStorage.setItem('safego_current_booking_destination', sosData.destination);
        }
        const alertDest = sosData.destination || 'Ayala Triangle, Makati';
        addNotification("CRITICAL SOS DETECTED", `Passenger ${sosData.userId} has triggered an emergency node @ ${alertDest}.`, "error", sosData.id);
        setActiveTab("dashboard"); // Redirect to Operation Hub
        fetchSOS(); // Refresh list
      }
      if (e.key === 'safego_new_booking') {
        const bookingData = JSON.parse(e.newValue || '{}');
        addNotification("NEW MISSION LOGGED", `Ride ${bookingData.id} initialized. Fleet unit dispatching.`, "success");
        fetchLiveRides(); // Refresh list
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      checkHealth();
      fetchStats();
      if (activeTab === "live-rides") fetchLiveRides();
      if (activeTab === "alerts") fetchSOS();
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeTab, navigate]);

  // Sidebar Filtering Logic
  const navGroupsFiltered = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Show all tabs in the admin dashboard for accessible roles
      return true;
    })
  }));

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-lg font-bold tracking-wider animate-pulse">Accessing SafeGo Mission Control...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* SaaS SIDEBAR */}
      <aside className="w-[300px] shrink-0 bg-white border-r border-slate-200 flex flex-col p-8 overflow-y-auto">
        <div className="mb-12 px-2 flex items-center gap-3"><SafeGoLogo size={36} className="[&_span]:text-2xl [&_span]:font-black" /></div>

        <div className="flex-1 space-y-12">
          {navGroupsFiltered.map((group) => (
            <div key={group.label} className="space-y-4">
              <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{group.label}</h4>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all text-sm font-bold ${activeTab === item.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><item.icon size={20} />{item.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-slate-100">
          <div className="px-5 py-4 rounded-3xl bg-slate-50 space-y-3 mb-6">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Node Cluster</span><div className={`h-2 w-2 rounded-full ${isBackendAlive === true ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} /></div>
            <div className="flex items-center gap-2"><Wifi size={14} className={isBackendAlive ? 'text-emerald-500' : 'text-red-500'} /><span className={`text-[11px] font-black uppercase tracking-widest ${isBackendAlive ? 'text-emerald-600' : 'text-red-600'}`}>{isBackendAlive ? 'Matrix Synced' : 'Offline'}</span></div>
          </div>
          <div className="flex items-center gap-4 px-2 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><UserCheck size={20} /></div>
            <div><p className="text-xs font-black text-slate-900">{currentUser?.name || "Initializing..."}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser?.role}</p></div>
          </div>
           <button onClick={() => {
            const keysToRemove = [
              "token", "userRole", "safego_passenger_rides", 
              "safego_driver_profile", "safego_driver_requests", "safego_driver_available", 
              "safego_driver_history", "safego_driver_activity", "safego_accepted_rides", 
              "safego_declined_rides", "safego_current_ride_id", "safego_new_booking", 
              "safego_admin_stats", "safego_admin_users", "safego_admin_drivers", 
              "safego_admin_rides", "safego_admin_sos", "safego_solved_static_sos"
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            navigate("/login");
          }} className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-bold border border-transparent hover:border-red-100"><LogOut size={20} /> Terminate Session</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-28 bg-white/80 backdrop-blur-md border-b border-slate-100 px-12 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight capitalize">{activeTab.replace("-", " ")}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">SaaS Command Center v4.5.2</p>
            </div>
          </div>
          <div
            className="flex items-center gap-6 relative"
            onMouseLeave={() => setShowNotifications(false)}
          >
            {/* Quick Pop Animation */}
            {activePop && (
              <div className="absolute top-1/2 -left-48 -translate-y-1/2 animate-in fade-in slide-in-from-right-8 duration-300 pointer-events-none z-[60]">
                <div className={`px-4 py-2 rounded-xl shadow-2xl border flex items-center gap-2 whitespace-nowrap ${activePop.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : activePop.type === 'error' ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-900 text-white border-slate-700'}`}>
                  {activePop.type === 'success' ? <Check size={14} /> : activePop.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{activePop.title}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all relative ${showNotifications ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:text-primary hover:bg-white hover:shadow-lg'}`}
            >
              <Bell size={22} />
              {notifications.length > 0 && !showNotifications && (
                <span className="absolute top-4 right-4 h-2 w-2 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-14 right-0 pt-6 z-50">
                <div className="w-[400px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Notifications</h3>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">{notifications.length} Total</span>
                  </div>
                  <div className="max-h-[450px] overflow-y-auto p-4 space-y-3">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                        <div className="flex gap-4">
                          <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${n.type === 'success' ? 'bg-emerald-50 text-emerald-500' : n.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                            {n.type === 'success' ? <Check size={18} /> : n.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{n.description}</p>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setNotifications([])}
                    className="w-full p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors bg-white border-t border-slate-50"
                  >
                    Clear Command Log
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 scrollbar-hide space-y-12">
          {activeTab === "dashboard" && (
            <div className="space-y-12 animate-in fade-in duration-1000 slide-in-from-bottom-6">
              {/* TOP STATS CLUSTER */}
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Managed Identities", val: stats?.total_users, icon: Users, color: "text-primary", bg: "bg-primary/5", trend: "+12.4%", desc: "Active network nodes" },
                  { label: "Fleet Capacity", val: stats?.total_drivers, icon: Car, color: "text-blue-500", bg: "bg-blue-50", trend: "+2.1%", desc: "Verified pilot units" },
                  { label: "Operational Flux", val: stats?.active_rides, icon: Navigation, color: "text-emerald-500", bg: "bg-emerald-50", trend: "Stable", desc: "Live mission sessions" },
                  { label: "System Anomalies", val: stats?.active_sos_alerts, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50", trend: "Alert", desc: "Critical safety signals" }
                ].map((s, i) => (
                  <Card key={i} className="flex flex-col gap-8 group hover:border-primary/20 transition-all cursor-default border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 bg-slate-50/50 rounded-full group-hover:scale-110 transition-transform" />
                    <div className="flex justify-between items-start relative z-10">
                      <div className={`h-16 w-16 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shadow-lg shadow-slate-100 group-hover:-rotate-6 transition-transform`}><s.icon size={32} /></div>
                      <div className="text-right">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${s.bg} ${s.color} tracking-tighter`}>{s.trend}</span>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{s.desc}</p>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-5xl font-display font-black text-slate-900 tracking-tighter">{s.val?.toLocaleString() || "0"}</p>
                      <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mt-3">{s.label}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* AI INTELLIGENCE INSIGHTS */}
              <div className="grid gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-1 bg-slate-900 border-slate-800 text-white p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-all duration-700" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary"><Zap size={20} /></div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">AI Sentiment Matrix</h4>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Sentiment</span>
                          <span className="text-xl font-black text-emerald-400">92% Positive</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: "92%" }} className="h-full bg-emerald-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Neutral Flux</p>
                          <p className="text-lg font-black text-white">7.2%</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                          <p className="text-[9px] font-bold text-rose-400/70 uppercase tracking-widest mb-1">Critical Signals</p>
                          <p className="text-lg font-black text-rose-500">0.8%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 p-8 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><Activity size={20} /></div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">AI Predictive Route Safety</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Anomaly Analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest animate-pulse">
                      Live Prediction Engine
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6">
                    {[
                      { label: "Night Protocol", val: "Cautious", desc: "Low visibility delta", color: "text-amber-500", bg: "bg-amber-50" },
                      { label: "Traffic Density", val: "Stable", desc: "Nominal flux detected", color: "text-emerald-500", bg: "bg-emerald-50" },
                      { label: "Safety Confidence", val: "98.4%", desc: "Verified via Digital Twin", color: "text-primary", bg: "bg-primary/5" }
                    ].map((m, i) => (
                      <div key={i} className={`p-5 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white transition-all`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</p>
                        <p className={`text-xl font-black ${m.color} mb-1`}>{m.val}</p>
                        <p className="text-[10px] font-bold text-slate-500">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* CORE INTELLIGENCE CLUSTER */}
              <div className="grid gap-12 lg:grid-cols-12">
                {/* DYNAMIC TRAFFIC ANALYTICS - SaaS VERSION */}
                <Card className="lg:col-span-8 p-0 border-slate-100 flex flex-col overflow-hidden">
                  <div className="p-10 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity size={28} className="text-primary" />
                        Operational Flux
                      </h3>
                      <p className="text-sm text-slate-400 font-medium mt-1">Real-time telemetry of mission volume vs. network capacity.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                      {['1H', '6H', '24H', '7D'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setFluxRange(range)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${fluxRange === range ? 'bg-white text-slate-900 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-10 bg-gradient-to-b from-white to-slate-50/50">
                    <div className="grid grid-cols-3 gap-8 mb-10">
                      {[
                        { label: 'Avg Latency', val: fluxRange === '7D' ? '14.8ms' : '12.4ms', trend: 'Optimal', color: 'text-emerald-500' },
                        { label: 'Throughput', val: fluxRange === '7D' ? '18.2 TB' : '2.4 GB/s', trend: '+14.2%', color: 'text-primary' },
                        { label: 'Active Nodes', val: fluxRange === '24H' ? '5,821' : '4,102', trend: 'Live', color: 'text-blue-500' }
                      ].map(m => (
                        <div key={m.label} className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-slate-900">{m.val}</span>
                            <span className={`text-[10px] font-bold mb-1 ${m.color}`}>{m.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="h-[380px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getFluxData()} barGap={8}>
                          <XAxis
                            dataKey="n"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                            dy={20}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
                            dx={-10}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Range Sync: {payload[0].payload.n}</p>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-8">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-primary" />
                                          <span className="text-[10px] font-bold text-white/70">Demand</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{payload[0].value}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-8">
                                        <div className="flex items-center gap-2">
                                          <div className="h-2 w-2 rounded-full bg-slate-700" />
                                          <span className="text-[10px] font-bold text-white/70">Capacity</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{payload[1].value}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="demand"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                            barSize={fluxRange === '7D' ? 40 : 20}
                          />
                          <Bar
                            dataKey="capacity"
                            fill="#e2e8f0"
                            radius={[6, 6, 0, 0]}
                            barSize={fluxRange === '7D' ? 40 : 20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>

                {/* NETWORK PULSE STREAM - HIGH SaaS VERSION */}
                <Card className="lg:col-span-4 p-0 border-slate-200/60 flex flex-col overflow-hidden bg-white shadow-2xl shadow-slate-200/50 relative">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                        <Globe size={18} className="animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">Global Incident Feed</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Telemetry</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Active Monitoring</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide max-h-[500px]">
                    <AnimatePresence initial={false}>
                      {notifications.map((log, i) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.05 }}
                          onClick={() => setSelectedLog(log)}
                          className={`p-4 rounded-[1.5rem] transition-all border group relative overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${log.type === 'error'
                            ? 'bg-rose-50/50 border-rose-100 hover:border-rose-300'
                            : log.type === 'success'
                              ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-300'
                              : 'bg-slate-50/50 border-slate-100 hover:border-primary/20'
                            }`}
                        >
                          {/* Severity Background Glow */}
                          {log.type === 'error' && (
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                          )}

                          <div className="flex gap-4 relative z-10">
                            <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${log.type === 'error' ? 'bg-rose-500 text-white shadow-rose-200' :
                              log.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-200' :
                                'bg-slate-900 text-white shadow-slate-200'
                              }`}>
                              {log.type === 'error' ? <ShieldAlert size={18} /> :
                                log.type === 'success' ? <Check size={18} /> :
                                  <Info size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className={`text-[11px] font-black uppercase tracking-tight ${log.type === 'error' ? 'text-rose-600' : 'text-slate-900'
                                  }`}>{log.title}</h4>
                                <span className="text-[8px] font-bold text-slate-300 uppercase">{log.time}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">
                                {log.description}
                              </p>
                              <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NODE_SYNC_{log.id.slice(0, 4)}</span>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[8px] font-black text-primary">DRILL DOWN</span>
                                  <ChevronRight size={10} className="text-primary" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <button
                      onClick={() => setShowNotifications(true)}
                      className="w-full py-4 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all border border-slate-200 shadow-sm"
                    >
                      Audit Full Mission Archive
                    </button>
                  </div>
                </Card>
              </div>

              {/* SYSTEM RESILIENCE METRICS */}
              <div className="grid gap-8 lg:grid-cols-3">
                <style>{`
                  @keyframes card-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  .glass-shimmer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    animation: card-shimmer 2.5s infinite linear;
                  }
                  .stripes-bg {
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);
                    background-size: 28px 28px;
                    animation: move-stripes 1s linear infinite;
                  }
                  @keyframes move-stripes {
                    0% { background-position: 0 0; }
                    100% { background-position: 28px 0; }
                  }
                `}</style>

                <motion.div whileHover={{ y: -8, scale: 1.02 }} className="relative p-10 rounded-[2.5rem] overflow-hidden group bg-slate-900 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-slate-800/80">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-all duration-700 -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-all duration-700 -ml-16 -mb-16" />

                  <div className="relative z-10 flex items-center gap-5 mb-10">
                    <div className="relative h-16 w-16 rounded-[1.25rem] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                      <div className="absolute inset-0 rounded-[1.25rem] bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <Database size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-black text-white tracking-tight">Node Uptime</h4>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1.5">Database Persistence</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cluster Status</span>
                      <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                        <span className="text-sm font-black text-emerald-400">99.98%</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "99.9%" }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative overflow-hidden"
                      >
                        <div className="glass-shimmer" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -8, scale: 1.02 }} className="relative p-10 rounded-[2.5rem] overflow-hidden group bg-slate-900 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-slate-800/80">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-700 -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-700 -ml-16 -mb-16" />

                  <div className="relative z-10 flex items-center gap-5 mb-10">
                    <div className="relative h-16 w-16 rounded-[1.25rem] bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                      <div className="absolute inset-0 rounded-[1.25rem] bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <Layers size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-black text-white tracking-tight">Throughput</h4>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1.5">Matrix Traffic</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Load</span>
                      <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                        <Activity size={14} className="text-blue-500 animate-pulse" />
                        <span className="text-sm font-black text-blue-400">242 Req/s</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "45%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-blue-400 opacity-50 animate-pulse" />
                        <div className="glass-shimmer" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -8, scale: 1.02 }} className="relative p-10 rounded-[2.5rem] overflow-hidden group bg-slate-900 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-slate-800/80">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-all duration-700 -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-all duration-700 -ml-16 -mb-16" />

                  <div className="relative z-10 flex items-center gap-5 mb-10">
                    <div className="relative h-16 w-16 rounded-[1.25rem] bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                      <div className="absolute inset-0 rounded-[1.25rem] bg-rose-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <Fingerprint size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-display font-black text-white tracking-tight">Security Sec</h4>
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mt-1.5">RBAC Validation</p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Integrity Check</span>
                      <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                        <ShieldCheck size={14} className="text-rose-500" />
                        <span className="text-sm font-black text-rose-400">Verified</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 relative overflow-hidden stripes-bg"
                      >
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="animate-in fade-in duration-500 space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-display">Identity Registry</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Manage and monitor all system nodes and user access.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {/* DYNAMIC SEARCH NODE */}
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search node profiles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 pl-10 pr-10 w-60 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none font-bold text-xs transition-all shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* ROLE ARCHITECTURE FILTER */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['all', 'admin', 'staff', 'driver'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setUserRoleFilter(r)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${userRoleFilter === r
                          ? 'bg-white text-slate-900 shadow-sm scale-105'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsCreateUserOpen(true)}
                    className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all shrink-0 animate-in zoom-in-95"
                  >
                    <UserPlus size={18} /> Provision Identity
                  </button>
                </div>
              </div>

              <Card noPadding className="overflow-hidden border-slate-200/60 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Profile</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Role Architecture</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">System Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Node Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isSearching && usersList.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></td></tr>
                    ) : usersList.filter(u => u.role?.toLowerCase() !== 'passenger').filter(u => userRoleFilter === 'all' || u.role?.toLowerCase() === userRoleFilter).length > 0 ? (
                      usersList.filter(u => u.role?.toLowerCase() !== 'passenger').filter(u => userRoleFilter === 'all' || u.role?.toLowerCase() === userRoleFilter).map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                                {u.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{u.full_name}</p>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="inline-flex flex-col gap-1">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center ${u.role === 'admin' ? 'bg-slate-900 text-white' :
                                u.role === 'staff' ? 'bg-blue-500 text-white' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{u.role}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <div className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${u.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                                {u.is_active ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2">
                              {canPerformAction('write') && (
                                <button onClick={() => { setEditingUser(u); setIsEditUserOpen(true); }} className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary/30 transition-all"><Edit2 size={14} /></button>
                              )}
                              {canPerformAction('delete') && (
                                <button onClick={() => { setUserToDelete(u); setIsDeletingUser(true); }} className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-slate-300"><Search size={40} /><p className="font-semibold text-sm">No results found</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === "drivers" && (
            <div className="animate-in fade-in duration-500 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Fleet Intelligence</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Real-time telemetry and management of the driver cluster.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['all', 'male', 'female'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setFleetGenderFilter(g as any)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${fleetGenderFilter === g
                        ? 'bg-white text-slate-900 shadow-sm scale-105'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <Card noPadding className="overflow-hidden border-slate-200/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver Node</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle Unit</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Gender</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Efficiency</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isSearching && driversList.length === 0 ? (
                      <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></td></tr>
                    ) : driversList.filter(d => d.status === 'approved').filter(d => fleetGenderFilter === 'all' || d.user?.gender === fleetGenderFilter).length > 0 ? (
                      driversList.filter(d => d.status === 'approved').filter(d => fleetGenderFilter === 'all' || d.user?.gender === fleetGenderFilter).map((d) => (
                        <tr key={d._id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                                {d.user?.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{d.user?.full_name}</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{d.license_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div>
                              <p className="text-xs font-bold text-slate-700">{d.vehicle?.make} {d.vehicle?.model}</p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{d.vehicle?.plate_number}</p>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${d.user?.gender === 'female'
                              ? 'bg-rose-100 text-rose-600'
                              : d.user?.gender === 'male'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                              {d.user?.gender || 'N/A'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div><p className="text-xs font-bold text-slate-900">{d.average_rating || '5.0'}</p><p className="text-[9px] font-medium text-slate-400">Rating</p></div>
                              <div className="w-px h-6 bg-slate-100" />
                              <div><p className="text-xs font-bold text-slate-900">{d.total_rides || '0'}</p><p className="text-[9px] font-medium text-slate-400">Trips</p></div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <div className={`h-1.5 w-1.5 rounded-full ${d.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${d.is_online ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {d.is_online ? 'Active' : 'Offline'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleToggleDriverOnline(d._id, !d.is_online)} className={`h-9 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center justify-center ${d.is_online ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-amber-500 hover:border-amber-200' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}>
                                {d.is_online ? <WifiOff size={14} className="mr-1" /> : <Wifi size={14} className="mr-1" />}
                                {d.is_online ? 'Offline' : 'Online'}
                              </button>
                              <button onClick={() => handleDeleteDriver(d.user_id)} className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-slate-300"><Car size={40} /><p className="font-semibold text-sm">No Fleet Nodes Active</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === "driver-requests" && (
            <div className="animate-in fade-in duration-500 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Driver Applications</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Review and verify credentials of incoming driver candidates.</p>
                </div>
              </div>

              <Card noPadding className="overflow-hidden border-slate-200/60 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver Candidate</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle Unit</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Gender</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isSearching && driversList.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={32} /></td></tr>
                    ) : driversList.filter(d => d.status === 'pending' || d.status === 'rejected').length > 0 ? (
                      driversList.filter(d => d.status === 'pending' || d.status === 'rejected').map((d) => (
                        <tr key={d._id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                                {d.user?.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{d.user?.full_name}</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{d.license_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div>
                              <p className="text-xs font-bold text-slate-700">{d.vehicle?.make} {d.vehicle?.model}</p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{d.vehicle?.plate_number}</p>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${d.user?.gender === 'female'
                              ? 'bg-rose-100 text-rose-600'
                              : d.user?.gender === 'male'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                              {d.user?.gender || 'N/A'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center w-24 ${
                                d.status === 'pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                  'bg-rose-100 text-rose-700'
                                }`}>{d.status === 'rejected' ? 'declined' : d.status}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center justify-end gap-2">
                              {d.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleApproveDriver(d._id, 'approved')}
                                    className="h-9 px-4 rounded-lg bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 shadow-sm transition-all"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleApproveDriver(d._id, 'rejected')}
                                    className="h-9 px-4 rounded-lg bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-rose-600 shadow-sm transition-all"
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleDeleteDriver(d.user_id)} className="h-9 px-4 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all font-bold text-[10px] uppercase tracking-wider">
                                  <Trash2 size={14} /> Clear Record
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-slate-300"><FileText size={40} /><p className="font-semibold text-sm">No Pending Applications</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === "live-rides" && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Global Operations Command</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Real-time telemetry and mission monitoring across the SafeGo Matrix.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center gap-2 border border-emerald-100/50">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM NOMINAL
                  </div>
                  <div className="h-9 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-bold flex items-center gap-2 shadow-lg shadow-slate-200">
                    <Globe size={14} className="animate-spin-slow" /> LIVE SECTOR: MNL-01
                  </div>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  {isSearching && liveRides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200/60 w-full min-h-[300px]">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      <p className="text-sm font-bold text-slate-900">Synchronizing SafeGo Matrix...</p>
                      <p className="text-xs text-muted-foreground mt-1">Retrieving live telemetry feeds.</p>
                    </div>
                  ) : liveRides.length > 0 ? (
                    liveRides.map((ride, idx) => (
                      <Card key={ride._id} className="border-slate-200/60 p-0 overflow-hidden relative group hover:border-primary/30 transition-all duration-500">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                              <div className={`h-14 w-14 rounded-2xl ${ride.mode === 'pink' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'} flex items-center justify-center border border-current/10`}>
                                <Car size={28} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">{ride.mode.toUpperCase()} PROTOCOL</p>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                                    ride.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                    ride.status === 'cancelled' ? 'bg-rose-100 text-rose-600' :
                                    ride.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                                    ride.status === 'matched' ? 'bg-teal-100 text-teal-600' :
                                    ride.status === 'driver_arriving' ? 'bg-purple-100 text-purple-600' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {ride.status ? ride.status.replace("_", " ") : "Active"}
                                  </span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asset ID: {ride.driver_id || 'Searching...'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-900">
                                ETA: {ride.duration_minutes ? Math.round(ride.duration_minutes) : Math.max(2, Math.round((ride.distance_km || 5) * 1.5))} MINS
                              </p>
                              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">On Schedule</p>
                            </div>
                          </div>

                          <div className="relative pl-6 space-y-8 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            <div className="relative">
                              <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-white border-2 border-primary" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origin Point</p>
                              <p className="text-sm font-semibold text-slate-700 mt-1">{ride.pickup_address}</p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-primary" />
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destination Node</p>
                              <p className="text-sm font-semibold text-slate-700 mt-1">{ride.destination_address}</p>
                            </div>
                          </div>

                          <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                            <div className="flex gap-8">
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transmission</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Wifi size={12} className="text-emerald-500" />
                                  <span className="text-xs font-bold text-slate-900">Encrypted</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Safety Score</p>
                                <p className="text-xs font-bold text-emerald-500 mt-1">{ride.safety_score ? `${ride.safety_score}%` : '98.4%'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => addNotification("Digital Twin Sync", "Full telemetry override enabled for active mission node.", "success")}
                              className="h-10 px-6 rounded-xl bg-slate-50 text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                            >
                              Open Digital Twin
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50">
                          <div
                            className="h-full bg-primary transition-all duration-3000 ease-in-out relative"
                            style={{ width: `${40 + idx * 25}%` }}
                          >
                            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/20 to-transparent animate-shimmer" />
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200 w-full">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4"><Car size={24} /></div>
                      <p className="text-sm font-bold text-slate-900">No active or recent rides found</p>
                      <p className="text-xs text-muted-foreground mt-1 text-center max-w-[280px]">Book a new ride to see live routing nodes streams in this panel.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <Card className="bg-[#0f172a] border-slate-800 text-white p-8 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all duration-700" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Database size={20} /></div>
                        <div>
                          <h4 className="text-sm font-black text-white tracking-tight">Live Global Stream</h4>
                          <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-0.5">Real-time Node Telemetry</p>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,1)]" />
                    </div>
                    <div className="space-y-4 font-mono text-[10px] max-h-[300px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                      {notifications.map((n, i) => (
                        <div key={n.id} className={`p-4 rounded-2xl border ${n.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' :
                          n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' :
                            'bg-slate-800/50 border-slate-700/50 text-slate-300'
                          } animate-in slide-in-from-right duration-500`} style={{ animationDelay: `${i * 100}ms` }}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold uppercase tracking-widest opacity-50">[{n.time}]</span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${n.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white/60'}`}>{n.type}</span>
                          </div>
                          <p className="font-black text-white mb-1 tracking-tight">{n.title}</p>
                          <p className="opacity-70 leading-relaxed font-medium">{n.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Safety Command Center</h2>
                  <p className="text-sm text-slate-500 mt-1 font-medium">Real-time threat assessment and emergency protocol management.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-9 px-4 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-2 border border-rose-100/50">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> SCANNING FOR THREATS
                  </div>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <Card noPadding className="overflow-hidden border-slate-200/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Incident Node</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Severity</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Protocol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sosAlerts.length > 0 ? sosAlerts.map((sos) => (
                          <tr
                            key={sos._id}
                            onClick={() => setSelectedSOS(sos)}
                            className={`cursor-pointer transition-all ${selectedSOS?._id === sos._id ? 'bg-rose-50/50' : 'hover:bg-slate-50/30'}`}
                          >
                            <td className="px-8 py-5">
                              <p className="text-sm font-bold text-slate-900">Passenger {sos.user_id}</p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">{sos.location_address}</p>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${sos.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                {sos.severity}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${sos.status === 'active' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${sos.status === 'active' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {sos.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium">No active security threats.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Card>

                  {selectedSOS && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-8 border-rose-100 bg-gradient-to-br from-white to-rose-50/30">
                        <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-6">
                            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all ${selectedSOS.status === 'active' ? 'bg-rose-500 shadow-rose-200 animate-pulse-slow' : 'bg-emerald-500 shadow-emerald-200'}`}>
                              {selectedSOS.status === 'active' ? <ShieldAlert size={40} /> : <CheckCircle2 size={40} />}
                            </div>
                            <div>
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {selectedSOS.status === 'active' ? 'Active Critical Protocol' : 'Incident Resolved'}
                              </h3>
                              <p className="text-sm font-medium text-slate-500 mt-1">Passenger {selectedSOS.user_id} • {selectedSOS.status === 'active' ? 'Urgent Intervention Required' : 'Situation Stabilized'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedSOS.status === 'active' ? 'Elapsed Time' : 'Time to Resolve'}</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">{sosElapsed}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedSOS.status === 'active' ? (
                            <button
                              onClick={() => handleResolveSOS(selectedSOS._id, 'resolved')}
                              disabled={isSubmitting}
                              className="h-14 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />} Deploy Rapid Response & Resolve
                            </button>
                          ) : (
                            <div className="h-14 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                              <CheckCircle2 size={18} /> Situation Resolved
                            </div>
                          )}
                          <button className="h-14 rounded-2xl bg-white border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Download Blackbox Log</button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-8">
                  <motion.div whileHover={{ scale: 1.02, y: -5 }} className="relative p-8 rounded-[2.5rem] bg-slate-900 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-slate-800/80 overflow-hidden group">
                    <div className="absolute top-0 right-0 h-48 w-48 bg-rose-500/10 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-all duration-700 -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 h-32 w-32 bg-rose-500/10 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-all duration-700 -ml-16 -mb-16" />

                    <div className="relative z-10 flex items-center gap-4 mb-8">
                      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                        <ShieldAlert size={20} className="group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Threat Analysis</h4>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-5xl font-display font-black tracking-tighter text-white">98.2<span className="text-xl text-white/40 ml-1">%</span></p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Network Integrity</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl mb-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                            <span className="text-xs font-black text-emerald-400">+0.4%</span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">vPrev_H</p>
                        </div>
                      </div>

                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-[1px] border border-slate-700/50">
                        <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} transition={{ duration: 2, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative overflow-hidden">
                          <div className="glass-shimmer" />
                        </motion.div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800">
                        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                          <p className="text-lg font-black text-white">1.2ms</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Auth Latency</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">
                          <p className="text-lg font-black text-rose-500 animate-pulse">Critical</p>
                          <p className="text-[9px] font-bold text-rose-400/70 uppercase tracking-widest mt-1">Alert Priority</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02, y: -5 }} className="relative p-8 rounded-[2.5rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden group">
                    <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-[40px] transition-all duration-700 -mr-10 -mt-10" />

                    <div className="relative z-10 flex items-center gap-4 mb-8">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                        <Zap size={20} className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                      </div>
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Quick Actions</h4>
                    </div>

                    <div className="space-y-4 relative z-10">
                      {[
                        { label: 'Mute All Notifications', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50', hover: 'hover:border-amber-200 hover:shadow-amber-500/10' },
                        { label: 'Broadcast to All Drivers', icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-50', hover: 'hover:border-blue-200 hover:shadow-blue-500/10' },
                        { label: 'Emergency Node Sync', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50', hover: 'hover:border-rose-200 hover:shadow-rose-500/10' }
                      ].map((item, i) => (
                        <button key={i} className={`w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 transition-all duration-300 hover:shadow-xl ${item.hover} group/btn`}>
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center transition-transform group-hover/btn:scale-110`}>
                              <item.icon size={16} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 group-hover/btn:text-slate-900">{item.label}</span>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-slate-900 group-hover/btn:text-white transition-colors">
                            <ChevronRight size={14} className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="animate-in fade-in duration-500 space-y-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Configuration</h2>
                <p className="text-lg text-slate-500 mt-2 font-medium">Fine-tune global parameters and security protocols for the SafeGo network.</p>
              </div>

              <div className="grid gap-10 lg:grid-cols-2">
                <Card
                  className="p-10 space-y-10 border-slate-100 hover:border-primary/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => toast.info("Price Logic Selected", { description: "You are now editing the Matrix Pricing parameters." })}
                >
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center"><Zap size={32} /></div>
                    <div><h3 className="text-2xl font-bold text-slate-900">Matrix Pricing</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fare Algorithm Management</p></div>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Base Transition Fee</label><div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span><input type="number" defaultValue="45.00" className="w-full h-14 pl-10 pr-6 rounded-2xl bg-slate-50 border-none font-bold text-lg" /></div></div>
                      <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Price Per KM</label><div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span><input type="number" defaultValue="12.50" className="w-full h-14 pl-10 pr-6 rounded-2xl bg-slate-50 border-none font-bold text-lg" /></div></div>
                    </div>
                    <div className="flex items-center justify-between p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100/50">
                      <div className="flex items-center gap-4"><div className="h-3 w-3 rounded-full bg-emerald-500" /><p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Dynamic Surge Pricing</p></div>
                      <div className="h-8 w-14 bg-emerald-500 rounded-full relative p-1 cursor-pointer"><div className="h-6 w-6 bg-white rounded-full ml-auto shadow-sm" /></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addNotification("Pricing Matrix Updated", "Global fare logic synced to all network nodes.", "success"); }} className="w-full h-16 rounded-[1.5rem] bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-200">Update Fare Logic</button>
                  </div>
                </Card>

                <Card
                  className="p-10 space-y-10 border-slate-100 hover:border-rose-100 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => addNotification("Safety Console Enabled", "Adjusting emergency response thresholds.", "info")}
                >
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[2rem] bg-rose-50 text-rose-500 flex items-center justify-center"><ShieldCheck size={32} /></div>
                    <div><h3 className="text-2xl font-bold text-slate-900">Safety Protocols</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Emergency Thresholds</p></div>
                  </div>
                  <div className="space-y-8">
                    <div className="p-6 rounded-[2rem] bg-slate-50 space-y-6">
                      <div className="flex justify-between items-center"><p className="text-sm font-black text-slate-700">SOS Auto-Dispatch</p><div className="h-8 w-14 bg-slate-200 rounded-full relative p-1 cursor-not-allowed"><div className="h-6 w-6 bg-white rounded-full" /></div></div>
                      <p className="text-xs text-slate-400 leading-relaxed font-bold italic">Enable automatic safety team dispatch when a critical SOS node is triggered without confirmation.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Max Speed Limit</label><span className="text-sm font-black text-slate-900">80 KM/H</span></div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-rose-500 w-[60%] shadow-[0_0_10px_rgba(244,63,94,0.4)]" /></div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); addNotification("Safety Thresholds Updated", "System-wide emergency protocols have been recommitted.", "success"); }} className="w-full h-16 rounded-[1.5rem] border-2 border-rose-100 text-rose-600 text-sm font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Commit Safety Changes</button>
                  </div>
                </Card>

                <Card className="lg:col-span-2 p-10 space-y-10 border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center"><Lock size={32} /></div>
                    <div><h3 className="text-2xl font-bold text-slate-900">Global Access Control</h3><p className="text-xs font-black text-slate-400 uppercase tracking-widest">RBAC & Authentication Policy</p></div>
                  </div>
                  <div className="grid lg:grid-cols-3 gap-10">
                    <div onClick={() => toast.info("Security Module: 2FA")} className="p-8 rounded-[2rem] bg-slate-50 space-y-4 cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm"><Key size={24} /></div>
                      <h5 className="text-xl font-bold text-slate-900">2FA Enforcement</h5>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed">Require all administrative nodes to use biometric or token-based 2FA.</p>
                      <button className="text-xs font-black text-primary uppercase tracking-widest mt-4">Configure</button>
                    </div>
                    <div onClick={() => toast.info("Identity Module: Token Persistance")} className="p-8 rounded-[2rem] bg-slate-50 space-y-4 cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm"><Fingerprint size={24} /></div>
                      <h5 className="text-xl font-bold text-slate-900">Identity Persistence</h5>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed">Set token expiration for session tokens. Current: 24 Hours.</p>
                      <button className="text-xs font-black text-primary uppercase tracking-widest mt-4">Adjust</button>
                    </div>
                    <div onClick={() => toast.error("WARNING: Maintenance Mode Required")} className="p-8 rounded-[2rem] bg-slate-50 space-y-4 cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-900 shadow-sm"><Briefcase size={24} /></div>
                      <h5 className="text-xl font-bold text-slate-900">Maintenance Mode</h5>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed">Restrict all passenger transitions during system updates.</p>
                      <button className="text-xs font-black text-rose-500 uppercase tracking-widest mt-4">Activate</button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateUserOpen} onClose={() => setIsCreateUserOpen(false)} title="Provision New Node">
        <form onSubmit={handleCreateUser} className="space-y-8">
          {formError && <div className="p-5 rounded-2xl bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-4 border border-red-100 animate-shake"><AlertCircle size={20} /> {formError}</div>}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name</label><div className="relative"><UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><input required value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all" /></div></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Access Email</label><div className="relative"><Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all" /></div></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contact Node (Phone)</label><div className="relative"><Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><input required type="tel" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all" /></div></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Role Architecture</label>
              <div className="grid grid-cols-3 gap-3">
                {['driver', 'staff', 'admin'].map(r => (
                  <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r })} className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${newUser.role === r ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>{r}</button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold ml-1 italic">{newUser.role === 'driver' ? 'Drivers can access the Driver Portal.' : 'Managed Nodes have internal system access.'}</p>
            </div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Secret Key (Node Access)</label><div className="relative"><Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" /><input required type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 focus:border-primary/20 outline-none font-bold text-sm transition-all" /></div></div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm shadow-2xl hover:bg-primary transition-all flex items-center justify-center gap-4 disabled:opacity-50 hover:-translate-y-1">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />} {isSubmitting ? 'Syncing...' : 'Provision New Identity'}
          </button>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Modify Identity Core">
        <form onSubmit={handleUpdateUser} className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label><input required value={editingUser?.full_name || ""} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 outline-none font-bold text-sm transition-all" /></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input required type="email" value={editingUser?.email || ""} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 outline-none font-bold text-sm transition-all" /></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input required type="tel" value={editingUser?.phone || ""} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:ring-4 ring-primary/5 outline-none font-bold text-sm transition-all" /></div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Role Architecture</label>
              <div className="grid grid-cols-3 gap-3">
                {['driver', 'staff', 'admin'].map(r => (
                  <button key={r} type="button" onClick={() => setEditingUser({ ...editingUser, role: r })} className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${editingUser?.role === r ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3"><label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Identity Status</label><div className="flex gap-4"><button type="button" onClick={() => setEditingUser({ ...editingUser, is_active: true })} className={`flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${editingUser?.is_active ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Online</button><button type="button" onClick={() => setEditingUser({ ...editingUser, is_active: false })} className={`flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!editingUser?.is_active ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>Restricted</button></div></div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm shadow-2xl hover:bg-primary transition-all flex items-center justify-center gap-4 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />} Commit System Changes
          </button>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeletingUser} onClose={() => setIsDeletingUser(false)} title="Terminate Node Access">
        <div className="text-center space-y-8 p-4">
          <div className="h-24 w-24 rounded-[2rem] bg-red-50 text-red-500 mx-auto flex items-center justify-center shadow-inner"><AlertCircle size={48} /></div>
          <div className="space-y-3"><p className="text-2xl font-black text-slate-900 tracking-tight">Permanently Purge {userToDelete?.full_name}?</p><p className="text-sm text-slate-400 font-bold">This action will permanently revoke all Matrix credentials and delete the entity log. This cannot be reversed.</p></div>
          <div className="flex gap-6"><button onClick={() => setIsDeletingUser(false)} className="flex-1 h-16 rounded-2xl bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button><button onClick={handleDeleteUser} disabled={isSubmitting} className="flex-1 h-16 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-red-100 hover:bg-red-600 transition-all">Purge Identity</button></div>
        </div>
      </Modal>

      {/* NODE TELEMETRY MODAL - SaaS DRILL DOWN */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Mission Node Telemetry"
      >
        {selectedLog && (
          <div className="space-y-8">
            <div className={`p-6 rounded-3xl border flex items-center gap-6 ${selectedLog.type === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
              }`}>
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedLog.type === 'error' ? 'bg-rose-500 shadow-rose-200' : 'bg-slate-900 shadow-slate-200'
                }`}>
                {selectedLog.type === 'error' ? <ShieldAlert size={32} /> : <Info size={32} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedLog.title}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{selectedLog.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Node Identity</p>
                <div className="flex items-center gap-3">
                  <Fingerprint size={16} className="text-primary" />
                  <span className="text-xs font-bold text-slate-700">TRX_{selectedLog.id}</span>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Protocol Timestamp</p>
                <div className="flex items-center gap-3">
                  <History size={16} className="text-primary" />
                  <span className="text-xs font-bold text-slate-700">{selectedLog.time}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Raw Matrix Data</h4>
              <div className="p-6 rounded-2xl bg-[#0f172a] text-emerald-400 font-mono text-[11px] leading-relaxed shadow-inner">
                <p className="opacity-50">{"{"}</p>
                <p className="ml-4">"node_id": "{selectedLog.id}",</p>
                <p className="ml-4">"severity": "{selectedLog.type === 'error' ? 'CRITICAL_1' : 'STABLE_0'}",</p>
                <p className="ml-4">"encryption": "AES-256-GCM",</p>
                <p className="ml-4">"status": "LOGGED_ARCHIVE",</p>
                <p className="ml-4">"payload": "{selectedLog.description}"</p>
                <p className="opacity-50">{"}"}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Close Trace
              </button>
              {(selectedLog.type === 'error' || selectedLog.title.includes('SOS')) && (
                <button
                  onClick={() => {
                    setActiveTab('alerts');
                    setSelectedLog(null);
                  }}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={14} /> Open Safety Command
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;
