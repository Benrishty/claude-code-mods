import type { Register } from 'claude-code'

// iOS dark-mode systemBlue, the colour of an iMessage bubble.
const IMESSAGE_BLUE = '#0A84FF'
const WHITE = '#FFFFFF'

// A bubble takes at most this share of the terminal, like iMessage's.
const MAX_SHARE = 0.7
const MIN_WIDTH = 12

// Cells a character takes: CJK and emoji are two wide, everything else one.
function cellWidth(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0
  const isWide =
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0x1f300 && cp <= 0x1faff)
  return isWide ? 2 : 1
}

function widthOf(s: string): number {
  let w = 0
  for (const ch of s) w += cellWidth(ch)
  return w
}

// Word-wraps one paragraph to `max` cells, splitting a word only when it is
// longer than a whole line.
function wrapLine(line: string, max: number): string[] {
  const out: string[] = []
  let cur = ''
  let curW = 0

  for (const word of line.split(/(\s+)/)) {
    const w = widthOf(word)
    if (curW + w <= max) {
      cur += word
      curW += w
      continue
    }
    if (cur.trim()) out.push(cur.trimEnd())
    cur = ''
    curW = 0
    if (/^\s+$/.test(word)) continue
    for (const ch of word) {
      const cw = cellWidth(ch)
      if (curW + cw > max) {
        out.push(cur)
        cur = ''
        curW = 0
      }
      cur += ch
      curW += cw
    }
  }
  out.push(cur.trimEnd())
  return out
}

export function bubbleLines(text: string, columns: number): string[] {
  const max = Math.max(MIN_WIDTH, Math.floor(columns * MAX_SHARE) - 2)
  return text.replace(/\t/g, '  ').split('\n').flatMap(line => wrapLine(line, max))
}

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    const { origin, task, from, text } = e.props
    // Only what the person typed (terminal or Remote Control), not
    // task notifications or messages from other agents.
    const isMine = (origin.kind === 'composer' || origin.kind === 'bridge') && !task && !from

    if (!isMine) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const lines = bubbleLines(text, e.viewport?.columns ?? 80)
    const inner = Math.max(...lines.map(widthOf))

    // Half blocks pad the body by half a row above and below; a half row is
    // about one column tall, matching the one-space padding at the sides.
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={IMESSAGE_BLUE} wrap="truncate">{'▄'.repeat(inner + 2)}</Text>
        {lines.map(line => (
          <Text color={WHITE} backgroundColor={IMESSAGE_BLUE} wrap="truncate">
            {' ' + line + ' '.repeat(inner - widthOf(line)) + ' '}
          </Text>
        ))}
        <Text color={IMESSAGE_BLUE} wrap="truncate">{'▀'.repeat(inner + 2)}</Text>
      </Box>
    )
  })
}
