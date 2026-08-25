import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter, Routes, Route, MemoryRouter } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModeFilterTabs } from "@/components/ModeFilterTabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";

const TestThemeConsumer = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
    </div>
  );
};

describe("Theme, Navigation & Route Protection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should provide theme state and update theme on setTheme call", () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="safego_theme">
        <TestThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme").textContent).toBe("light");

    fireEvent.click(screen.getByText("Set Dark"));
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(localStorage.getItem("safego_theme")).toBe("dark");

    fireEvent.click(screen.getByText("Set Light"));
    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(localStorage.getItem("safego_theme")).toBe("light");
  });

  it("should render ThemeToggle button and allow toggling theme", () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="safego_theme_toggle">
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByRole("button", { name: /Toggle theme/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(localStorage.getItem("safego_theme_toggle")).toBe("dark");
  });

  it("should render ModeFilterTabs and trigger onSelect when clicked", () => {
    const handleSelect = vi.fn();
    render(<ModeFilterTabs active="pink" onSelect={handleSelect} />);

    expect(screen.getByText("All Modes")).toBeInTheDocument();
    expect(screen.getByText("Normal Mode")).toBeInTheDocument();
    expect(screen.getByText("Pink Mode")).toBeInTheDocument();
    expect(screen.getByText("PWD Mode")).toBeInTheDocument();
    expect(screen.getByText("Elderly Mode")).toBeInTheDocument();

    fireEvent.click(screen.getByText("PWD Mode"));
    expect(handleSelect).toHaveBeenCalledWith("pwd");
  });

  it("should allow authenticated users in ProtectedRoute", () => {
    localStorage.setItem("token", "valid_auth_token");
    localStorage.setItem("userRole", "passenger");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ProtectedRoute allowedRoles={["passenger"]}>
          <div>Protected Content Active</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected Content Active")).toBeInTheDocument();
  });

  it("should redirect unauthenticated users to /login from ProtectedRoute", () => {
    localStorage.removeItem("token");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Admin Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Redirected</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page Redirected")).toBeInTheDocument();
    expect(screen.queryByText("Secret Admin Content")).not.toBeInTheDocument();
  });

  it("should block unauthorized roles in ProtectedRoute", () => {
    localStorage.setItem("token", "passenger_token");
    localStorage.setItem("userRole", "passenger"); // passenger trying to access admin

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <div>Admin Console</div>
              </ProtectedRoute>
            }
          />
          <Route path="/home" element={<div>Home Page Redirected</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Home Page Redirected")).toBeInTheDocument();
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
  });
});
