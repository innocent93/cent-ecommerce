import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Package, Clock3 } from "lucide-react";
import api from "../utils/api";
import { money, shortDate } from "../utils/format";
import StatusTag from "../components/StatusTag";
import EmptyState from "../components/EmptyState";
import StitchPattern from "../components/StitchPattern";
import { SkeletonLine, SkeletonRows } from "../components/Skeleton";

const StatCard = ({ label, value, hint, icon: Icon }) => (
  <div className="panel p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">{label}</p>
      {Icon && <Icon size={16} strokeWidth={1.75} className="text-ink-200" />}
    </div>
    <p className="mt-2 font-display text-2xl text-ink-500">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

const Dashboard = ({ seller }) => {
  const [balance, setBalance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productCount, setProductCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [balanceRes, ordersRes, productsRes] = await Promise.all([
          api.get("/api/seller/payouts/balance"),
          api.get("/api/seller/orders", { params: { limit: 6 } }),
          api.get("/api/seller/products", { params: { limit: 1 } }),
        ]);
        if (!mounted) return;
        setBalance(balanceRes.data);
        setOrders(ordersRes.data.orders || ordersRes.data.data || []);
        setProductCount(productsRes.data.total ?? productsRes.data.products?.length ?? null);
      } catch (error) {
        toast.error(error.response?.data?.message || "Couldn't load your dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const pendingCount = orders.filter((o) => !["delivered", "cancelled", "returned"].includes(o.status)).length;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-500">
        Good to see you, {seller?.businessName?.split(" ")[0] || "there"}
      </h1>
      <p className="mt-1 text-sm text-muted">Here's where your business stands today.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr,1fr,1fr]">
        <div className="panel relative overflow-hidden bg-ink-500 p-6 text-canvas">
          <StitchPattern className="inset-0 text-ochre-500/15" />
          <p className="relative text-sm text-ink-200">Available for payout</p>
          {loading ? (
            <div className="relative mt-3">
              <SkeletonLine width="60%" height={36} />
            </div>
          ) : (
            <p className="relative mt-3 font-display text-4xl">{money(balance?.amount, balance?.currency || "NGN")}</p>
          )}
          <p className="relative mt-2 text-xs text-ink-200">
            {loading ? " " : `From ${balance?.orderCount ?? 0} delivered order${balance?.orderCount === 1 ? "" : "s"} not yet paid out`}
          </p>
        </div>
        <StatCard icon={Package} label="Products live" value={loading ? <SkeletonLine width="30%" /> : productCount ?? 0} hint="Approved and listed" />
        <StatCard icon={Clock3} label="Orders in progress" value={loading ? <SkeletonLine width="30%" /> : pendingCount} hint="Not yet delivered" />
      </div>

      <div className="mt-8 panel p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-500">Recent orders</h2>
          <Link to="/orders" className="text-sm text-ink-500 underline underline-offset-2">
            View all
          </Link>
        </div>

        <div className="mt-4">
          {loading ? (
            <SkeletonRows rows={3} />
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              hint="Once a customer buys one of your products, it'll show up here."
            />
          ) : (
            orders.map((order) => (
              <div key={order._id || order.id} className="ledger-row sm:grid-cols-[1fr,auto,auto,auto]">
                <div>
                  <p className="text-sm text-ink-500">{order.orderNumber || order._id}</p>
                  <p className="text-xs text-muted">{shortDate(order.createdAt)}</p>
                </div>
                <p className="text-sm text-muted">{order.items?.length ?? 0} item{order.items?.length === 1 ? "" : "s"}</p>
                <p className="text-sm text-ink-500">{money(order.total, order.currency)}</p>
                <StatusTag status={order.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
