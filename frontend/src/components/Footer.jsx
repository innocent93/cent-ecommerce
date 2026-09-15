import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Instagram, Facebook, Mail, MapPin } from 'lucide-react';
import { assets } from '../frontend_assets/assets';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="us-shell py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div><img src={assets.logo} className="mb-5 h-10 w-auto object-contain" alt="UrbanStep" /><p className="max-w-sm text-sm leading-6 text-slate-500">A considered fashion marketplace connecting you with independent sellers and pieces worth keeping.</p><div className="mt-6 flex gap-2"><a className="us-social" href="#" aria-label="Instagram"><Instagram size={18}/></a><a className="us-social" href="#" aria-label="Facebook"><Facebook size={18}/></a></div></div>
          <div><h3 className="us-footer-heading">Explore</h3><div className="us-footer-links"><Link to="/">Home</Link><Link to="/collection">Shop all</Link><Link to="/about">Our story</Link><Link to="/track">Track order</Link></div></div>
          <div><h3 className="us-footer-heading">Support</h3><div className="us-footer-links"><Link to="/contact">Contact us</Link><Link to="/forgot-password">Account help</Link><Link to="/contact">Shipping & returns</Link><Link to="/contact">Become a seller</Link></div></div>
          <div><h3 className="us-footer-heading">Stay in the loop</h3><p className="text-sm leading-6 text-slate-500">Get new drops, seller stories, and useful style notes.</p><div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Mail size={16}/> support@urbanstep.ng</div><div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16}/> Nigeria</div><Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#3155e7]">Talk to us <ArrowUpRight size={16}/></Link></div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} UrbanStep. All rights reserved.</span><span>Built for everyday movement.</span></div>
      </div>
    </footer>
  );
}
