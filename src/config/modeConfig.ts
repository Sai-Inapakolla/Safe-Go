import { Accessibility, Heart, Users, Car } from "lucide-react";

export type RideMode = "pwd" | "pink" | "elderly" | "normal";

export interface ModeConfig {
  id: RideMode;
  name: string;
  accent: string;
  lightBg: string;
  darkText: string;
  accentClass: string;
  lightBgClass: string;
  borderClass: string;
  btnClass: string;
  icon: typeof Car;
  badge: string;
  description: string;
  features: string[];
  cta: string;
}

export const modes: ModeConfig[] = [
  {
    id: "pwd",
    name: "PWD Mode",
    accent: "hsl(var(--purple))",
    lightBg: "hsl(var(--purple-light))",
    darkText: "hsl(var(--purple-dark))",
    accentClass: "text-mode-purple",
    lightBgClass: "bg-mode-purple-light",
    borderClass: "border-mode-purple",
    btnClass: "bg-mode-purple hover:bg-mode-purple/90",
    icon: Accessibility,
    badge: "Accessible",
    description: "Fully accessible rides with trained drivers and integrated voice guidance for persons with disabilities. All our PWD fleet vehicles are thoroughly inspected quarterly for wheelchair ramp safety and interior space standards. Drivers undergo specialized empathy and physical assistance training to ensure every journey is completely stress-free.",
    features: ["Wheelchair-Accessible Vehicle", "Voice Navigation", "Pickup Assistance", "Certified Drivers"],
    cta: "Book PWD Ride",
  },
  {
    id: "pink",
    name: "Pink Mode",
    accent: "hsl(var(--pink))",
    lightBg: "hsl(var(--pink-light))",
    darkText: "hsl(var(--pink-dark))",
    accentClass: "text-mode-pink",
    lightBgClass: "bg-mode-pink-light",
    borderClass: "border-mode-pink",
    btnClass: "bg-mode-pink hover:bg-mode-pink/90",
    icon: Heart,
    badge: "For Women",
    description: "Feel empowered every trip. Verified female drivers, intelligent safe routes, and real-time family location sharing. By filtering out poorly lit routes and cross-referencing local crime data, our AI ensures you are never put in a vulnerable position, no matter what time of night you need to travel.",
    features: ["Female Drivers Preferred", "AI Safe Route Selection", "Emergency SOS Alerts", "Live Family Tracking"],
    cta: "Book Pink Ride",
  },
  {
    id: "elderly",
    name: "Elderly Mode",
    accent: "hsl(var(--blue))",
    lightBg: "hsl(var(--blue-light))",
    darkText: "hsl(var(--blue-dark))",
    accentClass: "text-mode-blue",
    lightBgClass: "bg-mode-blue-light",
    borderClass: "border-mode-blue",
    btnClass: "bg-mode-blue hover:bg-mode-blue/90",
    icon: Users,
    badge: "Senior Friendly",
    description: "Comfortable, patient rides with trained drivers who specialize in assisting senior citizens. We offer expanded wait times at no extra cost, direct-to-door assistance, and automatically integrated emergency medical contacts tailored specifically for older family members.",
    features: ["Specialized Trained Drivers", "Medical Contact Option", "Patient Calm Driving", "Door Assistance"],
    cta: "Book Elderly Ride",
  },
  {
    id: "normal",
    name: "Normal Mode",
    accent: "hsl(var(--teal))",
    lightBg: "hsl(var(--teal-light))",
    darkText: "hsl(var(--teal-dark))",
    accentClass: "text-mode-teal",
    lightBgClass: "bg-mode-teal-light",
    borderClass: "border-mode-teal",
    btnClass: "bg-mode-teal hover:bg-mode-teal/90",
    icon: Car,
    badge: "Standard",
    description: "Smart ride booking with AI-optimized routing and fully background-checked, verified drivers. Your everyday ride, redefined for maximum security with continuous GPS monitoring and a mandatory driver ride-rating system.",
    features: ["Fast Pickup", "Affordable Pricing", "Real-time Ride Tracking", "Verified Drivers"],
    cta: "Book Now",
  },
];

export const getModeConfig = (id: RideMode) => modes.find((m) => m.id === id)!;
