import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Payouts from "./pages/Payouts";
import Profile from "./pages/Profile";
import api from "./utils/api";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("sellerToken") || "");
  const [seller, setSeller] = useState(() => {
    const raw = localStorage.getItem("seller");
    return raw ? JSON.parse(raw) : null;
  });
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    // Confirm the token is still valid and pick up the latest status
    // (e.g. an admin approving the account) on every load.
    api
      .get("/api/seller/me")
      .then(({ data }) => {
        if (data.success) {
          setSeller(data.seller);
          localStorage.setItem("seller", JSON.stringify(data.seller));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAuthenticated = ({ token: newToken, refreshToken, seller: newSeller }) => {
    localStorage.setItem("sellerToken", newToken);
    if (refreshToken) localStorage.setItem("sellerRefreshToken", refreshToken);
    localStorage.setItem("seller", JSON.stringify(newSeller));
    setToken(newToken);
    setSeller(newSeller);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("sellerToken");
    localStorage.removeItem("sellerRefreshToken");
    localStorage.removeItem("seller");
    setToken("");
    setSeller(null);
  };

  const updateSeller = (updated) => {
    setSeller(updated);
    localStorage.setItem("seller", JSON.stringify(updated));
  };

  if (!token) {
    return (
      <>
        <ToastContainer position="top-right" />
        <Routes>
          <Route path="/register" element={<Register onAuthenticated={handleAuthenticated} />} />
          <Route path="*" element={<Login onAuthenticated={handleAuthenticated} />} />
        </Routes>
      </>
    );
  }

  const isApproved = seller?.status === "approved";

  return (
    <div className="flex min-h-screen bg-canvas">
      <ToastContainer position="top-right" />
      <Sidebar seller={seller} onLogout={handleLogout} open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div className="flex min-h-screen w-full flex-1 flex-col md:pl-0">
        <header className="flex items-center justify-between border-b border-ink-100 bg-paper px-4 py-3 md:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded border border-ink-100 text-ink-500"
          >
            <span className="sr-only">Menu</span>
            &#9776;
          </button>
          <p className="font-display text-base text-ink-500">Seller Hub</p>
          <div className="h-9 w-9" aria-hidden="true" />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-10 md:py-8">
          <Routes>
            <Route
              path="/"
              element={isApproved ? <Dashboard seller={seller} /> : <Navigate to="/profile" replace />}
            />
            <Route
              path="/products"
              element={isApproved ? <Products /> : <Navigate to="/profile" replace />}
            />
            <Route
              path="/orders"
              element={isApproved ? <Orders /> : <Navigate to="/profile" replace />}
            />
            <Route
              path="/payouts"
              element={isApproved ? <Payouts seller={seller} /> : <Navigate to="/profile" replace />}
            />
            <Route path="/profile" element={<Profile seller={seller} onSellerUpdated={updateSeller} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
