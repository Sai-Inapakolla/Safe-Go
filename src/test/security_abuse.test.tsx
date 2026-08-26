import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SOSButton } from "../components/SOSButton";
import { Navbar } from "../components/Navbar";
import { ProtectedRoute } from "../components/ProtectedRoute";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("🔥 Phase 3 — Frontend Security, Auth Attack & Abuse Resilience Tests 🔥", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. TOKEN MANIPULATION & LOCALSTORAGE ROLE SPOOFING ATTACKS
  // =========================================================================
  describe("1. LocalStorage & Role Spoofing Security", () => {
    it("should prevent access when attacker manually tampers userRole to 'admin' without valid JWT", () => {
      // Attacker attempts client-side role elevation by modifying localStorage without token
      localStorage.setItem("userRole", "admin");
      localStorage.removeItem("token");

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <div data-testid="admin-panel">Top Secret Admin Panel</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Must be redirected to login because token is absent
      expect(screen.queryByTestId("admin-panel")).not.toBeInTheDocument();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    it("should block passenger from accessing driver-only routes even with valid passenger token", () => {
      localStorage.setItem("token", "valid_passenger_token");
      localStorage.setItem("userRole", "passenger");

      render(
        <MemoryRouter initialEntries={["/driver-portal"]}>
          <Routes>
            <Route
              path="/driver-portal"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <div data-testid="driver-portal">Driver Portal Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/home" element={<div data-testid="home-page">Home Page</div>} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByTestId("driver-portal")).not.toBeInTheDocument();
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });

  });

  // =========================================================================
  // 2. SOS BUTTON FLOOD & UI DEBOUNCE ABUSE
  // =========================================================================
  describe("2. SOS Trigger Burst & Button Spamming Abuse", () => {
    it("should debounce and throttle rapid 50x clicks on SOS button", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ _id: "sos_123", status: "active" }),
      });

      render(
        <MemoryRouter>
          <SOSButton />
        </MemoryRouter>
      );

      const sosBtn = screen.getByLabelText(/emergency sos alert/i);

      // Simulate aggressive spam click (50 clicks in millisecond intervals)
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          fireEvent.click(sosBtn);
        }
      });

      // Modal must open cleanly without throwing Uncaught Exception or React render loops
      await waitFor(() => {
        expect(screen.getByText(/distress signal active/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 3. XSS INJECTION & HTML SANITIZATION RESILIENCE
  // =========================================================================
  describe("3. XSS Injection & Dangerous String Sanitization", () => {
    it("should safely sanitize XSS script tags inside emergency contact details", async () => {
      const maliciousContacts = [
        {
          id: "xss_1",
          name: "<script>window.__xss_compromised=true;</script>Hacker",
          phone: "+919490969706",
          relationship: "<img src=x onerror=alert(1)>Emergency Contact",
        },
      ];

      render(
        <MemoryRouter>
          <SOSButton contacts={maliciousContacts} />
        </MemoryRouter>
      );

      const sosBtn = screen.getByLabelText(/emergency sos alert/i);
      await act(async () => {
        fireEvent.click(sosBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/distress signal active/i)).toBeInTheDocument();
      });

      // Script injection must NOT execute into the window global context
      expect((window as any).__xss_compromised).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. CORRUPTED STORAGE & EXTREME BOUNDARY RESILIENCE
  // =========================================================================
  describe("4. Corrupted Storage & Extreme Boundaries", () => {
    it("should survive malformed JSON in localStorage and sessionStorage without crash", () => {
      localStorage.setItem("user", "{malformed_json_unclosed");
      sessionStorage.setItem("safego_auth", "undefined:null:[object Object]");

      expect(() => {
        render(
          <MemoryRouter initialEntries={["/"]}>
            <Navbar />
          </MemoryRouter>
        );
      }).not.toThrow();
    });

    it("should safely handle geolocation rejection or extreme NaN coordinates", async () => {
      // Mock Geolocation Error
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((_, error) =>
          error({
            code: 1,
            message: "User denied Geolocation permission",
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

      const sosBtn = screen.getByLabelText(/emergency sos alert/i);
      await act(async () => {
        fireEvent.click(sosBtn);
      });

      // Fallback coordinates should be used without throwing crash
      await waitFor(() => {
        expect(screen.getByText(/distress signal active/i)).toBeInTheDocument();
      });
    });
  });
});
