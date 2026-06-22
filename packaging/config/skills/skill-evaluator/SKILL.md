---
name: skill-evaluator
description: Evaluate and iterate on skill quality. Takes a skill name, creates test cases, runs evaluations, and reports pass rate.
allowed-tools: Bash(echo *) Bash(mkdir *) Bash(cat *) Bash(rm *) Read Write
---

# Skill Evaluator

Evaluate a skill's effectiveness: create test cases, run them against the skill, and measure pass rate.

## Usage

```
/skill-evaluator <skill-name>
/skill-evaluator <skill-name> --benchmark
```

## Process

1. **Read the skill** — Read `~/.kilo/skills/<skill-name>/SKILL.md` (or `.kilo/skills/` for project skills)
2. **Create test cases** — Identify 3-5 realistic prompts the skill should handle
3. **Define assertions** — For each case, define what constitutes a pass (specific outputs, behaviors, or checks)
4. **Run evals** — For each case, simulate invoking the skill and grade the result against assertions
5. **Report** — Output pass rate and details for each case

## Test Case Format

Save to `<skill-dir>/evals/evals.json`:
```json
[
  {
    "name": "summarize-uncommitted-changes",
    "prompt": "What did I just change?",
    "assertions": [
      "mentions specific files changed",
      "identifies at least one risk"
    ],
    "expected_pass": true
  }
]
```

## Reporting

Return a structured report:
```
Skill: <name>
Pass rate: N/M (XX%)
Cases:
  ✓ Test Case 1 — passed
  ✗ Test Case 2 — failed (expected X, got Y)
  ✓ Test Case 3 — passed
Recommendations:
  - [specific improvement suggestion based on failures]
```
