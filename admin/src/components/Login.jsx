// @ts-nocheck
import axios from 'axios'
import React, { useState } from 'react'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const Login = ( { setToken, setRole } ) =>
{
    const [ email, setEmail ] = useState( "" )
    const [ password, setPassword ] = useState( "" )
    const [ submitting, setSubmitting ] = useState( false )

    const onSubmithandler = async ( e ) =>
    {
        e.preventDefault();
        setSubmitting(true)

        try
        {
            const response = await axios.post( backendUrl + '/api/user/admin', { email, password } )

            if ( response.data.success )
            {
                setToken( response.data.token || response.data.accessToken || '' )
                setRole( response.data.user?.role || response.data.role || '' )
                if (response.data.refreshToken) localStorage.setItem('refreshToken', response.data.refreshToken)
                toast.success( "Login successful" )
            } else
            {
                toast.error( response.data.message )
            }

        } catch ( error )
        {
            // Account-lockout / rate-limit responses carry a clear message
            // from the API (e.g. "Too many failed attempts...") — show that
            // instead of a hardcoded string.
            toast.error( error.response?.data?.message || "Login failed. Please try again." )
        } finally {
            setSubmitting(false)
        }
    }

        return (
            <div className='flex items-center justify-center w-full min-h-screen bg-slate-950 px-4 py-8'>
                <div className='w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl sm:p-10'>
                    <div className='mb-8'>
                      <p className='mb-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500'>UrbanStep Commerce</p>
                      <h1 className='text-3xl font-extrabold tracking-tight text-slate-900'>Welcome back</h1>
                      <p className='mt-2 text-sm text-slate-500'>Sign in to manage your marketplace.</p>
                    </div>
                    <form onSubmit={onSubmithandler}>
                        <div className='mb-3 min-w-72'>
                            <p className='text-sm font-medium text-gray-700 mb-2'>Email Address</p>
                            <input onChange={( e ) => setEmail( e.target.value )} value={email} className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none' type="email" placeholder='your@email' required />
                        </div>
                        <div className='mb-3 min-w-72'>
                            <p className='text-sm font-medium text-gray-700 mb-2'>Password</p>
                            <input onChange={( e ) => setPassword( e.target.value )} value={password} className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none' type="password" placeholder='Enter your password' required />
                        </div>
                        <button disabled={submitting} className='mt-3 w-full rounded-xl bg-slate-950 px-4 py-4 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50' type='submit'>{submitting ? 'Signing in...' : 'Login'}</button>
                    </form>
                </div>
            </div>
        )
    
}

export default Login
