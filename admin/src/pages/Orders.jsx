// @ts-nocheck
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'

const STATUS_OPTIONS = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
]

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [trackingDrafts, setTrackingDrafts] = useState({}) // { [orderId]: { trackingNumber, carrier, estimatedDeliveryDate } }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await axios.get(backendUrl + '/api/orders', { headers: { token } })
      if (response.data.success) {
        setOrders(response.data.orders)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const updateDraft = (orderId, field, value) => {
    setTrackingDrafts((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }))
  }

  const submitStatusUpdate = async (orderId, payload) => {
    try {
      const response = await axios.patch(
        `${backendUrl}/api/orders/${orderId}/status`,
        payload,
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success('Order updated')
        setOrders((prev) => prev.map((o) => (o._id === orderId ? response.data.order : o)))
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const onChangeStatus = (order, newStatus) => {
    submitStatusUpdate(order._id, { status: newStatus })
  }

  const onSaveTracking = (order) => {
    const draft = trackingDrafts[order._id] || {}
    if (!draft.trackingNumber && !draft.carrier && !draft.estimatedDeliveryDate) {
      toast.info('Enter a tracking number, carrier, or ETA first')
      return
    }
    submitStatusUpdate(order._id, draft)
  }

  if (loading) return <p>Loading orders...</p>

  return (
    <div>
      <p className='mb-4 text-lg font-medium'>Orders ({orders.length})</p>

      {orders.length === 0 && <p className='text-gray-400'>No orders yet.</p>}

      <div className='flex flex-col gap-4'>
        {orders.map((order) => {
          const draft = trackingDrafts[order._id] || {}
          return (
            <div key={order._id} className='border rounded p-4 bg-white'>
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
                <div>
                  <p className='font-medium'>{order.orderNumber}</p>
                  <p className='text-xs text-gray-500'>{new Date(order.createdAt).toLocaleString()}</p>
                  <p className='text-sm mt-1'>{order.shippingAddress.fullName} &middot; {order.shippingAddress.phone}</p>
                  <p className='text-sm text-gray-500'>
                    {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.country}
                  </p>
                </div>
                <div className='text-sm'>
                  <p>Payment: <b>{order.paymentMethod.toUpperCase()}</b> ({order.paymentStatus})</p>
                  <p>Total: <b>{currency}{order.total.toLocaleString()}</b></p>
                  <p className='text-xs text-gray-400'>Commission: {currency}{order.commissionAmount?.toLocaleString() || 0}</p>
                </div>
                <div className='flex flex-col gap-2'>
                  <select
                    value={order.status}
                    onChange={(e) => onChangeStatus(order, e.target.value)}
                    className='border rounded px-2 py-1 text-sm'
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                    className='text-xs underline text-gray-500'
                  >
                    {expandedId === order._id ? 'Hide items & tracking' : 'View items & set tracking'}
                  </button>
                </div>
              </div>

              {expandedId === order._id && (
                <div className='mt-4 pt-4 border-t grid md:grid-cols-2 gap-6'>
                  <div>
                    <p className='font-medium text-sm mb-2'>Items</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className='flex items-center gap-3 text-sm py-1'>
                        {item.image && <img src={item.image} className='w-10 h-10 object-cover rounded' alt='' />}
                        <p>{item.name} &middot; size {item.size} &middot; qty {item.quantity} &middot; {currency}{item.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className='font-medium text-sm mb-2'>Delivery / Tracking</p>
                    <div className='flex flex-col gap-2'>
                      <input
                        placeholder='Tracking number'
                        defaultValue={order.trackingNumber || ''}
                        onChange={(e) => updateDraft(order._id, 'trackingNumber', e.target.value)}
                        className='border rounded px-2 py-1 text-sm'
                      />
                      <input
                        placeholder='Carrier (e.g. GIG Logistics)'
                        defaultValue={order.carrier || ''}
                        onChange={(e) => updateDraft(order._id, 'carrier', e.target.value)}
                        className='border rounded px-2 py-1 text-sm'
                      />
                      <input
                        type='date'
                        defaultValue={order.estimatedDeliveryDate ? order.estimatedDeliveryDate.slice(0, 10) : ''}
                        onChange={(e) => updateDraft(order._id, 'estimatedDeliveryDate', e.target.value)}
                        className='border rounded px-2 py-1 text-sm'
                      />
                      <button
                        onClick={() => onSaveTracking(order)}
                        className='bg-black text-white text-sm py-1.5 rounded'
                      >
                        Save Tracking Info
                      </button>
                    </div>

                    <p className='font-medium text-sm mt-4 mb-2'>Timeline</p>
                    <ol className='text-xs text-gray-500 flex flex-col gap-1'>
                      {order.trackingEvents.map((event, idx) => (
                        <li key={idx}>
                          {event.status.replace(/_/g, ' ')} — {new Date(event.at).toLocaleString()}
                          {event.location ? ` (${event.location})` : ''}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Orders
