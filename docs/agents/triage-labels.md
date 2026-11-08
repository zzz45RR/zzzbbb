# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.

## Wayfinder labels

`/wayfinder` maps and tickets use a separate vocabulary, and only that vocabulary:

| Label               | Applies to                                     |
| ------------------- | ---------------------------------------------- |
| `wayfinder:map`     | the single map issue (Notes / Decisions / Fog) |
| `wayfinder:research`  | child ticket: investigate and answer           |
| `wayfinder:prototype` | child ticket: build a throwaway prototype      |
| `wayfinder:grilling`  | child ticket: interrogate the human            |
| `wayfinder:task`      | child ticket: straightforward execution        |

Maps and tickets never carry a triage label (`ready-for-agent` etc.) — they are decisions, not implementation work.
