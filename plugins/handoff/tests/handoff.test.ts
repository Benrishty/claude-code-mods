import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const RUN = {
  command: 'handoff-new',
  args: 'finish the tests',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

const DOC = 'C:\\Users\\me\\AppData\\Local\\Temp\\handoff-abc.md'

function fakeEngine(on: On, skillInstalled = true) {
  const commands: { command: string; args: string }[] = []
  const prompts: string[] = []
  on('command.list', async () => ({
    value: skillInstalled
      ? [{ name: 'mattpocock-skills:handoff', description: 'handoff', source: 'plugin' as never }]
      : [],
  }))
  on('command.run', async (_$, e, next) => {
    if (e.command === 'handoff-new') return next(e)
    commands.push({ command: e.command, args: e.args })
    return {}
  })
  on('prompt.submit', async (_$, e) => {
    prompts.push(e.text)
    return { text: e.text } as never
  })
  on('ui.status', async () => ({ value: undefined }) as never)
  on('ui.toast', async () => ({ value: undefined }) as never)
  on('tool.call', async () => ({ result: 'ok', text: 'ok' }) as never)
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  return { commands, prompts }
}

const turnDone = (answer: string) =>
  ({ answer, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' }) as never

test('runs the mattpocock handoff skill, then clears and points the new session at its doc', async ($, on) => {
  const clock = mock.clock(on)
  const { commands, prompts } = fakeEngine(on)

  const { text } = await $.command.run(RUN)
  expect(text).toContain('mattpocock-skills:handoff')
  await clock.settle()
  expect(commands).toEqual([{ command: 'mattpocock-skills:handoff', args: 'finish the tests' }])

  // the skill's turn writes the doc, then ends
  const callTool = ($ as unknown as { tool: { call: (input: unknown) => Promise<unknown> } }).tool.call
  await callTool({ tool: 'Write', file_path: DOC, content: '# Handoff', tool_use_id: 'w1' })
  await $.turn.complete(turnDone('Saved the handoff.'))
  await clock.settle()

  expect(commands.map(c => c.command)).toEqual(['mattpocock-skills:handoff', 'clear'])
  expect(prompts.length).toBe(1)
  expect(prompts[0]).toContain(DOC)
})

test('falls back to the path named in the reply when no Write was seen', async ($, on) => {
  const clock = mock.clock(on)
  const { prompts } = fakeEngine(on)

  await $.command.run(RUN)
  await clock.settle()
  await $.turn.complete(turnDone(`Handoff saved to \`${DOC}\`.`))
  await clock.settle()

  expect(prompts[0]).toContain(DOC)
})

test('skill not installed: nothing runs', async ($, on) => {
  const clock = mock.clock(on)
  const { commands } = fakeEngine(on, false)

  const { text } = await $.command.run(RUN)
  await clock.settle()
  expect(text).toContain('not installed')
  expect(commands).toEqual([])
})
