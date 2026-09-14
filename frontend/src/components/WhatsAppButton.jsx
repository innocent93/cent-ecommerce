// @ts-nocheck
import React from 'react'

// Configurable via VITE_WHATSAPP_NUMBER (full international format, no
// leading +, e.g. "2348012345678"). Renders nothing if unset, so it's safe
// to ship without forcing every deployment to configure it immediately.
const WhatsAppButton = () => {
  const number = import.meta.env.VITE_WHATSAPP_NUMBER

  if (!number) return null

  const message = encodeURIComponent("Hi! I have a question about my order.")
  const href = `https://wa.me/${number}?text=${message}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 32 32" className="w-8 h-8 fill-white" aria-hidden="true">
        <path d="M16.004 3C9.376 3 4 8.373 4 15c0 2.386.7 4.61 1.912 6.482L4 29l7.72-1.876A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3zm0 21.818a9.77 9.77 0 0 1-4.98-1.364l-.357-.212-4.583 1.113 1.132-4.468-.233-.366A9.77 9.77 0 0 1 6.18 15c0-5.42 4.406-9.818 9.824-9.818S25.82 9.58 25.82 15s-4.406 9.818-9.816 9.818zm5.37-7.336c-.294-.147-1.74-.858-2.01-.955-.27-.098-.467-.147-.663.147-.196.294-.76.955-.932 1.15-.172.196-.343.22-.637.074-.294-.147-1.24-.457-2.362-1.457-.873-.779-1.463-1.742-1.634-2.036-.172-.294-.018-.453.129-.6.132-.132.294-.343.44-.514.148-.172.196-.294.294-.49.098-.196.049-.367-.024-.514-.074-.147-.663-1.597-.909-2.187-.24-.575-.484-.497-.663-.507l-.564-.01c-.196 0-.514.074-.784.367-.27.294-1.03 1.007-1.03 2.457 0 1.45 1.055 2.85 1.202 3.046.147.196 2.076 3.17 5.032 4.444.703.303 1.251.484 1.679.62.706.224 1.348.192 1.856.117.566-.085 1.74-.712 1.985-1.4.245-.688.245-1.277.172-1.4-.073-.123-.269-.196-.563-.343z" />
      </svg>
    </a>
  )
}

export default WhatsAppButton
