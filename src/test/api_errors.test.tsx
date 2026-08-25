import { describe, it, expect, vi, beforeEach } from "vitest";

// API error response parser utility
export function parseApiError(status: number, data?: any): { message: string; isAuthError: boolean } {
  if (status === 401 || status === 403) {
    return {
      message: data?.detail || data?.message || "Authentication expired. Please log in again.",
      isAuthError: true,
    };
  }
  if (status === 404) {
    return {
      message: data?.detail || "The requested ride or resource was not found.",
      isAuthError: false,
    };
  }
  if (status === 422) {
    const errorDetails = data?.detail?.[0]?.msg || "Invalid input parameters.";
    return {
      message: errorDetails,
      isAuthError: false,
    };
  }
  if (status >= 500) {
    return {
      message: "SafeGo server is currently busy. Please try again in a moment.",
      isAuthError: false,
    };
  }
  return {
    message: data?.message || "An unexpected error occurred.",
    isAuthError: false,
  };
}

export function handleAuthTokenExpiry(error: { isAuthError: boolean }): boolean {
  if (error.isAuthError) {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    return true; // redirected to login
  }
  return false;
}

describe("API Error Handling & Network Resilience", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should parse 401 Unauthorized errors and trigger auth cleanup", () => {
    localStorage.setItem("token", "expired_token_123");
    localStorage.setItem("userRole", "passenger");

    const err = parseApiError(401, { detail: "Could not validate credentials" });
    expect(err.isAuthError).toBe(true);
    expect(err.message).toBe("Could not validate credentials");

    const didRedirect = handleAuthTokenExpiry(err);
    expect(didRedirect).toBe(true);
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("should parse 404 Resource Not Found errors gracefully", () => {
    const err = parseApiError(404, { detail: "Ride not found or expired" });
    expect(err.isAuthError).toBe(false);
    expect(err.message).toBe("Ride not found or expired");
  });

  it("should parse 422 Validation Error details from FastAPI response", () => {
    const pydanticError = {
      detail: [{ loc: ["body", "phone"], msg: "Invalid Indian phone number format", type: "value_error" }],
    };
    const err = parseApiError(422, pydanticError);
    expect(err.message).toBe("Invalid Indian phone number format");
  });

  it("should handle 500 internal server errors with user-friendly fallback", () => {
    const err = parseApiError(500);
    expect(err.message).toContain("SafeGo server is currently busy");
  });
});
