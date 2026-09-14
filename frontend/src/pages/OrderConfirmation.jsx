// @ts-nocheck
import React, { useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'

// Landing page after a Paystack redirect (?reference=...). This page is
// purely informational — the actual payment confirmation happens
// server-side via the Paystack webhook (see backend/src/controllers/webhook.controller.js),
// which is the only source of truth for `paymentStatus`. We never mark an
// order paid based on the browser simply landing here.
const OrderConfirmation = () => {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference')
  const { getMyOrders, navigate } = useContext(ShopContext)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const orders = await getMyOrders()
        const match = orders.find((o) => o.paymentReference === reference)
        setOrder(match || orders[0] || null)
      } catch {
        /* ignore — we still show a generic confirmation below */
      }
    })()
  }, [reference])

  return (
    <div className='border-t pt-16 min-h-[60vh] flex flex-col items-center text-center gap-4'>
      <Title text1={'ORDER'} text2={'RECEIVED'} />
      <p className='text-gray-600 max-w-md'>
        Thanks for your order{order ? ` #${order.orderNumber}` : ''}! We're confirming your payment now —
        this usually takes a few seconds. You'll see the updated status in "My Orders".
      </p>
      <button onClick={() => navigate('/order')} className='bg-black text-white px-8 py-3 text-sm mt-4'>
        VIEW MY ORDERS
      </button>
    </div>
  )
}

export default OrderConfirmation
