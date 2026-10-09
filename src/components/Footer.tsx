import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SafeGoLogo } from "./SafeGoLogo";
import { BookingForModal } from "./BookingForModal";

export const Footer = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full px-6 pt-16 pb-8 sm:px-10 lg:px-16">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <SafeGoLogo size={22} />
            <p className="mt-3 text-sm text-muted-foreground">Your Safety. Our Priority.</p>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold">Product</h4>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-left text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Book a Ride
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold">Company</h4>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/drive-with-us" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link>
              <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display text-sm font-bold">Contact Us</h4>
            <div className="mt-3 flex flex-col gap-2">
              <a href="mailto:SafeGo@gmail.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                SafeGo@gmail.com
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2025 SafeGo Inc. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/home" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/home" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      <BookingForModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProceed={(details) => {
          navigate(`/book/${details.preferenceMode || "normal"}`);
        }}
      />
    </footer>
  );
};
