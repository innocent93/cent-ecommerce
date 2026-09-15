import React from 'react'
import {assets} from '../frontend_assets/assets'

const Navbar = ({setToken, setRole}) => {
  const logout = () => {
    setToken('')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    if (setRole) setRole('')
  }

  return (
    <div className='sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-[4%]'>
          <div className='flex items-center gap-3 font-bold text-slate-900'><img className='h-10 w-10 rounded-xl object-contain' src={assets.logo} alt="" /><span>UrbanStep <span className='text-slate-400'>Admin</span></span></div>
          <button onClick={logout} className='rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 sm:px-6 sm:text-sm'>Logout</button>
    </div>
  )
}

export default Navbar


