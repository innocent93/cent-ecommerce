import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Package, ClipboardList, Wallet, Building2 } from "lucide-react";

const links = [
  { to: "/", label: "Overview", end: true, icon: LayoutGrid },
  { to: "/products", label: "Products", icon: Package },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/payouts", label: "Payouts", icon: Wallet },
  { to: "/profile", label: "Business profile", icon: Building2 },
];

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// Fixed-position drawer on mobile (translated off-screen unless open),
// static in-flow column from md upward. One component covers both so the
// nav links/state never drift out of sync between breakpoints.
const Sidebar = ({ seller, onLogout, open, onNavigate }) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-700/40 md:hidden"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col justify-between bg-ink-500 text-ink-100 transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="px-6 py-7">
            <p className="font-display text-lg leading-none text-canvas">Seller Hub</p>
            <p className="mt-1 text-xs text-ink-200">UrbanStep marketplace</p>
          </div>

          <nav className="mt-2 flex flex-col gap-0.5 px-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-ink-600 text-canvas"
                        : "text-ink-200 hover:bg-ink-600/60 hover:text-canvas"
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                  {link.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 border-t border-ink-400/40 px-6 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ochre-500 text-sm font-medium text-ink-700">
            {initials(seller?.businessName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-canvas">{seller?.businessName}</p>
            <p className="truncate text-xs text-ink-200">{seller?.email}</p>
            <button
              onClick={onLogout}
              className="mt-1 text-xs text-ink-200 underline decoration-ink-400 underline-offset-2 hover:text-canvas"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
