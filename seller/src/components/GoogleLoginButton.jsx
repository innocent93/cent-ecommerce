// @ts-nocheck
import React, { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";

// Renders Google's official button via Google Identity Services. The ID
// token Google returns is sent straight to the backend, which verifies it
// server-side (see backend/src/services/seller.service.js#googleLogin)
// before trusting anything about the seller's identity — this component
// never evaluates the token's contents itself.
//
// Two outcomes from the backend, handled differently:
//  - an existing (or newly-linked) seller -> log straight in.
//  - no seller tied to this Google account -> hand off to Register with
//    the verified name/email and the same idToken, so registration can
//    finish account creation without asking for a password.
const GoogleLoginButton = ({ onAuthenticated, onNeedsRegistration }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!clientId) return; // Google Sign-In not configured — render nothing

    const handleCredentialResponse = async (response) => {
      try {
        const { data } = await api.post("/api/seller/google", { idToken: response.credential });
        if (!data.success) {
          toast.error(data.message);
          return;
        }
        if (data.isNewSeller) {
          onNeedsRegistration({ idToken: response.credential, prefill: data.prefill });
        } else {
          onAuthenticated({ token: data.token, refreshToken: data.refreshToken, seller: data.seller });
          toast.success(data.message);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Google sign-in failed");
      }
    };

    const initialize = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredentialResponse });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
        });
      }
    };

    const existing = document.getElementById("google-identity-script");
    if (existing) {
      initialize();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.id = "google-identity-script";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full items-center gap-3 text-xs text-ink-200">
        <hr className="flex-1 border-ink-100" />
        OR
        <hr className="flex-1 border-ink-100" />
      </div>
      <div ref={buttonRef}></div>
    </div>
  );
};

export default GoogleLoginButton;
