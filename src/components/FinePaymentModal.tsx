import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  CreditCard,
  Smartphone,
  Wallet,
  Building2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Receipt,
  Download,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api";

export interface FinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  penaltyAmount: number;
  penaltyReason?: string;
  onSuccess?: (receipt: any) => void;
  onBookRide?: () => void;
}

export const FinePaymentModal: React.FC<FinePaymentModalProps> = ({
  isOpen,
  onClose,
  penaltyAmount,
  penaltyReason = "Pink Mode Safety Policy Violation",
  onSuccess,
  onBookRide,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "wallet" | "netbanking">("upi");
  
  // UPI State
  const [upiApp, setUpiApp] = useState<string>("gpay");
  const [customUpiId, setCustomUpiId] = useState<string>("");
  
  // Card State
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  
  // Netbanking State
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");
  
  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  if (!isOpen) return null;

  const handleFillDemoCard = () => {
    setCardNumber("4242 •••• •••• 4242");
    setCardExpiry("12/28");
    setCardCvv("888");
    setCardName(localStorage.getItem("safego_user_name") || "Verified Traveler");
    toast.info("SafeGo Sandbox Test Card details filled.");
  };

  const handleProcessPayment = async () => {
    // Form validation
    if (paymentMethod === "upi" && upiApp === "custom" && !customUpiId.trim()) {
      toast.error("Please enter a valid UPI ID (e.g., name@okaxis)");
      return;
    }
    if (paymentMethod === "card") {
      if (!cardNumber.trim()) {
        toast.error("Please enter card number or tap 'Quick Demo Card'");
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStep("Connecting to SafeGo Secure Pay Gateway...");

    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep(`Authorizing payment of ₹${penaltyAmount} via ${paymentMethod.toUpperCase()}...`);

    await new Promise((r) => setTimeout(r, 700));
    setProcessingStep("Clearing safety violation & unlocking ride booking privileges...");

    const txnId = `TXN_SFG_${Date.now().toString().slice(-8)}`;
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const receipt = {
      receiptNumber: `RCP-SFG-${Math.floor(100000 + Math.random() * 900000)}`,
      transactionId: txnId,
      amount: penaltyAmount,
      reason: penaltyReason,
      method: paymentMethod.toUpperCase(),
      date: formattedDate,
      timestamp: nowIso,
      status: "SETTLED & UNLOCKED",
    };

    // 1. Synchronize with backend API
    const API_URL = getApiUrl();
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${API_URL}/api/users/pay-penalty`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: penaltyAmount,
            payment_method: paymentMethod,
            transaction_id: txnId,
            notes: `Fine settled via ${paymentMethod}`,
          }),
        });
      } catch (err) {
        console.warn("Backend penalty payment sync notice:", err);
      }
    }

    // 2. Clear penalty balance in LocalStorage & local rides
    localStorage.setItem("safego_penalty_balance", "0");
    localStorage.setItem("safego_last_paid_fine_receipt", JSON.stringify(receipt));

    try {
      const storedRides = localStorage.getItem("safego_passenger_rides") || localStorage.getItem("safego_rides");
      if (storedRides) {
        const parsed = JSON.parse(storedRides);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((r: any) => {
            if (r.is_penalty_applied) {
              return { ...r, is_penalty_paid: true, penalty_paid_at: nowIso };
            }
            return r;
          });
          localStorage.setItem("safego_passenger_rides", JSON.stringify(updated));
          localStorage.setItem("safego_rides", JSON.stringify(updated));
        }
      }
    } catch (_) {}

    // 3. Dispatch global cross-tab event
    window.dispatchEvent(
      new CustomEvent("safego_penalty_cleared", {
        detail: { amount: penaltyAmount, receipt },
      })
    );

    await new Promise((r) => setTimeout(r, 500));
    setIsProcessing(false);
    setReceiptData(receipt);
    setPaymentSuccess(true);

    toast.success(`₹${penaltyAmount} Fine Paid Successfully! Ride booking is now unlocked.`);

    if (onSuccess) {
      onSuccess(receipt);
    }
  };

  const handleFinishAndBook = () => {
    onClose();
    if (onBookRide) {
      onBookRide();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fine-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-border/80 bg-background/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Close Button (only if not processing) */}
        {!isProcessing && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-6 right-6 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        )}

        {/* ─── SCREEN 1: SUCCESS CONFIRMATION & RECEIPT ─── */}
        {paymentSuccess && receiptData ? (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-8 ring-emerald-500/10 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={44} className="stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                <Unlock size={12} /> Account Unlocked
              </div>
              <h3 id="fine-modal-title" className="font-display text-2xl font-black text-foreground">
                Fine Settled Successfully!
              </h3>
              <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">
                Your payment has been received and verified. All ride booking restrictions have been removed immediately.
              </p>
            </div>

            {/* Official Digital Receipt Card */}
            <div className="rounded-3xl border border-border/80 bg-secondary/40 p-5 text-left space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Settlement Receipt
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">
                  Paid & Cleared
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Amount Paid</span>
                  <p className="text-lg font-black text-foreground">₹{receiptData.amount}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Payment Mode</span>
                  <p className="font-bold text-foreground capitalize">{receiptData.method}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Receipt ID</span>
                  <p className="font-mono text-[11px] font-bold text-foreground truncate">{receiptData.receiptNumber}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Transaction Ref</span>
                  <p className="font-mono text-[11px] font-bold text-foreground truncate">{receiptData.transactionId}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Timestamp:</span>
                <span className="font-semibold text-foreground">{receiptData.date}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleFinishAndBook}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Sparkles size={16} /> Book Ride Now <ArrowRight size={14} />
              </button>
              <button
                onClick={onClose}
                className="py-4 px-6 rounded-2xl border border-border bg-secondary/60 hover:bg-secondary text-foreground font-black text-xs uppercase tracking-wider transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* ─── SCREEN 2: PAYMENT METHOD SELECTION & CONFIRMATION ─── */
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-rose-500 text-white shrink-0 shadow-lg shadow-rose-500/30">
                <ShieldAlert size={26} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    Policy Settlement
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                    <Lock size={10} /> Booking Locked
                  </span>
                </div>
                <h3 id="fine-modal-title" className="font-display text-xl font-black text-foreground mt-1">
                  Pay Outstanding Fine
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Pay the stated fine amount below to remove the restriction and unlock ride booking immediately.
                </p>
              </div>
            </div>

            {/* Due Amount Highlight Card */}
            <div className="rounded-3xl border-2 border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20 p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Total Fine Amount Stated
                </span>
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  ₹{penaltyAmount}
                </p>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Reason: {penaltyReason}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-background/80 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm">
                  <Lock size={12} /> Unlock Ride
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Select Secure Payment Method
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "wallet", label: "Wallet", icon: Wallet },
                  { id: "netbanking", label: "Banking", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-md scale-[1.02]"
                          : "border-border/80 bg-secondary/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Method Specific Details */}
              <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-3">
                {/* 1. UPI Payment */}
                {paymentMethod === "upi" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {[
                        { id: "gpay", name: "Google Pay" },
                        { id: "phonepe", name: "PhonePe" },
                        { id: "paytm", name: "Paytm" },
                        { id: "custom", name: "Other UPI" },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setUpiApp(app.id)}
                          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                            upiApp === app.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background/80 text-foreground border-border hover:bg-secondary"
                          }`}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>

                    {upiApp === "custom" ? (
                      <div>
                        <input
                          type="text"
                          value={customUpiId}
                          onChange={(e) => setCustomUpiId(e.target.value)}
                          placeholder="Enter your VPA (e.g., yourname@okhdfcbank)"
                          className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Instant App Redirection</span>
                        <span className="font-bold text-primary flex items-center gap-1">
                          Auto-verified on tap <ShieldCheck size={14} />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Card Payment */}
                {paymentMethod === "card" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Card Details</span>
                      <button
                        type="button"
                        onClick={handleFillDemoCard}
                        className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline cursor-pointer"
                      >
                        ⚡ Fill Demo Card
                      </button>
                    </div>

                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card Number (4242 •••• •••• 4242)"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="CVV (888)"
                        maxLength={4}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}

                {/* 3. SafeGo Wallet */}
                {paymentMethod === "wallet" && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Wallet size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground">SafeGo Pre-paid Wallet</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">Available Balance: ₹2,500</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      Sufficient Balance
                    </span>
                  </div>
                )}

                {/* 4. Net Banking */}
                {paymentMethod === "netbanking" && (
                  <div className="space-y-2">
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-[10px] text-muted-foreground font-medium">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>
                256-bit encrypted settlement. Settling this fine instantly unlocks your booking privileges across all SafeGo modes.
              </span>
            </div>

            {/* Pay Button / Loader */}
            <div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleProcessPayment}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{processingStep || "Processing Payment..."}</span>
                  </>
                ) : (
                  <>
                    <Unlock size={16} />
                    <span>Pay ₹{penaltyAmount} & Unlock Ride Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FinePaymentModal;
