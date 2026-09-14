// @ts-nocheck
import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { toast } from 'react-toastify'
import PasswordStrength, { isPasswordValid } from '../components/PasswordStrength'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordMeetsPolicy = isPasswordValid(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('This reset link is missing its token — please use the link from your email.')
      return
    }
    if (!passwordMeetsPolicy) {
      toast.error('Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a symbol')
      return
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/api/user/reset-password', { token, password })
      if (data.success) {
        toast.success('Password reset successfully — please log in.')
        navigate('/login')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'This reset link is invalid or has expired')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800'>
      <div className='inline-flex items-center gap-2 mb-2 mt-10'>
        <p className='text-3xl'>Set New Password</p>
        <hr className='border-none h-[1.5px] w-8 bg-gray-800' />
      </div>

      <input
        className={`w-full px-3 py-2 border ${password ? (passwordMeetsPolicy ? 'border-green-500' : 'border-gray-800') : 'border-gray-800'}`}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder='New password'
        required
      />
      <PasswordStrength password={password} />

      <input
        className={`w-full px-3 py-2 border ${passwordsMatch ? 'border-green-500' : 'border-gray-800'}`}
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder='Confirm new password'
        required
      />
      {confirmPassword.length > 0 && (
        <p className={`w-full text-xs -mt-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
          {passwordsMatch ? '\u2713 Passwords match' : 'Passwords do not match'}
        </p>
      )}

      <button disabled={submitting} className='bg-black text-white font-light px-8 py-2 mt-4 disabled:opacity-50 w-full'>
        {submitting ? 'Saving...' : 'Reset Password'}
      </button>
    </form>
  )
}

export default ResetPassword
