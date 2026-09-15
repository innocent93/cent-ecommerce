import React, { useContext, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import ProductItem from './ProductItem';

export default function BestSeller() {
  const { products } = useContext(ShopContext);
  const [bestSeller, setBestSeller] = useState([]);
  useEffect(() => setBestSeller(products.filter((item) => item.bestseller).slice(0, 5)), [products]);
  return (
    <section className="us-shell"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="us-kicker">Loved by shoppers</p><h2 className="us-section-title">Customer favourites</h2><p className="mt-2 max-w-lg text-sm text-slate-500">The pieces customers keep coming back for.</p></div><Link to="/collection" className="us-text-link hidden sm:inline-flex">View all <ArrowRight size={16} /></Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{bestSeller.map((item) => <ProductItem key={item._id} id={item._id} name={item.name} price={item.price} image={item.image} />)}</div></section>
  );
}
