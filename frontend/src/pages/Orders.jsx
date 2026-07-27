// @ts-nocheck
import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { toast } from 'react-toastify'
import api from '../utils/api'

const STATUS_LABELS = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

const STATUS_COLOR = {
  placed: 'bg-gray-400',
  confirmed: 'bg-blue-400',
  processing: 'bg-blue-400',
  shipped: 'bg-yellow-500',
  out_for_delivery: 'bg-yellow-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-red-500',
}

const Orders = () =>
{
  const { currency, getMyOrders, isLoggedIn, navigate } = useContext(ShopContext)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [refundReasons, setRefundReasons] = useState({}) // { [orderId]: reason }
  const [refundSubmittingId, setRefundSubmittingId] = useState(null)

  const requestRefund = async (orderId) => {
    const reason = (refundReasons[orderId] || '').trim()
    if (reason.length < 5) {
      toast.error('Please describe the issue (at least 5 characters)')
      return
    }
    setRefundSubmittingId(orderId)
    try {
      const { data } = await api.post(`/api/orders/${orderId}/refund-request`, { reason })
      if (data.success) {
        toast.success('Refund requested — we will review it shortly')
        setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not request refund')
    } finally {
      setRefundSubmittingId(null)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    (async () => {
      try {
        const data = await getMyOrders()
        setOrders(data)
      } catch (error) {
        toast.error('Could not load your orders')
      } finally {
        setLoading(false)
      }
    })()
  }, [isLoggedIn])

  if (loading) {
    return <div className='border-t pt-16 text-center text-gray-500'>Loading your orders...</div>
  }

  return (
    <div className='border-t pt-16'>
      <div className='text-2xl'>
        <Title text1={'MY'} text2={'ORDERS'}/>
      </div>

      {orders.length === 0 && (
        <p className='py-10 text-gray-500'>You haven't placed any orders yet.</p>
      )}

      <div className=''>
        {orders.map((order) => (
          <div key={order._id} className='py-4 border-t border-b text-gray-700'>
            <div className='flex flex-col md:items-center md:flex-row md:justify-between gap-4'>
              <div className='text-sm'>
                <p className='sm:text-base font-medium'>{order.orderNumber}</p>
                <p className='mt-1 text-gray-500'>{order.items.length} item(s) &middot; {currency}{order.total.toLocaleString()}</p>
                <p className='mt-1'>Placed: <span className='text-gray-400'>{new Date(order.createdAt).toLocaleDateString()}</span></p>
                {order.trackingNumber && (
                  <p className='mt-1 text-gray-400'>Tracking #: {order.trackingNumber} {order.carrier ? `(${order.carrier})` : ''}</p>
                )}
              </div>

              <div className='md:w-1/2 flex justify-between items-center'>
                <div className='flex items-center gap-2'>
                  <p className={`min-w-2 h-2 rounded-full ${STATUS_COLOR[order.status] || 'bg-gray-400'}`}></p>
                  <p className='text-sm md:text-base'>{STATUS_LABELS[order.status] || order.status}</p>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                  className='border px-4 py-2 text-sm font-medium rounded-sm'
                >
                  {expandedId === order._id ? 'Hide Details' : 'Track Order'}
                </button>
              </div>
            </div>

            {expandedId === order._id && (
              <div className='mt-4 bg-gray-50 rounded p-4'>
                <p className='font-medium text-sm mb-3'>Delivery Timeline</p>
                <ol className='relative border-l border-gray-300 ml-2'>
                  {order.trackingEvents.map((event, idx) => (
                    <li key={idx} className='mb-4 ml-4'>
                      <div className='absolute w-2 h-2 bg-black rounded-full -left-1'></div>
                      <p className='text-sm font-medium'>{STATUS_LABELS[event.status] || event.status}</p>
                      {event.location && <p className='text-xs text-gray-500'>{event.location}</p>}
                      {event.note && <p className='text-xs text-gray-500'>{event.note}</p>}
                      <p className='text-xs text-gray-400'>{new Date(event.at).toLocaleString()}</p>
                    </li>
                  ))}
                </ol>
                {order.estimatedDeliveryDate && order.status !== 'delivered' && (
                  <p className='text-sm text-gray-600 mt-2'>
                    Estimated delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                  </p>
                )}
                <div className='mt-3'>
                  <p className='font-medium text-sm mb-2'>Items</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className='flex items-center gap-4 text-sm py-2 border-t'>
                      {item.image && <img src={item.image} className='w-12 h-12 object-cover rounded' alt='' />}
                      <div>
                        <p>{item.name}</p>
                        <p className='text-gray-500'>Size: {item.size} &middot; Qty: {item.quantity} &middot; {currency}{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- Refund / return --- */}
                {order.paymentStatus === 'paid' && order.refund?.status === 'none' && (
                  <div className='mt-4 pt-3 border-t'>
                    <p className='font-medium text-sm mb-2'>Not happy with this order?</p>
                    <textarea
                      value={refundReasons[order._id] || ''}
                      onChange={(e) => setRefundReasons((prev) => ({ ...prev, [order._id]: e.target.value }))}
                      placeholder="Tell us what went wrong (e.g. wrong size, damaged item)..."
                      className='border border-gray-300 rounded py-2 px-3 w-full text-sm'
                      rows={2}
                    />
                    <button
                      onClick={() => requestRefund(order._id)}
                      disabled={refundSubmittingId === order._id}
                      className='mt-2 border px-4 py-2 text-sm rounded-sm disabled:opacity-50'
                    >
                      {refundSubmittingId === order._id ? 'Submitting...' : 'Request Refund'}
                    </button>
                  </div>
                )}
                {order.refund?.status && order.refund.status !== 'none' && (
                  <div className='mt-4 pt-3 border-t text-sm'>
                    <p>
                      Refund status: <b>{order.refund.status}</b>
                      {order.refund.status === 'completed' && order.refund.amount ? ` — ${currency}${order.refund.amount.toLocaleString()} refunded` : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Orders
