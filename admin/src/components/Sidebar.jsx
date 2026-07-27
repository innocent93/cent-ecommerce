import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../frontend_assets/assets'

const Sidebar = ({ isSuperAdmin }) => {
  return (
    <div className='w-[18%] min-h-screen border-r-2'>
          <div className='flex flex-col gap-4 pt-6 pl-[20%] text-[15px]'>
              <NavLink to='/add' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                  <img className='w-5 h-5' src={assets.bin_icon} alt="" />
                  <p className='hidden md:block'>Add items</p>
              </NavLink>
              <NavLink to='/list' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                  <img className='w-5 h-5' src={assets.star_icon} alt="" />
                  <p className='hidden md:block'>List items</p>
              </NavLink>
              <NavLink to='/orders' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                  <img className='w-5 h-5' src={assets.star_icon} alt="" />
                  <p className='hidden md:block'>Orders</p>
              </NavLink>
              <NavLink to='/refunds' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                  <img className='w-5 h-5' src={assets.star_icon} alt="" />
                  <p className='hidden md:block'>Refunds</p>
              </NavLink>
              <NavLink to='/coupons' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                  <img className='w-5 h-5' src={assets.star_icon} alt="" />
                  <p className='hidden md:block'>Coupons</p>
              </NavLink>
              {isSuperAdmin && (
                <NavLink to='/staff' className={'flex items-center gap-3 border border-gray-300 px-3 py-2 rounded-l'} >
                    <img className='w-5 h-5' src={assets.star_icon} alt="" />
                    <p className='hidden md:block'>Staff</p>
                </NavLink>
              )}
      </div>
    </div>
  )
}

export default Sidebar
