import { Box, Text, Textarea } from '@chakra-ui/react'
import { ChevronDown, ChevronUp, Plus, SquareCheck, Terminal } from 'lucide-react'
import { verdictOf } from '../lib/verdict.js'

const GREEN = '#10b981'
const RED = '#f87171'

const Label = ({ children }) => (
  <Text fontFamily="mono" fontSize="xs" color="#8a8a93" mb={1.5}>
    {children}
  </Text>
)

const Block = ({ text, color = '#e6e6ea', borderColor = '#1e1e22', minH }) => (
  <Box
    as="pre"
    m={0}
    px={3}
    py={2}
    minH={minH}
    bg="#111114"
    border="1px solid"
    borderColor={borderColor}
    borderRadius={8}
    fontFamily="mono"
    fontSize="sm"
    color={color}
    whiteSpace="pre-wrap"
    wordBreak="break-word"
  >
    {text}
  </Box>
)

const Tab = ({ active, icon, children, onClick }) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    display="flex"
    alignItems="center"
    gap={1.5}
    fontSize="sm"
    fontWeight="medium"
    color={active ? '#e6e6ea' : '#8a8a93'}
    _hover={{ color: '#e6e6ea' }}
  >
    {icon}
    {children}
  </Box>
)

const Pill = ({ active, dot, children, onClick }) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    display="inline-flex"
    alignItems="center"
    gap={2}
    px={3}
    py={1}
    borderRadius={8}
    fontSize="sm"
    bg={active ? '#1f1f24' : 'transparent'}
    color={active ? '#e6e6ea' : '#8a8a93'}
    _hover={{ bg: '#1a1a1f', color: '#e6e6ea' }}
  >
    {dot && <Box as="span" w="6px" h="6px" borderRadius="full" bg={dot} />}
    {children}
  </Box>
)

export default function TestPanel({ cases, caseIndex, onCaseChange, onInputChange, onAddCase, results, isLoading, view, onViewChange }) {
  const { tab, open } = view
  const show = (next) => onViewChange({ tab: next, open: true })
  const toggle = () => onViewChange({ tab, open: !open })

  const current = cases[caseIndex] ?? { input: '', expected: null }
  const result = results[caseIndex]
  const verdict = verdictOf(result, current.expected)
  const graded = cases.filter((c) => c.expected != null)
  const passed = cases.filter((c, i) => c.expected != null && verdictOf(results[i], c.expected)?.label === 'Accepted').length

  const pills = (withDots) => (
    <Box display="flex" flexWrap="wrap" alignItems="center" gap={1} mb={3}>
      {cases.map((c, i) => (
        <Pill
          key={i}
          active={i === caseIndex}
          dot={withDots ? verdictOf(results[i], c.expected)?.color : null}
          onClick={() => onCaseChange(i)}
        >
          Case {i + 1}
        </Pill>
      ))}
      {!withDots && (
        <Pill onClick={onAddCase}>
          <Plus size={14} />
        </Pill>
      )}
    </Box>
  )

  return (
    <Box
      border="1px solid"
      borderColor="#1e1e22"
      borderRadius={12}
      bg="#0b0b0e"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      flexShrink={0}
      h={open ? { base: '340px', lg: '45%' } : 'auto'}
      minH={0}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" px={4} py={2} borderBottom={open ? '1px solid' : 'none'} borderColor="#1e1e22">
        <Box display="flex" alignItems="center" gap={4}>
          <Tab active={tab === 'case'} icon={<SquareCheck size={15} color={GREEN} />} onClick={() => show('case')}>
            Testcase
          </Tab>
          <Box w="1px" h="14px" bg="#1e1e22" />
          <Tab active={tab === 'result'} icon={<Terminal size={15} color={GREEN} />} onClick={() => show('result')}>
            Test Result
          </Tab>
        </Box>
        <Box as="button" type="button" onClick={toggle} color="#8a8a93" _hover={{ color: '#e6e6ea' }} display="flex">
          {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Box>
      </Box>

      {open && tab === 'case' && (
        <Box flex="1" minH={0} overflow="auto" px={4} py={3}>
          {pills(false)}
          <Label>stdin =</Label>
          <Textarea
            value={current.input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Program input…"
            rows={Math.min(8, Math.max(2, current.input.split('\n').length))}
            resize="vertical"
            fontFamily="mono"
            fontSize="sm"
            bg="#111114"
            color="#e6e6ea"
            border="1px solid"
            borderColor="#1e1e22"
            borderRadius={8}
            px={3}
            py={2}
            _placeholder={{ color: '#5a5a63' }}
            _focus={{ borderColor: '#3b82f6', boxShadow: 'none', outline: 'none' }}
          />
          {current.expected != null && (
            <Box mt={3}>
              <Label>expected output =</Label>
              <Block text={current.expected} />
            </Box>
          )}
        </Box>
      )}

      {open && tab === 'result' && (
        <Box flex="1" minH={0} overflow="auto" px={4} py={3}>
          {isLoading ? (
            <Text fontSize="sm" color="#8a8a93" mb={3}>
              Running…
            </Text>
          ) : verdict ? (
            <Box display="flex" alignItems="baseline" gap={3} mb={3}>
              <Text fontSize="lg" fontWeight="semibold" color={verdict.color}>
                {verdict.label}
              </Text>
              {graded.length > 0 && (
                <Text fontSize="xs" fontFamily="mono" color="#8a8a93">
                  {passed} / {graded.length} passed
                </Text>
              )}
            </Box>
          ) : (
            <Text fontSize="sm" color="#5a5a63">
              Run your code to see the result here.
            </Text>
          )}

          {(verdict || isLoading) && pills(true)}

          {result && !isLoading && (
            <Box display="flex" flexDirection="column" gap={3}>
              {result.stderr && (
                <Box>
                  <Label>stderr</Label>
                  <Block text={result.stderr} color={RED} borderColor="#7f1d1d" />
                </Box>
              )}
              <Box>
                <Label>output</Label>
                <Block text={result.stdout || ''} minH="80px" />
              </Box>
              {current.expected != null && (
                <Box>
                  <Label>expected</Label>
                  <Block text={current.expected} />
                </Box>
              )}
              <Box>
                <Label>input</Label>
                <Block text={current.input} color="#c9c9d0" />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
