// @ts-nocheck
import React, { useState } from 'react'
import api from '../utils/api'
import { toast } from 'react-toastify'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/user/forgot-password', { email })
      if (data.success) {
        setSent(true)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800 text-center'>
        <p className='text-3xl'>Check your email</p>
        <p className='text-gray-500 text-sm'>
          If an account exists for <b>{email}</b>, we've sent a link to reset your password. It expires in 1 hour.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800'>
      <div className='inline-flex items-center gap-2 mb-2 mt-10'>
        <p className='text-3xl'>Reset Password</p>
        <hr className='border-none h-[1.5px] w-8 bg-gray-800' />
      </div>
      <p className='text-gray-500 text-sm text-center'>Enter your email and we'll send you a link to reset your password.</p>
      <input className='w-full px-3 py-2 border border-gray-800' type="email" placeholder='Email' value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button disabled={submitting} className='bg-black text-white font-light px-8 py-2 mt-4 disabled:opacity-50 w-full'>
        {submitting ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  )
}

export default ForgotPassword
