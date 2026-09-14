import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import GoogleLoginButton from "../components/GoogleLoginButton";

const initial = { businessName: "", ownerName: "", email: "", phone: "", password: "" };

const Register = ({ onAuthenticated }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Arrives either via router state (redirected here from the Login page's
  // Google button) or set directly below (Google button on this page).
  const [google, setGoogle] = useState(location.state?.googleIdToken ? location.state : null);
  const [form, setForm] = useState(() => ({
    ...initial,
    ownerName: location.state?.prefill?.name || "",
    email: location.state?.prefill?.email || "",
  }));
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = google
        ? { businessName: form.businessName, ownerName: form.ownerName, phone: form.phone, googleIdToken: google.idToken }
        : form;
      const { data } = await api.post("/api/seller/register", payload);
      if (!data.success) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message || "Account created \u2014 pending approval");

      if (google) {
        // The account now exists and is linked to this Google identity —
        // reuse the same verified idToken to log straight in rather than
        // making them click "Continue with Google" a second time.
        const { data: loginData } = await api.post("/api/seller/google", { idToken: google.idToken });
        if (loginData.success && !loginData.isNewSeller) {
          onAuthenticated({ token: loginData.token, refreshToken: loginData.refreshToken, seller: loginData.seller });
          return;
        }
      }
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't create the account. Check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-8">
      <div className="w-full max-w-md">
        <p className="font-display text-2xl text-ink-500">Seller Hub</p>
        <h1 className="mt-6 font-display text-2xl text-ink-500">Register as a seller</h1>
        <p className="mt-1 text-sm text-muted">
          Your account will be reviewed before you can start listing products.
        </p>

        {google && (
          <p className="mt-4 rounded border border-ochre-500 bg-ochre-50 px-4 py-3 text-sm text-ink-600">
            Continuing as <strong>{form.email}</strong> via Google. Just need your business details below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="field-label" htmlFor="businessName">Business name</label>
            <input id="businessName" required className="field-input" value={form.businessName} onChange={update("businessName")} placeholder="e.g. Lagos Leather Co." />
          </div>
          <div>
            <label className="field-label" htmlFor="ownerName">Owner / contact name</label>
            <input id="ownerName" required className="field-input" value={form.ownerName} onChange={update("ownerName")} />
          </div>
          {!google && (
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <input id="email" type="email" required className="field-input" value={form.email} onChange={update("email")} />
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="phone">Phone number</label>
            <input id="phone" className="field-input" value={form.phone} onChange={update("phone")} placeholder="Optional" />
          </div>
          {!google && (
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" type="password" required className="field-input" value={form.password} onChange={update("password")} placeholder="8+ characters, upper, lower, symbol" />
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-ochre w-full">
            {submitting ? "Creating account\u2026" : "Create account"}
          </button>
        </form>

        {!google && (
          <div className="mt-5">
            <GoogleLoginButton
              onAuthenticated={onAuthenticated}
              onNeedsRegistration={({ idToken, prefill }) => {
                setGoogle({ idToken });
                setForm((f) => ({ ...f, ownerName: prefill.name || f.ownerName, email: prefill.email }));
              }}
            />
          </div>
        )}

        <p className="mt-6 text-sm text-muted">
          Already registered?{" "}
          <Link to="/" className="text-ink-500 underline underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
