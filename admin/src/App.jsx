// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import Add from "./pages/Add";
import List from "./pages/List";
import Edit from "./pages/Edit";
import Orders from "./pages/Orders";
import Refunds from "./pages/Refunds";
import Coupons from "./pages/Coupons";
import Staff from "./pages/Staff";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'


export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency  = "\u20a6"

const App = () =>
{
  const [ token, setToken ] = useState( localStorage.getItem('token') || "" )
  const [ role, setRole ] = useState( localStorage.getItem('role') || "" )

  useEffect( () =>
  {
    localStorage.setItem('token', token)
  },[token])

  useEffect( () =>
  {
    localStorage.setItem('role', role)
  },[role])

  const isSuperAdmin = role === 'superadmin'

  return (
    
    <div className="bg-gray-50 min-h-screen" >
      {token === "" ? <Login setToken={setToken} setRole={setRole} /> :  <>
        <ToastContainer/>
         <Navbar setToken={setToken} setRole={setRole} />
      <hr />
      <div className="flex w-full">
        <Sidebar isSuperAdmin={isSuperAdmin} />
    
      <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
        <Routes>
      <Route path="/add" element={<Add token={token} />} />
      <Route path="/list" element={<List token={token} />} />
      <Route path="/edit/:productId" element={<Edit token={token} />} />
      <Route path="/orders" element={<Orders token={token} />} />
      <Route path="/refunds" element={<Refunds token={token} />} />
      <Route path="/coupons" element={<Coupons token={token} />} />
      <Route
        path="/staff"
        element={isSuperAdmin ? <Staff token={token} /> : <Navigate to="/orders" replace />}
      />
      </Routes>
          </div>
            </div>
      </>
      }
     
    
     
  </div>
  )
};

export default App;
