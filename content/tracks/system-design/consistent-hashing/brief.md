# Partitioning and consistent hashing

When data or traffic outgrows one machine, you split it across many. The question is which machine owns which key, and what happens when machines come and go.

## Why `hash(key) % N` breaks

With 4 servers, key `user:42` might live on server 2. Add a fifth server and `hash % 5` sends almost every key somewhere new: about 80% of keys move. For a cache that means a near-total miss storm; for a database, a huge migration.

**Predict:** going from 10 to 11 servers with modulo hashing, roughly what share of keys move? (About 10/11, so 91%. With consistent hashing: about 1/11, so 9%.)

## The ring

1. Hash each server onto a circle of 2³² positions.
2. Hash each key onto the same circle.
3. A key belongs to the first server clockwise from it, wrapping past the top back to 0.

Adding a server only takes keys from its clockwise neighbour; removing one only gives its keys to the next server along. Everyone else is untouched.

## Virtual nodes

With one point per server, the arcs between points are uneven, so some servers own far more keys than others. Give each server many points, such as `node-a#0` to `node-a#99`. Arcs average out, load evens up, and a server with twice the capacity can simply get twice the points.

## Lookups

Keep the points sorted. A lookup is a binary search for the first point at or after the key's hash, which is O(log V) for V points. A linear scan works for 5 servers and falls over at 10,000 points and 100,000 lookups a second.

## Replicas

To store 3 copies, keep walking clockwise from the key until you've collected 3 **distinct physical** servers. Skipping repeat virtual nodes of the same server matters: otherwise two "replicas" can land on one machine.

## Other ways to partition

| Strategy | Good at | Weak at |
| --- | --- | --- |
| Hash (mod or ring) | Even spread | Range queries touch every partition |
| Range (by key order, e.g. A-F, G-M) | Range scans, ordered data | Hot spots on popular or sequential keys |
| Directory (a lookup table of key → partition) | Full control, easy moves | The directory is a dependency to scale |

## Hot keys

Even a perfect ring can't split a single key. A celebrity's profile or a viral link can overwhelm its one owner. Common fixes: cache the hot key everywhere, replicate it to several owners, or split it with a suffix (`post:9:shard-0` to `shard-7`) and merge on read.

## Where you'll meet this

Distributed caches (Memcached clients), Dynamo-style databases (DynamoDB, Cassandra), load balancers with sticky routing, and sharded rate limiters.
