import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

export default function NewsletterBox() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (event) => { event.preventDefault(); if (!email.trim()) return; setSubmitted(true); };
  return <section className="us-shell"><div className="us-newsletter"><div><p className="us-kicker text-[#b9c8ff]">Stay in the loop</p><h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Good style. Delivered.</h2><p className="mt-2 max-w-md text-sm leading-6 text-blue-100">Get first access to new drops, seller spotlights, and subscriber-only offers.</p></div><form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="newsletter-email">Email address</label><div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-4"><Mail size={17} className="shrink-0 text-slate-400" /><input id="newsletter-email" type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="you@example.com" className="min-w-0 flex-1 py-3 text-sm text-slate-900 outline-none" /></div><button className="us-button bg-white text-[#2446e8]" type="submit">{submitted ? 'You’re in' : 'Subscribe'} <ArrowRight size={17} /></button></form></div></section>;
}
