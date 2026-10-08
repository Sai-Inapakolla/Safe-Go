import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import { ElderModeProvider } from "@/contexts/ElderModeContext";

describe("AuthPage - Gender & Preference Selectors (SignUp Only)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderAuthPage = (initialRoute = "/signup") => {
    return render(
      <ElderModeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthPage />
        </MemoryRouter>
      </ElderModeProvider>
    );
  };

  it("does NOT render Gender & Preference selectors on the Login page (/login)", () => {
    renderAuthPage("/login");

    // Welcome Back header is present
    expect(screen.getByText(/welcome back!/i)).toBeInTheDocument();

    // Gender & Preference dropdowns should NOT be on login page
    expect(screen.queryByLabelText(/select gender/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/select your preference/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rider mode & accessibility setup/i)).not.toBeInTheDocument();

    // Standard login fields are present
    expect(screen.getByPlaceholderText(/you@email\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("renders 'Select Gender' and 'Select your Preference' on the SignUp page (/signup)", () => {
    renderAuthPage("/signup");

    // Join SafeGo header is present
    expect(screen.getByText(/join safego/i)).toBeInTheDocument();

    // Clean dropdowns are present on signup
    expect(screen.getByLabelText(/select gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/select your preference/i)).toBeInTheDocument();

    // Bulky old controls are removed
    expect(screen.queryByPlaceholderText(/enter your age/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rider mode & accessibility setup/i)).not.toBeInTheDocument();
  });

  it("defaults to Pink Mode for female rider on SignUp, and Pink Mode is enabled", () => {
    renderAuthPage("/signup");

    const genderSelect = screen.getByLabelText(/select gender/i) as HTMLSelectElement;
    expect(genderSelect.value).toBe("female");

    const preferenceSelect = screen.getByLabelText(/select your preference/i) as HTMLSelectElement;
    expect(preferenceSelect.value).toBe("pink");

    const pinkOption = screen.getByRole("option", { name: /pink mode \(women only\)/i }) as HTMLOptionElement;
    expect(pinkOption.disabled).toBe(false);
  });

  it("disables Pink Mode and resets mode to Normal when gender is changed to Male on SignUp", async () => {
    renderAuthPage("/signup");

    const genderSelect = screen.getByLabelText(/select gender/i) as HTMLSelectElement;
    const preferenceSelect = screen.getByLabelText(/select your preference/i) as HTMLSelectElement;

    // Change gender to male
    fireEvent.change(genderSelect, { target: { value: "male" } });

    await waitFor(() => {
      expect(genderSelect.value).toBe("male");
      // Selected mode should fall back to normal
      expect(preferenceSelect.value).toBe("normal");
      // Pink mode option should be disabled
      const pinkOption = screen.getByRole("option", { name: /pink mode \(women only - disabled\)/i }) as HTMLOptionElement;
      expect(pinkOption.disabled).toBe(true);
      // Explanatory note should be visible
      expect(screen.getByText(/note: for only women users pink mode is enabled/i)).toBeInTheDocument();
    });
  });

  it("allows selecting Senior Mode (60+) or Disability Mode (PWD) on SignUp", async () => {
    renderAuthPage("/signup");

    const preferenceSelect = screen.getByLabelText(/select your preference/i) as HTMLSelectElement;

    // Select Senior Mode
    fireEvent.change(preferenceSelect, { target: { value: "elderly" } });
    await waitFor(() => {
      expect(preferenceSelect.value).toBe("elderly");
      expect(screen.getAllByText(/senior mode/i).length).toBeGreaterThan(0);
    });

    // Select Disability Mode
    fireEvent.change(preferenceSelect, { target: { value: "pwd" } });
    await waitFor(() => {
      expect(preferenceSelect.value).toBe("pwd");
      expect(screen.getAllByText(/disability/i).length).toBeGreaterThan(0);
    });
  });

  it("hides gender and preference dropdowns on SignUp when driver or admin role is selected", async () => {
    renderAuthPage("/signup");

    // Click Driver role
    const driverBtn = screen.getByRole("button", { name: /^driver$/i });
    fireEvent.click(driverBtn);

    await waitFor(() => {
      expect(screen.queryByLabelText(/select gender/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/select your preference/i)).not.toBeInTheDocument();
    });
  });
});
