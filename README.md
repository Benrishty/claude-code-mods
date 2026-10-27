# claude-code-mods

My Claude Code mods, packaged as a single plugin marketplace.

| Mod | What it does |
| --- | --- |
| `brain-dump` | Ben AI's Brain Dump: when you send a long, loose prompt (120+ words), offers to ask up to three questions about real gaps, then puts a four-part brief (the job, the why, the guardrails, done means) back in the prompt box for you to check and send. `/shape` turns it on or off |
| `cache-keeper` | Nate Herk's Cache Keeper: cache warm/cold band with plan limits, `/keepwarm`, a cold-send guard, `/board`, and a handoff button + `/handoff` that runs Matt Pocock's `handoff` skill |
| `imessage-bubbles` | Draws your own chat messages as right-aligned blue iMessage-style bubbles |

`cache-keeper` is copied from Nate Herk's [claude-code-mods](https://github.com/nateherkai/claude-code-mods) (MIT). The one change: its handoff runs Matt Pocock's `handoff` skill instead of Nate's `/session-handoff`, so it needs `claude plugin install mattpocock-skills@mattpocock`.

`brain-dump` is copied unchanged from Ben AI's benai-mods (0.2.0). It still listens for that marketplace's `/mods` switchboard (`~/.claude/mods/switches.json`); without it, the mod is just on.

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
