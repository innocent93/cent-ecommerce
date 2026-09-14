import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";
import { money } from "../utils/format";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import ProductForm from "../components/ProductForm";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formTarget, setFormTarget] = useState(null); // null = closed, {} = add, product = edit
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/seller/products");
      setProducts(data.products || data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't load your products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (product) => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    setDeletingId(product._id);
    try {
      const { data } = await api.delete(`/api/seller/products/${product._id}`);
      if (data.success) {
        toast.success("Product removed");
        setProducts((prev) => prev.filter((p) => p._id !== product._id));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't remove this product.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalStock = (product) => {
    if (!product.stock) return null;
    return Object.values(product.stock).reduce((sum, n) => sum + Number(n || 0), 0);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink-500">Products</h1>
          <p className="mt-1 text-sm text-muted">What you're currently selling on UrbanStep.</p>
        </div>
        <button onClick={() => setFormTarget({})} className="btn-ochre">List a product</button>
      </div>

      <div className="mt-6 panel p-6">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : products.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            hint="Add your first product and it'll be live for customers as soon as it's approved."
            action={<button onClick={() => setFormTarget({})} className="btn-ochre">List a product</button>}
          />
        ) : (
          products.map((product) => {
            const stock = totalStock(product);
            return (
              <div key={product._id} className="ledger-row sm:grid-cols-[auto,1fr,auto,auto,auto]">
                <img
                  src={product.image?.[0]}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                />
                <div>
                  <p className="text-sm text-ink-500">{product.name}</p>
                  <p className="text-xs text-muted">{product.category} &middot; {product.subCategory}</p>
                </div>
                <p className="text-sm text-ink-500">{money(product.price)}</p>
                <p className="text-sm text-muted">{stock === null ? "Not tracked" : `${stock} in stock`}</p>
                <div className="flex gap-3">
                  <button onClick={() => setFormTarget(product)} className="text-sm text-ink-500 underline underline-offset-2">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product._id}
                    className="text-sm text-brick-500 underline underline-offset-2 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {formTarget !== null && (
        <ProductForm
          product={formTarget._id ? formTarget : null}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
};

export default Products;
