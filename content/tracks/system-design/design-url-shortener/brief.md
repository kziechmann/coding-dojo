# Design: URL shortener

The URL shortener is the most common first system-design question because it is small enough to finish and still touches estimation, ID generation, caching and data modelling. Use it to practise the **process** as much as the answer.

## A 45-minute structure that works for any design

| Minutes | Step | Output |
| --- | --- | --- |
| 0-5 | Requirements | Functional list, non-functional list, numbers agreed |
| 5-10 | Estimates | Reads/s, writes/s, storage; what they imply |
| 10-15 | API and data model | Endpoints with request/response; tables or key-value layout |
| 15-25 | High-level design | Boxes and arrows for the main read and write paths |
| 25-40 | Deep dives | The two riskiest parts, chosen by you or the interviewer |
| 40-45 | Wrap-up | Bottlenecks, failure modes, what you'd do next |

Say each step out loud as you enter it. Interviewers grade structure as much as content.

## The problem's real decisions

1. **Short codes.** Options:
   - **Counter + base62:** a global counter (or ranges handed out to each server) encoded as base62. No collisions, short codes; predictable, so codes can be enumerated.
   - **Random 7 characters:** 62⁷ ≈ 3.5 trillion codes. Collisions are rare but must be checked on insert.
   - **Hash of the long URL:** the same URL always gets the same code (often unwanted: different users want separate stats), and truncation collides.
2. **Read path.** Redirects dominate (often 100:1 reads to writes) and must be fast. A cache in front of the store holds hot codes; a CDN or edge can serve the very hottest.
3. **Redirect status.** 301 is cached by browsers (fewer requests to you, but no per-click analytics); 302 keeps every click visible.
4. **Analytics.** Never block the redirect on writing a click. Emit an event to a queue or log and aggregate offline.
5. **Custom aliases and expiry.** Unique constraint on the code; lazy deletion of expired links on read plus a background sweep.

**Predict:** 100M new links a month, 7-character codes, 5-year retention. How many codes do you need, and is 62⁷ enough? (About 6 billion; yes, with room to spare.)

## Data model sketch

`links(code PK, long_url, owner_id, created_at, expires_at)` in a key-value store or a relational table keyed by `code`. All reads are by primary key, so a key-value store scales simply; a relational database is fine at moderate scale and makes custom aliases and ownership queries easier. Say which you choose and why.

## What strong answers add

- Range-based counters so servers don't coordinate on every write.
- Abuse handling: rate limits on creation, malware URL checks.
- Multi-region reads with a single writer per code range.

## How this exercise is graded

Your design goes in the workspace file. The tutor scores it 1-4 on each rubric dimension (requirements, estimation, API and data, architecture, deep dives, trade-offs), quotes the descriptor it used, and asks two follow-up probes before giving the score.
