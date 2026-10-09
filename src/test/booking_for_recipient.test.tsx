import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BookingForModal } from "@/components/BookingForModal";
import Home from "@/pages/Home";
import { ElderModeProvider } from "@/contexts/ElderModeContext";

describe("Booking Recipient Selection Flow (Myself vs Others)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("renders BookingForModal with 'Myself' and 'Others' options when open", () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <BookingForModal
          isOpen={true}
          onClose={handleClose}
          onProceed={handleProceed}
        />
      </MemoryRouter>
    );

    // Modal title & questions are present
    expect(screen.getByText(/to whom are you booking this ride\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /myself/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /others/i })).toBeInTheDocument();

    // Default is Myself
    expect(screen.getByText(/i am traveling on this ride/i)).toBeInTheDocument();
  });

  it("allows proceeding directly when 'Myself' is selected", () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <BookingForModal
          isOpen={true}
          onClose={handleClose}
          onProceed={handleProceed}
        />
      </MemoryRouter>
    );

    // Click Proceed button
    const proceedBtn = screen.getByRole("button", { name: /proceed to book ride/i });
    fireEvent.click(proceedBtn);

    expect(handleProceed).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingFor: "myself",
      })
    );
    expect(handleClose).toHaveBeenCalled();
    expect(localStorage.getItem("safego_booking_for")).toBe("myself");
  });

  it("asks for details (She/He, Age, and Preference Mode) when 'Others' is selected", () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <BookingForModal
          isOpen={true}
          onClose={handleClose}
          onProceed={handleProceed}
        />
      </MemoryRouter>
    );

    // Select "Others"
    const othersBtn = screen.getByRole("button", { name: /others/i });
    fireEvent.click(othersBtn);

    // Prompts for details
    expect(screen.getByText(/please specify their details/i)).toBeInTheDocument();
    expect(screen.getByText(/whether she or he/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passenger age/i)).toBeInTheDocument();
    expect(screen.getByText(/your preference mode/i)).toBeInTheDocument();

    // Verify She and He options exist
    expect(screen.getByRole("button", { name: /she \(female\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /he \(male\)/i })).toBeInTheDocument();
  });

  it("recommends Pink Mode when 'She' is selected, and allows proceeding with recipient details", () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <BookingForModal
          isOpen={true}
          onClose={handleClose}
          onProceed={handleProceed}
        />
      </MemoryRouter>
    );

    // Select "Others"
    fireEvent.click(screen.getByRole("button", { name: /others/i }));

    // Select "She"
    fireEvent.click(screen.getByRole("button", { name: /she \(female\)/i }));
    expect(screen.getByText(/pink mode.*is available for her/i)).toBeInTheDocument();

    // Enter Age
    const ageInput = screen.getByLabelText(/passenger age/i);
    fireEvent.change(ageInput, { target: { value: "28" } });

    // Optional name and phone
    const nameInput = screen.getByLabelText(/passenger name/i);
    fireEvent.change(nameInput, { target: { value: "Aaradhya Sen" } });

    // Submit
    const proceedBtn = screen.getByRole("button", { name: /proceed to book ride/i });
    fireEvent.click(proceedBtn);

    expect(handleProceed).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingFor: "others",
        gender: "she",
        age: 28,
        preferenceMode: "pink",
        riderName: "Aaradhya Sen",
      })
    );
    expect(localStorage.getItem("safego_booking_for")).toBe("others");
    expect(localStorage.getItem("safego_booking_recipient_gender")).toBe("she");
    expect(localStorage.getItem("safego_booking_recipient_age")).toBe("28");
  });

  it("recommends Elderly Mode when age >= 60 is selected", () => {
    const handleProceed = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <BookingForModal
          isOpen={true}
          onClose={handleClose}
          onProceed={handleProceed}
        />
      </MemoryRouter>
    );

    // Select "Others"
    fireEvent.click(screen.getByRole("button", { name: /others/i }));

    // Click Senior (60+) chip
    const seniorChip = screen.getByRole("button", { name: /senior \(60\+\)/i });
    fireEvent.click(seniorChip);

    const ageInput = screen.getByLabelText(/passenger age/i) as HTMLInputElement;
    expect(ageInput.value).toBe("68");

    // Submit
    const proceedBtn = screen.getByRole("button", { name: /proceed to book ride/i });
    fireEvent.click(proceedBtn);

    expect(handleProceed).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingFor: "others",
        age: 68,
        preferenceMode: "elderly",
      })
    );
  });

  it("opens BookingForModal when clicking 'Book a Safe Ride' on the Home page", async () => {
    render(
      <ElderModeProvider>
        <MemoryRouter initialEntries={["/home"]}>
          <Home />
        </MemoryRouter>
      </ElderModeProvider>
    );

    // Find and click "Book a Safe Ride" button
    const bookRideBtn = screen.getByRole("button", { name: /book a safe ride/i });
    expect(bookRideBtn).toBeInTheDocument();

    fireEvent.click(bookRideBtn);

    // Modal pops up asking "To whom are you booking this ride?"
    await waitFor(() => {
      expect(screen.getByText(/to whom are you booking this ride\?/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /myself/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /others/i })).toBeInTheDocument();
    });
  });
});
