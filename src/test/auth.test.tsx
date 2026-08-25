import { describe, it, expect, vi, beforeEach } from "vitest";

// Pure validation and auth logic helpers
export function validateRegistrationForm(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}): { valid: boolean; error?: string } {
  if (!data.fullName.trim()) return { valid: false, error: "Full name is required" };
  if (!data.email.trim() || !data.email.includes("@")) return { valid: false, error: "Valid email is required" };
  if (!data.phone.trim() || data.phone.length < 10) return { valid: false, error: "Valid 10-digit phone number is required" };
  if (!data.password || data.password.length < 6) return { valid: false, error: "Password must be at least 6 characters" };
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

export function validateLoginForm(data: { email: string; password: string }): { valid: boolean; error?: string } {
  if (!data.email.trim()) return { valid: false, error: "Email is required" };
  if (!data.password) return { valid: false, error: "Password is required" };
  return { valid: true };
}

export function handleLoginSuccess(user: { id: string; role: "passenger" | "driver" | "admin"; token: string }): string {
  localStorage.setItem("token", user.token);
  localStorage.setItem("userRole", user.role);
  localStorage.setItem("userId", user.id);

  if (user.role === "admin") return "/admin";
  if (user.role === "driver") return "/driver";
  return "/home";
}

describe("Authentication & Role Authorization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should validate complete registration form inputs", () => {
    const validData = {
      fullName: "Ananya Roy",
      email: "ananya@safego.in",
      phone: "+919876543210",
      password: "SecretPassword123",
      confirmPassword: "SecretPassword123",
    };
    const res = validateRegistrationForm(validData);
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("should reject registration with mismatched passwords", () => {
    const mismatch = {
      fullName: "Ananya Roy",
      email: "ananya@safego.in",
      phone: "+919876543210",
      password: "PasswordA123",
      confirmPassword: "PasswordB123",
    };
    const res = validateRegistrationForm(mismatch);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Passwords do not match");
  });

  it("should reject registration with short passwords (< 6 characters)", () => {
    const shortPass = {
      fullName: "Ananya Roy",
      email: "ananya@safego.in",
      phone: "+919876543210",
      password: "123",
      confirmPassword: "123",
    };
    const res = validateRegistrationForm(shortPass);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("at least 6 characters");
  });

  it("should validate login credentials requirements", () => {
    expect(validateLoginForm({ email: "", password: "pass" }).valid).toBe(false);
    expect(validateLoginForm({ email: "user@test.com", password: "" }).valid).toBe(false);
    expect(validateLoginForm({ email: "user@test.com", password: "validPassword" }).valid).toBe(true);
  });

  it("should direct Passenger to /home upon successful login", () => {
    const redirect = handleLoginSuccess({ id: "p1", role: "passenger", token: "jwt_passenger_token" });
    expect(redirect).toBe("/home");
    expect(localStorage.getItem("token")).toBe("jwt_passenger_token");
    expect(localStorage.getItem("userRole")).toBe("passenger");
  });

  it("should direct Driver to /driver portal upon successful login", () => {
    const redirect = handleLoginSuccess({ id: "d1", role: "driver", token: "jwt_driver_token" });
    expect(redirect).toBe("/driver");
    expect(localStorage.getItem("userRole")).toBe("driver");
  });

  it("should direct Admin to /admin dashboard upon successful login", () => {
    const redirect = handleLoginSuccess({ id: "a1", role: "admin", token: "jwt_admin_token" });
    expect(redirect).toBe("/admin");
    expect(localStorage.getItem("userRole")).toBe("admin");
  });
});
