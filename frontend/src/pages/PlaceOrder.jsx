// @ts-nocheck
import React, { useContext, useState } from 'react'
import Title from '../components/Title'
import CartTotal from '../components/CartTotal'
import { ShopContext } from '../context/ShopContext'
import { toast } from 'react-toastify'
import api from '../utils/api'

const PlaceOrder = () =>
{
  const [ method, setMethod ] = useState( 'paystack' )
  const [ submitting, setSubmitting ] = useState( false )
  const { navigate, placeOrder, isLoggedIn, cartItems, getCartAmount } = useContext(ShopContext)
  // One key per checkout attempt: stable across a double-click or a retry of
  // *this* form, but a fresh order if the user leaves and starts over.
  const [idempotencyKey] = useState(() =>
    (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  )

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'NG',
  })

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null) // { code, discountAmount }
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const hasItems = Object.keys(cartItems || {}).length > 0

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) return
    setApplyingCoupon(true)
    try {
      const { data } = await api.post('/api/coupons/validate', { code, subtotal: getCartAmount() })
      if (data.success) {
        setAppliedCoupon({ code: code.toUpperCase(), discountAmount: data.discountAmount })
        toast.success(`Coupon applied — you saved \u20a6${data.discountAmount}`)
      }
    } catch (error) {
      setAppliedCoupon(null)
      toast.error(error.response?.data?.message || 'Invalid coupon code')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
  }

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!isLoggedIn) {
      toast.info('Please log in to place an order')
      navigate('/login')
      return
    }
    if (!hasItems) {
      toast.error('Your cart is empty')
      return
    }

    if (submitting) return; // guards against a double-click firing two submits before state updates
    setSubmitting(true)
    try {
      const data = await placeOrder({
        shippingAddress: form,
        paymentMethod: method,
        idempotencyKey,
        ...(appliedCoupon && { couponCode: appliedCoupon.code }),
      })

      if (!data.success) {
        toast.error(data.message || 'Could not place order')
        return
      }

      if (method === 'paystack' && data.paystackAuthorizationUrl) {
        // Redirect to Paystack's hosted checkout page. Paystack redirects
        // back to FRONTEND_URL/order/confirmation?reference=... when done,
        // and the backend webhook independently confirms payment server-side
        // (never trust the redirect alone for "payment succeeded").
        window.location.href = data.paystackAuthorizationUrl
        return
      }

      // Cash on delivery — order is placed immediately, nothing to redirect to.
      toast.success('Order placed! Pay cash when it arrives.')
      navigate('/order')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not place order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>
      {/* Left Side */}
      <div className='flex flex-col gap-4 w-full max-w-[480px]'>
        <div className='text-xl sm:text-2xl my-3'>
          <Title text1={'DELIVERY'} text2={'INFORMATION'}/>
        </div>
        <input name='fullName' value={form.fullName} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Full Name' required />
        <input name='line1' value={form.line1} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Street Address' required />
        <input name='line2' value={form.line2} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Apartment, suite, etc. (optional)' />
        <div className='flex gap-3' >
          <input name='city' value={form.city} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='City' required />
          <input name='state' value={form.state} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='State' />
        </div>
        <div className='flex gap-3' >
          <input name='postalCode' value={form.postalCode} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="text" placeholder='Postal Code' required />
          <select name='country' value={form.country} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full'>
            <option value='NG'>Nigeria</option>
            <option value='GH'>Ghana</option>
            <option value='KE'>Kenya</option>
            <option value='ZA'>South Africa</option>
          </select>
        </div>
        <input name='phone' value={form.phone} onChange={onChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full' type="tel" placeholder='Phone Number' required />
      </div>

      {/* Right Side */}
      <div className='mt-8'>
        <div className='mt-8 min-w-80'>
          <CartTotal discountAmount={appliedCoupon?.discountAmount || 0} />

          <div className='mt-4'>
            {appliedCoupon ? (
              <div className='flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded px-3 py-2'>
                <span>Coupon <b>{appliedCoupon.code}</b> applied</span>
                <button type='button' onClick={removeCoupon} className='text-red-600 underline'>Remove</button>
              </div>
            ) : (
              <div className='flex gap-2'>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder='Coupon code'
                  className='border border-gray-300 rounded py-1.5 px-3.5 flex-1 text-sm'
                />
                <button
                  type='button'
                  onClick={applyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className='border px-4 py-1.5 text-sm rounded disabled:opacity-50'
                >
                  {applyingCoupon ? 'Checking...' : 'Apply'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className='mt-12'>
          <Title text1={'PAYMENT'} text2={'METHOD'} />
          <div className='flex gap-3 flex-col lg:flex-row'>
            <div onClick={()=>setMethod('paystack')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method ==='paystack' ? 'bg-green-400' : ''}`}></p>
              <p className='text-color text-gray-700 text-sm font-medium mx-4'>PAY WITH CARD / TRANSFER / USSD (Paystack)</p>
            </div>
            <div onClick={()=>setMethod('cod')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method ==='cod' ? 'bg-green-400' : ''}`}></p>
              <p className='text-color text-gray-500 text-sm font-medium mx-4'>CASH ON DELIVERY</p>
            </div>
          </div>

          <div className='w-full text-end mt-8' >
             <button disabled={submitting} type='submit' className='bg-black text-white px-16 py-3 text-sm disabled:opacity-50'>
               {submitting ? 'PLACING ORDER...' : 'PLACE ORDER'}
             </button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder
