import { useMemo, useState } from 'react'
import { toast, Bounce } from 'react-toastify'
import { executeCode } from '../api.js'

const notifyError = (message) =>
  toast.error(message, { position: 'top-center', autoClose: 5000, theme: 'dark', transition: Bounce })

const byIndex = (list) => Object.fromEntries(list.map((result, i) => [i, result]))

export const useRun = ({ editorRef, language, sharedRun }) => {
  const [localResults, setLocalResults] = useState({})
  const [localLoading, setLocalLoading] = useState(false)
  const [hidden, setHidden] = useState(null)

  const isShared = Boolean(sharedRun)
  const shared = sharedRun?.result
  const results = useMemo(() => {
    if (!isShared) return localResults
    return shared?.results && shared !== hidden ? byIndex(shared.results) : {}
  }, [isShared, shared, hidden, localResults])

  const run = async (inputs) => {
    if (sharedRun) {
      const res = await sharedRun.start(inputs)
      if (!res?.ok) notifyError(res?.error || 'Could not start the run')
      return
    }

    const code = editorRef.current?.getValue()
    if (!code?.trim()) return notifyError('Please enter some code to execute.')

    try {
      setLocalLoading(true)
      setLocalResults(byIndex(await executeCode(language, code, inputs)))
    } catch (err) {
      const status = err.response?.status
      if (status === 401) notifyError('Please log in to run code.')
      else if (status === 429) notifyError('Too many runs - please wait a moment.')
      else notifyError(err.response?.data?.error || err.response?.data?.message || err.message)
    } finally {
      setLocalLoading(false)
    }
  }

  const clear = () => {
    setLocalResults({})
    setHidden(shared ?? null)
  }

  return {
    run,
    results,
    clear,
    isLoading: sharedRun ? sharedRun.busy : localLoading,
  }
}
