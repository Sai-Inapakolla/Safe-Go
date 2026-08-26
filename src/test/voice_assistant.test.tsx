import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import * as VoiceContext from "@/contexts/VoiceAssistantContext";

describe("Voice Assistant & Floating Assistant Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should render FloatingAssistant toggle button with microphone icon", () => {
    vi.spyOn(VoiceContext, "useVoiceAssistant").mockReturnValue({
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      audioLevel: 0,
      transcript: "",
      lastCommand: "",
      lastFeedback: "",
      voiceEnabled: true,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      speak: vi.fn(),
      setVoiceEnabled: vi.fn(),
    });

    render(
      <BrowserRouter>
        <FloatingAssistant />
      </BrowserRouter>
    );

    const toggleBtn = screen.getByRole("button", { name: /Start voice assistant/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  it("should render active transcript bubble and allow stopping when listening", () => {
    const mockStop = vi.fn();
    vi.spyOn(VoiceContext, "useVoiceAssistant").mockReturnValue({
      isListening: true,
      isProcessing: false,
      isSpeaking: false,
      audioLevel: 0.8,
      transcript: "Book a pink ride to Vadodara",
      lastCommand: "book_pink_ride",
      lastFeedback: "Searching for verified female drivers...",
      voiceEnabled: true,
      startListening: vi.fn(),
      stopListening: mockStop,
      speak: vi.fn(),
      setVoiceEnabled: vi.fn(),
    });

    render(
      <BrowserRouter>
        <FloatingAssistant />
      </BrowserRouter>
    );

    expect(screen.getByText("Book a pink ride to Vadodara")).toBeInTheDocument();

    const activeBtn = screen.getByRole("button", { name: /Stop recording/i });
    expect(activeBtn).toBeInTheDocument();

    fireEvent.click(activeBtn);
    expect(mockStop).toHaveBeenCalled();
  });
});
