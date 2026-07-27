import React from 'react'

const NewsletterBox = () =>
{
    const handleSubmit = ( e ) => {
        e.preventDefault();
        // NOTE: no backend endpoint exists yet to store newsletter signups —
        // this intentionally does nothing rather than fake a success toast.
        // Wiring this up is a small addition (a NewsletterSubscriber model +
        // one POST route) if you want it before launch.
    }

  return (
    <div className='text-center'>
          <p className='text-2xl font-medium text-gray-800'>Get 10% off your first order</p>
          <p className='text-gray-400 mt-3'>Sign up for restock alerts, new drops, and subscriber-only discounts. No spam, unsubscribe any time.</p>
          <form onSubmit={handleSubmit} className='w-full sm:w-1/2 flex items-center gap-3 mx-auto my-6 border pl-3'>
              <input type="email" placeholder='Enter Your Email' className='w-full sm:flex-1 outline-none' required /> 
              <button type='submit' className='bg-black text-white text-xs px-10 py-4'>SUBSCRIBE</button>
          </form>
    </div>
  )
}

export default NewsletterBox
