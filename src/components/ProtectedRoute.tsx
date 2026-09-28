import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ children, allowedRoles, redirectTo }: ProtectedRouteProps) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");
  const toastShown = useRef(false);

  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (!isAuthenticated && !toastShown.current) {
      toastShown.current = true;
      toast.error("Authentication Required", {
        description: "Please log in or sign up to access this service.",
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    if (userRole === "driver") {
      if (!toastShown.current) {
        toastShown.current = true;
        toast.info("Driver Account Active", {
          description: "Driver accounts are automatically redirected to the Driver Portal.",
          duration: 4500,
        });
      }
      return <Navigate to={redirectTo || "/driver"} replace />;
    }

    if (!toastShown.current) {
      toastShown.current = true;
      toast.error("Access Denied", {
        description: "You do not have permission to access this page.",
      });
    }
    return <Navigate to={redirectTo || "/home"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
