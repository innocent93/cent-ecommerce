// @ts-nocheck
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const emptyForm = {
  code: '', type: 'percentage', value: '', minOrderAmount: '', maxDiscountAmount: '',
  usageLimit: '', usageLimitPerUser: '1', expiresAt: '',
}

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/coupons`, { headers: { token } })
      if (data.success) setCoupons(data.coupons)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCoupons() }, [])

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        ...(form.minOrderAmount && { minOrderAmount: Number(form.minOrderAmount) }),
        ...(form.maxDiscountAmount && { maxDiscountAmount: Number(form.maxDiscountAmount) }),
        ...(form.usageLimit && { usageLimit: Number(form.usageLimit) }),
        usageLimitPerUser: Number(form.usageLimitPerUser || 1),
        ...(form.expiresAt && { expiresAt: new Date(form.expiresAt).toISOString() }),
      }
      const { data } = await axios.post(`${backendUrl}/api/coupons`, payload, { headers: { token } })
      if (data.success) {
        toast.success('Coupon created')
        setForm(emptyForm)
        fetchCoupons()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (coupon) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/coupons/${coupon._id}`,
        { active: !coupon.active },
        { headers: { token } }
      )
      if (data.success) {
        setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? data.coupon : c)))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const remove = async (id) => {
    try {
      const { data } = await axios.delete(`${backendUrl}/api/coupons/${id}`, { headers: { token } })
      if (data.success) {
        toast.success('Coupon deleted')
        setCoupons((prev) => prev.filter((c) => c._id !== id))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  return (
    <div>
      <p className='mb-4 text-lg font-medium'>Coupons</p>

      <form onSubmit={onSubmit} className='border rounded p-4 bg-white mb-6 flex flex-col gap-3 max-w-xl'>
        <p className='font-medium text-sm'>Create a coupon</p>
        <div className='flex gap-2'>
          <input name='code' value={form.code} onChange={onChange} placeholder='CODE (e.g. WELCOME10)' className='border rounded px-2 py-1 text-sm flex-1' required />
          <select name='type' value={form.type} onChange={onChange} className='border rounded px-2 py-1 text-sm'>
            <option value='percentage'>Percentage %</option>
            <option value='fixed'>Fixed amount (₦)</option>
          </select>
          <input name='value' type='number' min='0' value={form.value} onChange={onChange} placeholder='Value' className='border rounded px-2 py-1 text-sm w-24' required />
        </div>
        <div className='flex gap-2'>
          <input name='minOrderAmount' type='number' min='0' value={form.minOrderAmount} onChange={onChange} placeholder='Min order (₦, optional)' className='border rounded px-2 py-1 text-sm flex-1' />
          <input name='maxDiscountAmount' type='number' min='0' value={form.maxDiscountAmount} onChange={onChange} placeholder='Max discount (₦, optional)' className='border rounded px-2 py-1 text-sm flex-1' />
        </div>
        <div className='flex gap-2'>
          <input name='usageLimit' type='number' min='1' value={form.usageLimit} onChange={onChange} placeholder='Total usage limit (optional)' className='border rounded px-2 py-1 text-sm flex-1' />
          <input name='usageLimitPerUser' type='number' min='1' value={form.usageLimitPerUser} onChange={onChange} placeholder='Per-user limit' className='border rounded px-2 py-1 text-sm flex-1' />
          <input name='expiresAt' type='date' value={form.expiresAt} onChange={onChange} className='border rounded px-2 py-1 text-sm flex-1' />
        </div>
        <button disabled={submitting} className='bg-black text-white text-sm py-2 rounded self-start px-6 disabled:opacity-50'>
          {submitting ? 'Creating...' : 'Create Coupon'}
        </button>
      </form>

      {loading ? <p>Loading...</p> : (
        <div className='flex flex-col gap-2'>
          {coupons.length === 0 && <p className='text-gray-400'>No coupons yet.</p>}
          {coupons.map((c) => (
            <div key={c._id} className='border rounded p-3 bg-white flex items-center justify-between text-sm'>
              <div>
                <p className='font-medium'>{c.code} — {c.type === 'percentage' ? `${c.value}%` : `₦${c.value}`}</p>
                <p className='text-gray-500 text-xs'>
                  Used {c.timesUsed}{c.usageLimit ? `/${c.usageLimit}` : ''} times
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className='flex gap-2 items-center'>
                <button onClick={() => toggleActive(c)} className='border rounded px-3 py-1'>
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(c._id)} className='border rounded px-3 py-1 text-red-600'>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Coupons
