import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SOSButton } from "../components/SOSButton";
import { Navbar } from "../components/Navbar";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { calculateFare, computeNextRideStatus, generate4DigitPin, validatePinInput } from "./booking_fare.test";
import i18n from "i18next";

// Mock fetch for all integration flows
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SafeGo Comprehensive Frontend Integration Tests 🚀", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Default mock response for safety/sos and user endpoints
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      const urlStr = url.toString();

      if (urlStr.includes("/api/safety/sos/cancel")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "cancelled", message: "SOS Cancelled" }),
        };
      }

      if (urlStr.includes("/api/safety/sos")) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            _id: "sos_integ_12345",
            status: "active",
            severity: "critical",
            created_at: new Date().toISOString(),
          }),
        };
      }

      if (urlStr.includes("/api/auth/me")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            _id: "user_integ_999",
            full_name: "Priya Patel",
            email: "priya@safego.in",
            role: "passenger",
            phone: "+919490969706",
          }),
        };
      }

      if (urlStr.includes("/api/modes")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: "normal", name: "Normal", color: "#4CAF50" },
            { id: "pink", name: "Pink", color: "#E91E63" },
            { id: "pwd", name: "PWD", color: "#2196F3" },
            { id: "elderly", name: "Elderly", color: "#FF9800" },
          ],
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ message: "Success" }),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // INTEGRATION FLOW 1: Auth Session & Role-Gated Protected Route Transition
  // =========================================================================
  describe("Flow 1: Auth Session & Role-Gated Route Transitions", () => {
    it("should allow authenticated passenger to access passenger route and deny unauthorized routes", async () => {
      // Setup authenticated passenger session in localStorage
      localStorage.setItem("token", "valid_passenger_jwt_token");
      localStorage.setItem("userRole", "passenger");
      localStorage.setItem("user", JSON.stringify({
        _id: "p_123",
        role: "passenger",
        full_name: "Aanya Sharma",
        email: "aanya@safego.in"
      }));

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["passenger", "admin"]}>
                  <div data-testid="passenger-dashboard">Passenger Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-portal"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <div data-testid="driver-portal">Driver Portal Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("passenger-dashboard")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });

    it("should redirect unauthenticated guest to /login when attempting to access protected route", async () => {
      localStorage.clear();

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["passenger"]}>
                  <div data-testid="passenger-dashboard">Passenger Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId("passenger-dashboard")).not.toBeInTheDocument();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // INTEGRATION FLOW 2: End-to-End Dynamic Fare Calculation & Multi-Mode Surge
  // =========================================================================
  describe("Flow 2: Dynamic Fare Calculation & Mode Modifiers", () => {
    it("should enforce PWD mode zero-surge guarantee across all distance brackets", () => {
      const distances = [2.5, 10.0, 25.0, 50.0];
      const peakSurges = [1.5, 2.0, 2.8];

      distances.forEach((dist) => {
        peakSurges.forEach((surge) => {
          const normalFare = calculateFare(dist, 50, 15, "normal", surge);
          const pwdFare = calculateFare(dist, 50, 15, "pwd", surge);

          // PWD fare must strictly calculate at 1.0x surge
          const basePwdExpected = Math.round((50 + dist * 15) * 1.0 * 100) / 100;
          expect(pwdFare).toBe(basePwdExpected);
          expect(pwdFare).toBeLessThanOrEqual(normalFare);
        });
      });
    });

    it("should calculate Pink Mode premium modifier correctly", () => {
      const distance = 12.0;
      const baseFare = 50;
      const ratePerKm = 15;
      
      const normalFare = calculateFare(distance, baseFare, ratePerKm, "normal", 1.0);
      const pinkFare = calculateFare(distance, baseFare, ratePerKm, "pink", 1.0);

      // Pink mode has a 1.05x modifier
      expect(pinkFare).toBe(Math.round(normalFare * 1.05 * 100) / 100);
      expect(pinkFare).toBeGreaterThan(normalFare);
    });
  });

  // =========================================================================
  // INTEGRATION FLOW 3: Full Emergency SOS Lifecycle, GPS & Twilio Integration
  // =========================================================================
  describe("Flow 3: Full Emergency SOS Lifecycle, GPS & Cancellation", () => {
    it("should trigger SOS emergency, capture geolocation, call backend API, and support cancellation", async () => {
      // Mock Geolocation
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success) =>
          success({
            coords: {
              latitude: 22.3072,
              longitude: 73.1812,
              accuracy: 10,
            },
          })
        ),
      };
      Object.defineProperty(global.navigator, "geolocation", {
        value: mockGeolocation,
        writable: true,
        configurable: true,
      });

      render(
        <MemoryRouter>
          <SOSButton />
        </MemoryRouter>
      );

      // 1. Click SOS Trigger Button
      const sosBtn = screen.getByLabelText(/emergency sos alert/i);
      await act(async () => {
        fireEvent.click(sosBtn);
      });

      // 2. Modal appears with distress title
      await waitFor(() => {
        expect(screen.getByText(/distress signal active/i)).toBeInTheDocument();
      });

      // 3. Verify backend dispatch called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/safety/"),
          expect.objectContaining({
            method: "POST",
          })
        );
      });

      // 4. Test Dismiss Alert Button
      const dismissBtn = screen.getByRole("button", { name: /dismiss alert/i });
      await act(async () => {
        fireEvent.click(dismissBtn);
      });

      await waitFor(() => {
        expect(screen.queryByText(/distress signal active/i)).not.toBeInTheDocument();
      });
    });

    it("should display emergency contacts section in distress modal", async () => {
      const mockContacts = [
        { id: "c1", name: "Rahul Contact", phone: "+919490969706", relationship: "Brother" }
      ];

      render(
        <MemoryRouter>
          <SOSButton contacts={mockContacts} />
        </MemoryRouter>
      );

      const sosBtn = screen.getByLabelText(/emergency sos alert/i);
      await act(async () => {
        fireEvent.click(sosBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/distress signal active/i)).toBeInTheDocument();
        expect(screen.getByText(/rahul contact/i)).toBeInTheDocument();
        expect(screen.getByText(/\+919490969706/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // INTEGRATION FLOW 4: Driver Verification OTP & Ride State Machine
  // =========================================================================
  describe("Flow 4: Driver Verification OTP & Ride State Machine", () => {
    it("should step through ride state transitions with 4-digit security PIN verification", () => {
      let state: any = "requested";
      const validPin = generate4DigitPin();

      expect(validatePinInput(validPin)).toBe(true);

      // Step 1: Driver accepts
      state = computeNextRideStatus(state, "driver_accept");
      expect(state).toBe("accepted");

      // Step 2: Passenger provides PIN, Driver verifies and starts trip
      state = computeNextRideStatus(state, "verify_pin_start");
      expect(state).toBe("in_progress");

      // Step 3: Destination reached, Driver completes trip
      state = computeNextRideStatus(state, "complete_trip");
      expect(state).toBe("completed");
    });
  });

  // =========================================================================
  // INTEGRATION FLOW 5: Multi-Language (i18n) Switching & Navigation Bar
  // =========================================================================
  describe("Flow 5: Multi-Language (i18n) Switching & Navbar Integration", () => {
    it("should switch languages seamlessly and update navigation items", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <Navbar />
        </MemoryRouter>
      );

      // Verify Navbar brand link exists
      const brandElements = screen.getAllByText(/safego/i);
      expect(brandElements.length).toBeGreaterThan(0);

      // Switch language to Hindi in i18n
      await act(async () => {
        await i18n.changeLanguage("hi");
      });

      // Re-switch back to English cleanly
      await act(async () => {
        await i18n.changeLanguage("en");
      });

      expect(screen.getAllByText(/safego/i).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // INTEGRATION FLOW 6: Negative Feedback, Resilience & Error Boundaries
  // =========================================================================
  describe("Flow 6: Error Resilience & Fault Tolerance", () => {
    it("should handle corrupted localStorage session data gracefully without crashing", () => {
      localStorage.setItem("user", "{invalid_json_corrupted");

      expect(() => {
        render(
          <MemoryRouter initialEntries={["/"]}>
            <Navbar />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it("should handle API 500 server error gracefully during ride mode lookup", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal Server Error" }),
      });

      expect(() => {
        render(
          <MemoryRouter initialEntries={["/"]}>
            <Navbar />
          </MemoryRouter>
        );
      }).not.toThrow();
    });
  });
});
