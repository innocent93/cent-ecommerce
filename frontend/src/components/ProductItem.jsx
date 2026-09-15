import React, { useContext } from 'react';
import { Heart, ArrowUpRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import optimizedImage from '../utils/cloudinaryImage';

export default function ProductItem({ id, image = [], name, price }) {
  const { currency } = useContext(ShopContext);
  const imageUrl = image[0];
  return (
    <Link className="group block min-w-0" to={`/product/${id}`}>
      <article className="us-product-card">
        <div className="us-product-media relative overflow-hidden bg-slate-100">
          {imageUrl && <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={optimizedImage(imageUrl, 700)} loading="lazy" decoding="async" alt={name} />}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">New in</span>
          <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow-sm transition group-hover:bg-[#3155e7] group-hover:text-white"><Heart size={16} /></span>
          <span className="absolute bottom-3 right-3 grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-slate-950 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"><ArrowUpRight size={16} /></span>
        </div>
        <div className="space-y-2 p-3 sm:p-4">
          <div className="flex items-center gap-1 text-[11px] text-amber-500"><Star size={12} fill="currentColor" /><span className="text-slate-500">4.8 · Popular pick</span></div>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-slate-900">{name}</p>
          <div className="flex items-end justify-between gap-2"><p className="text-base font-black text-slate-950">{currency}{Number(price || 0).toLocaleString()}</p><span className="text-[10px] font-semibold text-slate-400">View</span></div>
        </div>
      </article>
    </Link>
  );
}
