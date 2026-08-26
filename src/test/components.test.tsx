import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { StatsCard } from "@/components/StatsCard";
import { SafetyScoreBar } from "@/components/SafetyScoreBar";
import { MapPlaceholder } from "@/components/MapPlaceholder";
import { Footer } from "@/components/Footer";
import { NavLink } from "@/components/NavLink";
import { SafeGoLogo } from "@/components/SafeGoLogo";
import { SafeGoLogoAnimated } from "@/components/SafeGoLogoAnimated";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Users, Heart } from "lucide-react";

describe("Core UI Components Coverage", () => {
  it("should render SafeGoLogo with correct branding", () => {
    render(
      <BrowserRouter>
        <SafeGoLogo />
      </BrowserRouter>
    );
    expect(screen.getByText("SafeGo")).toBeInTheDocument();
  });

  it("should render SafeGoLogoAnimated SVG with calculated sizing", () => {
    const { container } = render(<SafeGoLogoAnimated size={120} className="custom-logo-class" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 420 144");
    expect(screen.getByText("SafeGo")).toBeInTheDocument();
  });

  it("should render ScrollToTop component and attach window scroll listener", () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <BrowserRouter>
        <ScrollToTop />
      </BrowserRouter>
    );
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });

  it("should render LanguageSwitcher trigger button with globe icon", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render MapPlaceholder with placeholder indicator", () => {
    render(<MapPlaceholder />);
    expect(screen.getByText(/Map placeholder/i)).toBeInTheDocument();
  });

  it("should render NavLink and handle navigation destination", () => {
    render(
      <BrowserRouter>
        <NavLink to="/safety">Safety Center</NavLink>
      </BrowserRouter>
    );
    const link = screen.getByText("Safety Center");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/safety");
  });

  it("should render Footer with navigation links and copyright", () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    expect(screen.getByText("Your Safety. Our Priority.")).toBeInTheDocument();
    expect(screen.getByText("© 2025 SafeGo Inc. All rights reserved.")).toBeInTheDocument();
  });

  it("should render StatsCard with multiple variations", () => {
    const { rerender } = render(
      <StatsCard icon={Users} value="15,000+" label="Active Passengers" />
    );
    expect(screen.getByText("15,000+")).toBeInTheDocument();
    expect(screen.getByText("Active Passengers")).toBeInTheDocument();

    rerender(
      <StatsCard icon={Heart} value="99.9%" label="Safety Rating" iconColor="#E91E63" iconBg="#FCE4EC" />
    );
    expect(screen.getByText("99.9%")).toBeInTheDocument();
    expect(screen.getByText("Safety Rating")).toBeInTheDocument();
  });

  it("should render SafetyScoreBar with different score ranges", () => {
    const { rerender } = render(<SafetyScoreBar score={45} label="Moderate Route Risk" color="#FF9800" />);
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("Moderate Route Risk")).toBeInTheDocument();

    rerender(<SafetyScoreBar score={98} label="Optimal Safety" color="#4CAF50" />);
    expect(screen.getByText("98%")).toBeInTheDocument();
    expect(screen.getByText("Optimal Safety")).toBeInTheDocument();
  });
});
