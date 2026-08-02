import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SafeGoLogo } from "@/components/SafeGoLogo";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile
} from "firebase/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/login";

  const [role, setRole] = useState<"passenger" | "driver" | "admin">("passenger");

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");
    if (token) {
      if (userRole === "admin") navigate("/admin");
      else if (userRole === "driver") navigate("/driver");
      else navigate("/home");
    }
  }, [navigate]);

  // Clear errors and password visibility when switching roles or pages
  useEffect(() => {
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [role, isLogin]);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Sync with backend
      const res = await fetch(`${API_URL}/api/auth/firebase`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ role })
      });
      
      if (!res.ok) throw new Error("Failed to sync Google account with SafeGo");
      
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.removeItem("safego_accepted_rides");
      localStorage.removeItem("safego_declined_rides");
      
      const finalRole = (data.role === "admin" || result.user.email?.includes("admin")) ? "admin" : data.role;
      localStorage.setItem("userRole", finalRole);
      
      if (finalRole === "admin") {
        navigate("/admin");
      } else {
        navigate(finalRole === "driver" ? "/driver" : "/home");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let idToken = "";
      
      if (isLogin) {
        // Try local backend login first (for seeded demo users)
        try {
          const localRes = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          
          if (localRes.ok) {
            const data = await localRes.json();
            localStorage.setItem("token", data.access_token);
            localStorage.removeItem("safego_accepted_rides");
            localStorage.removeItem("safego_declined_rides");
            const finalRole = (data.role === "admin" || email.includes("admin")) ? "admin" : data.role;
            localStorage.setItem("userRole", finalRole);
            
            setLoading(false);
            if (finalRole === "admin") navigate("/admin");
            else if (finalRole === "driver") navigate("/driver");
            else navigate("/home");
            return;
          }
        } catch (e) {
          console.log("Local login check failed, proceeding to Firebase...");
        }

        // Firebase Login Fallback
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        idToken = await userCredential.user.getIdToken();
      } else {
        // Firebase Registration
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        idToken = await userCredential.user.getIdToken();
      }

      // Sync with backend
      const res = await fetch(`${API_URL}/api/auth/firebase`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          role,
          full_name: fullName,
          phone: phone
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      // Save token
      localStorage.setItem("token", data.access_token);
      localStorage.removeItem("safego_accepted_rides");
      localStorage.removeItem("safego_declined_rides");
      const finalRole = (data.role === "admin" || email.includes("admin")) ? "admin" : data.role;
      localStorage.setItem("userRole", finalRole);

      if (finalRole === "admin") {
        navigate("/admin");
      } else if (finalRole === "driver") {
        navigate("/driver");
      } else {
        navigate("/home");
      }

    } catch (err: any) {
      setError(err.message);
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
        
        {/* Animated grid/lines pattern overlay for 4K high-end aesthetic */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col justify-between h-full w-full p-12 lg:p-16">
          {/* Top section: Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <SafeGoLogo size={36} className="text-white [&>span]:text-white" />
            </Link>
          </div>
          
          {/* Bottom section: Content */}
          <div className="max-w-md animate-in slide-in-from-bottom duration-700">
            <h1 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight uppercase">
              Your Next <span className="text-primary">Commute</span> Awaits!
            </h1>
            <p className="mt-4 text-slate-300 text-sm lg:text-base leading-relaxed font-medium">
              Log in to unlock premium rides, plan your journey, and get matched with certified drivers. Your safety is our absolute priority.
            </p>
            <div className="mt-8 border-t border-white/10 pt-6 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your premium journey starts here.</span>
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

        {/* Abstract floating glowing ride paths */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <svg className="absolute w-[600px] h-[600px] -right-24 -bottom-24 text-primary/15 stroke-current fill-none" viewBox="0 0 120 120">
            {/* Route path 1 */}
            <path d="M 10 110 Q 60 90 70 50 T 110 10" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
            {/* Route path 2 */}
            <path d="M 25 100 Q 50 60 95 50" strokeWidth="0.2" />
            {/* Markers */}
            <circle cx="110" cy="10" r="1.5" className="fill-primary/30" />
            <circle cx="70" cy="50" r="1" className="fill-primary/20" />
            <circle cx="10" cy="110" r="2.5" className="fill-primary/40 animate-pulse" />
          </svg>
        </div>

        {/* Form Card Container */}
        <div className="w-full max-w-[500px] md:max-w-[580px] lg:max-w-[640px] py-14 px-10 sm:px-12 lg:px-16 rounded-[2.5rem] lg:rounded-[3.5rem] bg-card/70 border border-border/80 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.1)] backdrop-blur-md relative z-10 transition-all hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)]">
          <div className="mb-8 flex flex-col items-center md:items-start">
            <Link to="/" className="md:hidden mb-6 inline-block transition-transform hover:scale-105">
              <SafeGoLogo size={36} />
            </Link>
            
            <h2 className="font-display text-3xl lg:text-4xl font-black text-foreground tracking-tight uppercase text-center md:text-left">
              {isLogin ? "Welcome Back!" : (role === "admin" ? "Admin Access" : "Join SafeGo")}
            </h2>
            <p className="mt-2 text-muted-foreground text-sm text-center md:text-left font-medium">
              {isLogin ? "Welcome back! Please enter your details." : "Create an account to start booking premium rides."}
            </p>
          </div>

          {/* Role toggle */}
          <div className="mb-6 flex w-full md:w-fit rounded-xl border border-border/60 bg-muted/40 p-1 backdrop-blur-sm">
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
            <div className="mb-6 rounded-2xl bg-primary/5 border border-primary/20 p-4 text-xs font-semibold text-primary leading-relaxed">
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
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-xs font-bold text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
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
                  className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="w-full rounded-xl border border-border/80 bg-background/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="+63 900 000 0000"
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
                  className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    className="w-full rounded-xl border border-border/80 bg-background/50 pl-4 pr-11 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              className="mt-4 flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
};

export default AuthPage;
