// @ts-nocheck
import React, { useContext, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import { toast } from 'react-toastify'

// Public tracking page (no login required) — mirrors the "track your
// package" pages on Jumia/DHL/Amazon. Looks up an order purely by its
// tracking number, which is safe to expose without auth since it reveals
// nothing more sensitive than shipment status.
const TrackOrder = () => {
  const { trackOrder } = useContext(ShopContext)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setOrder(null)
    try {
      const result = await trackOrder(trackingNumber.trim())
      if (!result) {
        toast.error('No order found with that tracking number')
      }
      setOrder(result)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No order found with that tracking number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='border-t pt-16 min-h-[60vh]'>
      <Title text1={'TRACK'} text2={'YOUR ORDER'} />
      <form onSubmit={onSubmit} className='flex gap-3 mt-6 max-w-md'>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder='Enter tracking number'
          className='border border-gray-300 rounded py-2 px-3.5 w-full'
          required
        />
        <button disabled={loading} className='bg-black text-white px-6 py-2 text-sm disabled:opacity-50'>
          {loading ? 'Searching...' : 'Track'}
        </button>
      </form>

      {order && (
        <div className='mt-8 bg-gray-50 rounded p-4 max-w-md'>
          <p className='font-medium'>{order.orderNumber}</p>
          <p className='text-sm text-gray-600 mt-1'>Status: {order.status.replace(/_/g, ' ')}</p>
          {order.carrier && <p className='text-sm text-gray-600'>Carrier: {order.carrier}</p>}
          {order.estimatedDeliveryDate && (
            <p className='text-sm text-gray-600'>
              Estimated delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
            </p>
          )}
          <ol className='relative border-l border-gray-300 ml-2 mt-4'>
            {order.trackingEvents.map((event, idx) => (
              <li key={idx} className='mb-4 ml-4'>
                <div className='absolute w-2 h-2 bg-black rounded-full -left-1'></div>
                <p className='text-sm font-medium'>{event.status.replace(/_/g, ' ')}</p>
                {event.location && <p className='text-xs text-gray-500'>{event.location}</p>}
                <p className='text-xs text-gray-400'>{new Date(event.at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default TrackOrder
