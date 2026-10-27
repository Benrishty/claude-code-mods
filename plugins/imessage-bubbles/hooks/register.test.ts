import { test, expect } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const
const BLUE = '#0A84FF'

function engineStandIn(on: Parameters<Parameters<typeof test>[1]>[1]) {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine drawing'] }))
}

test('my own prompt draws as a solid blue bubble', async ($, on) => {
  engineStandIn(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'imessage-bubbles',
      surface,
      component: 'UserMessage',
      props: { text: 'hello', origin: { kind: 'composer' }, isExpanded: true },
    })
    const body = await ui.find({ type: 'Text', text: /hello/ })
    expect(body?.props.backgroundColor).toBe(BLUE)
    expect(body?.props.color).toBe('#FFFFFF')
    expect(body?.text).toBe(' hello ')
    expect((await ui.find({ type: 'Text', text: /^▄+$/ }))?.text).toBe('▄▄▄▄▄▄▄')
    expect((await ui.find({ type: 'Text', text: /^▀+$/ }))?.text).toBe('▀▀▀▀▀▀▀')
    await ui.unmount()
  }
})

test('a long message wraps to rows of equal width', async ($, on) => {
  engineStandIn(on)

  const ui = await $.ui.mount({
    plugin: 'imessage-bubbles',
    surface: 'terminal',
    component: 'UserMessage',
    viewport: { columns: 40, rows: 20 },
    props: {
      text: 'the quick brown fox jumps over the lazy dog and keeps on running',
      origin: { kind: 'composer' },
      isExpanded: true,
    },
  })
  const rows = (await ui.findAll({ type: 'Text' })).filter(t => t.props.backgroundColor === BLUE)
  expect(rows.length).toBeGreaterThan(1)
  const widths = new Set(rows.map(r => r.text?.length))
  expect(widths.size).toBe(1)
  expect([...widths][0]).toBeLessThanOrEqual(28)
  await ui.unmount()
})

test("a task notification keeps the engine's drawing", async ($, on) => {
  engineStandIn(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'imessage-bubbles',
      surface,
      component: 'UserMessage',
      props: { text: 'done', origin: { kind: 'task-notification' }, isExpanded: true, task: { id: 't1' } },
    })
    expect(await ui.find({ type: 'Text', text: 'engine drawing' })).toBeDefined()
    await ui.unmount()
  }
})
