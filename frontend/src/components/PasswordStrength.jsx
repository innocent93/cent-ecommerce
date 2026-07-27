import React from 'react'

// Live checklist matching the server-side policy exactly (see
// backend/src/services/user.service.js#assertStrongPassword and
// backend/src/validators/user.validators.js) — at least 8 characters, one
// uppercase letter, one lowercase letter, one symbol. Each rule turns green
// with a check as soon as it's satisfied, so the user gets immediate
// feedback instead of finding out only after submitting.
export const checkPasswordRules = (password = '') => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
})

export const isPasswordValid = (password) => {
  const rules = checkPasswordRules(password)
  return rules.length && rules.uppercase && rules.lowercase && rules.symbol
}

const RuleRow = ({ met, label }) => (
  <li className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-600' : 'text-gray-400'}`}>
    <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[10px] ${met ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
      {met ? '\u2713' : ''}
    </span>
    {label}
  </li>
)

const PasswordStrength = ({ password }) => {
  if (!password) return null
  const rules = checkPasswordRules(password)

  return (
    <ul className='flex flex-col gap-1 w-full -mt-2 mb-1'>
      <RuleRow met={rules.length} label='At least 8 characters' />
      <RuleRow met={rules.uppercase} label='One uppercase letter' />
      <RuleRow met={rules.lowercase} label='One lowercase letter' />
      <RuleRow met={rules.symbol} label='One symbol (e.g. ! @ # $)' />
    </ul>
  )
}

export default PasswordStrength
