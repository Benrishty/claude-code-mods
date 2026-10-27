import type { Register } from 'claude-code'

const IMESSAGE_BLUE = '#0A84FF'

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    // Only the person's own prompts: task notifications and messages from
    // other agents/sessions keep the engine's drawing.
    if (e.props.task || e.props.from) {
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
