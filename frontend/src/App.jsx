// @ts-nocheck
import React, { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import WhatsAppButton from "./components/WhatsAppButton";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'

// Code-split every route below Home — Home (and the components above) load
// eagerly since they're needed immediately on first paint; everything else
// loads on demand, shrinking the initial bundle a first-time visitor has to
// download just to see the homepage.
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const Login = lazy(() => import("./pages/Login"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Collection = lazy(() => import("./pages/Collection"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="flex justify-center py-24 text-gray-400 text-sm">Loading...</div>
);

const App = () => {
  return (
    <div className="min-h-screen">
      <ToastContainer/>
      <Navbar />
      <SearchBar/>
    <Suspense fallback={<RouteFallback/>}>
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/product/:productId" element={<Product/>} />
      <Route path="/cart" element={<Cart/>} />
      <Route path="/order" element={<Orders/>} />
      <Route path="/order/confirmation" element={<OrderConfirmation/>} />
      <Route path="/track" element={<TrackOrder/>} />
      <Route path="/track/:trackingNumber" element={<TrackOrder/>} />
      <Route path="/login" element={<Login/>} />
      <Route path="/forgot-password" element={<ForgotPassword/>} />
      <Route path="/reset-password" element={<ResetPassword/>} />
      <Route path="/verify-email" element={<VerifyEmail/>} />
      <Route path="/contact" element={<Contact/>} />
      <Route path="/place-order" element={<PlaceOrder/>} />
      <Route path="/about" element={<About/>} />
      <Route path="/collection" element={<Collection/>} />
      <Route path="*" element={<NotFound/>} />
      </Routes>
      </Suspense>
      <Footer/>
      <WhatsAppButton/>
  </div>
  )
};

export default App;
