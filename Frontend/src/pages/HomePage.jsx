import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Mic, Cpu, ListChecks, ArrowRight } from 'lucide-react'
import { toast } from 'react-toastify'

import { StatusChip } from '../components/site/StatusChip.jsx'
import { SectionCard } from '../components/site/SectionCard.jsx'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { makeId } from '../lib/room.js'

export default function HomePage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  const create = () => {
    // TODO: wire to POST /rooms/createRoom (backend is ready) once auth flow is in.
    // No language is chosen here — the room picks it up inside the editor.
    const id = makeId()
    toast.success(`Room ${id} created`, { theme: 'dark' })
    navigate(`/room/${id}`)
  }

  const join = () => {
    if (!joinCode.trim()) {
      toast.error('Enter a room code', { theme: 'dark' })
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
          <StatusChip tone="success">Live · Works in your browser</StatusChip>
          <h1 className="mt-8 max-w-5xl font-mono text-[44px] leading-[1.05] font-bold tracking-tight sm:text-[64px] md:text-[76px]">
            Write code together.
            <br />
            Run it together.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
            CodeCollab is a code editor you share with your friends, right in your
            browser. Create a room, share the room code with up to two friends, and
            write code together while you talk over voice. Run it in C++, Java or
            Python with one click, or load a Codeforces problem and solve it as a
            team. Nothing to install.
          </p>
        </div>

        {/* Two cards */}
        {/* Both cards share the same shape: one field, one hint, one action. */}
        <div className="mt-16 grid items-stretch gap-6 md:grid-cols-2">
          <SectionCard title="Create a Room" tone="primary" className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-5">
              <Hint>
                Start a new room and share its code with your friends. Up to 3 people
                can be in one room. You pick the language inside the room and can
                change it any time.
              </Hint>
              <button
                onClick={create}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create Room <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Join a Room" tone="success" className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-5">
              <Field label="Room Code">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC-123-XYZ"
                  className="h-11 w-full rounded-lg border border-border bg-background/60 px-3 font-mono text-sm tracking-widest text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60"
                />
              </Field>
              <Hint>Ask your friend for the room code. They can copy it from the top bar inside their room.</Hint>
              <button
                onClick={join}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-success/40 bg-success/10 text-sm font-medium text-success transition-colors hover:bg-success/20"
              >
                Join Room <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </SectionCard>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            What you can do
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Users} title="Code together" desc="Everyone in the room sees the same code and each other's cursors as they type." />
            <Feature icon={Mic} title="Talk while you code" desc="Turn on voice inside the room and talk to your teammates. No other app needed." />
            <Feature icon={Cpu} title="C++, Java & Python" desc="Pick a language and run your code with one click. Nothing to install." />
            <Feature icon={ListChecks} title="Practice problems" desc="Type a Codeforces problem ID to load it with its sample tests and check your answer right away." />
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
