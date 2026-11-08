# Caching

A cache keeps a copy of data somewhere faster or closer than its source. It turns a 5 ms database query into a 0.1 ms memory read, and it shields the database from read traffic it could never handle alone. You already use one every day: the browser's HTTP cache and a CDN are what make Core Web Vitals achievable.

## Where caches sit

Browser → CDN → API gateway → application memory → shared cache (Redis, Memcached) → database buffer pool. Each layer closer to the user is faster but harder to invalidate.

## Patterns

| Pattern | Read path | Write path | Use when |
| --- | --- | --- | --- |
| Cache-aside | App checks cache; on a miss, loads from DB and fills the cache | App writes DB, then deletes the cache entry | The default; the cache can fail without data loss |
| Read-through | Cache library loads on a miss | Same as cache-aside | You want loading logic in one place |
| Write-through | Same as read-through | Write goes to cache and DB together | Reads must see fresh writes immediately |
| Write-behind | Same | Write to cache now, flush to DB later | High write volume and some loss is tolerable |

**Delete, don't update, on write.** If two writers race to update the cache, the older value can land last. Deleting means the next read loads the truth.

## Eviction and expiry

- **LRU** (least recently used) evicts the entry untouched for longest. A `Map` in JavaScript keeps insertion order, so delete-and-reinsert on access gives O(1) LRU. In other languages you'd pair a hash map with a doubly linked list.
- **TTL** bounds staleness: after it expires, the next read reloads. Short TTLs mean fresher data and more load.
- **Expire lazily.** Check the timestamp on read instead of running a timer per key.

## How caches go wrong

1. **Stampede (thundering herd).** A hot key expires and 1,000 requests miss at once, all hitting the database. Fixes: coalesce concurrent loads into one ("single flight"), add jitter to TTLs, or refresh before expiry.
2. **Penetration.** Requests for keys that don't exist always miss. Cache the "not found" result briefly.
3. **Stale reads after writes.** Cache-aside with delete-on-write leaves a small window; say whether your product can tolerate it.
4. **Cold start.** A fresh cache has a 0% hit rate; warm the hottest keys before shifting traffic.

**Predict:** a key gets 2,000 reads a second and its load takes 50 ms. When it expires, how many requests hit the database without single flight? (About 100: everything arriving during the 50 ms load. With single flight: 1.)

## Measuring a cache

Hit rate is the headline number, but latency at p99 and database load are what matter. A 90% hit rate means the database sees 10% of reads; going to 99% cuts that by another 10×.

## In a design interview

Say what you cache, where, the key format, the TTL and why, the invalidation rule, and what happens on a stampede. That's a complete answer in under a minute.
