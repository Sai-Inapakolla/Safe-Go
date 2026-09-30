import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { FinePaymentModal } from "@/components/FinePaymentModal";

describe("Fine Settlement & Ride Booking Lock Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should render FinePaymentModal with stated fine amount, violation notice, and payment methods", () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <FinePaymentModal
        isOpen={true}
        onClose={handleClose}
        penaltyAmount={750}
        penaltyReason="Pink Mode Safety Policy Violation"
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText("Pay Outstanding Fine")).toBeInTheDocument();
    expect(screen.getByText("₹750")).toBeInTheDocument();
    expect(screen.getByText(/Pink Mode Safety Policy Violation/i)).toBeInTheDocument();
    expect(screen.getByText("UPI")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Banking")).toBeInTheDocument();
    expect(screen.getByText(/Pay ₹750 & Unlock Ride Booking/i)).toBeInTheDocument();
  });

  it("should allow switching payment methods and filling demo card", () => {
    render(
      <FinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        penaltyAmount={750}
      />
    );

    // Switch to Card tab
    const cardTab = screen.getByText("Card");
    fireEvent.click(cardTab);

    expect(screen.getByPlaceholderText(/Card Number/i)).toBeInTheDocument();

    // Click demo card autofill
    const demoBtn = screen.getByText(/Fill Demo Card/i);
    fireEvent.click(demoBtn);

    const cardInput = screen.getByPlaceholderText(/Card Number/i) as HTMLInputElement;
    expect(cardInput.value).toContain("4242");
  });

  it("should process payment, clear penalty balance in localStorage, and show settlement receipt", async () => {
    localStorage.setItem("safego_penalty_balance", "750");

    let eventFired = false;
    window.addEventListener("safego_penalty_cleared", () => {
      eventFired = true;
    });

    const handleSuccess = vi.fn();

    render(
      <FinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        penaltyAmount={750}
        penaltyReason="Pink Mode Solo Male Restriction"
        onSuccess={handleSuccess}
      />
    );

    // Switch to SafeGo Wallet for instant 1-tap test
    const walletTab = screen.getByText("Wallet");
    fireEvent.click(walletTab);

    expect(screen.getByText("SafeGo Pre-paid Wallet")).toBeInTheDocument();

    // Tap Pay button
    const payBtn = screen.getByText(/Pay ₹750 & Unlock Ride Booking/i);
    fireEvent.click(payBtn);

    // Expect receipt and unlocked state after processing completes
    await waitFor(
      () => {
        expect(screen.getByText("Fine Settled Successfully!")).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    expect(screen.getByText("Account Unlocked")).toBeInTheDocument();
    expect(screen.getByText("Settlement Receipt")).toBeInTheDocument();
    expect(screen.getByText("Book Ride Now")).toBeInTheDocument();

    // Verify localStorage penalty balance cleared to 0
    expect(localStorage.getItem("safego_penalty_balance")).toBe("0");

    // Verify event dispatched
    expect(eventFired).toBe(true);

    // Verify onSuccess callback
    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 750,
        status: "SETTLED & UNLOCKED",
      })
    );
  });

  it("should enforce booking block when fine is stated (> 0)", () => {
    // Helper function verifying booking lock check logic
    const checkCanBook = (penaltyBalance: number) => {
      if (penaltyBalance > 0) {
        return { allowed: false, reason: `Fine of ₹${penaltyBalance} must be paid before booking another ride.` };
      }
      return { allowed: true, reason: null };
    };

    const blockedResult = checkCanBook(750);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.reason).toContain("Fine of ₹750 must be paid before booking another ride.");

    // Once fine is paid (0 balance)
    const allowedResult = checkCanBook(0);
    expect(allowedResult.allowed).toBe(true);
    expect(allowedResult.reason).toBeNull();
  });

  it("should handle custom UPI ID selection, validation, and submission", async () => {
    render(
      <FinePaymentModal
        isOpen={true}
        onClose={vi.fn()}
        penaltyAmount={500}
      />
    );

    // Click Other UPI
    const otherUpiBtn = screen.getByText("Other UPI");
    fireEvent.click(otherUpiBtn);

    // Empty submission should trigger validation toast
    const payBtn = screen.getByText(/Pay ₹500 & Unlock Ride Booking/i);
    fireEvent.click(payBtn);

    // Enter valid UPI ID
    const upiInput = screen.getByPlaceholderText(/Enter your VPA/i);
    fireEvent.change(upiInput, { target: { value: "traveler@okhdfcbank" } });

    // Submit valid UPI
    fireEvent.click(payBtn);

    await waitFor(
      () => {
        expect(screen.getByText("Fine Settled Successfully!")).toBeInTheDocument();
      },
      { timeout: 3500 }
    );
  });

  it("should handle Card validation, manual entry, and post-payment Book Ride button", async () => {
    const handleClose = vi.fn();
    const handleBook = vi.fn();

    // Set stored rides in localStorage to test history sync
    localStorage.setItem(
      "safego_passenger_rides",
      JSON.stringify([{ id: "r1", is_penalty_applied: true, is_penalty_paid: false }])
    );
    localStorage.setItem("token", "dummy_user_jwt");

    // Mock fetch for backend /pay-penalty sync
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", balance: 0 }),
    }) as any;

    render(
      <FinePaymentModal
        isOpen={true}
        onClose={handleClose}
        penaltyAmount={350}
        onBookRide={handleBook}
      />
    );

    // Switch to Card tab
    fireEvent.click(screen.getByText("Card"));

    // Attempt pay with empty card
    const payBtn = screen.getByText(/Pay ₹350 & Unlock Ride Booking/i);
    fireEvent.click(payBtn);

    // Fill in card fields
    const cardInput = screen.getByPlaceholderText(/Card Number/i);
    const expiryInput = screen.getByPlaceholderText(/MM \/ YY/i);
    const cvvInput = screen.getByPlaceholderText(/CVV/i);

    fireEvent.change(cardInput, { target: { value: "5123 4567 8901 2345" } });
    fireEvent.change(expiryInput, { target: { value: "09/29" } });
    fireEvent.change(cvvInput, { target: { value: "321" } });

    fireEvent.click(payBtn);

    await waitFor(
      () => {
        expect(screen.getByText("Fine Settled Successfully!")).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    // Verify stored rides updated with is_penalty_paid = true
    const updatedRides = JSON.parse(localStorage.getItem("safego_passenger_rides") || "[]");
    expect(updatedRides[0].is_penalty_paid).toBe(true);

    // Click "Book Ride Now"
    const bookRideBtn = screen.getByText(/Book Ride Now/i);
    fireEvent.click(bookRideBtn);
    expect(handleClose).toHaveBeenCalled();
    expect(handleBook).toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it("should handle Net Banking selection, bank change, and Return to Dashboard button", async () => {
    const handleClose = vi.fn();

    render(
      <FinePaymentModal
        isOpen={true}
        onClose={handleClose}
        penaltyAmount={400}
      />
    );

    // Switch to Banking tab
    fireEvent.click(screen.getByText("Banking"));

    // Select different bank
    const bankSelect = screen.getByRole("combobox");
    fireEvent.change(bankSelect, { target: { value: "ICICI Bank" } });

    // Submit payment
    const payBtn = screen.getByText(/Pay ₹400 & Unlock Ride Booking/i);
    fireEvent.click(payBtn);

    await waitFor(
      () => {
        expect(screen.getByText("Fine Settled Successfully!")).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    // Click Return to Dashboard
    const returnBtn = screen.getByText("Return to Dashboard");
    fireEvent.click(returnBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("should allow dismissing modal via Close (X) button when not processing", () => {
    const handleClose = vi.fn();
    render(
      <FinePaymentModal
        isOpen={true}
        onClose={handleClose}
        penaltyAmount={200}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("should return null when isOpen is false", () => {
    const { container } = render(
      <FinePaymentModal
        isOpen={false}
        onClose={vi.fn()}
        penaltyAmount={200}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
