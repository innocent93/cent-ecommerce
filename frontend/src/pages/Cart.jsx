// @ts-nocheck
import React, { useContext, useEffect, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import { assets } from "../frontend_assets/assets";
import CartTotal from "../components/CartTotal";
import optimizedImage from "../utils/cloudinaryImage";

const Cart = () =>
{
  const { products, currency, cartItems, updateQuantity,navigate} = useContext( ShopContext )
  const [ cartData, setCartData ] = useState( [] )
  

  useEffect( () => {
    const tempData = [] 
    for (const items in cartItems) {
      for (const item in cartItems[items])
        if (cartItems[items][item] > 0) {
          tempData.push( {
            _id: items,
            size: item,
            quantity: cartItems[items][item]
          })
        }
    }
    setCartData(tempData);
    
  },[cartItems])
  return <div className="border-t pt-14">

    <div className="text-2xl mb-3">
      <Title text1={'YOUR'} text2={'CART'} />
    </div>
    <div className="">
      {/* Product entry */}
      {
        cartData.map( (item,index) =>
        {
          const productData = products.find( ( product ) => product._id === item._id )
          return (
            <div key={index} className="py-4 border-t border-b text-gray-700 grid grid-cols-[4fr_0.5fr-0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-4 ">
              <div className="flex items-start gap-6">
                <img className="w-16 sm:w-20" src={optimizedImage(productData.image[0], 160)} loading="lazy" decoding="async" alt={productData.name} />
                <div className="">
                  <p className="text-sm font-medium sm:text-lg">{productData.name}</p>
                  <div className="flex items-center gap-5 mt-2">
                    <p>{currency}{productData.price}</p>
                    <p className="px-2 sm:px-3 sm:py-1 border bg-slate-50">{ item.size}</p>
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label={`Quantity for ${productData.name}`}><button type="button" aria-label="Decrease quantity" onClick={()=>updateQuantity(item._id,item.size,Math.max(1,item.quantity-1))} className="grid h-9 w-9 place-items-center text-lg font-bold text-slate-700 hover:bg-slate-50">−</button><span className="grid h-9 min-w-9 place-items-center border-x border-slate-200 px-2 text-sm font-bold">{item.quantity}</span><button type="button" aria-label="Increase quantity" onClick={()=>updateQuantity(item._id,item.size,item.quantity+1)} className="grid h-9 w-9 place-items-center text-lg font-bold text-slate-700 hover:bg-slate-50">+</button></div>
              <img onClick={()=> updateQuantity(item._id,item.size,0)} src={assets.bin_icon} className="w-4 mr-4 sm:w-5 cursor-pointer" alt="" />
            </div>
          )
        })
      }
    </div>
    <div className="flex justify-end my-20">
      <div className="w-full sm:w-[450px]">
        <CartTotal />
        
        <div className="w-full text-end">
<button onClick={()=> navigate('/place-order')} className="bg-black text-white text-sm my-8 px-8 py-3">PROCEED TO CHECKOUT</button>
        </div>
</div>
    </div>
  </div>;
};

export default Cart;
