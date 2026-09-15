import React, { useContext, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, ShoppingBag, UserRound, Menu, X, ChevronRight } from 'lucide-react';
import { ShopContext } from '../context/ShopContext';

const links=[['/','Home'],['/collection','Shop'],['/about','Our story'],['/contact','Contact']];
export default function Navbar(){
 const [open,setOpen]=useState(false);
 const {setShowSearch,getCartCount,navigate,token,logout}=useContext(ShopContext);
 const navClass=({isActive})=>`text-sm font-semibold transition ${isActive?'text-[#2446e8]':'text-slate-600 hover:text-[#2446e8]'}`;
 return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
  <div className="us-shell flex h-[76px] items-center justify-between gap-5">
   <Link to="/" className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2446e8] text-lg font-extrabold text-white">U</span><span className="text-xl font-extrabold tracking-tight">Urban<span className="text-[#2446e8]">Step</span></span></Link>
   <nav className="hidden items-center gap-7 md:flex">{links.map(([to,label])=><NavLink key={to} to={to} className={navClass}>{label}</NavLink>)}</nav>
   <div className="flex items-center gap-2">
    <button aria-label="Search" onClick={()=>setShowSearch(true)} className="grid h-11 w-11 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100"><Search size={20}/></button>
    <button aria-label="Account" onClick={()=>token?null:navigate('/login')} className="hidden h-11 w-11 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100 sm:grid"><UserRound size={20}/></button>
    <Link aria-label="Cart" to="/cart" className="relative grid h-11 w-11 place-items-center rounded-2xl text-slate-700 hover:bg-slate-100"><ShoppingBag size={20}/><span className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#2446e8] px-1 text-[10px] font-bold text-white">{getCartCount()}</span></Link>
    <button aria-label="Open menu" onClick={()=>setOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 md:hidden"><Menu size={21}/></button>
   </div>
  </div>
  {open&&<div className="fixed inset-0 z-50 bg-slate-950/30 md:hidden" onClick={()=>setOpen(false)}><aside className="ml-auto flex h-full w-[min(88%,360px)] flex-col bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
   <div className="mb-8 flex items-center justify-between"><span className="text-lg font-extrabold">Menu</span><button onClick={()=>setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><X size={20}/></button></div>
   <div className="flex flex-col gap-2">{links.map(([to,label])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} className="flex items-center justify-between rounded-2xl px-4 py-4 font-semibold hover:bg-blue-50 hover:text-[#2446e8]">{label}<ChevronRight size={18}/></NavLink>)}</div>
   <div className="mt-auto border-t border-slate-200 pt-5">{token?<button onClick={logout} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white">Sign out</button>:<button onClick={()=>{setOpen(false);navigate('/login')}} className="w-full rounded-2xl bg-[#2446e8] px-4 py-3 font-bold text-white">Sign in</button>}</div>
  </aside></div>}
 </header>
}
