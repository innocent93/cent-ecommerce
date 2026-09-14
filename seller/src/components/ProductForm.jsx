import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";

const CATEGORIES = ["Men", "Women", "Kids", "Footwear"];
const SUBCATEGORIES = ["Topwear", "Bottomwear", "Winterwear", "Sneakers", "Boots", "Sandals"];
const PRESET_SIZES = ["S", "M", "L", "XL", "XXL"];

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "Men",
  subCategory: "Topwear",
  brand: "",
  color: "",
  gender: "unisex",
  sku: "",
  bestseller: false,
};

// Used for both "add" and "edit" — pass an existing product to prefill.
const ProductForm = ({ product, onClose, onSaved }) => {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          category: product.category || "Men",
          subCategory: product.subCategory || "Topwear",
          brand: product.brand || "",
          color: product.color || "",
          gender: product.gender || "unisex",
          sku: product.sku || "",
          bestseller: Boolean(product.bestseller),
        }
      : emptyForm
  );
  const [sizes, setSizes] = useState(product?.sizes || []);
  const [customSize, setCustomSize] = useState("");
  const [stockBySize, setStockBySize] = useState(() => {
    if (!product?.stock) return {};
    return Object.fromEntries(Object.entries(product.stock));
  });
  const [trackStock, setTrackStock] = useState(Boolean(product?.stock));
  const [images, setImages] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleSize = (size) =>
    setSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));

  const addCustomSize = () => {
    const value = customSize.trim();
    if (!value) return;
    if (!sizes.includes(value)) setSizes((prev) => [...prev, value]);
    setCustomSize("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sizes.length === 0) {
      toast.error("Select or add at least one size");
      return;
    }
    if (!isEdit && Object.keys(images).length === 0) {
      toast.error("Upload at least one product image");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append("sizes", JSON.stringify(sizes));
      if (trackStock) {
        const stockPayload = {};
        sizes.forEach((s) => (stockPayload[s] = Number(stockBySize[s] || 0)));
        formData.append("stock", JSON.stringify(stockPayload));
      }
      Object.entries(images).forEach(([slot, file]) => formData.append(slot, file));

      const request = isEdit
        ? api.patch(`/api/seller/products/${product._id}`, formData)
        : api.post("/api/seller/products", formData);

      const { data } = await request;
      if (data.success) {
        toast.success(isEdit ? "Product updated" : "Product submitted");
        onSaved();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't save this product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-ink-700/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <h2 className="font-display text-lg text-ink-500">
            {isEdit ? "Edit product" : "List a new product"}
          </h2>
          <button onClick={onClose} className="text-sm text-muted hover:text-ink-500">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div>
            <p className="field-label">Product images</p>
            <div className="flex gap-2">
              {["image1", "image2", "image3", "image4"].map((slot) => (
                <label
                  key={slot}
                  htmlFor={slot}
                  className="flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded border border-dashed border-ink-200 bg-canvas text-xs text-muted"
                >
                  {images[slot] ? (
                    <img src={URL.createObjectURL(images[slot])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "+"
                  )}
                  <input
                    id={slot}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setImages((prev) => ({ ...prev, [slot]: e.target.files[0] }))}
                  />
                </label>
              ))}
            </div>
            {isEdit && <p className="mt-1.5 text-xs text-muted">Leave a slot empty to keep the current image.</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="name">Product name</label>
            <input id="name" required className="field-input" value={form.name} onChange={update("name")} />
          </div>

          <div>
            <label className="field-label" htmlFor="description">Description</label>
            <textarea id="description" required rows={3} className="field-input" value={form.description} onChange={update("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="category">Category</label>
              <select id="category" className="field-input" value={form.category} onChange={update("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="subCategory">Sub-category</label>
              <select id="subCategory" className="field-input" value={form.subCategory} onChange={update("subCategory")}>
                {SUBCATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="price">Price (\u20a6)</label>
              <input id="price" type="number" min="0" step="0.01" required className="field-input" value={form.price} onChange={update("price")} />
            </div>
            <div>
              <label className="field-label" htmlFor="sku">SKU <span className="text-muted">(optional)</span></label>
              <input id="sku" className="field-input" value={form.sku} onChange={update("sku")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label" htmlFor="brand">Brand</label>
              <input id="brand" className="field-input" value={form.brand} onChange={update("brand")} />
            </div>
            <div>
              <label className="field-label" htmlFor="color">Color</label>
              <input id="color" className="field-input" value={form.color} onChange={update("color")} />
            </div>
            <div>
              <label className="field-label" htmlFor="gender">Gender</label>
              <select id="gender" className="field-input" value={form.gender} onChange={update("gender")}>
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>
          </div>

          <div>
            <p className="field-label">Sizes</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`rounded border px-3 py-1.5 text-sm ${
                    sizes.includes(size)
                      ? "border-ink-500 bg-ink-500 text-canvas"
                      : "border-ink-100 text-ink-500 hover:border-ink-300"
                  }`}
                >
                  {size}
                </button>
              ))}
              {sizes.filter((s) => !PRESET_SIZES.includes(s)).map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => toggleSize(size)}
                  className="rounded border border-ink-500 bg-ink-500 px-3 py-1.5 text-sm text-canvas"
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="field-input"
                placeholder="Add a custom size, e.g. US 10"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
              />
              <button type="button" onClick={addCustomSize} className="btn-ghost shrink-0">Add</button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-ink-500">
              <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
              Track stock per size
            </label>
            {trackStock && sizes.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {sizes.map((size) => (
                  <div key={size}>
                    <label className="field-label">{size}</label>
                    <input
                      type="number"
                      min="0"
                      className="field-input"
                      value={stockBySize[size] ?? ""}
                      onChange={(e) => setStockBySize((prev) => ({ ...prev, [size]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-500">
            <input type="checkbox" checked={form.bestseller} onChange={(e) => setForm((f) => ({ ...f, bestseller: e.target.checked }))} />
            Feature as bestseller
          </label>
        </form>

        <div className="border-t border-ink-100 px-6 py-4">
          <button onClick={handleSubmit} disabled={submitting} className="btn-ochre w-full">
            {submitting ? "Saving\u2026" : isEdit ? "Save changes" : "Submit product"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
