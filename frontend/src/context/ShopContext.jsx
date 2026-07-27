// @ts-nocheck
import { createContext, useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export const ShopContext = createContext();

const ShopContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // NGN is the platform's base/display currency (Nigeria/Africa-first launch).
  // Swap this + the backend's BASE_CURRENCY together if you relaunch in a
  // different primary market.
  const currency = "\u20a6"; // Naira sign
  // Estimate shown pre-checkout; the authoritative fee (with the free-shipping
  // threshold applied) is computed server-side in order.service.js at checkout.
  const delivery_fee = 2500;
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState("");
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
    const navigate = useNavigate();

  const isLoggedIn = Boolean(token);

  // --- Cart -----------------------------------------------------------
  // Cart is persisted server-side once logged in (POST /api/cart/add etc.)
  // so it survives across devices/sessions, matching how Jumia/Amazon carts
  // behave. Guests get a local-only cart that isn't saved.
  const addToCart = async (itemId, size) => {
    if (!size) {
      toast.error("Select Product Size");
      return;
    }

    // Optimistic local update so the UI feels instant.
    const cartData = structuredClone(cartItems);
    cartData[itemId] = cartData[itemId] || {};
    cartData[itemId][size] = (cartData[itemId][size] || 0) + 1;
    setCartItems(cartData);

    if (isLoggedIn) {
      try {
        const { data } = await api.post("/api/cart/add", { itemId, size });
        if (data.success) {
          setCartItems(data.cartData);
        }
      } catch (error) {
        // Roll back the optimistic update and surface the real reason
        // (e.g. "out of stock") instead of silently diverging from the server.
        toast.error(error.response?.data?.message || "Could not add to cart");
        getUserCart();
      }
    }
  };

  const updateQuantity = async (itemId, size, quantity) => {
    const cartData = structuredClone(cartItems);
    if (!cartData[itemId]) return;
    cartData[itemId][size] = quantity;
    setCartItems(cartData);

    if (isLoggedIn) {
      try {
        const { data } = await api.put("/api/cart/update", { itemId, size, quantity });
        if (data.success) setCartItems(data.cartData);
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not update cart");
        getUserCart();
      }
    }
  };

  const getUserCart = useCallback(async () => {
    try {
      const { data } = await api.post("/api/cart/get");
      if (data.success) setCartItems(data.cartData || {});
    } catch (error) {
      // Non-fatal — user just sees an empty cart until the next successful sync.
      console.error(error);
    }
  }, []);

  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) totalCount += cartItems[items][item];
        } catch {
          /* skip malformed entry */
        }
      }
    }
    return totalCount;
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      const itemInfo = products.find((product) => product._id === items);
      if (!itemInfo) continue;
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) {
            totalAmount += itemInfo.price * cartItems[items][item];
          }
        } catch {
          /* skip malformed entry */
        }
      }
    }
    return totalAmount;
  };

  // --- Products ---------------------------------------------------------
  const getProductsData = async () => {
    try {
      const { data } = await api.get("/api/product/list", { params: { currency: "NGN" } });
      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // --- Auth / session ------------------------------------------------
  const logout = async () => {
    try {
      await api.post("/api/user/logout", { refreshToken: localStorage.getItem("refreshToken") });
    } catch {
      /* best-effort — clear local state regardless */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken("");
    setUser(null);
    setCartItems({});
    navigate("/login");
  };

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/api/user/me");
      if (data.success) setUser(data.user);
    } catch {
      /* token invalid/expired — the api interceptor already tried refreshing */
    }
  }, []);

  // --- Orders ----------------------------------------------------------
  const placeOrder = async ({ shippingAddress, paymentMethod, currency: orderCurrency, idempotencyKey, couponCode }) => {
    const { data } = await api.post("/api/orders", { shippingAddress, paymentMethod, currency: orderCurrency, idempotencyKey, couponCode });
    return data; // { success, order, paystackAuthorizationUrl? }
  };

  const getMyOrders = async () => {
    const { data } = await api.get("/api/orders/mine");
    return data.success ? data.orders : [];
  };

  const trackOrder = async (trackingNumber) => {
    const { data } = await api.get(`/api/orders/track/${encodeURIComponent(trackingNumber)}`);
    return data.success ? data.order : null;
  };

  // --- Wishlist ----------------------------------------------------------
  const [wishlist, setWishlist] = useState([]);

  const fetchWishlist = useCallback(async () => {
    try {
      const { data } = await api.get("/api/user/wishlist");
      if (data.success) setWishlist(data.wishlist.map((p) => p._id));
    } catch {
      /* non-fatal */
    }
  }, []);

  const toggleWishlist = async (productId, isWishlisted) => {
    if (!isLoggedIn) {
      toast.info("Please log in to save items to your wishlist");
      navigate("/login");
      return;
    }
    try {
      if (isWishlisted) {
        await api.delete(`/api/user/wishlist/${productId}`);
        setWishlist((prev) => prev.filter((id) => id !== productId));
      } else {
        await api.post("/api/user/wishlist", { productId });
        setWishlist((prev) => [...prev, productId]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update wishlist");
    }
  };

  useEffect(() => {
    getProductsData();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!token && stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (token) {
      getUserCart();
      fetchMe();
      fetchWishlist();
    }
  }, [token, getUserCart, fetchMe, fetchWishlist]);

  const value = {
    products,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    cartItems,
    addToCart,
    getCartCount,
    updateQuantity,
    getCartAmount,
    navigate,
    token,
    setToken,
    backendUrl,
    user,
    isLoggedIn,
    logout,
    placeOrder,
    getMyOrders,
    trackOrder,
    wishlist,
    toggleWishlist,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export default ShopContextProvider;
