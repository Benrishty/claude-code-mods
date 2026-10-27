import { expect, mock, test } from 'claude-code/testing'

// The band waits for the first model request; the footer label shows a ready handoff
const FOOTER = { plugin: 'cache-keeper', component: 'SessionMode', props: { modes: [] } } as const

const DOC = '# Handoff\n\n' + 'Where things stand and what to do next. '.repeat(10)

test("/handoff runs Matt Pocock's skill and picks up the doc it writes", async ($, on) => {
  const ran: { command: string; args: string }[] = []
  const written: Record<string, string> = {}
  const clock = mock.clock(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('command.list', () => ({ value: [{ name: 'handoff' }, { name: 'mattpocock-skills:handoff' }] }))
  on('command.run', (_, e) => {
    ran.push({ command: e.command, args: e.args })
    return { text: '' }
  })
  on('ui.toast', () => ({ value: {} }))
  on('ui.invalidate', () => ({ value: {} }))
  on('env.get', () => ({ value: '/home/me' }))
  on('session.id', () => ({ value: 'abcdef1234' }))
  on('session.cwd', () => ({ value: '/work/app' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({ value: { context: { window: 200000 }, rateLimits: [] } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: {} }))
  on('store.keys', () => ({ value: [] }))
  on('agent.list', () => ({ value: [] }))
  on('fs.exists', () => ({ value: false }))
  on('fs.write', (_, e) => {
    written[e.path] = e.text
    return { value: {} }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', () => ({}))
  on('tool.call', (_, e) => ({ result: e.tool === 'AskUserQuestion' ? { answers: {} } : {} }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: [(e.props as { modes?: string[] }).modes?.join(' & ') ?? ''] })
  })

  await $.session.start({ cwd: '/work/app', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'handoff', args: 'finish the tests' })
  await clock.advance(100)
  expect(ran).toContainEqual({ command: 'mattpocock-skills:handoff', args: 'finish the tests' })

  await $.tool.call({ tool: 'Write', file_path: '/tmp/handoff-1.md', content: DOC })
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: 'Saved to /tmp/handoff-1.md' })
  expect(Object.values(written)).toContainEqual(DOC.trim() + '\n')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...FOOTER, surface })
    expect(await ui.find({ type: 'Text', text: /handoff ready/ })).toBeTruthy()
    await ui.unmount()
  }
})
