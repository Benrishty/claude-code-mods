import type { EngineInterface, ModelUsage, Register, Timer } from 'claude-code'

type Tally = { read: number; written: number; uncached: number }

const empty = (): Tally => ({ read: 0, written: 0, uncached: 0 })

// Module state: a reload starts these over, which only blanks the segment until the next turn.
let ttlMs = 60 * 60_000
let warnMs = 60_000
let session = empty()
let warning: Timer | undefined

const hitRate = (t: Tally) => {
  const total = t.read + t.written + t.uncached
  return total === 0 ? null : Math.round((100 * t.read) / total)
}

const tally = (u: ModelUsage): Tally => ({
  read: u.cache_read_input_tokens,
  written: u.cache_creation_input_tokens,
  uncached: u.input_tokens,
})

// statusline.ps1 reads this file by the session id it is handed and draws the segment.
const publish = async ($: EngineInterface, figures: object) => {
  const home = ((await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.').replace(/\\/g, '/')
  await $.fs.write(`${home}/.claude/mods/.status/${await $.session.id()}.cache.json`, JSON.stringify(figures))
}

const warnLater = ($: EngineInterface) => {
  warning?.cancel()
  if (warnMs <= 0 || warnMs >= ttlMs) return
  warning = $.clock.after(ttlMs - warnMs, () =>
    $.ui.toast(`Prompt cache goes cold in ${Math.round(warnMs / 1000)}s; the next turn re-reads the whole context`),
  )
}

export const register: Register = (on, options) => {
  ttlMs = Number(options.ttlMinutes ?? '60') * 60_000
  warnMs = Number(options.warnSeconds ?? 60) * 1000

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      session = empty()
      warning?.cancel()
      await publish($, {})
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const usage = done.usage ?? e.usage
    if (e.agentId !== undefined || !usage) return done
    const turn = tally(usage)
    session = {
      read: session.read + turn.read,
      written: session.written + turn.written,
      uncached: session.uncached + turn.uncached,
    }
    const expiresAt = (await $.clock.now()) + ttlMs
    await publish($, { hit: hitRate(turn), sessionHit: hitRate(session), expiresAt })
    warnLater($)
    return done
  })
}