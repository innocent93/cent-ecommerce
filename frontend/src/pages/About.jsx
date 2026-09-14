import React from 'react'
import Title from '../components/Title'
import {assets} from "../frontend_assets/assets"
import NewsletterBox from '../components/NewsletterBox'

const About = () => {
  return (
    <div>
      <div className='text-2xl text-center pt-8 border-t'>
          <Title text1={'ABOUT'} text2={'US'} />
      </div>
      <div className='my-10 flex flex-col md:flex-row gap-16'>
        <img src={assets.about_img} className='w-full md:max-w-[450px]' alt="Inside the UrbanStep warehouse" />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
          <p>UrbanStep started with a simple frustration: finding good shoes and clothing online in Nigeria meant either paying import prices or gambling on quality. We set out to fix that — curated pieces, honest pricing, and delivery you can actually track.</p>
          <p>Every product on this site is selected by people who'd wear it themselves. We work directly with brands and trusted suppliers, so what you see in the photos is what shows up at your door.</p>
          <b className='text-gray-800'>Our Mission</b>
          <p>To make quality footwear and clothing accessible across Nigeria and beyond — with fast, reliable delivery and support that actually responds when you need it.</p>

        </div>
      </div>

      <div className='text-xl py-4'>
        <Title text1={'WHY'} text2={'CHOOSE US'} />
      </div>

      <div className='flex flex-col sm:flex-row text-sm mb-20'>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Quality Assurance</b>
          <p className='text-gray-600'>Every product is inspected before it's listed — what you order is what you get.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Convenience</b>
          <p className='text-gray-600'>Browse, pay by card, transfer, or cash on delivery, and track your order from checkout to your door.</p>
        </div>
        <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
          <b>Exceptional Customer Service</b>
          <p className='text-gray-600'>Real people, reachable by WhatsApp, ready to help before and after you order.</p>
        </div>
      </div>

      <NewsletterBox/>

    </div>
  )
}

export default About
