import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";
import { money, shortDate } from "../utils/format";
import StatusTag from "../components/StatusTag";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";

const STATUS_FLOW = ["placed", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];
const FILTERS = ["all", ...STATUS_FLOW, "cancelled", "returned"];

const UpdatePanel = ({ order, onClose, onUpdated }) => {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [carrier, setCarrier] = useState(order.carrier || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/api/seller/orders/${order._id}/status`, {
        status,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        note: note || undefined,
      });
      if (data.success) {
        toast.success("Order updated \u2014 the customer has been notified");
        onUpdated(data.order);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update this order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink-700/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <div>
            <h2 className="font-display text-lg text-ink-500">{order.orderNumber}</h2>
            <p className="text-xs text-muted">Placed {shortDate(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-sm text-muted hover:text-ink-500">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div>
            <p className="field-label">Items</p>
            <div className="panel divide-y divide-ink-100">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-ink-500">{item.name} &times; {item.quantity} <span className="text-muted">({item.size})</span></span>
                  <span className="text-muted">{money(item.price, order.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="field-label" htmlFor="status">Delivery status</label>
              <select id="status" className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {[...STATUS_FLOW, "cancelled", "returned"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="carrier">Carrier</label>
              <input id="carrier" className="field-input" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. GIG Logistics" />
            </div>
            <div>
              <label className="field-label" htmlFor="trackingNumber">Tracking number</label>
              <input id="trackingNumber" className="field-input" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="note">Note to customer <span className="text-muted">(optional)</span></label>
              <input id="note" className="field-input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button type="submit" disabled={submitting} className="btn-ochre w-full">
              {submitting ? "Saving\u2026" : "Update order"}
            </button>
          </form>

          {order.trackingEvents?.length > 0 && (
            <div className="mt-6">
              <p className="field-label">History</p>
              <div className="space-y-2">
                {[...order.trackingEvents].reverse().map((ev, i) => (
                  <div key={i} className="text-sm text-muted">
                    <span className="text-ink-500">{ev.status.replace(/_/g, " ")}</span> &middot; {shortDate(ev.at)}
                    {ev.note && <span> &mdash; {ev.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/seller/orders", {
        params: status && status !== "all" ? { status } : {},
      });
      setOrders(data.orders || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-500">Orders</h1>
      <p className="mt-1 text-sm text-muted">Update status and tracking as items move.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
              filter === f ? "bg-ink-500 text-canvas" : "text-muted hover:bg-ink-50"
            }`}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="mt-4 panel p-6">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders here" hint="Try a different filter, or check back once a sale comes in." />
        ) : (
          orders.map((order) => (
            <button
              key={order._id}
              onClick={() => setSelected(order)}
              className="ledger-row w-full text-left transition-colors hover:bg-canvas sm:grid-cols-[1fr,auto,auto,auto]"
            >
              <div>
                <p className="text-sm text-ink-500">{order.orderNumber}</p>
                <p className="text-xs text-muted">{shortDate(order.createdAt)}</p>
              </div>
              <p className="text-sm text-muted">{order.items?.length ?? 0} item{order.items?.length === 1 ? "" : "s"}</p>
              <p className="text-sm text-ink-500">{money(order.total, order.currency)}</p>
              <StatusTag status={order.status} />
            </button>
          ))
        )}
      </div>

      {selected && (
        <UpdatePanel
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};

export default Orders;
