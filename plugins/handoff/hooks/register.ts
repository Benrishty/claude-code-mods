import type { EngineInterface, Register } from 'claude-code'

const BRIEF = `Write a handoff note so a fresh Claude session, with none of this conversation, can pick up the work exactly where it stands.

Markdown, these sections, terse and specific (exact paths, commands, IDs, branch names; no preamble, no sign-off):
## Goal: what we are trying to achieve and why
## State: what is done, what is in progress, what is verified vs assumed
## Decisions: choices made and the reason for each, including approaches rejected
## Files: paths touched or important, one line each on why
## Open questions / blockers
## Next steps: ordered, concrete, the first one doable immediately
## Gotchas: anything learned the hard way that the next session must not repeat`

const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace(/:/g, '')

const ageText = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m < 60 ? `${m}m` : m < 2880 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}

// Notes live under the user's ~/.claude, one folder per project, so they never land in a repo.
const folder = async ($: EngineInterface) => {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.'
  const slug = (await $.session.root()).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${home.replace(/\\/g, '/')}/.claude/handoffs/${slug}`
}

const latest = async ($: EngineInterface) => {
  const dir = await folder($)
  try {
    const notes = (await $.fs.list(dir)).filter(f => f.kind === 'file' && f.name.endsWith('.md'))
    notes.sort((a, b) => b.name.localeCompare(a.name))
    const top = notes[0]
    return top ? { path: `${dir}/${top.name}`, mtimeMs: top.mtimeMs } : undefined
  } catch {
    return undefined
  }
}

const write = async ($: EngineInterface, focus: string, reason: string) => {
  const prompt = focus ? `${BRIEF}\n\nGive extra weight to: ${focus}` : BRIEF
  const reply = await $.model.fork({ prompt })
  if (!reply.isAnswered) return { error: reply.reason }
  const path = `${await folder($)}/${stamp(await $.clock.now())}.md`
  const header = `<!-- handoff (${reason}) from ${await $.session.root()} · session ${await $.session.id()} -->\n\n`
  await $.fs.write(path, header + reply.text.trim() + '\n')
  return { path }
}

export const register: Register = (on, options) => {
  const autoOnCompact = options.autoOnCompact !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff',
      description: 'Write a handoff note for a fresh session ([focus]), or `load` / `path` the latest one',
    })
    const done = await next(e)
    const note = await latest($)
    if (note && e.isInteractive) {
      const age = (await $.clock.now()) - note.mtimeMs
      if (age < 3 * 86_400_000) $.ui.toast(`Handoff note from ${ageText(age)} ago for this project: /handoff load`)
    }
    return done
  })

  on('command.run', { command: 'handoff' }, async ($, e) => {
    const args = e.args.trim()

    if (args === 'load' || args === 'path') {
      const note = await latest($)
      if (!note) return { text: 'No handoff note for this project yet. Run /handoff first.' }
      if (args === 'path') return { text: note.path }
      await $.prompt.fill({
        text: `Continue from the handoff note at ${note.path}. Read it first, confirm the next step, then carry on.`,
      })
      return { text: `Loaded the prompt with ${note.path}; press Enter to continue.` }
    }

    $.ui.toast('Writing handoff note…')
    const out = await write($, args, 'manual')
    if ('error' in out) return { text: `Handoff not written: ${out.error}` }
    return { text: `Handoff written to ${out.path}\nNext: /clear, then /handoff load` }
  })

  on('session.compact', { trigger: 'auto' }, async ($, e, next) => {
    if (autoOnCompact && e.agentId === undefined) {
      const out = await write($, '', 'auto-compact')
      if ('path' in out) $.ui.toast(`Handoff saved before compacting: ${out.path}`)
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // a failed handoff never blocks the compaction
}