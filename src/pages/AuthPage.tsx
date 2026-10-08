import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SafeGoLogo } from "@/components/SafeGoLogo";
import { 
  AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight, 
  Heart, Accessibility, Users, Car, Sparkles, Check, ChevronDown
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile,
  updatePassword
} from "firebase/auth";
import { useAppMode, AppRideMode } from "@/contexts/ElderModeContext";
import { getApiUrl } from "@/lib/api";
import { toast } from "sonner";

const API_URL = getApiUrl();

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";
  const { setRiderPreferences, setElderMode, setPinkMode, setDisabilityMode, activeMode: globalActiveMode } = useAppMode();

  const [role, setRole] = useState<"passenger" | "driver" | "admin">("passenger");

  // Step state: "auth" (standard sign-in / sign-up) vs "set_password" (password creation for Google accounts)
  const [step, setStep] = useState<"auth" | "set_password">("auth");
  const [googleUserEmail, setGoogleUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string>("/home");

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Rider Profile & Modes: Gender, Age, Has Disability
  // Rider Profile & Modes: Gender & Preference
  const [gender, setGender] = useState<string>(() => {
    return localStorage.getItem("safego_user_gender") || "female";
  });
  const [selectedMode, setSelectedMode] = useState<AppRideMode>(() => {
    const stored = localStorage.getItem("safego_preferred_mode") as AppRideMode;
    const storedGender = localStorage.getItem("safego_user_gender") || "female";
    if (stored && ["pink", "elderly", "pwd", "normal"].includes(stored)) {
      if (stored === "pink" && storedGender !== "female") return "normal";
      return stored;
    }
    return storedGender === "female" ? "pink" : "normal";
  });

  const activeHeroMode: AppRideMode = selectedMode;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // When gender changes, only female riders can have Pink Mode enabled
  const handleGenderChange = (newGender: string) => {
    setGender(newGender);
    if (newGender === "female") {
      // Female riders default to Pink Mode
      setSelectedMode("pink");
      setPinkMode(true);
      setElderMode(false);
      setDisabilityMode(false);
    } else {
      // Non-female riders cannot have Pink Mode active
      if (selectedMode === "pink") {
        setSelectedMode("normal");
        setPinkMode(false);
      }
    }
  };

  const handlePreferenceChange = (newMode: AppRideMode) => {
    if (newMode === "pink" && gender !== "female") {
      toast.error("Pink Mode is exclusively enabled for women riders.");
      return;
    }
    setSelectedMode(newMode);
    if (newMode === "pink") {
      setPinkMode(true);
      setElderMode(false);
      setDisabilityMode(false);
    } else if (newMode === "elderly") {
      setElderMode(true);
      setPinkMode(false);
      setDisabilityMode(false);
    } else if (newMode === "pwd") {
      setDisabilityMode(true);
      setPinkMode(false);
      setElderMode(false);
    } else {
      setPinkMode(false);
      setElderMode(false);
      setDisabilityMode(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    if (token && step === "auth") {
      if (userRole === "admin") navigate("/admin");
      else if (userRole === "driver") navigate("/driver");
      else navigate("/home");
    }
  }, [navigate, step]);

  // Clear errors and password visibility when switching roles or pages
  useEffect(() => {
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  }, [role, isLogin, step]);

  const formatAuthError = (err: any): string => {
    const msg = err?.message || err?.detail || "";
    const code = err?.code || "";

    if (code === "auth/unauthorized-domain" || msg.includes("auth/unauthorized-domain") || msg.toLowerCase().includes("unauthorized domain")) {
      return "This domain is not authorized in Firebase. Please add this domain in Firebase Console > Authentication > Settings > Authorized Domains.";
    }
    if (code === "auth/popup-closed-by-user" || msg.includes("auth/popup-closed-by-user")) {
      return "Google sign-in popup was closed before completing.";
    }
    if (code === "auth/popup-blocked" || msg.includes("auth/popup-blocked")) {
      return "Popup was blocked by your browser. Please allow popups for this site.";
    }
    if (code === "auth/email-already-in-use" || msg.includes("auth/email-already-in-use") || msg.includes("already registered")) {
      return "This email is already registered. Please switch to Login or use 'Sign in with Google'.";
    }
    if (code === "auth/user-not-found" || msg.includes("auth/user-not-found") || msg.toLowerCase().includes("not found")) {
      return "No account found with this email. Please click 'Sign Up' below or use 'Sign in with Google'.";
    }
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("Invalid email or password")) {
      return "Incorrect password or credentials. If you signed up with Google, please click 'Sign in with Google'.";
    }
    if (code === "auth/weak-password" || msg.includes("auth/weak-password")) {
      return "Password must be at least 6 characters long.";
    }
    if (code === "auth/invalid-email" || msg.includes("auth/invalid-email")) {
      return "Please enter a valid email address.";
    }
    if (code === "auth/too-many-requests" || msg.includes("auth/too-many-requests")) {
      return "Too many failed attempts. Please wait a few minutes before trying again.";
    }
    if (code === "auth/network-request-failed" || msg.includes("auth/network-request-failed")) {
      return "Network connection to Firebase failed. Please check your internet connection.";
    }
    return msg || "Authentication failed. Please check your credentials.";
  };

  const notifyModeWelcome = (modeName: AppRideMode) => {
    if (modeName === "pink") {
      toast.success("💖 Pink Mode Activated", {
        description: "Verified female drivers prioritized, AI-monitored lit routes & real-time family tracking.",
        duration: 4000,
      });
    } else if (modeName === "elderly") {
      toast.success("👵 Senior Vision Mode Activated", {
        description: "116% enlarged typography, high-contrast clarity, door assistance & patient drivers active.",
        duration: 4000,
      });
    } else if (modeName === "pwd") {
      toast.success("♿ Disability (PWD) Mode Activated", {
        description: "Wheelchair ramp certified vehicles, audio assistance & priority accessibility fleet active.",
        duration: 4000,
      });
    } else {
      toast.success("🚗 Standard Mode Activated", {
        description: "Safe rides with GPS tracking and verified drivers.",
        duration: 3000,
      });
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const defaultRole = (role === "admin" || result.user.email?.includes("admin")) ? "admin" : role;
      let finalRole = defaultRole;
      let needsPassword = false;

      // Sync with backend if reachable
      try {
        const syncPayload: any = { 
          role,
          gender: role === "passenger" ? gender : undefined,
          has_disability: role === "passenger" ? selectedMode === "pwd" : false,
          is_elder: role === "passenger" ? selectedMode === "elderly" : false,
          preferred_mode: role === "passenger" ? selectedMode : undefined,
        };

        const res = await fetch(`${API_URL}/api/auth/firebase`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify(syncPayload)
        });
        
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("token", data.access_token);
          finalRole = (data.role === "admin" || result.user.email?.includes("admin")) ? "admin" : data.role;
          needsPassword = !!data.needs_password;
        } else {
          // Fallback to Firebase idToken
          localStorage.setItem("token", idToken);
        }
      } catch {
        // Backend offline or unreachable - fallback to Firebase session
        localStorage.setItem("token", idToken);
      }

      localStorage.removeItem("safego_accepted_rides");
      localStorage.removeItem("safego_declined_rides");
      localStorage.setItem("userRole", finalRole);
      localStorage.setItem("safego_user_email", result.user.email || "");
      if (result.user.displayName) localStorage.setItem("safego_user_name", result.user.displayName);
      
      if (finalRole === "passenger") {
        localStorage.setItem("safego_user_gender", gender);
        localStorage.setItem("safego_preferred_mode", selectedMode);
        localStorage.setItem("safego_has_disability", selectedMode === "pwd" ? "true" : "false");
        setRiderPreferences({
          gender,
          hasDisability: selectedMode === "pwd",
          mode: selectedMode,
        });
        notifyModeWelcome(selectedMode);
      }

      const destination = from || (finalRole === "admin" ? "/admin" : finalRole === "driver" ? "/driver" : "/home");

      if (needsPassword) {
        setGoogleUserEmail(result.user.email || "");
        setPendingRedirect(destination);
        setStep("set_password");
      } else {
        navigate(destination);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone || phone.trim().length < 7) {
      setError("Please enter a valid phone number");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/api/auth/set-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            password: newPassword,
            confirm_password: confirmNewPassword,
            phone: phone.trim()
          })
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (resData.phone) {
            localStorage.setItem("safego_user_phone", resData.phone);
          } else {
            localStorage.setItem("safego_user_phone", phone.trim());
          }
        }
      } catch {
        localStorage.setItem("safego_user_phone", phone.trim());
      }

      // Sync password with Firebase if currentUser exists
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
        }
      } catch (fbErr) {
        console.warn("Firebase password sync note:", fbErr);
      }

      navigate(pendingRedirect);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPassword = () => {
    navigate(pendingRedirect);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    try {
      let idToken = "";
      
      if (role === "passenger") {
        // Save selected rider preferences immediately to localStorage & Context
        localStorage.setItem("safego_user_gender", gender);
        localStorage.setItem("safego_preferred_mode", selectedMode);
        localStorage.setItem("safego_has_disability", selectedMode === "pwd" ? "true" : "false");
        setRiderPreferences({
          gender,
          hasDisability: selectedMode === "pwd",
          mode: selectedMode,
        });
      }

      if (isLogin) {
        // 1. Try local backend login first
        try {
          const localRes = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
          });
          
          if (localRes.ok) {
            const data = await localRes.json();
            localStorage.setItem("token", data.access_token);
            localStorage.removeItem("safego_accepted_rides");
            localStorage.removeItem("safego_declined_rides");
            const finalRole = (data.role === "admin" || cleanEmail.includes("admin")) ? "admin" : data.role;
            localStorage.setItem("userRole", finalRole);
            localStorage.setItem("safego_user_email", cleanEmail);
            
            // Sync user profile & update preferences in backend
            try {
              const meRes = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${data.access_token}` }
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                if (meData.full_name) localStorage.setItem("safego_user_name", meData.full_name);
                if (meData.phone) localStorage.setItem("safego_user_phone", meData.phone);
                if (meData.email) localStorage.setItem("safego_user_email", meData.email);
              }

              if (finalRole === "passenger") {
                await fetch(`${API_URL}/api/auth/me`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${data.access_token}`
                  },
                  body: JSON.stringify({
                    gender,
                    preferred_mode: selectedMode,
                    is_elder: selectedMode === "elderly",
                    has_disability: selectedMode === "pwd",
                  })
                });
              }
            } catch {}

            setLoading(false);
            if (finalRole === "passenger") {
              notifyModeWelcome(selectedMode);
            }
            if (finalRole === "admin") navigate("/admin");
            else if (finalRole === "driver") navigate("/driver");
            else navigate(from || "/home");
            return;
          }
        } catch {
          console.log("Local backend login check skipped, proceeding to Firebase...");
        }

        // 2. Direct validation for pre-configured Admin and Tester accounts
        const adminDemoPass = import.meta.env.VITE_ADMIN_PASSWORD || "mock-admin-password-safego";
        const testerDemoPass = import.meta.env.VITE_TESTER_PASSWORD || "mock-tester-password-safego";
        if (
          (cleanEmail === "admin@safego.ph" && cleanPassword === adminDemoPass) ||
          (cleanEmail === "tester@safego.in" && cleanPassword === testerDemoPass)
        ) {
          const matchedRole = cleanEmail.includes("admin") ? "admin" : "passenger";
          const demoToken = `safego_token_${Date.now()}_${btoa(cleanEmail)}`;
          localStorage.setItem("token", demoToken);
          localStorage.setItem("userRole", matchedRole);
          localStorage.setItem("safego_user_email", cleanEmail);
          localStorage.setItem("safego_user_name", cleanEmail.includes("admin") ? "SafeGo Admin" : "SafeGo Tester");
          localStorage.removeItem("safego_accepted_rides");
          localStorage.removeItem("safego_declined_rides");
          setLoading(false);
          if (matchedRole === "passenger") {
            notifyModeWelcome(selectedMode);
          }
          if (matchedRole === "admin") navigate("/admin");
          else navigate(from || "/home");
          return;
        }

        // 3. Firebase Login Fallback
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        idToken = await userCredential.user.getIdToken();
      } else {
        // Firebase Registration
        if (cleanPassword !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        await updateProfile(userCredential.user, { displayName: fullName });
        idToken = await userCredential.user.getIdToken();
      }

      let finalToken = idToken;
      let finalRole = (role === "admin" || email.includes("admin")) ? "admin" : role;

      // Sync with backend if available
      try {
        const syncPayload: any = { 
          role,
          full_name: fullName,
          phone: phone,
          gender: role === "passenger" ? gender : undefined,
          has_disability: role === "passenger" ? selectedMode === "pwd" : false,
          is_elder: role === "passenger" ? selectedMode === "elderly" : false,
          preferred_mode: role === "passenger" ? selectedMode : undefined,
        };

        const res = await fetch(`${API_URL}/api/auth/firebase`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify(syncPayload)
        });

        if (res.ok) {
          const data = await res.json();
          finalToken = data.access_token;
          finalRole = (data.role === "admin" || email.includes("admin")) ? "admin" : data.role;
        }
      } catch {
        console.warn("Backend sync offline, continuing with Firebase credentials");
      }

      // Save credentials to localStorage
      localStorage.setItem("token", finalToken);
      localStorage.removeItem("safego_accepted_rides");
      localStorage.removeItem("safego_declined_rides");
      localStorage.setItem("userRole", finalRole);
      localStorage.setItem("safego_user_email", email);
      if (fullName) localStorage.setItem("safego_user_name", fullName);
      if (phone) localStorage.setItem("safego_user_phone", phone);

      if (finalRole === "passenger") {
        notifyModeWelcome(selectedMode);
      }

      if (finalRole === "admin") {
        navigate("/admin");
      } else if (finalRole === "driver") {
        navigate("/driver");
      } else {
        navigate(from || "/home");
      }

    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Panel - Premium Brand Image & Overlay */}
      <div 
        className="hidden md:flex md:w-1/2 relative overflow-hidden bg-cover bg-center select-none"
        style={{ backgroundImage: "url('/premium_taxi_login.png')" }}
      >
        {/* Dark overlay for rich contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
        
        {/* Dynamic Theme Glow based on Active Mode */}
        {activeHeroMode === "pink" && (
          <div className="absolute inset-0 bg-pink-600/10 pointer-events-none transition-opacity duration-700" />
        )}
        {activeHeroMode === "elderly" && (
          <div className="absolute inset-0 bg-amber-600/10 pointer-events-none transition-opacity duration-700" />
        )}
        {activeHeroMode === "pwd" && (
          <div className="absolute inset-0 bg-purple-600/15 pointer-events-none transition-opacity duration-700" />
        )}

        {/* Animated grid/lines pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col justify-between h-full w-full p-12 lg:p-16">
          {/* Top section: Logo & Active Mode Badge */}
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <SafeGoLogo size={36} className="text-white [&>span]:text-white" />
            </Link>

            {/* Dynamic Left Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-black/40 backdrop-blur-md text-white text-xs font-bold shadow-lg">
              {activeHeroMode === "pink" ? (
                <>
                  <Heart size={14} className="text-pink-400 fill-pink-400 animate-pulse" />
                  <span className="text-pink-200">Pink Safety Mode</span>
                </>
              ) : activeHeroMode === "elderly" ? (
                <>
                  <Users size={14} className="text-amber-400" />
                  <span className="text-amber-200">Senior Care Vision</span>
                </>
              ) : activeHeroMode === "pwd" ? (
                <>
                  <Accessibility size={14} className="text-purple-400 animate-pulse" />
                  <span className="text-purple-200">Disability (PWD) Mode</span>
                </>
              ) : (
                <>
                  <Car size={14} className="text-emerald-400" />
                  <span className="text-emerald-200">Standard Fleet</span>
                </>
              )}
            </div>
          </div>
          
          {/* Bottom section: Content */}
          <div className="max-w-md animate-in slide-in-from-bottom duration-700">
            <h1 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight uppercase">
              {activeHeroMode === "pink" ? (
                <>Safe Transit. <span className="text-pink-400">For Women.</span></>
              ) : activeHeroMode === "elderly" ? (
                <>Dignified, <span className="text-amber-400">Senior-First</span> Rides.</>
              ) : activeHeroMode === "pwd" ? (
                <>Fully <span className="text-purple-400">Accessible</span> Mobility.</>
              ) : (
                <>Your Next <span className="text-primary">Commute</span> Awaits!</>
              )}
            </h1>
            <p className="mt-4 text-slate-300 text-sm lg:text-base leading-relaxed font-medium">
              {activeHeroMode === "pink" 
                ? "Female drivers preferred, well-lit verified corridors, emergency tracking, and dedicated rapid-response assistance."
                : activeHeroMode === "elderly"
                ? "Enlarged fonts, patient door-to-door assistance, calm drivers, and integrated family emergency alerts."
                : activeHeroMode === "pwd"
                ? "Ramp-equipped vehicles, voice guided navigation, trained empathy drivers, and seamless wheelchair transit."
                : "Log in to unlock premium rides, plan your journey, and get matched with certified drivers. Your safety is our absolute priority."}
            </p>
            <div className="mt-8 border-t border-white/10 pt-6 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {activeHeroMode === "pink"
                  ? "Defaulting to Pink Mode for empowered safety"
                  : activeHeroMode === "elderly"
                  ? "Senior Care Vision Active"
                  : activeHeroMode === "pwd"
                  ? "Wheelchair Ramp Certification active"
                  : "Your premium journey starts here."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login/Signup Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-8 lg:p-12 bg-background relative overflow-hidden min-h-screen">
        {/* Subtle dot grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#cbd5e1_1.5px,transparent_1.5px)] bg-[size:32px_32px] opacity-40 dark:bg-[radial-gradient(ellipse_at_center,#334155_1.5px,transparent_1.5px)] pointer-events-none select-none" />
        
        {/* Soft background glow patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none opacity-60" />

        {/* Form Card Container */}
        <div className="w-full max-w-[500px] md:max-w-[580px] lg:max-w-[640px] py-10 px-8 sm:px-12 lg:px-14 rounded-[2.5rem] lg:rounded-[3.5rem] bg-card/80 border border-border/80 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.1)] backdrop-blur-md relative z-10 transition-all hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] my-6">
          {step === "set_password" ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-6 flex flex-col items-center md:items-start">
                <Link to="/" className="md:hidden mb-6 inline-block transition-transform hover:scale-105">
                  <SafeGoLogo size={36} />
                </Link>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-4 shadow-sm">
                  <ShieldCheck size={15} className="shrink-0" />
                  <span className="truncate max-w-[260px]">Google Connected: {googleUserEmail}</span>
                </div>
                
                <h2 className="font-display text-2xl lg:text-3xl font-black text-foreground tracking-tight uppercase text-center md:text-left">
                  Complete Your Profile
                </h2>
                <p className="mt-2 text-muted-foreground text-sm text-center md:text-left font-medium leading-relaxed">
                  Enter your phone number and create a password to complete your SafeGo account registration.
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-xs font-bold text-destructive">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      const sanitized = val.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '');
                      setPhone(sanitized);
                    }}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">New Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showConfirmNewPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      aria-label={showConfirmNewPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <span>Complete Setup & Continue</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkipPassword}
                  className="mt-1 text-center text-xs font-bold text-muted-foreground hover:text-foreground py-2 uppercase tracking-wider transition-colors"
                >
                  Skip for now & Go to Dashboard
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex flex-col items-center md:items-start">
                <Link to="/" className="md:hidden mb-4 inline-block transition-transform hover:scale-105">
                  <SafeGoLogo size={36} />
                </Link>
                
                <h2 className="font-display text-3xl lg:text-4xl font-black text-foreground tracking-tight uppercase text-center md:text-left">
                  {isLogin ? "Welcome Back!" : (role === "admin" ? "Admin Access" : "Join SafeGo")}
                </h2>
                <p className="mt-1.5 text-muted-foreground text-sm text-center md:text-left font-medium">
                  {isLogin ? "Enter your email and password to access your account." : "Create an account to start booking safe & accessible rides."}
                </p>
              </div>

              {/* Role toggle */}
              <div className="mb-5 flex w-full md:w-fit rounded-xl border border-border/60 bg-muted/40 p-1 backdrop-blur-sm">
                {(["passenger", "driver", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 md:flex-none rounded-lg px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${role === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {role === "admin" && !isLogin && (
                <div className="mb-5 rounded-2xl bg-primary/5 border border-primary/20 p-4 text-xs font-semibold text-primary leading-relaxed">
                  Company credentials are required for Admin access.
                  <button
                    onClick={() => navigate("/login")}
                    className="ml-1.5 font-black underline hover:text-primary/80"
                  >
                    Go to Login
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-xs font-bold text-destructive">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Rider Gender & Preference Selector (Passenger Only - Available on both Sign In & Sign Up) */}
              {role === "passenger" && (
                <div className="mb-4 p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-background/60 backdrop-blur-sm space-y-2.5 shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Select Gender */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label htmlFor="rider-gender-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Select Gender
                        </label>
                        {gender === "female" && (
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400">
                            Women
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          id="rider-gender-select"
                          value={gender}
                          onChange={(e) => handleGenderChange(e.target.value)}
                          className="w-full h-11 rounded-xl border border-border/80 bg-background px-3.5 pr-9 text-xs font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none shadow-xs"
                        >
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Select your Preference */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label htmlFor="rider-preference-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Select your Preference
                        </label>
                        {selectedMode === "pink" ? (
                          <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                            <Heart size={10} className="fill-pink-500" /> Pink Mode
                          </span>
                        ) : selectedMode === "elderly" ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Users size={10} /> Senior Mode
                          </span>
                        ) : selectedMode === "pwd" ? (
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <Accessibility size={10} /> Disability
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Car size={10} /> Normal
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          id="rider-preference-select"
                          value={selectedMode}
                          onChange={(e) => handlePreferenceChange(e.target.value as AppRideMode)}
                          className={`w-full h-11 rounded-xl border px-3.5 pr-9 text-xs font-bold outline-none transition-all focus:ring-2 cursor-pointer appearance-none shadow-xs ${
                            selectedMode === "pink"
                              ? "border-pink-500/50 bg-pink-500/10 text-pink-950 dark:text-pink-100 focus:border-pink-500 focus:ring-pink-500/20"
                              : selectedMode === "elderly"
                              ? "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100 focus:border-amber-500 focus:ring-amber-500/20"
                              : selectedMode === "pwd"
                              ? "border-purple-500/50 bg-purple-500/10 text-purple-950 dark:text-purple-100 focus:border-purple-500 focus:ring-purple-500/20"
                              : "border-border/80 bg-background text-foreground focus:border-primary focus:ring-primary/20"
                          }`}
                        >
                          <option value="normal">Normal Mode</option>
                          <option value="pink" disabled={gender !== "female"}>
                            {gender === "female" ? "Pink Mode (Women Only)" : "Pink Mode (Women Only - Disabled)"}
                          </option>
                          <option value="elderly">Senior Mode (60+)</option>
                          <option value="pwd">Disability Mode (PWD)</option>
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 px-1 pt-0.5">
                    <Heart size={11} className={gender === "female" ? "text-pink-500 fill-pink-500 shrink-0" : "text-pink-400 shrink-0"} />
                    <span>
                      {gender === "female"
                        ? "Note: Pink Mode is active for women riders."
                        : "Note: For only women users Pink mode is enabled."}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className="flex flex-col gap-4">
                {!isLogin && role !== "admin" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Legal Name</label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                      placeholder="John Doe"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                    placeholder="you@email.com"
                  />
                </div>

                {!isLogin && role !== "admin" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
                  </div>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {!isLogin && role !== "admin" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin || role === "admin" ? "Sign In" : "Create Account")}
                </button>

                <div className="relative my-2 flex items-center py-2">
                  <div className="flex-grow border-t border-border/60"></div>
                  <span className="shrink-0 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Or continue with</span>
                  <div className="flex-grow border-t border-border/60"></div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="flex w-full justify-center items-center gap-3 rounded-xl border border-border bg-background py-4 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Sign in with Google
                </button>
              </form>

              {role !== "admin" && (
                <p className="mt-6 text-center text-sm text-muted-foreground font-semibold">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Link to={isLogin ? "/signup" : "/login"} className="text-primary hover:underline ml-1">
                    {isLogin ? "Sign Up" : "Login"}
                  </Link>
                </p>
              )}

              {role === "admin" && !isLogin && (
                <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
                  Administrative accounts are managed by SafeGo.
                </p>
              )}

              {role === "admin" && isLogin && (
                <p className="mt-6 text-center text-xs text-muted-foreground font-medium">
                  Only authorized personnel may access the admin dashboard.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
