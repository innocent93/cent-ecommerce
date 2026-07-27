// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../utils/api'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    (async () => {
      try {
        const { data } = await api.post('/api/user/verify-email', { token })
        setStatus(data.success ? 'success' : 'error')
      } catch {
        setStatus('error')
      }
    })()
  }, [token])

  return (
    <div className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800 text-center'>
      {status === 'verifying' && <p className='text-gray-500'>Verifying your email...</p>}
      {status === 'success' && (
        <>
          <p className='text-3xl'>Email Verified</p>
          <p className='text-gray-500 text-sm'>Your email has been confirmed. You're all set.</p>
          <Link to='/' className='bg-black text-white px-8 py-2 mt-4'>Continue Shopping</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className='text-3xl'>Link Invalid</p>
          <p className='text-gray-500 text-sm'>This verification link is invalid or has already been used.</p>
        </>
      )}
    </div>
  )
}

export default VerifyEmail
