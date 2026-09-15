import React from 'react';
import { ArrowUpRight, Search, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { assets } from '../frontend_assets/assets';

export default function Hero() {
  return (
    <section className="us-shell pt-4 sm:pt-6">
      <div className="us-hero-grid">
        <div className="us-hero-copy">
          <div className="flex items-center gap-2 text-xs font-bold text-[#3155e7]"><span className="h-2 w-2 rounded-full bg-[#3155e7]" /> New season, new energy</div>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-6xl">Style that moves<br /><span className="text-[#3155e7]">with you.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">Discover fashion from independent sellers, curated for real life and delivered across Nigeria.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/collection" className="us-button us-button-primary">Shop the edit <ArrowUpRight size={17} /></Link>
            <Link to="/about" className="us-button us-button-secondary">Explore UrbanStep</Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#3155e7]" /> Trusted sellers</span>
            <span className="flex items-center gap-2"><Truck size={16} className="text-[#3155e7]" /> Fast delivery</span>
            <span className="flex items-center gap-2"><RotateCcw size={16} className="text-[#3155e7]" /> Easy returns</span>
          </div>
        </div>
        <div className="us-hero-art">
          <div className="absolute right-[-10%] top-[-18%] h-72 w-72 rounded-full bg-[#3155e7] sm:h-96 sm:w-96" />
          <div className="absolute bottom-[-30%] left-[-15%] h-80 w-80 rounded-full border-[24px] border-[#f4c95d]" />
          <img src={assets.hero_img} alt="UrbanStep fashion collection" className="relative z-10 h-full w-full object-cover object-center mix-blend-multiply" />
          <div className="absolute bottom-5 left-5 right-5 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:min-w-[270px]">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Featured edit</p><p className="mt-1 text-sm font-extrabold text-slate-950">Made for your next move.</p></div>
            <Link to="/collection" aria-label="Explore featured edit" className="grid h-10 w-10 place-items-center rounded-full bg-[#3155e7] text-white"><ArrowUpRight size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
