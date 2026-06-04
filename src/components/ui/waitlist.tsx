import { useState } from 'react'
import { motion } from 'framer-motion'
import { joinWaitlist } from '../../lib/waitlist'

interface WaitlistProps {
  onClose?: () => void
}

export function Waitlist({ onClose }: WaitlistProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (email.trim() === '' || !email.includes('@')) return
    setSaving(true)
    setError('')
    try {
      await joinWaitlist(email.trim())
      setSubmitted(true)
      setEmail('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isValid = email.trim() !== '' && email.includes('@')

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-emerald-500 w-16 h-16 mx-auto mb-4"
          >
            <path
              fillRule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            You're on the waitlist
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            We'll keep you updated on new features.
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#0070d2] hover:underline"
            >
              Close
            </button>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="py-10 px-6">
      <div className="text-center mb-6">
        <motion.h2
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-2xl font-bold text-gray-800"
        >
          Join the waitlist
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-sm text-gray-500 mt-2"
        >
          Be the first to access new features.
        </motion.p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex items-center"
        onSubmit={handleSubmit}
      >
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-l-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#0070d2] focus:ring-1 focus:ring-[#0070d2] transition-colors"
        />
        <button
          type="submit"
          disabled={!isValid || saving}
          className="rounded-r-lg bg-[#0070d2] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#005fb2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Join'}
        </button>
      </motion.form>
      {error && (
        <p className="text-xs text-red-500 text-center mt-3">{error}</p>
      )}
    </div>
  )
}
