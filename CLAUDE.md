# CLAUDE.md

## Game design baseline

This is a TETR.IO-style GUIDELINE Tetris game — NOT classic NES Tetris or a simple random-block game. Always analyze and design based on TETR.IO's actual competitive multiplayer rules, especially for: attack/garbage system, scoring, T-spin / T-spin-mini detection (SRS-based), B2B, combo, garbage cancel, and the attack table.

Implemented & working: SRS rotation w/ wall kicks, 7-bag randomizer, hold, ghost piece, line clear, T-spin + all-spin detection, garbage attack with combo (additive table [0,1,1,2,2,3,3,4,4,4] capped 5), B2B (flat +1 + Surge at streak≥4), perfect clear (+3, b2b+2).

Still to verify/build: garbage cancel, attack-table fine-tuning vs TETR.IO, visual effects for spins/B2B/Tetris/perfect-clear.

## Workflow rules

1. NEVER use git worktrees. Always work directly on the feat/build branch.
2. NEVER write actual secret values (API keys, NEXTAUTH_SECRET, AUTH_SECRET, webhook secrets, access tokens) into PROGRESS.md or any committed file — use placeholders like `<SET IN DASHBOARD>`. A past leak to a public repo was already rotated.
3. feat/build pushes to neworigin/main, which auto-deploys to Vercel (frontend) + Railway (backend + Postgres).
