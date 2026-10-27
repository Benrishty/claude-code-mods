import { expect, mock, test } from 'claude-code/testing'

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const RUN = { command: 'handoff', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } }
// The engine hands hooks native paths; the fake filesystem keys on forward slashes.
const slash = (p: string) => p.replace(/\\/g, '/')
const DIR = 'C:/Users/me/.claude/handoffs/C-Work-Proj'

test('writes a note from a fork, then loads it into the prompt', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-09T12:05:00Z') })
  mock.env(on, { USERPROFILE: 'C:\\Users\\me' })
  const files = new Map<string, string>()
  const fills: string[] = []
  const asks: string[] = []
  on('session.root', () => ({ value: 'C:\\Work\\Proj' }))
  on('session.id', () => ({ value: 'sess1' }))
  on('ui.status', () => ({ value: undefined }))
  on('model.fork', ($, e) => (asks.push(e.prompt), { value: { isAnswered: true as const, text: '## Goal\nship it\n', usage: USAGE } }))
  on('fs.write', ($, e) => (files.set(slash(e.path), e.text), { value: undefined }))
  on('fs.list', ($, e) => ({
    value: [...files.keys()]
      .filter(p => p.startsWith(`${slash(e.path)}/`))
      .map(p => ({ name: p.slice(slash(e.path).length + 1), kind: 'file' as const, size: 1, mtimeMs: 0, isLink: false })),
  }))
  on('prompt.fill', ($, e) => (fills.push(e.text), { isFilled: true }))

  const wrote = await $.command.run({ ...RUN, args: 'the migration' })
  expect(wrote.text).toContain(`${DIR}/2026-10-09T1205.md`)
  expect(asks[0]).toContain('Give extra weight to: the migration')
  expect(files.get(`${DIR}/2026-10-09T1205.md`)).toContain('## Goal\nship it')

  await $.command.run({ ...RUN, args: 'load' })
  expect(fills[0]).toContain(`${DIR}/2026-10-09T1205.md`)
})