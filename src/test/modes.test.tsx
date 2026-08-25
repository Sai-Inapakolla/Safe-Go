import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ModeCard } from "@/components/ModeCard";
import { modes, getModeConfig, type RideMode } from "@/config/modeConfig";

describe("Ride Mode Selection & Configuration", () => {
  it("should have all 4 core ride modes configured", () => {
    const modeIds = modes.map((m) => m.id);
    expect(modeIds).toContain("normal");
    expect(modeIds).toContain("pink");
    expect(modeIds).toContain("pwd");
    expect(modeIds).toContain("elderly");
    expect(modes.length).toBe(4);
  });

  it("should return exact match mode config using getModeConfig", () => {
    const pinkMode = getModeConfig("pink");
    expect(pinkMode.id).toBe("pink");
    expect(pinkMode.name).toBe("Pink Mode");
    expect(pinkMode.badge).toBe("For Women");

    const pwdMode = getModeConfig("pwd");
    expect(pwdMode.id).toBe("pwd");
    expect(pwdMode.name).toBe("PWD Mode");
    expect(pwdMode.badge).toBe("Accessible");
  });

  it("should handle aliases and colloquial names correctly in getModeConfig", () => {
    expect(getModeConfig("women").id).toBe("pink");
    expect(getModeConfig("female").id).toBe("pink");
    expect(getModeConfig("wheelchair").id).toBe("pwd");
    expect(getModeConfig("accessible").id).toBe("pwd");
    expect(getModeConfig("senior").id).toBe("elderly");
    expect(getModeConfig("seniors").id).toBe("elderly");
    expect(getModeConfig("eldery").id).toBe("elderly");
    expect(getModeConfig("unknown_xyz").id).toBe("normal");
    expect(getModeConfig(null).id).toBe("normal");
  });

  it("should render ModeCard with features, badge, and CTA button", () => {
    const normalMode = getModeConfig("normal");
    render(
      <BrowserRouter>
        <ModeCard mode={normalMode} />
      </BrowserRouter>
    );

    expect(screen.getByText("Normal Mode")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Fast Pickup")).toBeInTheDocument();
    expect(screen.getByText("Affordable Pricing")).toBeInTheDocument();
    
    const ctaLink = screen.getByRole("link", { name: "Book Now" });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/book/normal");
  });

  it("should hide CTA button when hideCTA prop is true", () => {
    const pwdMode = getModeConfig("pwd");
    render(
      <BrowserRouter>
        <ModeCard mode={pwdMode} hideCTA={true} />
      </BrowserRouter>
    );

    expect(screen.getByText("PWD Mode")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book PWD Ride" })).not.toBeInTheDocument();
  });
});
