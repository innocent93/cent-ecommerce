// @ts-nocheck
import React, { useContext, useEffect, useRef } from 'react'
import { ShopContext } from '../context/ShopContext'
import api from '../utils/api'
import { toast } from 'react-toastify'

// Renders Google's official "Continue with Google" button using Google
// Identity Services (loaded once, see main.jsx/index.html — the script tag
// lives here so this component works standalone if you copy it elsewhere).
// The credential Google returns is a signed ID token; we send it straight
// to the backend, which verifies it with Google server-side before ever
// trusting it (see user.service.js#googleLogin) — the frontend never
// evaluates or trusts the token's contents itself.
const GoogleLoginButton = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const buttonRef = useRef(null)
  const { setToken, navigate } = useContext(ShopContext)

  useEffect(() => {
    if (!clientId) return; // Google Sign-In not configured — render nothing

    const handleCredentialResponse = async (response) => {
      try {
        const { data } = await api.post('/api/user/google', { idToken: response.credential })
        if (data.success) {
          setToken(data.token)
          localStorage.setItem('token', data.token)
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
          toast.success(data.message)
          navigate('/')
        } else {
          toast.error(data.message)
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Google sign-in failed')
      }
    }

    const initialize = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      })
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
        })
      }
    }

    // Load the Google Identity Services script once, then initialize.
    const existing = document.getElementById('google-identity-script')
    if (existing) {
      initialize()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.id = 'google-identity-script'
    script.async = true
    script.defer = true
    script.onload = initialize
    document.body.appendChild(script)
  }, [clientId])

  if (!clientId) return null

  return (
    <div className='w-full flex flex-col items-center gap-3'>
      <div className='w-full flex items-center gap-3 text-xs text-gray-400'>
        <hr className='flex-1 border-gray-200' />
        OR
        <hr className='flex-1 border-gray-200' />
      </div>
      <div ref={buttonRef}></div>
    </div>
  )
}

export default GoogleLoginButton
