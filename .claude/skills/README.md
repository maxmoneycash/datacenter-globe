# Agent skills

Vendored from **[mattpocock/skills](https://github.com/mattpocock/skills)** (MIT,
© Matt Pocock — see `LICENSE.mattpocock`) at upstream commit `84fdeff`.

They live in the repo rather than being installed per-machine so that *every*
session picks them up automatically — including remote and CI agents, which
start from a fresh clone and never run an interactive install step.

## What's here

The `engineering`, `productivity`, and `misc` sets, flattened into this
directory. Upstream's `deprecated/` and `in-progress/` sets are deliberately
excluded — they're marked unfinished by their author.

Highlights for this repo:

| Skill | Use it for |
|---|---|
| `to-spec`, `to-tickets` | Turning a rough idea into a written spec / discrete tickets |
| `tdd` | Building a feature test-first (see `npm test` below) |
| `implement` | Executing an agreed spec or ticket |
| `diagnosing-bugs` | Root-causing rather than patching symptoms |
| `codebase-design`, `domain-modeling` | Structural changes to `src/` |
| `grilling`, `wait-what` | Pressure-testing a plan before it's written |
| `triage` | Sorting the issue queue |

## Two notes

**`code-review` shadows the built-in.** This directory defines a `code-review`
skill and so does Claude Code. Project skills win, so `/code-review` here runs
Matt's version. That's intentional — it's what "use these skills" asked for —
but it is a behaviour change worth knowing about.

**`setup-matt-pocock-skills` has not been run.** It scaffolds an issue-tracker
choice, triage label vocabulary, and domain-doc layout, and it wants decisions
from a human rather than defaults picked for them. Run it when you want the
ticket-flow skills (`to-tickets`, `triage`) wired to a real tracker.

## Updating

```bash
git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/skills
for g in engineering productivity misc; do cp -r "/tmp/skills/skills/$g/." .claude/skills/; done
```

Alternatively drop the vendored copy and subscribe to upstream's managed
bundle with `claude plugins install mattpocock-skills` — but do one or the
other, not both, or every skill appears twice.
