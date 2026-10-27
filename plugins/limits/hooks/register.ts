import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

let warnAt = 80
// Toast once per window per reset, so each window warns again after it resets.
const warned = new Set<string>()

const untilText = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${Math.round(h / 24)}d`
}

// The windows are the account's, not the session's: one file, the latest reading wins.
const publish = async ($: EngineInterface, limits: readonly SessionRateLimit[]) => {
  const home = ((await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.').replace(/\\/g, '/')
  await $.fs.write(`${home}/.claude/mods/.status/limits.json`, JSON.stringify({ warnAt, limits }))
}

const take = async ($: EngineInterface, limits: readonly SessionRateLimit[]) => {
  if (limits.length === 0) return
  await publish($, limits)
  const now = await $.clock.now()
  for (const l of limits) {
    const key = `${l.kind}@${l.resetsAt ?? ''}`
    if (l.percentUsed < warnAt || warned.has(key)) continue
    warned.add(key)
    const reset = l.resetsAt ? `, resets in ${untilText(Date.parse(l.resetsAt) - now)}` : ''
    $.ui.toast(`${LABEL[l.kind] ?? l.kind} limit at ${l.percentUsed}%${reset}`)
  }
}

export const register: Register = (on, options) => {
  warnAt = Number(options.warnAt ?? 80)

  on('session.start', async ($, e, next) => {
    const done = await next(e)
    await take($, (await $.session.usage()).rateLimits)
    return done
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await take($, e.rateLimits)
    return next(e)
  })
}