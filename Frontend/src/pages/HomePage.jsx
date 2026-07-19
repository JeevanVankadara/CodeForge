import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Cpu, Video, Zap, ArrowRight } from 'lucide-react'
import { toast } from 'react-toastify'

import { StatusChip } from '../components/site/StatusChip.jsx'
import { SectionCard } from '../components/site/SectionCard.jsx'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { makeId } from '../lib/room.js'

export default function HomePage() {
  const navigate = useNavigate()
  const [runtime, setRuntime] = useState('cpp')
  const [joinCode, setJoinCode] = useState('')

  const create = () => {
    // TODO: wire to POST /rooms/createRoom (backend is ready) once auth flow is in.
    const id = makeId()
    toast.success(`Session initialized — Room ${id}`, { theme: 'dark' })
    navigate(`/room/${id}?lang=${runtime}`)
  }

  const join = () => {
    if (!joinCode.trim()) {
      toast.error('Enter a room access code', { theme: 'dark' })
      return
    }
    navigate(`/room/${joinCode.trim().toUpperCase()}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient grid + glow */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />

      <Navbar />

      <main className="relative mx-auto max-w-7xl px-6 pt-20 pb-24">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <StatusChip tone="success">V2.4.0 Engine Ready</StatusChip>
          <h1 className="mt-8 max-w-5xl font-mono text-[44px] leading-[1.05] font-bold tracking-tight sm:text-[64px] md:text-[76px]">
            Code Together.
            <br />
            Compile Together.
            <br />
            <span className="text-muted-foreground/70">Interview Together.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
            The low-latency IDE for technical assessments and distributed engineering
            teams. Standardized runtimes, real-time cursors, and one-click execution —
            right in your browser.
          </p>
        </div> 

        {/* Two cards */}
        {/* Both cards share the same shape: one field, one hint, one action. */}
        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-2">
          <SectionCard title="Initialize Session" tone="primary" className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-5">
              <Field label="Runtime Engine">
                <select
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary/60"
                >
                  <option value="cpp">C++ 20 · GCC 13</option>
                  <option value="python">Python 3.12</option>
                  <option value="javascript">Node.js 20 LTS</option>
                  <option value="typescript">TypeScript 5.4</option>
                  <option value="rust">Rust 1.78</option>
                  <option value="go">Go 1.22</option>
                </select>
              </Field>
              <Hint>
                A fresh room is created and the code is yours to share — you can switch
                runtimes any time from inside the room.
              </Hint>
              <button
                onClick={create}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create Session <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Join Session" tone="success" className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-5">
              <Field label="Room Access Code">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC-123-XYZ"
                  className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm tracking-widest text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60"
                />
              </Field>
              <Hint>Ask a teammate to share their session code from the room top bar.</Hint>
              <button
                onClick={join}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-success/40 bg-success/10 text-sm font-medium text-success transition-colors hover:bg-success/20"
              >
                Join Session <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            Platform Capabilities
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Users} title="Real-time Collaboration" desc="Multi-cursor editing with sub-100ms sync." />
            <Feature icon={Cpu} title="Multi-language Compiler" desc="14 runtimes, pinned versions, sandboxed." />
            <Feature icon={Video} title="Live Interview Mode" desc="Integrated video, timer, and lockdown." />
            <Feature icon={Zap} title="Fast Execution" desc="Cold-start under 400ms on every runtime." />
          </div>
        </div>
      </main>

      <Footer />
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

// Dashed note that sits under a field so both cards keep the same rhythm.
function Hint({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-panel/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="group rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-card">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-4 font-mono text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</div>
    </div>
  )
}
