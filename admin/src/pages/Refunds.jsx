// @ts-nocheck
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'

const Refunds = ({ token }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState({}) // { [orderId]: adminNote }

  const fetchRefundRequests = async () => {
    setLoading(true)
    try {
      const response = await axios.get(backendUrl + '/api/orders/refunds', { headers: { token } })
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
    fetchRefundRequests()
  }, [])

  const decide = async (orderId, action) => {
    try {
      const response = await axios.patch(
        `${backendUrl}/api/orders/${orderId}/refund/${action}`,
        { adminNote: notes[orderId] || '' },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success(action === 'approve' ? 'Refund processed' : 'Refund rejected')
        setOrders((prev) => prev.filter((o) => o._id !== orderId))
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  if (loading) return <p>Loading refund requests...</p>

  return (
    <div>
      <p className='mb-4 text-lg font-medium'>Pending Refund Requests ({orders.length})</p>

      {orders.length === 0 && <p className='text-gray-400'>No pending refund requests.</p>}

      <div className='flex flex-col gap-4'>
        {orders.map((order) => (
          <div key={order._id} className='border rounded p-4 bg-white'>
            <p className='font-medium'>{order.orderNumber} &middot; {currency}{order.total.toLocaleString()}</p>
            <p className='text-sm text-gray-500 mt-1'>Requested: {new Date(order.refund.requestedAt).toLocaleString()}</p>
            <p className='text-sm mt-2'><b>Customer reason:</b> {order.refund.reason}</p>
            <textarea
              placeholder='Internal note (optional, sent to customer if refunded)'
              value={notes[order._id] || ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, [order._id]: e.target.value }))}
              className='border rounded px-2 py-1 text-sm w-full max-w-md mt-2'
              rows={2}
            />
            <div className='flex gap-2 mt-3'>
              <button onClick={() => decide(order._id, 'approve')} className='bg-black text-white text-sm px-4 py-1.5 rounded'>
                Approve & Refund
              </button>
              <button onClick={() => decide(order._id, 'reject')} className='border text-sm px-4 py-1.5 rounded'>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Refunds
