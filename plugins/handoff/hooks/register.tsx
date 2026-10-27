import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { HandoffPhase } from '../types'

const phase = atom({ plugin: 'handoff', key: 'phase' } as const, 'idle' as HandoffPhase)
const hasTurn = atom({ plugin: 'handoff', key: 'hasTurn' } as const, false)
const docPath = atom({ plugin: 'handoff', key: 'docPath' } as const, null as string | null)

// Matt Pocock's skill writes the doc; this mod only drives it and switches sessions.
const SKILL = 'mattpocock-skills:handoff'
// A markdown path in the skill's reply, the fallback when the doc was not written by Write.
const MD_PATH = /([A-Za-z]:[\\/][^\s`'"*<>|]+\.md|\/(?:tmp|var\/folders)\/[^\s`'"*<>|]+\.md)/

async function reset($: EngineInterface) {
  await update($, phase, () => 'idle')
  await update($, docPath, () => null)
  $.ui.status(undefined)
}

/** Runs the handoff skill as its own turn, once the calling hook has returned. */
async function start($: EngineInterface, focus: string): Promise<string> {
  if ((await read($, phase)) !== 'idle') return 'A handoff is already running.'
  const commands = await $.command.list()
  const skill = commands.find(c => c.name === SKILL) ?? commands.find(c => c.name.endsWith(':handoff'))
  if (skill === undefined) return `The ${SKILL} skill is not installed or enabled.`

  await update($, docPath, () => null)
  await update($, phase, () => 'writing')
  $.ui.status('Writing handoff…')
  $.clock.after(0, () => {
    $.command.run({ command: skill.name, args: focus }).catch(async err => {
      $.ui.toast(`Handoff skill did not run: ${String(err)}`)
      await reset($)
    })
  })
  return `Running /${skill.name}; a fresh session starts from its doc when it finishes.`
}

/** Clears the session and points the fresh one at the doc. */
function switchTo($: EngineInterface, path: string) {
  $.clock.after(0, () => {
    void (async () => {
      try {
        await $.command.run({ command: 'clear' })
        await $.prompt.submit({
          text: `Continue from a handoff. Read ${path} first: it is the full context from the previous session. Call the Skill tool for any skills its "suggested skills" section names, confirm in two or three lines what you understand the goal and next step to be, then start on it.`,
        })
      } catch (err) {
        $.ui.toast(`Handoff written to ${path}, but the new session did not start: ${String(err)}`)
      } finally {
        await update($, hasTurn, () => false)
        await reset($)
      }
    })()
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff-new',
      description: `Run /${SKILL}, then start a fresh session pointed at the doc it writes`,
      argumentHint: '[what the next session will be used for]',
    })
    return next(e)
  })

  on('command.run', { command: 'handoff-new' }, async ($, e) => ({ text: await start($, e.args.trim()) }))

  // The skill saves the doc with Write; remember where.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.tool !== 'Write' || e.agentId !== undefined || !/\.md$/i.test(e.file_path)) return result
    if ((await read($, phase)) === 'writing') {
      const path = e.file_path
      await update($, docPath, () => path)
    }
    return result
  })
    // never block a Write over bookkeeping: on failure, pass the call through
    .catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    await update($, hasTurn, () => true)
    if ((await read($, phase)) !== 'writing') return next(e)

    if (e.isAborted || e.reason !== 'answer') {
      $.ui.toast('Handoff cancelled: the skill turn did not finish.')
      await reset($)
      return next(e)
    }
    const path = (await read($, docPath)) ?? e.answer.match(MD_PATH)?.[1]
    if (path === undefined) {
      $.ui.toast('Handoff skill finished but no doc path was found; staying in this session.')
      await reset($)
      return next(e)
    }
    await update($, phase, () => 'switching')
    switchTo($, path)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, phase)
    if (e.props.hasSurvey || (current === 'idle' && !(await read($, hasTurn)))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    if (current !== 'idle') {
      return (
        <Box>
          <Text dimColor>{current === 'writing' ? `Writing handoff (/${SKILL})…` : 'Starting fresh session from handoff…'}</Text>
        </Box>
      )
    }
    return (
      <Box>
        <Button key="handoff" label="Handoff → new session" onPress={async () => $.ui.toast(await start($, ''))} />
      </Box>
    )
  })
}
