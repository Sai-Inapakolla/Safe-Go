import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoiceAssistant } from "@/contexts/VoiceAssistantContext";
import { useNavigate } from "react-router-dom";
import { Phone, MapPin, Navigation, HelpCircle, ShieldAlert, X } from "lucide-react";
// framer-motion removed to avoid dependency issues

const PWDMode: React.FC = () => {
  const { isListening, isSpeaking, startListening, stopListening, speak, lastCommand, setVoiceEnabled, shareCurrentLocation } = useVoiceAssistant();
  const navigate = useNavigate();

  useEffect(() => {
    // Voice auto-start disabled to match hidden assistant
    /*
    setVoiceEnabled(true);
    speak("Safe Go - PWD Mode enabled. Voice Assistance is now active. I am listening for your commands.");
    const t = setTimeout(() => startListening(), 2000);
    return () => clearTimeout(t);
    */
  }, []);

  const handleSOS = () => {
    speak("Triggering SOS alert. Help is on the way.");
    // In a real application, the context trigger would already be called via voice command, but we'll manually call it for this button.
    startListening(); // Re-activate for additional voice context if needed
  };

  const handleBooking = () => {
    speak("Opening booking page. Please select your destination.");
    navigate("/book/pwd");
  };

  const handleEmergency = () => {
    speak("Calling emergency services.");
    window.location.href = "tel:911";
  };

  const handleShareLocation = () => {
    speak("Sharing your location with emergency contacts.");
    if (shareCurrentLocation) {
      shareCurrentLocation();
    }
  };

  return (
    <div className="min-h-screen bg-black text-yellow-400 p-6 flex flex-col items-center justify-between font-mono">
      <Card className="w-full max-w-2xl bg-zinc-900 border-4 border-yellow-400 p-6 mb-8">
        <CardHeader className="text-center">
          <CardTitle className="text-5xl font-black uppercase tracking-widest text-yellow-400">Safe Go PWD</CardTitle>
          <p className="text-2xl mt-4 text-yellow-300">Accessibility Mode</p>
          {/* Voice status hidden */}
        </CardHeader>
        <CardContent className="flex flex-col gap-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Button
              className="h-44 text-4xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 rounded-2xl flex flex-col gap-4 border-none"
              onClick={handleBooking}
              aria-label="Book a Ride"
            >
              <Navigation size={64} />
              BOOK RIDE
            </Button>
            <Button
              className="h-44 text-4xl font-bold bg-zinc-800 text-yellow-400 hover:bg-zinc-700 rounded-2xl flex flex-col gap-4 border-4 border-yellow-400"
              onClick={handleShareLocation}
              aria-label="Share current location"
            >
              <MapPin size={64} />
              SHARE LOCATION
            </Button>
          </div>

          <Button
            variant="destructive"
            className="h-52 text-6xl font-black bg-red-600 text-white hover:bg-red-700 rounded-2xl flex flex-col gap-6 border-8 border-white animate-pulse"
            onClick={handleSOS}
            aria-label="SOS Emergency Help"
          >
            <ShieldAlert size={80} />
            S.O.S HELP
          </Button>

          {/* Voice status indicators hidden */}

          <p className="text-2xl text-center font-bold text-yellow-300 mt-4">
            Select an option below for assistance.
          </p>
        </CardContent>
      </Card>

      <div className="w-full max-w-2xl flex flex-col gap-6">
        <Button
          className="h-24 text-3xl font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-2xl flex gap-4"
          onClick={handleEmergency}
          aria-label="Call Emergency Services"
        >
          <Phone size={48} />
          CALL 9-1-1
        </Button>
        <Button
          variant="ghost"
          className="h-20 text-2xl font-bold text-yellow-400 hover:text-yellow-500 flex gap-4 self-center mt-12"
          onClick={() => navigate("/dashboard")}
          aria-label="Exit PWD Mode"
        >
          <X size={32} />
          EXIT PWD MODE
        </Button>

        {/* Voice Command Guide */}
        <div className="mt-20 p-8 bg-zinc-900 border-4 border-yellow-400 rounded-2xl text-left w-full max-w-2xl shadow-[0_0_50px_rgba(250,204,21,0.15)]">
          <h4 className="text-3xl font-black text-yellow-400 mb-6 uppercase tracking-widest flex items-center gap-3">
            <HelpCircle size={32} />
            How can I help?
          </h4>
          <div className="space-y-6">
            <div>
              <p className="text-yellow-500/80 text-xl font-bold uppercase tracking-tighter mb-2">Try saying things like:</p>
              <ul className="grid grid-cols-1 gap-4 text-2xl text-white font-medium">
                <li className="bg-zinc-800/50 p-4 rounded-xl border-l-4 border-yellow-400">"Book a ride to <span className="text-yellow-400 italic">your destination</span>"</li>
                <li className="bg-zinc-800/50 p-4 rounded-xl border-l-4 border-yellow-400">"Where is my driver?"</li>
                <li className="bg-zinc-800/50 p-4 rounded-xl border-l-4 border-yellow-400">"Show my ride history"</li>
                <li className="bg-red-950/30 p-4 rounded-xl border-l-4 border-red-500 text-red-100 italic font-bold">"S.O.S EMERGENCY"</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <p className="text-zinc-500 text-lg italic">
                Tip: You can speak naturally. I am designed to understand your needs and keep you safe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Voice click overlay disabled */}
    </div>
  );
};

export default PWDMode;
