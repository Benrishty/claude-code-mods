import { expect, mock, test } from 'claude-code/testing'

const USAGE = { model: 'm', input_tokens: 100, output_tokens: 5, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 }

test('publishes the hit rate and expiry, and warns before the cache goes cold', { options: { ttlMinutes: '5', warnSeconds: 60 } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.env(on, { USERPROFILE: 'C:\\Users\\me' })
  const files = new Map<string, string>()
  const toasts: string[] = []
  on('session.id', () => ({ value: 'sess1' }))
  on('fs.write', ($, e) => (files.set(e.path.replace(/\\/g, '/'), e.text), { value: undefined }))
  on('ui.toast', ($, e) => (toasts.push(e.text), { value: undefined }))
  on('turn.complete', ($, e) => ({ text: e.answer }))

  await $.turn.complete({ reason: 'answer', answer: 'hi', durationMs: 1, isAborted: false, turnId: 't1', usage: USAGE })
  expect(JSON.parse(files.get('C:/Users/me/.claude/mods/.status/sess1.cache.json') ?? '{}')).toEqual({
    hit: 90,
    sessionHit: 90,
    expiresAt: 1_300_000,
  })

  await clock.advance(239_000)
  expect(toasts.length).toBe(0)
  await clock.advance(2_000)
  expect(toasts.length).toBe(1)
})