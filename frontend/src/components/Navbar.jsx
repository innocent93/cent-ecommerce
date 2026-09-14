// @ts-nocheck
import React, { useContext, useState } from 'react'
import {assets} from "../frontend_assets/assets"
import { Link, NavLink } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'

const Navbar = () =>
{
    const [ visible, setVisible ] = useState( false )
    
    const { setShowSearch, getCartCount, navigate, token, logout } = useContext( ShopContext )

  return (
    <div className='flex items-center justify-between py-5 font-medium'>
          <Link to='/'>
            <img src={assets.logo} alt="UrbanStep" className='cursor-pointer' />
          </Link>
          
          <ul className='hidden sm:flex gap-5 text-sm text-gray-500'> 
              {/* hidden for small screen */}
              <NavLink to='/' className=' flex flex-col items-center gap-1'>
              <p>HOME</p>
              <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
              </NavLink>
              <NavLink to='/collection' className=' flex flex-col items-center gap-1'>
              <p>COLLECTION</p>
              <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
              </NavLink>
              <NavLink to='/about' className=' flex flex-col items-center gap-1'>
              <p>ABOUT</p>
              <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
              </NavLink>
              <NavLink to='/contact' className=' flex flex-col items-center gap-1'>
              <p>CONTACT</p>
              <hr className='w-2/4 border-none h-[1.5px] bg-gray-700 hidden' />
              </NavLink>
          </ul>

          <div className="flex items-center gap-6">
              <img onClick={()=> setShowSearch(true)} src={assets.search_icon} alt="search-icon" />
              <div className="group relative">
                 
                  
                      <img onClick={()=> token ? null : navigate("/login") } className='cursor-pointer w-5' src={assets.profile_icon} alt="profileIcon" />
               
                {/* Drop Down */}
                
                  {token && (<div className='group-hover:block hidden absolute dropdown-menu right-0 pt-4'>
                      <div className="flex flex-col gap-2 w-36 py-3 px-5 bg-slate-100 text-gray-500 rounded">
                          <p className='cursor-pointer hover:text-black'>My profile</p>
                          <p onClick={()=> navigate("/order")} className='cursor-pointer hover:text-black'>Orders</p>
                          <p onClick={()=> navigate("/track")} className='cursor-pointer hover:text-black'>Track Order</p>
                          <p onClick={logout} className='cursor-pointer hover:text-black'>Logout</p>
                      </div>
                  </div>)}
              </div>
              <Link to='/cart' className='relative'>
                  <img src={assets.cart_icon} alt="" className='w-5 min-w-5' />
                  <p className='absolute right-[-5px] bottom-[-5px] w-4 text-center leading-4 bg-black text-white aspect-square rounded-full text-[8px]'>{ getCartCount()}</p>
              </Link>

              <img onClick={()=> setVisible(true)} src={assets.menu_icon} alt="" className='w-5 cursor-pointer sm:hidden' /> 
    </div>
          {/* Sidebar menu for smaller screen */}
          <div className={`absolute top-0 right-0 bottom-0 overflow-hidden bg-white transition-all ${ visible ? 'w-full' : 'w-0' }`}>
              <div className='flex flex-col text-gray-600'>
                  <div onClick={()=> setVisible(false)} className='flex items-center gap-4 p-3 cursor-pointer'>
                      <img className='h-4 rotate-180' src={assets.dropdown_icon} alt="dropdown-icon" />
                      <p>Back</p>
                  </div>
                  <NavLink className={'py-2 pl-6 border text-center'} onClick={()=>setVisible(false)} to={'/'}>
                      HOME
                  </NavLink>
                  <NavLink className={'py-2 pl-6 border text-center'} onClick={()=>setVisible(false)} to={'/collection'}>
                      COLLECTION
                  </NavLink>
                  <NavLink className={'py-2 pl-6 border text-center'} onClick={()=>setVisible(false)} to={'/about'}>
                      ABOUT
                  </NavLink>
                  <NavLink className={'py-2 pl-6 border text-center'} onClick={()=>setVisible(false)} to={'/contact'}>
                      CONTACT
                  </NavLink>
                
              </div>
          </div>
    </div>
  )
}

export default Navbar
