---
description: Fan out three fresh-context reviewers on your changes and report the problems as questions. Never suggests fixes.
argument-hint: [path or focus, optional]
---

Review the current work and report what is wrong with it. Do not fix anything.
Do not describe how to fix anything.

Target (optional): $ARGUMENTS

## Why this command does not give fixes

Working out the fix is where the learning is. Name the problem precisely enough
that the engineer can solve it, ask the question that gets them there, and stop.

If they ask you to explain a finding afterward, explain the principle behind it.
Still do not hand over the code.

## Steps

**1. Scope it.**

If `$ARGUMENTS` names a path or a focus, that is the target. Otherwise review
the uncommitted diff. If the tree is clean, review `main...HEAD`.

Orient with `git status --short` and `git diff --stat`. State in one line what
you are reviewing.

**2. Run the tooling.**

`mise tasks`, then lint and format in check mode. Capture the counts. Fix
nothing. If mise or the task is missing, record `not configured`.

Then check the pre-PR list in `backend/AGENTS.md`, read-only:

- `git fetch origin main`, then `git rev-list --count HEAD..origin/main`. If
  the branch is behind, say so. If
  `git merge-tree --write-tree origin/main HEAD` reports conflicts, that is a
  High finding.
- For each migration the branch adds, compare its timestamp with the newest
  migration on `origin/main`. A migration that sorts before main's newest, or
  creates a table main already creates, is a High finding.
- If the diff touches routes or controller types, check whether
  `backend/openapi.yaml` changed too. If not, report it. CI will fail.

**3. Fan out three reviewers, in parallel, in a single message.**

```
correctness-reviewer   logic, edge cases, races, data safety, error paths
design-reviewer        abstraction, overengineering, layering, optionals,
                       validation boundary, encapsulation
style-critic           mise lint/format, naming, comments, readability
```

Each one gets: the scope, the diff, an instruction to read the actual files
rather than this conversation, an instruction to read `AGENTS.md` and
`backend/AGENTS.md` first, and `do not edit files`.

**4. Synthesize.**

Resolve disagreements yourself by reading the code, do not just concatenate.
Drop duplicates and anything the diff already handles.

`backend/AGENTS.md` beats existing code. Drop any finding that asks the author
to copy a pattern the conventions forbid, such as adding a
`var _ Interface = (*impl)(nil)` assertion because other files have one.

Keep:
- every correctness finding at **medium or high**
- every code quality finding at **any severity** (naming, comments, readability,
  abstraction, overengineering, layering, optionals, validation, encapsulation,
  dead code)

Drop low-severity correctness findings and collapse them into a count.

**5. Report, then stop.**

Do not edit files. Do not commit. Do not open a PR. Offer to go deeper on any
single finding if they want it.

## Readiness label

Be lenient. This gates asking a human for review, not merging.

```
Not ready    any High finding, or lint/format failing
Ready        everything else, mediums included
```

A pile of mediums is still ready. Someone learning will have mediums.

## Output

````
## Review — <what was reviewed>

lint: <n problems | clean | not configured>
format: <n files unformatted | clean | not configured>

**Ready for human review** — <short clause>

### Findings

**High** · races · api/devices.ts:61
Two installs scan the same QR code within the same second. How many
device rows exist when both finish?

**Medium** · abstraction · api/devices.ts:77
This role check is now written out at :77, :104, and in alerts.ts:31.
What has to happen when a fourth role is added?

**Low** · naming · api/devices.ts:12
What does `d2` hold that `d` does not?

4 low-severity correctness findings not shown.

### Done well
<one specific thing, one line>
````

Keep the `**Severity** · rule-tag · file:line` shape exactly. It is what makes
repeat offenders visible across reviews, and it is what a CI job would parse
later.

Order by severity, then by file. Be terse. No preamble.
