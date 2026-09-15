import React from 'react';
import { ArrowRight, BadgeCheck, Truck, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import LatestCollection from '../components/LatestCollection';
import BestSeller from '../components/BestSeller';
import NewsletterBox from '../components/NewsletterBox';

const categories = [
  { label: 'Women', description: 'Everyday essentials', tone: 'bg-[#e9efff]', href: '/collection?category=Women' },
  { label: 'Men', description: 'Sharp, effortless fits', tone: 'bg-[#edf4f1]', href: '/collection?category=Men' },
  { label: 'Shoes', description: 'Steps worth taking', tone: 'bg-[#fff1df]', href: '/collection?category=Shoes' },
  { label: 'Accessories', description: 'Finish the look', tone: 'bg-[#f2eaff]', href: '/collection?category=Accessories' },
];

export default function Home() {
  return (
    <main className="space-y-16 pb-16 sm:space-y-20">
      <Hero />

      <section className="us-shell">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="us-kicker">Shop by mood</p>
            <h2 className="us-section-title">Find your next favourite.</h2>
          </div>
          <Link to="/collection" className="us-text-link hidden sm:inline-flex">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.label} to={category.href} className={`us-category-card ${category.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-sm font-extrabold text-slate-900">{category.label[0]}</span>
                <ArrowRight size={18} className="text-slate-500" />
              </div>
              <div className="mt-12 sm:mt-16">
                <h3 className="text-lg font-extrabold tracking-tight text-slate-950">{category.label}</h3>
                <p className="mt-1 text-xs text-slate-600">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <LatestCollection />
      <BestSeller />

      <section className="us-shell">
        <div className="us-trust-panel">
          <div className="max-w-xl">
            <p className="us-kicker">Why UrbanStep</p>
            <h2 className="us-section-title">A better way to shop fashion online.</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">One trusted marketplace for expressive style, independent sellers, transparent delivery, and a checkout that feels simple.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="us-trust-item"><Truck size={22} /><strong>Reliable delivery</strong><span>Across Nigeria</span></div>
            <div className="us-trust-item"><ShieldCheck size={22} /><strong>Secure checkout</strong><span>Protected payments</span></div>
            <div className="us-trust-item"><RotateCcw size={22} /><strong>Easy returns</strong><span>Clear return policy</span></div>
            <div className="us-trust-item"><BadgeCheck size={22} /><strong>Trusted sellers</strong><span>Curated marketplace</span></div>
          </div>
        </div>
      </section>

      <NewsletterBox />
    </main>
  );
}
