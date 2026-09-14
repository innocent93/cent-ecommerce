import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import GoogleLoginButton from "../components/GoogleLoginButton";
import StitchPattern from "../components/StitchPattern";

const Login = ({ onAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/seller/login", { email, password });
      if (data.success) {
        onAuthenticated({ token: data.token, refreshToken: data.refreshToken, seller: data.seller });
        toast.success("Welcome back");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't sign in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-500 p-12 text-canvas md:flex">
        <StitchPattern className="inset-0 text-ochre-500/20" />
        <p className="relative font-display text-xl">Seller Hub</p>
        <div className="relative max-w-sm">
          <p className="font-display text-4xl leading-tight">
            Every sale, every payout, in one ledger.
          </p>
          <p className="mt-4 text-sm text-ink-200">
            List your products on UrbanStep, track orders as they move, and see exactly what's
            owed to you before it lands in your account.
          </p>
        </div>
        <p className="relative text-xs text-ink-200">UrbanStep marketplace &mdash; for manufacturers</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="font-display text-2xl text-ink-500 md:hidden">Seller Hub</p>
          <h1 className="mt-6 font-display text-2xl text-ink-500">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Manage your products, orders and payouts.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                className="field-input"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="field-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-ochre w-full">
              {submitting ? "Signing in\u2026" : "Sign in"}
            </button>
          </form>

          <div className="mt-5">
            <GoogleLoginButton
              onAuthenticated={onAuthenticated}
              onNeedsRegistration={({ idToken, prefill }) =>
                navigate("/register", { state: { googleIdToken: idToken, prefill } })
              }
            />
          </div>

          <p className="mt-6 text-sm text-muted">
            New to UrbanStep?{" "}
            <Link to="/register" className="text-ink-500 underline underline-offset-2">
              Create a seller account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
