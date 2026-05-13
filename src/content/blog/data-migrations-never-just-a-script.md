---
title: "Why Data Migrations Are Never 'Just a Script'"
date: "2026-01-28"
excerpt: "Data migration looks simple on a whiteboard. In production, it's where assumptions go to die."
tags: ["data", "engineering", "legacy"]
published: true
---

"It's just a migration script. How hard can it be?"

I've heard this sentence at least a dozen times. It's always said with confidence, usually during sprint planning, and it's almost always wrong.

## The whiteboard version

On paper, data migration is straightforward. You have data in format A. You need it in format B. Write a script that reads from A, transforms it, and writes to B. Ship it. Done.

This works for toy datasets. It falls apart the moment you deal with production data at scale.

## What actually goes wrong

**Inconsistent source data.** Legacy systems accumulate years of edge cases. Fields that should be non-null are null. Dates are stored in three different formats. Foreign keys reference records that were deleted years ago. Your migration script needs to handle every one of these cases, and you won't discover most of them until you run against real data.

**Scale surprises.** A migration that runs in 30 seconds on your dev database can take 14 hours on production. Lock contention, index rebuilds, and transaction log growth all scale non-linearly. If you haven't tested against production-scale data, you're guessing.

**Rollback complexity.** Migrations need to be reversible. This sounds simple until you realize that rolling back after partial completion means dealing with a system that's half in the old format and half in the new one. Idempotency isn't optional — it's survival.

**Business continuity.** Your migration has to run while the business keeps operating. That means handling concurrent writes during the migration window, resolving conflicts between old and new data, and ensuring that no report, no dashboard, and no downstream system sees corrupted data.

## How I approach migrations

1. **Profile the source data first.** Before writing any transformation logic, run analysis queries. Find the nulls, the duplicates, the format inconsistencies. Map every edge case.
2. **Build in checkpoints.** Break the migration into batches with progress tracking. If it fails at row 500,000, you should be able to resume from row 500,001.
3. **Run it twice.** First on a production clone, measuring time, monitoring locks, and validating output. Then on actual production, with the confidence that you've already seen what will happen.
4. **Verify at the business level.** Technical validation (row counts, checksums) is necessary but insufficient. Run the same reports against old and new data. If the numbers don't match, something is wrong.

## Respect the complexity

Data migrations touch every part of a system's integrity. They deserve the same rigor as any critical feature — design documents, code review, staged rollouts, and rollback plans.

The next time someone says "it's just a script," ask them: have you profiled the source data? What's the rollback plan? How long does it take at production scale?

If they can't answer, it's not "just" anything.
