# Design a URL shortener

You have 45 minutes. Work in your workspace file (`./dojo start url-shortener` creates it from a template), talking through each step with the tutor as you would with an interviewer.

## The prompt

> Design a service like Bitly. Users paste a long URL and get a short link; anyone who opens the short link is redirected to the long URL. Logged-in users can choose a custom alias and see click counts for their links.

The tutor plays the interviewer. It will answer clarifying questions with these numbers if you ask:

- 100 million new links a month; 10 billion redirects a month.
- Redirects should take under 50 ms at p99, from anywhere in North America and Europe.
- Links never expire unless the user sets an expiry.
- Click counts can lag by a few minutes.

## What to produce

Fill in every section of the template: requirements, estimates, API, data model, high-level design (a Mermaid diagram is welcome), two deep dives, and trade-offs and failure modes.

## Grading

The tutor scores each rubric dimension 1-4 (see `rubric.yaml`), asks the listed probes, and records the result with `./dojo attempt url-shortener --score <average/4> --hints <rung> --minutes <time>`.
