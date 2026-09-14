// @ts-nocheck
import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import api from '../utils/api'
import { toast } from 'react-toastify'
import PasswordStrength, { isPasswordValid } from '../components/PasswordStrength'
import GoogleLoginButton from '../components/GoogleLoginButton'

const Login = () =>
{
  const [ currentState, setCurrentState ] = useState( 'Login' )
  const { token, setToken, navigate } = useContext( ShopContext )
  const [name,setName] = useState("")
  const [password,setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ email, setEmail ] = useState( "" )
  const [ submitting, setSubmitting ] = useState( false )

  const isSignUp = currentState === 'Sign Up'
  const passwordMeetsPolicy = isPasswordValid(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const persistSession = (data) => {
    setToken( data.token )
    localStorage.setItem( 'token', data.token )
    if (data.refreshToken) {
      localStorage.setItem( 'refreshToken', data.refreshToken )
    }
  }

  const onSubmitHandler = async ( event ) =>
  {
    event.preventDefault()

    if (isSignUp) {
      if (!passwordMeetsPolicy) {
        toast.error('Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a symbol')
        return
      }
      if (!passwordsMatch) {
        toast.error('Passwords do not match')
        return
      }
    }

    setSubmitting(true)

    try {
      if (isSignUp) {
        const response = await api.post( '/api/user/register', { name, email, password } )

        if (response?.data.success) {
          persistSession(response.data)
          toast.success(response.data.message)
          navigate( "/" )
        } else {
          toast.error( response?.data.message );
        }
      } else {
        const response = await api.post( '/api/user/login', {  email, password } )
        if (response.data.success) {
          persistSession(response.data)
          toast.success(response.data.message)
        } else {
          toast.error(response.data.message);
        }
      }
    } catch (error) {
      // Account-lockout / rate-limit / password-policy responses carry a
      // clear message from the API (e.g. "Too many failed attempts...")
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false)
    }
  }

  useEffect( () =>
  {
     if (token) {
      navigate("/")
     }
  },[token])

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800'>
      <div className='inline-flex items-center gap-2 mb-2 mt-10'>
        <p className='prate-regular text-3xl'>{currentState }</p>
       <hr className='border-none h-[1.5px]  w-8 bg-gray-800' />
      </div>
      {isSignUp ? <input className='w-full px-3 py-2 border border-gray-800 ' value={name} onChange={(e)=>setName(e.target.value)} type="text" placeholder='Name' required/> : '' }

      <input className='w-full px-3 py-2 border border-gray-800 ' type="email" placeholder='Email' value={email} onChange={(e)=>setEmail(e.target.value)}  required/>

      <input
        className={`w-full px-3 py-2 border ${isSignUp && password ? (passwordMeetsPolicy ? 'border-green-500' : 'border-gray-800') : 'border-gray-800'}`}
        type="password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        placeholder={isSignUp ? 'Password (min. 8 characters)' : 'Password'}
        minLength={8}
        required
      />
      {isSignUp && <PasswordStrength password={password} />}

      {isSignUp && (
        <>
          <input
            className={`w-full px-3 py-2 border ${passwordsMatch ? 'border-green-500' : 'border-gray-800'}`}
            type="password"
            value={confirmPassword}
            onChange={(e)=>setConfirmPassword(e.target.value)}
            placeholder='Confirm Password'
            required
          />
          {confirmPassword.length > 0 && (
            <p className={`w-full text-xs -mt-2 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
              {passwordsMatch ? '\u2713 Passwords match' : 'Passwords do not match'}
            </p>
          )}
        </>
      )}

      <div className='w-full flex justify-between text-sm mt-[-8px]'>
        <p onClick={() => navigate('/forgot-password')} className='cursor-pointer'>Forgot Password?</p>
       {currentState == 'Login' ? <p onClick={() => setCurrentState('Sign Up')} className='cursor-pointer'>Create Account</p> : <p onClick={() => setCurrentState('Login')} className='cursor-pointer'>Login Here</p> }
      </div>
      <button disabled={submitting} className='bg-black text-white font-light px-8 py-2 mt-4 disabled:opacity-50'>{submitting ? 'Please wait...' : (currentState === 'Login' ? 'Sign In' : 'Sign Up') }</button>
      <GoogleLoginButton />
    </form>
  )
}

export default Login
