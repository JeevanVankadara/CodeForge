import { memo, useEffect, useMemo, useRef } from 'react'
import { Box, Text } from '@chakra-ui/react'
import { ExternalLink, FileText } from 'lucide-react'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'

const textMode = (math) =>
  math.replace(/\\text\{([^{}]*)\}/g, (_, inner) =>
    `\\text{${inner.replace(/\^/g, '\\textasciicircum{}').replace(/_/g, '\\_')}}`,
  )

const MATH = {
  delimiters: [
    { left: '$$$$$$', right: '$$$$$$', display: true },
    { left: '$$$', right: '$$$', display: false },
  ],
  preProcess: textMode,
  throwOnError: false,
  errorColor: '#e6e6ea',
  strict: 'ignore',
}

const Label = ({ children }) => (
  <Text fontFamily="mono" fontSize="11px" letterSpacing="0.14em" textTransform="uppercase" color="#8a8a93" mb={2}>
    {children}
  </Text>
)

const Chip = ({ children }) => (
  <Box as="span" px={2} py={0.5} borderRadius={6} bg="#17171b" fontFamily="mono" fontSize="xs" color="#c9c9d0">
    {children}
  </Box>
)

const Html = ({ html }) => {
  const inner = useMemo(() => ({ __html: html }), [html])
  return <div className="problem-html" dangerouslySetInnerHTML={inner} />
}

const Section = ({ title, html }) =>
  html ? (
    <Box mt={5}>
      <Label>{title}</Label>
      <Html html={html} />
    </Box>
  ) : null

const Sample = ({ title, text }) => (
  <Box>
    <Box px={3} py={1.5} borderBottom="1px solid" borderColor="#1e1e22">
      <Text fontFamily="mono" fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="#5a5a63">
        {title}
      </Text>
    </Box>
    <Box as="pre" px={3} py={2} m={0} fontFamily="mono" fontSize="sm" color="#e6e6ea" whiteSpace="pre-wrap">
      {text}
    </Box>
  </Box>
)

const frame = {
  border: '1px solid',
  borderColor: '#1e1e22',
  borderRadius: 12,
  bg: '#0b0b0e',
  h: '100%',
  minH: 0,
}

function ProblemPanel({ problem }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) renderMathInElement(bodyRef.current, MATH)
  }, [problem])

  if (!problem) {
    return (
      <Box {...frame} display="flex" alignItems="center" justifyContent="center" p={6}>
        <Box textAlign="center" color="#5a5a63">
          <FileText size={28} style={{ margin: '0 auto 12px' }} />
          <Text fontSize="sm">Enter a Codeforces problem ID above, like 345A, to load it here.</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box ref={bodyRef} {...frame} overflowY="auto" px={5} py={4}>
      <Text fontSize="lg" fontWeight="semibold" color="#e6e6ea">
        {problem.title}
      </Text>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mt={2} mb={4}>
        <Chip>{problem.timeLimit}</Chip>
        <Chip>{problem.memoryLimit}</Chip>
        <Box
          as="a"
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          display="inline-flex"
          alignItems="center"
          gap={1}
          fontFamily="mono"
          fontSize="xs"
          color="#3b82f6"
          _hover={{ textDecoration: 'underline' }}
        >
          Codeforces {problem.id}
          <ExternalLink size={12} />
        </Box>
      </Box>

      <Html html={problem.legend} />
      <Section title="Input" html={problem.inputSpec} />
      <Section title="Output" html={problem.outputSpec} />

      <Box mt={5}>
        <Label>Examples</Label>
        {problem.samples.map((sample, i) => (
          <Box key={i} mt={i ? 3 : 0} border="1px solid" borderColor="#1e1e22" borderRadius={8} overflow="hidden">
            <Sample title={`Input ${i + 1}`} text={sample.input} />
            <Box borderTop="1px solid" borderColor="#1e1e22">
              <Sample title={`Output ${i + 1}`} text={sample.output} />
            </Box>
          </Box>
        ))}
      </Box>

      <Section title="Note" html={problem.note} />
    </Box>
  )
}

export default memo(ProblemPanel)
