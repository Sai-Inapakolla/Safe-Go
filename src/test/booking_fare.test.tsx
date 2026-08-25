import { describe, it, expect } from "vitest";

// Domain logic functions to test
export function calculateFare(
  distanceKm: number,
  baseFare: number,
  ratePerKm: number,
  mode: "normal" | "pink" | "pwd" | "elderly",
  surgeMultiplier: number = 1.0
): number {
  let modeMultiplier = 1.0;
  if (mode === "pink") modeMultiplier = 1.05;
  if (mode === "pwd") {
    // Strict PWD protection: surge capped at 1.0x
    surgeMultiplier = Math.min(1.0, surgeMultiplier);
    modeMultiplier = 1.0;
  }
  if (mode === "elderly") {
    surgeMultiplier = Math.min(1.1, surgeMultiplier);
    modeMultiplier = 1.0;
  }

  const rawFare = (baseFare + distanceKm * ratePerKm) * modeMultiplier * surgeMultiplier;
  return Math.round(rawFare * 100) / 100;
}

export function generate4DigitPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function validatePinInput(input: string): boolean {
  return /^\d{4}$/.test(input);
}

export function computeNextRideStatus(
  currentStatus: "requested" | "accepted" | "in_progress" | "completed",
  action: "driver_accept" | "verify_pin_start" | "complete_trip"
): string {
  switch (action) {
    case "driver_accept":
      if (currentStatus === "requested") return "accepted";
      break;
    case "verify_pin_start":
      if (currentStatus === "accepted") return "in_progress";
      break;
    case "complete_trip":
      if (currentStatus === "in_progress") return "completed";
      break;
  }
  return currentStatus;
}

describe("Booking Creation, Fare Calculation & Security OTP", () => {
  it("should calculate standard normal mode fare accurately", () => {
    const fare = calculateFare(10, 50, 15, "normal", 1.0);
    // (50 + 10 * 15) * 1.0 * 1.0 = 200
    expect(fare).toBe(200);
  });

  it("should calculate surge pricing for peak rush hours", () => {
    const surgedFare = calculateFare(10, 50, 15, "normal", 1.5);
    // (50 + 150) * 1.5 = 300
    expect(surgedFare).toBe(300);
  });

  it("should enforce PWD mode fare protection: surge is strictly capped at 1.0x", () => {
    const pwdSurgedFare = calculateFare(10, 50, 15, "pwd", 2.0); // 2.0x surge requested
    // PWD must ignore the 2.0x surge and stay at 1.0x
    expect(pwdSurgedFare).toBe(200);
  });

  it("should cap Elderly mode surge at a maximum of 1.1x", () => {
    const elderlySurgedFare = calculateFare(10, 50, 15, "elderly", 1.8);
    // (200) * 1.1 = 220
    expect(elderlySurgedFare).toBe(220);
  });

  it("should generate valid 4-digit numeric OTP security PINs", () => {
    for (let i = 0; i < 50; i++) {
      const pin = generate4DigitPin();
      expect(pin).toHaveLength(4);
      expect(validatePinInput(pin)).toBe(true);
      expect(Number(pin)).toBeGreaterThanOrEqual(1000);
      expect(Number(pin)).toBeLessThanOrEqual(9999);
    }
  });

  it("should reject invalid PIN formats", () => {
    expect(validatePinInput("123")).toBe(false);
    expect(validatePinInput("12345")).toBe(false);
    expect(validatePinInput("12a4")).toBe(false);
    expect(validatePinInput("")).toBe(false);
    expect(validatePinInput(" 123")).toBe(false);
  });

  it("should progress ride lifecycle correctly through security milestones", () => {
    let status: any = "requested";
    
    // Driver accepts ride
    status = computeNextRideStatus(status, "driver_accept");
    expect(status).toBe("accepted");

    // Driver verifies passenger's 4-digit PIN to start trip
    status = computeNextRideStatus(status, "verify_pin_start");
    expect(status).toBe("in_progress");

    // Driver completes the trip
    status = computeNextRideStatus(status, "complete_trip");
    expect(status).toBe("completed");
  });

  it("should prevent starting trip without driver accepting first", () => {
    const invalidStart = computeNextRideStatus("requested", "verify_pin_start");
    expect(invalidStart).toBe("requested"); // Cannot start directly from requested
  });
});
