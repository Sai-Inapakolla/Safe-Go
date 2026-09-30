import { describe, it, expect } from "vitest";

interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicle: {
    model: string;
    plateNumber: string;
    color: string;
    hasWheelchairRamp: boolean;
  };
  gender: "male" | "female" | "other";
  rating: number;
  totalTrips: number;
  certifiedModes: string[];
}

export function isDriverEligibleForMode(driver: DriverProfile, mode: "normal" | "pink" | "pwd" | "elderly"): boolean {
  if (!driver.certifiedModes.includes(mode)) {
    return false;
  }
  if (mode === "pink" && driver.gender !== "female") {
    return false;
  }
  if (mode === "pwd" && !driver.vehicle.hasWheelchairRamp) {
    return false;
  }
  return true;
}

export function findBestDriverMatch(drivers: DriverProfile[], requestedMode: "normal" | "pink" | "pwd" | "elderly"): DriverProfile | null {
  const eligible = drivers.filter((d) => isDriverEligibleForMode(d, requestedMode));
  if (eligible.length === 0) return null;
  // Sort by highest rating, then highest trip count
  return eligible.sort((a, b) => b.rating - a.rating || b.totalTrips - a.totalTrips)[0];
}

const mockFleet: DriverProfile[] = [
  {
    id: "d1",
    name: "Priya Singh",
    phone: "+919811122233",
    vehicle: { model: "Maruti Dzire", plateNumber: "MH-01-AB-1234", color: "Silver", hasWheelchairRamp: false },
    gender: "female",
    rating: 4.95,
    totalTrips: 1420,
    certifiedModes: ["normal", "pink", "elderly"],
  },
  {
    id: "d2",
    name: "Vihaan Gupta",
    phone: "+919822233344",
    vehicle: { model: "Toyota Innova Crysta", plateNumber: "MH-02-CD-5678", color: "White", hasWheelchairRamp: true },
    gender: "male",
    rating: 4.88,
    totalTrips: 980,
    certifiedModes: ["normal", "pwd", "elderly"],
  },
  {
    id: "d3",
    name: "Amit Patel",
    phone: "+919833344455",
    vehicle: { model: "Hyundai Aura", plateNumber: "GJ-06-EF-9012", color: "White", hasWheelchairRamp: false },
    gender: "male",
    rating: 4.75,
    totalTrips: 450,
    certifiedModes: ["normal"],
  },
];

describe("Driver Assignment & Fleet Matching", () => {
  it("should match Pink Mode rides strictly with verified female drivers", () => {
    const matched = findBestDriverMatch(mockFleet, "pink");
    expect(matched).not.toBeNull();
    expect(matched?.id).toBe("d1");
    expect(matched?.name).toBe("Priya Singh");
    expect(matched?.gender).toBe("female");
  });

  it("should match PWD Mode rides strictly with wheelchair ramp-equipped vehicles", () => {
    const matched = findBestDriverMatch(mockFleet, "pwd");
    expect(matched).not.toBeNull();
    expect(matched?.id).toBe("d2");
    expect(matched?.name).toBe("Vihaan Gupta");
    expect(matched?.vehicle.hasWheelchairRamp).toBe(true);
  });

  it("should match Normal Mode rides with the highest-rated eligible driver", () => {
    const matched = findBestDriverMatch(mockFleet, "normal");
    expect(matched).not.toBeNull();
    // Priya has 4.95 rating vs Vihaan 4.88 and Amit 4.75
    expect(matched?.name).toBe("Priya Singh");
    expect(matched?.rating).toBe(4.95);
  });

  it("should reject ineligible drivers for specialized safety modes", () => {
    const amit = mockFleet[2];
    expect(isDriverEligibleForMode(amit, "pink")).toBe(false); // male, not certified for pink
    expect(isDriverEligibleForMode(amit, "pwd")).toBe(false); // no wheelchair ramp
    expect(isDriverEligibleForMode(amit, "normal")).toBe(true);
  });

  it("should render DriverNavigationMap with destination and passenger details", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { DriverNavigationMap } = await import("@/components/DriverNavigationMap");

    const { unmount } = render(
      <DriverNavigationMap
        pickup="Sayaji Baug, Vadodara"
        destination="Vadodara Central Station"
        passengerName="Kavita Rao"
        passengerPhone="+919876543210"
        fare="₹250"
        isOtpVerified={true}
      />
    );

    expect(screen.getByText("DRIVER NAVIGATION")).toBeInTheDocument();
    expect(screen.getByText("On Road ➔ Destination")).toBeInTheDocument();
    expect(screen.getByText("Call Rider")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call Rider/i })).toHaveAttribute("href", "tel:+919876543210");
    unmount();
  });

  it("should initialize Leaflet satellite map, plot route polyline, and handle recenter click", async () => {
    const { render, screen, fireEvent, waitFor } = await import("@testing-library/react");
    const { DriverNavigationMap } = await import("@/components/DriverNavigationMap");

    const mockMap = {
      setView: vi.fn().mockReturnThis(),
      fitBounds: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    };
    const mockPolyline: any = {
      addTo: vi.fn(),
      getBounds: vi.fn().mockReturnValue([[22.3, 73.3], [22.4, 73.4]]),
    };
    mockPolyline.addTo.mockReturnValue(mockPolyline);

    const mockMarker: any = {
      addTo: vi.fn(),
      bindPopup: vi.fn(),
    };
    mockMarker.addTo.mockReturnValue(mockMarker);
    mockMarker.bindPopup.mockReturnValue(mockMarker);

    const mockTileLayer: any = {
      addTo: vi.fn(),
    };
    mockTileLayer.addTo.mockReturnValue(mockTileLayer);

    (window as any).L = {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue(mockTileLayer),
      divIcon: vi.fn().mockReturnValue({}),
      marker: vi.fn().mockReturnValue(mockMarker),
      polyline: vi.fn().mockReturnValue(mockPolyline),
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        distance_km: 14.5,
        duration_minutes: 18,
        route_polyline: JSON.stringify({
          coordinates: [[73.3762, 22.3023], [73.24, 22.35]],
        }),
      }),
    }) as any;

    const { unmount } = render(
      <DriverNavigationMap
        pickup="Sayaji Baug, Vadodara"
        pickupLat={22.3023}
        pickupLng={73.3762}
        destination="Vadodara Central Station"
        destLat={22.35}
        destLng={73.24}
        isOtpVerified={false}
      />
    );

    expect(screen.getByText("Heading to Pickup")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("14.5 km")).toBeInTheDocument();
    });

    // Verify recenter button triggers fitBounds
    const recenterBtn = screen.getByTitle("Recenter Route");
    fireEvent.click(recenterBtn);

    expect(mockMap.fitBounds).toHaveBeenCalled();

    unmount();
    expect(mockMap.remove).toHaveBeenCalled();

    global.fetch = originalFetch;
    delete (window as any).L;
  });
});
