import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../utils/api";
import { money, dateTime } from "../utils/format";
import StatusTag from "../components/StatusTag";
import EmptyState from "../components/EmptyState";
import { SkeletonLine, SkeletonRows } from "../components/Skeleton";
import StitchPattern from "../components/StitchPattern";

const Payouts = ({ seller }) => {
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [balanceRes, payoutsRes] = await Promise.all([
          api.get("/api/seller/payouts/balance"),
          api.get("/api/seller/payouts"),
        ]);
        if (!mounted) return;
        setBalance(balanceRes.data);
        setPayouts(payoutsRes.data.payouts || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Couldn't load your payouts.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-500">Payouts</h1>
      <p className="mt-1 text-sm text-muted">What's owed to you, and what's already been paid.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="panel relative overflow-hidden bg-ink-500 p-6 text-canvas">
          <StitchPattern className="inset-0 text-ochre-500/15" />
          <p className="relative text-sm text-ink-200">Available for payout</p>
          {loading ? (
            <div className="relative mt-3"><SkeletonLine width="60%" height={36} /></div>
          ) : (
            <p className="relative mt-3 font-display text-4xl">{money(balance?.amount, balance?.currency || "NGN")}</p>
          )}
          <p className="relative mt-2 text-xs text-ink-200">
            {loading ? " " : `${balance?.orderCount ?? 0} delivered order${balance?.orderCount === 1 ? "" : "s"}, net of commission`}
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm text-muted">How this is calculated</p>
          <p className="mt-3 text-sm text-ink-500">
            Delivered orders become payable once they're no longer eligible for a refund request.
            Your balance is the order subtotal minus the platform's commission on each sale &mdash;
            payouts are triggered by UrbanStep to your registered bank account.
          </p>
        </div>
      </div>

      {!seller?.hasBankDetails && (
        <div className="mt-5 rounded border border-ochre-500 bg-ochre-50 px-4 py-3 text-sm text-ink-600">
          You haven't added bank details yet &mdash; add them on your{" "}
          <Link to="/profile" className="underline underline-offset-2">business profile</Link> so payouts can reach you.
        </div>
      )}

      <div className="mt-8 panel p-6">
        <h2 className="font-display text-lg text-ink-500">Payout history</h2>
        <div className="mt-4">
          {loading ? (
            <SkeletonRows rows={3} />
          ) : payouts.length === 0 ? (
            <EmptyState title="No payouts yet" hint="Your first payout will appear here once UrbanStep processes one." />
          ) : (
            payouts.map((payout) => (
              <div key={payout._id} className="ledger-row sm:grid-cols-[1fr,auto,auto,auto]">
                <div>
                  <p className="text-sm text-ink-500">{payout.orders?.length ?? 0} order{payout.orders?.length === 1 ? "" : "s"}</p>
                  <p className="text-xs text-muted">{dateTime(payout.createdAt)}</p>
                </div>
                <p className="text-sm text-muted">{payout.paystackTransferCode || "\u2014"}</p>
                <p className="text-sm text-ink-500">{money(payout.amount, payout.currency)}</p>
                <StatusTag status={payout.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Payouts;
