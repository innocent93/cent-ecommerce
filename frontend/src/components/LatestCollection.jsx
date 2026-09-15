import React, { useContext, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import ProductItem from './ProductItem.jsx';

export default function LatestCollection() {
  const { products } = useContext(ShopContext);
  const [latestProducts, setLatestProducts] = useState([]);
  useEffect(() => setLatestProducts(products.slice(0, 10)), [products]);
  return (
    <section className="us-shell">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="us-kicker">Fresh from the marketplace</p><h2 className="us-section-title">Latest arrivals</h2><p className="mt-2 max-w-lg text-sm text-slate-500">New pieces, everyday essentials, and standout finds from sellers worth discovering.</p></div><Link to="/collection" className="us-text-link hidden sm:inline-flex">Shop all <ArrowRight size={16} /></Link></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{latestProducts.map((item) => <ProductItem key={item._id} id={item._id} image={item.image} name={item.name} price={item.price} />)}</div>
    </section>
  );
}
