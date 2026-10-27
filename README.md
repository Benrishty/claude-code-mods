# claude-code-mods

My Claude Code mods, packaged as a single plugin marketplace.

| Mod | What it does |
| --- | --- |
| `cache-keeper` | Nate Herk's Cache Keeper: cache warm/cold band with plan limits, `/keepwarm`, a cold-send guard, `/board`, and a handoff button + `/handoff` that runs Matt Pocock's `handoff` skill |
| `imessage-bubbles` | Draws your own chat messages as right-aligned blue iMessage-style bubbles |

`cache-keeper` is copied from Nate Herk's [claude-code-mods](https://github.com/nateherkai/claude-code-mods) (MIT). The one change: its handoff runs Matt Pocock's `handoff` skill instead of Nate's `/session-handoff`, so it needs `claude plugin install mattpocock-skills@mattpocock`.

## Install

From a local clone:

```
/plugin marketplace add C:\GithubLocal\claude-code-mods
/plugin install imessage-bubbles@claude-code-mods
```

Or straight from GitHub (needs access to the private repo):

```
/plugin marketplace add Benrishty/claude-code-mods
```

## Layout

```
.claude-plugin/marketplace.json   lists every mod
plugins/<mod>/.claude-plugin/plugin.json
plugins/<mod>/hooks/hooks.json    points at register.ts(x) or register.mjs
plugins/<mod>/tests/
```

`.claude-plugin/types/` inside each mod holds engine type stubs the app generates; they're gitignored.
