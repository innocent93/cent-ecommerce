import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../frontend_assets/assets'

const Footer = () => {
    return (
      <div>
           <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-10 mt-40 text-sm'>
                    <div>
                        <img src={assets.logo} className='mb-5 w-32' alt="UrbanStep" />
                    <p className='w-full md:w-2/3 text-gray-600'>
                      Quality shoes and clothing for every step of your day, delivered across Nigeria.
                      We source pieces we'd actually wear ourselves, at prices that make sense.
                    </p>
                    </div>


                    <div >
                        <p className='text-xl font-medium mb-5'>COMPANY</p>
                        <ul className='flex flex-col gap-1 text-gray-600'>
                                <li><Link to='/' className='hover:text-black'>Home</Link></li>
                                <li><Link to='/about' className='hover:text-black'>About Us</Link></li>
                                <li><Link to='/track' className='hover:text-black'>Track Your Order</Link></li>
                                <li><Link to='/contact' className='hover:text-black'>Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
                        <ul className='flex flex-col gap-1 text-gray-600'>
                                <li>+234-700-000-0000</li>
                                <li>support@urbanstep.ng</li>

                        </ul>
                    </div>
            </div>


            <div>
                <hr />
                <p className='py-5 text-sm text-center'>&copy; {new Date().getFullYear()} UrbanStep. All rights reserved.</p>
            </div>
      </div>

  )
}

export default Footer
