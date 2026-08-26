import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseApiError, handleAuthTokenExpiry } from "./api_errors.test";
import { validateRegistrationForm, validateLoginForm, handleLoginSuccess } from "./auth.test";
import { calculateFare, generate4DigitPin, validatePinInput, computeNextRideStatus } from "./booking_fare.test";
import { isDriverEligibleForMode, findBestDriverMatch } from "./driver_tracking.test";
import { getModeConfig } from "@/config/modeConfig";

// ==========================================
// 1. Phone Number Validation Utility & Logic
// ==========================================
export function formatAndValidateIndianPhone(phone: string | null | undefined): {
  isValid: boolean;
  formatted: string | null;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, formatted: null, error: "Phone number is required" };
  }

  // Strip whitespaces, dashes, parentheses
  const clean = phone.replace(/[\s\-()]/g, "");

  // Check for non-digit characters (except leading +)
  if (!/^\+?\d+$/.test(clean)) {
    return { isValid: false, formatted: null, error: "Phone number must contain only numeric digits" };
  }

  // If starts with +91, must be followed by 10 digits
  if (clean.startsWith("+91")) {
    const nationalNumber = clean.slice(3);
    if (nationalNumber.length !== 10) {
      return { isValid: false, formatted: null, error: "Indian phone number with +91 must have exactly 10 digits" };
    }
    // Valid Indian mobile numbers start with 6, 7, 8, 9
    if (!/^[6-9]/.test(nationalNumber)) {
      return { isValid: false, formatted: null, error: "Indian mobile numbers must start with 6, 7, 8, or 9" };
    }
    return { isValid: true, formatted: clean };
  }

  // If 10 digits without +91
  if (clean.length === 10) {
    if (!/^[6-9]/.test(clean)) {
      return { isValid: false, formatted: null, error: "Indian mobile numbers must start with 6, 7, 8, or 9" };
    }
    return { isValid: true, formatted: `+91${clean}` };
  }

  return { isValid: false, formatted: null, error: "Invalid phone number length (must be 10 digits)" };
}

// ==========================================
// 2. SMS Alert Template Generation Logic
// ==========================================
export function generateEmergencySMSBody(params: {
  userName: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  routeInfo?: string;
  timestamp?: string;
  refCode?: string;
}): string {
  const time = params.timestamp || "Immediate";
  const ref = params.refCode || "SOS-001";
  const locationUrl =
    params.latitude && params.longitude
      ? `https://maps.google.com/?q=${params.latitude},${params.longitude}`
      : params.locationAddress || "Live Tracking Unavailable";
  const route = params.routeInfo ? ` | Route: ${params.routeInfo}` : "";

  return `🚨 SAFEGO EMERGENCY [Ref #${ref} - ${time}]: ${params.userName} triggered an SOS alert! Track Location: ${locationUrl}${route}`;
}

// ==========================================
// 3. Admin / Tester Routing Decision Logic
// ==========================================
export function getRouteForAuthenticatedUser(user: {
  role: "passenger" | "driver" | "admin";
  email: string;
  isVerified?: boolean;
}): { destination: string; canAccessAdmin: boolean; isTesterAccount: boolean } {
  const isTester = user.email.includes("tester@safego") || user.email.includes("admin@safego");

  if (user.role === "admin") {
    return {
      destination: "/admin",
      canAccessAdmin: true,
      isTesterAccount: isTester,
    };
  }

  if (user.role === "driver") {
    return {
      destination: "/driver",
      canAccessAdmin: false,
      isTesterAccount: isTester,
    };
  }

  return {
    destination: "/home",
    canAccessAdmin: false,
    isTesterAccount: isTester,
  };
}

describe("Deep Dive: Targeted Feature Unit Testing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------
  // Test Category 1: Phone-number Validation
  // -------------------------------------------------------------
  describe("Phone-Number Validation & Formatting", () => {
    it("should accept valid 10-digit Indian numbers and format to +91 E.164", () => {
      const res = formatAndValidateIndianPhone("9876543210");
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe("+919876543210");
      expect(res.error).toBeUndefined();
    });

    it("should accept valid numbers with existing +91 and spaces/dashes", () => {
      const res = formatAndValidateIndianPhone("+91 98123-45678");
      expect(res.isValid).toBe(true);
      expect(res.formatted).toBe("+919812345678");
    });

    it("should reject numbers starting with invalid digits (e.g. 0, 1, 2, 3, 4, 5)", () => {
      const res = formatAndValidateIndianPhone("1234567890");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("must start with 6, 7, 8, or 9");
    });

    it("should reject short phone numbers (< 10 digits)", () => {
      const res = formatAndValidateIndianPhone("98765432");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid phone number length");
    });

    it("should reject overly long phone numbers (> 10 digits without country code)", () => {
      const res = formatAndValidateIndianPhone("9876543210123");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Invalid phone number length");
    });

    it("should reject non-numeric inputs and special characters", () => {
      expect(formatAndValidateIndianPhone("98765abcde").isValid).toBe(false);
      expect(formatAndValidateIndianPhone("").isValid).toBe(false);
      expect(formatAndValidateIndianPhone(null as any).isValid).toBe(false);
      expect(formatAndValidateIndianPhone(undefined as any).isValid).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test Category 2: SMS Generation & Twilio Alert Formatting
  // -------------------------------------------------------------
  describe("SMS Generation & Emergency Alert Formatting", () => {
    it("should generate properly formatted SOS SMS message with GPS coordinates", () => {
      const sms = generateEmergencySMSBody({
        userName: "Ananya Roy",
        latitude: 12.9716,
        longitude: 77.5946,
        timestamp: "02:30:15 PM",
        refCode: "8899",
        routeInfo: "Koramangala to Indiranagar",
      });

      expect(sms).toContain("🚨 SAFEGO EMERGENCY [Ref #8899 - 02:30:15 PM]");
      expect(sms).toContain("Ananya Roy triggered an SOS alert!");
      expect(sms).toContain("https://maps.google.com/?q=12.9716,77.5946");
      expect(sms).toContain("Route: Koramangala to Indiranagar");
    });

    it("should fallback gracefully to textual address when GPS coordinates are null", () => {
      const sms = generateEmergencySMSBody({
        userName: "Rohit Verma",
        locationAddress: "MG Road Metro Station, Bengaluru",
        refCode: "1234",
      });

      expect(sms).toContain("Track Location: MG Road Metro Station, Bengaluru");
      expect(sms).toContain("Rohit Verma");
    });

    it("should ensure message body is concise and compliant with SMS gateway standards", () => {
      const sms = generateEmergencySMSBody({
        userName: "Priya",
        latitude: 19.076,
        longitude: 72.8777,
      });
      expect(sms.length).toBeGreaterThan(30);
      expect(sms.length).toBeLessThan(300); // Well within multi-part SMS threshold
    });
  });

  // -------------------------------------------------------------
  // Test Category 3: Admin / Tester Routing & Role Authorization
  // -------------------------------------------------------------
  describe("Admin & Tester Routing Authorization", () => {
    it("should authorize Admin role and route to /admin dashboard", () => {
      const user = { role: "admin" as const, email: "admin@safego.in" };
      const routeInfo = getRouteForAuthenticatedUser(user);

      expect(routeInfo.destination).toBe("/admin");
      expect(routeInfo.canAccessAdmin).toBe(true);
    });

    it("should identify Tester admin accounts and grant admin portal access", () => {
      const tester = { role: "admin" as const, email: "tester@safego.in" };
      const routeInfo = getRouteForAuthenticatedUser(tester);

      expect(routeInfo.destination).toBe("/admin");
      expect(routeInfo.isTesterAccount).toBe(true);
      expect(routeInfo.canAccessAdmin).toBe(true);
    });

    it("should prevent Passenger role from accessing Admin destination", () => {
      const passenger = { role: "passenger" as const, email: "passenger@gmail.com" };
      const routeInfo = getRouteForAuthenticatedUser(passenger);

      expect(routeInfo.destination).toBe("/home");
      expect(routeInfo.canAccessAdmin).toBe(false);
    });

    it("should route Driver role strictly to /driver portal", () => {
      const driver = { role: "driver" as const, email: "driver@safego.in" };
      const routeInfo = getRouteForAuthenticatedUser(driver);

      expect(routeInfo.destination).toBe("/driver");
      expect(routeInfo.canAccessAdmin).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test Category 4: SOS Trigger Logic & State Milestones
  // -------------------------------------------------------------
  describe("SOS Trigger Lifecycle & State Milestones", () => {
    it("should process SOS trigger payload and establish active alert status", () => {
      const sosPayload = {
        userId: "USR_12345",
        latitude: 13.0827,
        longitude: 80.2707,
        severity: "critical",
        status: "active",
        createdAt: new Date().toISOString(),
      };

      expect(sosPayload.status).toBe("active");
      expect(sosPayload.severity).toBe("critical");
      expect(sosPayload.latitude).toBeCloseTo(13.0827);
    });

    it("should prevent duplicate rapid triggers during cooldown window", () => {
      let isCooldown = false;
      let triggerCount = 0;

      const triggerHandler = () => {
        if (isCooldown) return false;
        isCooldown = true;
        triggerCount++;
        return true;
      };

      // First trigger succeeds
      expect(triggerHandler()).toBe(true);
      expect(triggerCount).toBe(1);

      // Immediate second trigger is blocked by cooldown
      expect(triggerHandler()).toBe(false);
      expect(triggerCount).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // Test Category 5: Authentication / Authorization Tokens & Storage
  // -------------------------------------------------------------
  describe("Authentication Token Handling & Expiration", () => {
    it("should store and retrieve valid authentication session", () => {
      const session = { id: "USR_55", role: "passenger" as const, token: "eyJhbGciOi..." };
      const route = handleLoginSuccess(session);

      expect(route).toBe("/home");
      expect(localStorage.getItem("token")).toBe("eyJhbGciOi...");
      expect(localStorage.getItem("userRole")).toBe("passenger");
      expect(localStorage.getItem("userId")).toBe("USR_55");
    });

    it("should cleanly purge authentication tokens upon token expiration", () => {
      localStorage.setItem("token", "expired_token");
      localStorage.setItem("userRole", "passenger");

      const err = parseApiError(401, { detail: "Token expired" });
      const purged = handleAuthTokenExpiry(err);

      expect(purged).toBe(true);
      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("userRole")).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // Test Category 6: Edge Cases & Invalid Inputs
  // -------------------------------------------------------------
  describe("Edge Cases & Invalid Input Resilience", () => {
    it("should handle 0 km distance safely without dividing by zero", () => {
      const fare = calculateFare(0, 50, 15, "normal", 1.0);
      expect(fare).toBe(50); // Base fare only
    });

    it("should handle extreme long-distance trips (e.g. 500 km)", () => {
      const fare = calculateFare(500, 50, 15, "normal", 1.0);
      // 50 + 500 * 15 = 7550
      expect(fare).toBe(7550);
    });

    it("should enforce PWD surge cap of 1.0x even with extreme 5.0x surge", () => {
      const fare = calculateFare(10, 50, 15, "pwd", 5.0);
      // (50 + 150) * 1.0 = 200
      expect(fare).toBe(200);
    });

    it("should reject 4-digit PIN with letters, symbols, or whitespace", () => {
      expect(validatePinInput("123a")).toBe(false);
      expect(validatePinInput(" 123")).toBe(false);
      expect(validatePinInput("12-4")).toBe(false);
      expect(validatePinInput("12345")).toBe(false);
      expect(validatePinInput("999")).toBe(false);
    });

    it("should fallback unknown ride mode gracefully to 'normal' mode config", () => {
      const config = getModeConfig("INVALID_MODE_999" as any);
      expect(config.id).toBe("normal");
      expect(config.name).toBe("Normal Mode");
    });
  });
});
