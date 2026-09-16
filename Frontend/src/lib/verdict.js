const GREEN = '#10b981'
const RED = '#f87171'

const normalize = (text = '') =>
  text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()

export const verdictOf = (result, expected) => {
  if (!result) return null
  if (result.exitCode === -1 && /time limit/i.test(result.stderr || '')) return { label: 'Time Limit Exceeded', color: RED }
  if (result.exitCode !== 0) return { label: 'Error', color: RED }
  if (expected == null) return { label: 'Finished', color: GREEN }
  return normalize(result.stdout) === normalize(expected)
    ? { label: 'Accepted', color: GREEN }
    : { label: 'Wrong Answer', color: RED }
}

export const allAccepted = (cases, results) =>
  cases.some((c) => c.expected != null) &&
  cases.every((c, i) => c.expected == null || verdictOf(results[i], c.expected)?.label === 'Accepted')
