import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { toast } from 'react-toastify'

import { Logo } from '../components/site/Logo.jsx'
import { StatusChip } from '../components/site/StatusChip.jsx'
import { SectionCard } from '../components/site/SectionCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Fill in all fields', { theme: 'dark' })
      return
    }
    try {
      setLoading(true)
      await signup({ name: name.trim(), email: email.trim(), password })
      toast.success('Account created', { theme: 'dark' })
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed', { theme: 'dark' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <Logo subtitle="Access" />
          <StatusChip tone="success">Create Account</StatusChip>
        </div>

        <SectionCard title="Sign Up" tone="success">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? 'Creating…' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </SectionCard>

        <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  )
}
