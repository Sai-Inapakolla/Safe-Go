import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const signOutMock = vi.fn(() => Promise.resolve());
vi.mock("firebase/auth", async () => {
  const actual = await vi.importActual<typeof import("firebase/auth")>("firebase/auth");
  return {
    ...actual,
    signOut: (...args: any[]) => signOutMock(...args),
  };
});

describe("Navbar & Navigation Header", () => {
  const renderNavbar = (fullWidth?: boolean) =>
    render(
      <ThemeProvider>
        <BrowserRouter>
          <Navbar fullWidth={fullWidth} />
        </BrowserRouter>
      </ThemeProvider>
    );

  beforeEach(() => {
    localStorage.clear();
    signOutMock.mockClear();
  });

  it("should render Navbar with core navigation links when unauthenticated", () => {
    renderNavbar();

    expect(screen.getByText("SafeGo")).toBeInTheDocument();
    expect(screen.getByText("Book")).toBeInTheDocument();
    expect(screen.getByText("Drive With Us")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/About/i)).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("should render Sign Out button when user is authenticated with token", () => {
    localStorage.setItem("token", "valid_auth_token");

    renderNavbar();

    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("should toggle mobile menu drawer on hamburger button click", () => {
    renderNavbar();

    const hamburgerBtn = screen.getByRole("button", { name: /Toggle menu/i });
    expect(hamburgerBtn).toBeInTheDocument();

    fireEvent.click(hamburgerBtn);
    expect(screen.getByText("App Theme")).toBeInTheDocument();
  });

  it("should show role-based driver navigation links", () => {
    localStorage.setItem("userRole", "driver");
    renderNavbar();

    expect(screen.getByText("Driver Portal")).toBeInTheDocument();
    expect(screen.queryByText("Book")).not.toBeInTheDocument();
    expect(screen.queryByText("Drive With Us")).not.toBeInTheDocument();
  });

  it("should show role-based admin navigation links", () => {
    localStorage.setItem("userRole", "admin");
    renderNavbar();

    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
    expect(screen.getByText("Book")).toBeInTheDocument();
    expect(screen.getByText("Drive With Us")).toBeInTheDocument();
  });

  it("should close mobile menu when unauthenticated mobile login link is clicked", () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /Toggle menu/i }));
    expect(screen.getByText("App Theme")).toBeInTheDocument();

    const loginLinks = screen.getAllByText("Login");
    fireEvent.click(loginLinks[loginLinks.length - 1]);
    expect(screen.queryByText("App Theme")).not.toBeInTheDocument();
  });

  it("should apply scrolled shadow style after scroll event", () => {
    const scrollSpy = vi.spyOn(window, "scrollY", "get").mockReturnValue(25);
    const { container } = renderNavbar();
    const nav = container.querySelector("nav");

    fireEvent.scroll(window);
    expect(nav?.className).toContain("shadow-sm");

    scrollSpy.mockRestore();
  });

  it("should use constrained container classes when fullWidth is false", () => {
    const { container } = renderNavbar(false);
    expect(container.querySelector(".max-w-\\[1400px\\]")).toBeInTheDocument();
  });

  it("should allow toggling senior vision control from navbar", () => {
    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /Enable Senior Vision Mode/i }));
    expect(screen.getByText("SafeGo")).toBeInTheDocument();
  });

  it("should sign out and clear auth keys when authenticated desktop sign out is clicked", async () => {
    localStorage.setItem("token", "valid_auth_token");
    localStorage.setItem("userRole", "admin");
    localStorage.setItem("safego_admin_stats", '{"rides":10}');

    const { container } = renderNavbar();
    const desktopSignOut = screen.getByText("Sign Out");

    fireEvent.click(desktopSignOut);
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("userRole")).toBeNull();
    expect(localStorage.getItem("safego_admin_stats")).toBeNull();
    expect(container.querySelector("nav")).toBeInTheDocument();
  });

  it("should sign out and close menu from authenticated mobile drawer", async () => {
    localStorage.setItem("token", "valid_auth_token");
    localStorage.setItem("userRole", "driver");
    localStorage.setItem("safego_driver_profile", '{"id":"D-101"}');

    renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: /Toggle menu/i }));
    expect(screen.getByText("Logout")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Logout"));
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("userRole")).toBeNull();
    expect(localStorage.getItem("safego_driver_profile")).toBeNull();
    expect(screen.queryByText("App Theme")).not.toBeInTheDocument();
  });
});
