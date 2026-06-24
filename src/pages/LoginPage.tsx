/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTaskFlow } from "../store/stateContext";
import { Sparkles, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { verifyOTP } = useTaskFlow();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
      console.log(`[TaskFlow AI] Simulating OTP code delivery for ${email}. Enter any 6 digit code.`);
    }, 1200);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("OTP code must be exactly 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate verification
    setTimeout(() => {
      const success = verifyOTP(email, otpCode);
      setIsLoading(false);
      if (!success) {
        setError("Invalid OTP code. Please enter 6 digits.");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-tr from-[#06060c] via-[#0d0d21] to-[#140b28]">
      {/* Visual background ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pink-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Decorative elements */}
        <div className="flex flex-col items-center justify-center gap-2.5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-xl shadow-[var(--accent-glow)] select-none animate-pulse-glow">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">TaskFlow AI</h1>
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Passwordless Gateway</p>
          </div>
        </div>

        {/* Main interactive Card */}
        <div className="card-glass p-8 relative overflow-hidden">
          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Welcome to TaskFlow</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Enter your email address to receive a secure passwordless login code. No accounts or passwords required.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="name@company.com"
                    className="input-glass pl-10 text-base h-12"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary h-12 font-semibold shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Dispatching Code...</span>
                  </>
                ) : (
                  <span>Continue with Email</span>
                )}
              </button>

              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-2.5 justify-center text-[11px] font-medium text-[var(--text-muted)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Protected by local client sandbox encryption</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Enter Security Code</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  A verification code has been dispatched to <strong className="text-[var(--text-primary)]">{email}</strong>. Enter it below to enter your workspace.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="000000"
                  className="input-glass h-14 text-center text-3xl font-mono tracking-[0.4em] pl-[0.4em]"
                  disabled={isLoading}
                  autoFocus
                />
                
                {/* Visual notice about simulated verification */}
                <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-300 leading-relaxed text-center">
                  💡 <strong>Sandbox Simulation Mode:</strong> We sent the OTP to your local tab. Enter any <strong>6 digit code</strong> (e.g. 123456) to login instantly!
                </div>

                {error && <p className="text-red-400 text-xs font-semibold text-center">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary h-12 font-semibold shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Authenticate Session</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setOtpCode(""); setError(""); }}
                className="w-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center transition-colors block"
              >
                Use different email address
              </button>
            </form>
          )}
        </div>

        {/* Footer info links */}
        <p className="text-center text-[11px] font-medium text-[var(--text-muted)] mt-6 flex items-center justify-center gap-1">
          <span>TaskFlow AI Offline Sandbox</span>
          <span>•</span>
          <span>Terms & Conditions</span>
        </p>
      </div>
    </div>
  );
}
