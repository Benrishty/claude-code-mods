export type HandoffPhase = 'idle' | 'writing' | 'switching'

declare module 'claude-code' {
  interface PluginState {
    handoff: { phase: HandoffPhase; hasTurn: boolean; docPath: string | null }
  }
}
