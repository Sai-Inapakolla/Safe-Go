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
});
