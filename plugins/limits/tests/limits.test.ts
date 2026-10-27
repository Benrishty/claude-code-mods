import { expect, mock, test } from 'claude-code/testing'

const at = (pct: number) => [
  { kind: 'five_hour', percentUsed: pct, resetsAt: '2026-10-09T14:30:00Z' },
  { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-12T12:00:00Z' },
]

test('publishes the windows and warns once past the threshold', { options: { warnAt: 80 } }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-09T12:00:00Z') })
  mock.env(on, { USERPROFILE: 'C:\\Users\\me' })
  const files = new Map<string, string>()
  const toasts: string[] = []
  on('fs.write', ($, e) => (files.set(e.path.replace(/\\/g, '/'), e.text), { value: undefined }))
  on('ui.toast', ($, e) => (toasts.push(e.text), { value: undefined }))
  on('session.measure', ($, e) => ({ changed: e.changed }))

  await $.session.measure({ context: { window: 200_000 }, rateLimits: at(85), changed: ['rateLimits'] })
  expect(JSON.parse(files.get('C:/Users/me/.claude/mods/.status/limits.json') ?? '{}')).toEqual({ warnAt: 80, limits: at(85) })
  expect(toasts).toEqual(['5h limit at 85%, resets in 2h30'])

  await $.session.measure({ context: { window: 200_000 }, rateLimits: at(86), changed: ['rateLimits'] })
  expect(toasts.length).toBe(1)
})