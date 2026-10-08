import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import { ElderModeProvider } from "@/contexts/ElderModeContext";

describe("AuthPage - Login vs SignUp Mode & Accessibility", () => {
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

  it("does NOT render Rider Mode & Accessibility setup card on the Login page (/login)", () => {
    renderAuthPage("/login");

    // Welcome Back header is present
    expect(screen.getByText(/welcome back!/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email and password to access your account/i)).toBeInTheDocument();

    // Standard login fields are present
    expect(screen.getByPlaceholderText(/you@email\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();

    // Rider Mode & Accessibility card should NOT be present on /login
    expect(screen.queryByText(/rider mode & accessibility setup/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter your age/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /has disability/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /female/i })).not.toBeInTheDocument();
  });

  it("renders Gender, Age, and Has Disability button on the SignUp page (/signup)", () => {
    renderAuthPage("/signup");

    // Card title is visible
    expect(screen.getByText(/rider mode & accessibility setup/i)).toBeInTheDocument();

    // Check Gender buttons
    expect(screen.getByRole("button", { name: /female/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\bmale\b/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /other/i })).toBeInTheDocument();

    // Check Manual Age input
    const ageInput = screen.getByPlaceholderText(/enter your age/i);
    expect(ageInput).toBeInTheDocument();
    expect(ageInput).toHaveAttribute("type", "number");

    // Check Has Disability button
    const hasDisabilityBtn = screen.getByRole("button", { name: /has disability/i });
    expect(hasDisabilityBtn).toBeInTheDocument();
  });

  it("activates Pink Mode by default for female rider on SignUp", () => {
    renderAuthPage("/signup");

    // Banner indicates Pink Mode Active
    expect(screen.getByText(/pink mode active/i)).toBeInTheDocument();
    expect(screen.getByText(/defaults to pink mode/i)).toBeInTheDocument();
  });

  it("toggles Disability Mode when Has Disability button is clicked on SignUp", async () => {
    renderAuthPage("/signup");

    const hasDisabilityBtn = screen.getByRole("button", { name: /has disability/i });
    fireEvent.click(hasDisabilityBtn);

    // Disability Mode should now be active
    await waitFor(() => {
      expect(screen.getByText(/disability \(pwd\) mode active/i)).toBeInTheDocument();
      expect(screen.getByText(/has disability \(pwd on\)/i)).toBeInTheDocument();
    });
  });

  it("activates Senior Mode when Age is set to 60 or above on SignUp", async () => {
    renderAuthPage("/signup");

    const ageInput = screen.getByRole("spinbutton");
    fireEvent.change(ageInput, { target: { value: "65" } });

    await waitFor(() => {
      expect(screen.getByText(/senior mode active/i)).toBeInTheDocument();
      expect(screen.getByText(/senior \(60\+\)/i)).toBeInTheDocument();
    });
  });

  it("allows switching back to Pink Mode via Quick Mode Selector on SignUp", async () => {
    renderAuthPage("/signup");

    // First switch to Normal mode
    const normalModeBtn = screen.getByRole("button", { name: /normal mode/i });
    fireEvent.click(normalModeBtn);

    await waitFor(() => {
      expect(screen.getByText(/standard commute active/i)).toBeInTheDocument();
    });

    // Then switch back to Pink Mode
    const pinkModeBtn = screen.getByRole("button", { name: /pink mode/i });
    fireEvent.click(pinkModeBtn);

    await waitFor(() => {
      expect(screen.getByText(/pink mode active/i)).toBeInTheDocument();
    });
  });
});
