import type { EngineInterface, Register } from 'claude-code'

const IMESSAGE_BLUE = '#0A84FF'

// The /mods switchboard turns this mod off in every chat with switches.json.
const NAME = 'imessage-bubbles'
let home = ''
let off = false

async function readSwitch($: EngineInterface) {
  let now = false
  try {
    const path = `${home}/.claude/mods/switches.json`
    if (await $.fs.exists(path)) {
      const json = JSON.parse(String(await $.fs.read(path))) as Record<string, unknown>
      now = json[NAME] === false
    }
  } catch {
    now = off
  }
  if (now === off) return
  off = now
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // The next state change redraws anyway.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    home = (await $.env.get('HOME').catch(() => undefined)) || ($.plugin.root.split('/.claude/')[0] ?? '')
    await readSwitch($).catch(() => undefined)
    $.clock.every(3000, () => {
      void readSwitch($).catch(() => undefined)
    })
    return result
  })

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    // Only the person's own prompts: task notifications and messages from
    // other agents/sessions keep the engine's drawing.
    if (off || e.props.task || e.props.from) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      // The engine's own bubble comes back from next(e) as an opaque node we
      // can't recolor, so draw a lookalike: rounded, snug, filled blue.
      <Box flexDirection="row" justifyContent="flex-end">
        <Box
          borderStyle="round"
          borderColor={IMESSAGE_BLUE}
          backgroundColor={IMESSAGE_BLUE}
          paddingX={1}
        >
          <Text color="white">{e.props.text}</Text>
        </Box>
      </Box>
    )
  })
}
