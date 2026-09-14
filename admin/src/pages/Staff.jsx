// @ts-nocheck
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const ROLES = ['support', 'admin', 'superadmin']

const emptyForm = { name: '', email: '', password: '', role: 'support' }

const Staff = ({ token }) => {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/staff`, { headers: { token } })
      if (data.success) setStaff(data.staff)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStaff() }, [])

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await axios.post(`${backendUrl}/api/user/staff`, form, { headers: { token } })
      if (data.success) {
        toast.success('Staff account created')
        setForm(emptyForm)
        fetchStaff()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const changeRole = async (staffId, role) => {
    try {
      const { data } = await axios.patch(`${backendUrl}/api/user/staff/${staffId}`, { role }, { headers: { token } })
      if (data.success) setStaff((prev) => prev.map((s) => (s.id === staffId ? data.staff : s)))
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const toggleActive = async (member) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/user/staff/${member.id}`,
        { active: !member.active },
        { headers: { token } }
      )
      if (data.success) setStaff((prev) => prev.map((s) => (s.id === member.id ? data.staff : s)))
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  return (
    <div>
      <p className='mb-4 text-lg font-medium'>Staff Accounts</p>
      <p className='text-sm text-gray-500 mb-4 max-w-xl'>
        Support agents can view orders and update delivery status. Admins can additionally manage products, coupons, and refunds. Only superadmins can manage other staff accounts.
      </p>

      <form onSubmit={onSubmit} className='border rounded p-4 bg-white mb-6 flex flex-col gap-3 max-w-xl'>
        <p className='font-medium text-sm'>Add a staff member</p>
        <input name='name' value={form.name} onChange={onChange} placeholder='Full name' className='border rounded px-2 py-1 text-sm' required />
        <input name='email' type='email' value={form.email} onChange={onChange} placeholder='Email' className='border rounded px-2 py-1 text-sm' required />
        <input name='password' type='password' value={form.password} onChange={onChange} placeholder='Temporary password (min. 8 chars, upper/lower/symbol)' className='border rounded px-2 py-1 text-sm' required />
        <select name='role' value={form.role} onChange={onChange} className='border rounded px-2 py-1 text-sm'>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button disabled={submitting} className='bg-black text-white text-sm py-2 rounded self-start px-6 disabled:opacity-50'>
          {submitting ? 'Creating...' : 'Create Staff Account'}
        </button>
      </form>

      {loading ? <p>Loading...</p> : (
        <div className='flex flex-col gap-2'>
          {staff.map((member) => (
            <div key={member.id} className='border rounded p-3 bg-white flex items-center justify-between text-sm'>
              <div>
                <p className='font-medium'>{member.name} {!member.active && <span className='text-red-500 text-xs'>(deactivated)</span>}</p>
                <p className='text-gray-500 text-xs'>{member.email}</p>
              </div>
              <div className='flex gap-2 items-center'>
                <select value={member.role} onChange={(e) => changeRole(member.id, e.target.value)} className='border rounded px-2 py-1 text-sm'>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => toggleActive(member)} className='border rounded px-3 py-1'>
                  {member.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Staff
