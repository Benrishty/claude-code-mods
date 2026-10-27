import { expect, mock, test } from 'claude-code/testing'

// The band, after Ben AI's Cache Clock: a live countdown while warm, a cold line with the handoff as the main action
const BAND = { plugin: 'cache-keeper', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160 } } as const
const MIN = 60000

for (const surface of ['terminal', 'desktop'] as const) {
  test(`band counts down, then offers the handoff once a big chat is cold (${surface})`, async ($, on) => {
    const clock = mock.clock(on, { now: new Date(2026, 9, 27, 14, 0).getTime() })
    on('command.register', (_, e) => ({ value: { command: e.name } }))
    on('command.list', () => ({ value: [] }))
    on('ui.toast', () => ({ value: {} }))
    on('env.get', () => ({ value: '/home/me' }))
    on('session.id', () => ({ value: 'abcdef1234' }))
    on('session.cwd', () => ({ value: '/work/app' }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.usage', () => ({ value: { context: { tokens: 180000, window: 200000 }, rateLimits: [] } }))
    on('store.get', () => ({ value: undefined }))
    on('store.set', () => ({ value: {} }))
    on('store.keys', () => ({ value: [] }))
    on('agent.list', () => ({ value: [] }))
    on('fs.exists', () => ({ value: false }))
    on('fs.write', () => ({ value: {} }))
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('session.measure', (_, e) => ({ changed: e.changed }))
    on('turn.step', async function* () { return { turnId: 't1', index: 0, answer: 'ok', toolUses: [], stop: 'end_turn', usage: { model: 'claude-opus-5-5', input_tokens: 1000, cache_read_input_tokens: 179000, cache_creation_input_tokens: 0, output_tokens: 20 } } })
    on('ui.render', ($, e) => {
      const { Text } = $.ui.resolve(e)
      return Text({ children: [''] })
    })

    await $.session.start({ cwd: '/work/app', surface, isInteractive: true })
    // One main-loop request that read the cache starts the clock
    // The status line's numbers: context fill and two plan-limit windows
    await $.session.measure({
      context: { tokens: 180000, window: 200000, percent: 90 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 42, resetsAt: new Date(2026, 9, 27, 16, 10).toISOString() },
        { kind: 'seven_day', percentUsed: 18, resetsAt: new Date(2026, 9, 30, 9, 0).toISOString() },
      ],
      changed: ['context', 'rateLimits'],
    } as never)
    // turn.step streams: read it to the end so the hooks see the result
    for await (const _ of $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 2 } as never) as AsyncIterable<unknown>) {
      // no chunks to look at
    }
    const ui = await $.ui.mount({ ...BAND, surface })
    const warm = await ui.find({ type: 'Text', text: /Cache warm/ })
    if (warm) {
      expect(await ui.find({ key: 'keepwarm' }), 'Keep warm button').toBeTruthy()
      expect(await ui.find({ key: 'handoff' }), 'handoff button').toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /Context 90%/ }), 'context meter').toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /180k\/200k/ }), 'context detail').toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /5h 42%.*4:10pm/ }), '5-hour meter with its reset').toBeTruthy()
      expect(await ui.find({ type: 'Text', text: /Week 18%.*Fri 9am/ }), 'weekly meter with its reset day').toBeTruthy()
      await clock.advance(61 * MIN)
      expect(await ui.find({ type: 'Text', text: /Cache cold/ }), 'cold line after the hour').toBeTruthy()
      expect(await ui.find({ key: 'handoff', text: 'Hand off to a fresh chat' } as never), 'handoff is the main action once cold').toBeTruthy()
    }
    expect(warm, 'the band draws once there was a request').toBeTruthy()
    await ui.unmount()
  })
}
