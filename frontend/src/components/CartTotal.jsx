import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title'

const CartTotal = ({ discountAmount = 0 }) =>
{
    const {currency,delivery_fee,getCartAmount} = useContext(ShopContext)
    const subtotal = getCartAmount()
    const total = subtotal === 0 ? 0 : Math.max(subtotal + delivery_fee - discountAmount, 0)
  return (
    <div className='w-full'>
          <div className='text-2xl'>
              <Title text1={'CART'}  text2={'TOTALS'} />
          </div>
          <div className='flex flex-col gap-2 mt-2 text-sm'>
              <div className='flex justify-between'>
                  <p>Subtotal</p>
                  <p>{ currency}{subtotal }.00</p>
              </div>
              <hr />
              <div className='flex justify-between'>
                  <p>Shipping Fee</p>
                  <p>{currency}{ delivery_fee}.00</p>
              </div>
              {discountAmount > 0 && (
                <>
                  <hr />
                  <div className='flex justify-between text-green-600'>
                      <p>Discount</p>
                      <p>-{currency}{discountAmount}.00</p>
                  </div>
                </>
              )}
              <hr />
              <div className='flex justify-between'>
                  <b>Total</b>
                  <b>{currency}{ total }.00</b>
              </div>
          </div>
      </div>
      

  )
}

export default CartTotal
