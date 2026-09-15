import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import api from '../utils/api'
import { toast } from 'react-toastify'
import PasswordStrength, { isPasswordValid } from '../components/PasswordStrength'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const valid = isPasswordValid(password)
  const matches = confirmPassword.length > 0 && password === confirmPassword

  async function submit(event) {
    event.preventDefault()
    if (!token) return toast.error('This reset link is missing its token. Please request a new link.')
    if (!valid) return toast.error('Use at least 8 characters with uppercase, lowercase and a symbol.')
    if (!matches) return toast.error('Passwords do not match.')
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/user/reset-password', { token, password })
      if (!data.success) throw new Error(data.message || 'Unable to reset password')
      toast.success('Password reset successfully. Please sign in.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'This reset link is invalid or expired.')
    } finally { setSubmitting(false) }
  }

  return <main className="us-shell grid min-h-[calc(100vh-76px)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr]">
    <section className="hidden overflow-hidden rounded-[32px] bg-[#142b91] p-10 text-white lg:block">
      <div className="mb-20 flex items-center gap-2 text-sm font-semibold text-blue-100"><ShieldCheck size={18}/> UrbanStep account security</div>
      <h1 className="max-w-lg text-5xl font-extrabold leading-[1.05]">A safer account starts with a stronger password.</h1>
      <p className="mt-5 max-w-md text-blue-100">Create a new password and get back to discovering fashion from trusted independent sellers.</p>
      <div className="mt-12 space-y-4 text-sm text-blue-50"><p className="flex items-center gap-3"><CheckCircle2 size={18}/> Secure password recovery</p><p className="flex items-center gap-3"><CheckCircle2 size={18}/> One account across UrbanStep</p><p className="flex items-center gap-3"><CheckCircle2 size={18}/> Your shopping journey stays yours</p></div>
    </section>
    <section className="us-panel mx-auto w-full max-w-xl p-6 sm:p-10">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-[#2446e8]">UrbanStep account</span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Set a new password</h2>
      <p className="mt-2 text-sm text-slate-500">Choose a strong password you have not used before.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block text-sm font-semibold">New password<div className="relative mt-2"><input className="us-input pr-12" type={show ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your new password" required/><button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        <PasswordStrength password={password}/>
        <label className="block text-sm font-semibold">Confirm new password<input className="us-input mt-2" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required/></label>
        {confirmPassword && <p className={`text-xs ${matches?'text-emerald-600':'text-rose-600'}`}>{matches?'✓ Passwords match':'Passwords do not match'}</p>}
        <button disabled={submitting} className="us-button us-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60">{submitting?'Saving…':'Reset password'}<ArrowRight size={18}/></button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-[#2446e8]">Back to sign in</Link></p>
    </section>
  </main>
}
