# claude-code-mods

My Claude Code mods, packaged as a single plugin marketplace.

| Mod | What it does |
| --- | --- |
| `cache` | Status line: prompt-cache hit rate and time until the cache goes cold |
| `limits` | Status line: 5-hour and 7-day rate-limit usage with reset countdowns, toasts past a threshold |
| `handoff` | A Handoff button and `/handoff` command: writes a handoff doc, then starts a fresh session pointed at it |
| `imessage-bubbles` | Draws your own chat messages as right-aligned blue iMessage-style bubbles |

## Install

From a local clone:

```
/plugin marketplace add C:\GithubLocal\claude-code-mods
/plugin install cache@claude-code-mods
```

Or straight from GitHub (needs access to the private repo):

```
/plugin marketplace add Benrishty/claude-code-mods
```

## Layout

```
.claude-plugin/marketplace.json   lists every mod
plugins/<mod>/.claude-plugin/plugin.json
plugins/<mod>/hooks/hooks.json    points at register.ts(x)
plugins/<mod>/tests/
```

`.claude-plugin/types/` inside each mod holds engine type stubs the app generates; they're gitignored.
