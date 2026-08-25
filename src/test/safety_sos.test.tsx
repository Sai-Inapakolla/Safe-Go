import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { SOSButton, Contact } from "@/components/SOSButton";
import { StatsCard } from "@/components/StatsCard";
import { ShieldCheck } from "lucide-react";

describe("Safety Components & Emergency SOS Functionality", () => {
  const originalGeolocation = navigator.geolocation;
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _id: "SOS_MOCK_ID", status: "active" }),
    });

    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 12.9716,
              longitude: 77.5946,
            },
          });
        }),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
    if (originalVibrate) {
      navigator.vibrate = originalVibrate;
    }
  });

  describe("UI & Static Safety Components", () => {
    it("should render SafetyScoreBar with exact score and custom label", () => {
      render(<SafetyScoreBar score={94} label="Night Route Safety" color="#4CAF50" />);
      expect(screen.getByText("Night Route Safety")).toBeInTheDocument();
      expect(screen.getByText("94%")).toBeInTheDocument();
    });

    it("should render StatsCard with correct values and icons", () => {
      render(
        <StatsCard
          icon={ShieldCheck}
          value="4,231"
          label="Covered Indian Cities"
          iconColor="#008080"
          iconBg="#E0F2F1"
        />
      );
      expect(screen.getByText("4,231")).toBeInTheDocument();
      expect(screen.getByText("Covered Indian Cities")).toBeInTheDocument();
    });

    it("should render SOSButton with buzzer-3d and accessibility attributes", () => {
      render(<SOSButton />);
      const btn = screen.getByRole("button", { name: /Emergency SOS Alert/i });
      expect(btn).toBeInTheDocument();
      expect(screen.getByText("SOS")).toBeInTheDocument();
      expect(screen.getByText(/Press to Alert/i)).toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  describe("Geolocation Scenarios", () => {
    it("should acquire precise GPS position and dispatch authenticated backend SOS", async () => {
      localStorage.setItem("token", "jwt-valid-sample-token");
      localStorage.setItem("safego_current_ride_id", "ride_7788");
      localStorage.setItem("safego_current_booking_destination", "Indiranagar, Bangalore");
      localStorage.setItem("safego_user", JSON.stringify({ id: "USR_101", full_name: "Pooja" }));

      const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 12.9784,
            longitude: 77.6408,
          },
        });
      });

      Object.defineProperty(navigator, "geolocation", {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true,
        writable: true,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: "SOS_SERVER_999",
          user_id: "USR_101",
          status: "active",
        }),
      });

      const onTrigger = vi.fn();
      render(<SOSButton onTrigger={onTrigger} />);

      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(onTrigger).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentPosition).toHaveBeenCalled();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/safety/sos"),
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer jwt-valid-sample-token",
            }),
            body: expect.stringContaining('"latitude":12.9784'),
          })
        );
      });

      // Verify broadcast in localStorage
      const broadcast = JSON.parse(localStorage.getItem("safego_new_sos") || "{}");
      expect(broadcast.id).toBe("SOS_SERVER_999");
      expect(broadcast.destination).toBe("Indiranagar, Bangalore");
      expect(broadcast.latitude).toBe(12.9784);
    });

    it("should handle Geolocation error and fallback to default safe coordinates", async () => {
      localStorage.setItem("token", "sample-token");

      const mockGetCurrentPosition = vi.fn().mockImplementation((_, error) => {
        error(new Error("User denied Geolocation"));
      });

      Object.defineProperty(navigator, "geolocation", {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true,
        writable: true,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: "SOS_FALLBACK_123", user_id: "USR_FALLBACK" }),
      });

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/safety/sos"),
          expect.objectContaining({
            body: expect.stringContaining('"latitude":12.9716'),
          })
        );
      });
    });

    it("should fallback cleanly when navigator.geolocation is not supported", async () => {
      localStorage.setItem("token", "sample-token");
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _id: "SOS_NOGEO_456" }),
      });

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/safety/sos"),
          expect.objectContaining({
            body: expect.stringContaining('"latitude":12.9716'),
          })
        );
      });
    });
  });

  describe("Authentication & Network Resilience", () => {
    it("should dispatch to guest public SOS endpoint when user is unauthenticated", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "success" }),
      });

      render(<SOSButton testerPhone="+919490969706" />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/safety/public-sos"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"emergency_contact_phone":"+919490969706"'),
          })
        );
      });
    });

    it("should gracefully handle backend HTTP 500 and network errors without crashing", async () => {
      localStorage.setItem("token", "sample-token");
      (global.fetch as any).mockRejectedValueOnce(new Error("Network connection dropped"));

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      // Modal should still display distress signal
      expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      
      // Local broadcast is still recorded after failure
      await waitFor(() => {
        const broadcast = localStorage.getItem("safego_new_sos");
        expect(broadcast).not.toBeNull();
      });
    });

    it("should trigger haptic vibration when navigator.vibrate is available", () => {
      const mockVibrate = vi.fn();
      navigator.vibrate = mockVibrate;

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(mockVibrate).toHaveBeenCalledWith([250, 100, 250]);
    });
  });

  describe("Emergency Contacts Variations", () => {
    it("should render populated contact list with correct phone links and relation fallbacks", () => {
      const mockContacts: Contact[] = [
        {
          _id: "c1",
          name: "Dr. Arvind Kumar",
          relationship: "Guardian",
          phone: "+919876543210",
          is_primary: true,
        },
        {
          id: "c2",
          name: "Sunita Kumar",
          relation: "Mother", // legacy schema fallback
          phone: "+919876543211",
        },
      ];

      render(<SOSButton contacts={mockContacts} />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(screen.getByText("Dr. Arvind Kumar")).toBeInTheDocument();
      expect(screen.getByText(/Guardian • \+919876543210/i)).toBeInTheDocument();
      expect(screen.getByText("Sunita Kumar")).toBeInTheDocument();
      expect(screen.getByText(/Mother • \+919876543211/i)).toBeInTheDocument();

      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "tel:+919876543210");
      expect(links[1]).toHaveAttribute("href", "tel:+919876543211");
    });

    it("should display empty state placeholder when no contacts are configured", () => {
      render(<SOSButton contacts={[]} />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(screen.getByText("No emergency contacts configured.")).toBeInTheDocument();
    });
  });

  describe("Lifecycle, Dispatch Escalation & Cancellation", () => {
    it("should dismiss modal and invoke cancel endpoint when Dismiss Alert is clicked", async () => {
      localStorage.setItem("token", "sample-token");
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: "SOS_TO_CANCEL_11" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "false_alarm" }),
        });

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      });

      const dismissBtn = screen.getByRole("button", { name: /Dismiss Alert/i });
      fireEvent.click(dismissBtn);

      await waitFor(() => {
        expect(screen.queryByText("Distress Signal Active")).not.toBeInTheDocument();
      });

      expect(localStorage.getItem("safego_new_sos")).toBeNull();
    });

    it("should dismiss modal when the top-right X close button is clicked", async () => {
      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", { name: /Close Distress Modal/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByText("Distress Signal Active")).not.toBeInTheDocument();
    });

    it("should dismiss modal on Escape keydown", async () => {
      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

      expect(screen.queryByText("Distress Signal Active")).not.toBeInTheDocument();
    });

    it("should execute Dispatch Authorities escalation and show confirmation badge", async () => {
      localStorage.setItem("token", "sample-token");
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: "SOS_DISPATCH_99" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "critical", notes: "Escalated" }),
        });

      render(<SOSButton testerPhone="+919490969706" />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      });

      const dispatchBtn = screen.getByRole("button", { name: /Dispatch Authorities/i });
      fireEvent.click(dispatchBtn);

      await waitFor(() => {
        expect(screen.getByText("Escalated to Tester & Admin Channels")).toBeInTheDocument();
      });
    });

    it("should handle error gracefully when cancel API call fails", async () => {
      localStorage.setItem("token", "sample-token");
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: "SOS_CANCEL_FAIL_ID" }),
        })
        .mockRejectedValueOnce(new Error("Cancel endpoint timeout"));

      render(<SOSButton />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      });

      const dismissBtn = screen.getByRole("button", { name: /Dismiss Alert/i });
      fireEvent.click(dismissBtn);

      await waitFor(() => {
        expect(screen.queryByText("Distress Signal Active")).not.toBeInTheDocument();
      });
    });

    it("should handle error gracefully when dispatch-authorities API call fails", async () => {
      localStorage.setItem("token", "sample-token");
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ _id: "SOS_DISPATCH_FAIL_ID" }),
        })
        .mockRejectedValueOnce(new Error("Escalation API 500 error"));

      render(<SOSButton testerPhone="+919490969706" />);
      fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));

      await waitFor(() => {
        expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      });

      const dispatchBtn = screen.getByRole("button", { name: /Dispatch Authorities/i });
      fireEvent.click(dispatchBtn);

      await waitFor(() => {
        expect(screen.getByText("Escalated to Tester & Admin Channels")).toBeInTheDocument();
      });
    });
  });

  describe("Storage Resilience & Repeated Triggering", () => {
    it("should handle localStorage failure gracefully", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      render(<SOSButton />);
      expect(() => {
        fireEvent.click(screen.getByRole("button", { name: /Emergency SOS Alert/i }));
      }).not.toThrow();

      expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
      setItemSpy.mockRestore();
    });

    it("should support repeated activation clicks cleanly", () => {
      const onTrigger = vi.fn();
      render(<SOSButton onTrigger={onTrigger} />);

      const sosBtn = screen.getByRole("button", { name: /Emergency SOS Alert/i });
      fireEvent.click(sosBtn);
      fireEvent.click(sosBtn);

      expect(onTrigger).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Distress Signal Active")).toBeInTheDocument();
    });
  });
});

