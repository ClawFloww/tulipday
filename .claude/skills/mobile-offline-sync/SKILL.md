---
name: mobile-offline-sync
description: Use this skill when implementing offline-first behavior in a Capacitor or hybrid mobile app, especially with Supabase or Firebase backends. Covers caching strategies (cache-first, network-first, stale-while-revalidate), IndexedDB and Capacitor Preferences/Filesystem for local persistence, conflict resolution for sync, queueing mutations while offline, optimistic UI updates, and detecting connectivity state. Trigger whenever the user mentions offline support, sync, caching, "works without internet", spotty connection handling, or building an app for users in areas with unreliable network.
---

# Mobile Offline-First Sync

Tourist apps, field apps, and apps for remote areas (Bollenstreek included — coverage drops in the fields between villages) need to work offline. The pattern is "offline-first": the local cache is the source of truth for the UI, and the network is a synchronizer that runs when available.

## Architecture overview

```
User action
  ↓
Optimistic UI update (immediate)
  ↓
Write to local store (IndexedDB / Preferences)
  ↓
Add to sync queue
  ↓
[when online] Push to backend
  ↓
Reconcile response with local store
  ↓
Update UI if conflict
```

The UI should never wait for the network. Ever. If you're showing a spinner because of a fetch on the critical path, your offline story is broken.

## Choosing a local store

For Capacitor apps, you have three main options:

| Store | Best for | Limit | Speed |
|-------|----------|-------|-------|
| IndexedDB (via Dexie.js) | Structured data, queries, large datasets | ~50% of disk | Fast |
| @capacitor/preferences | Small key-value (settings, tokens) | ~1 MB | Fast |
| @capacitor/filesystem | Large blobs (images, video, JSON dumps) | Disk-limited | Variable |

For a tourist app with ~50 locations, 25+ attractions, 183 facts, and photo metadata: **IndexedDB via Dexie** is the right call. It's queryable, transactional, and handles 100MB+ comfortably.

## Dexie.js setup pattern

```typescript
// db.ts
import Dexie, { Table } from 'dexie';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  village: string;
  bloomStatus: string;
  lastSyncedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

interface PendingMutation {
  id?: number;
  table: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: number;
  retries: number;
}

class AppDB extends Dexie {
  locations!: Table<Location, string>;
  pendingMutations!: Table<PendingMutation, number>;

  constructor() {
    super('tulipday-db');
    this.version(1).stores({
      locations: 'id, village, bloomStatus, lastSyncedAt',
      pendingMutations: '++id, table, createdAt',
    });
  }
}

export const db = new AppDB();
```

Index the fields you query on (`village`, `bloomStatus`) — that's what the comma-separated list after the primary key does.

## Caching strategies

### Cache-first (for static-ish data)

For data that changes slowly — location lists, facts, attractions:

```typescript
async function getLocations(): Promise<Location[]> {
  // 1. Return cache immediately
  const cached = await db.locations.toArray();
  if (cached.length > 0) {
    // 2. Trigger background refresh, don't await
    refreshLocationsInBackground();
    return cached;
  }
  // 3. No cache, must wait for network
  return await fetchAndCacheLocations();
}
```

### Stale-while-revalidate (for moderately fresh data)

For data like bloom status that changes daily but isn't critical to be real-time:

```typescript
async function getBloomStatus(locationId: string) {
  const cached = await db.locations.get(locationId);
  const isStale = !cached || (Date.now() - cached.lastSyncedAt) > 6 * 60 * 60 * 1000; // 6h

  // Always return cached if exists
  if (cached) {
    if (isStale) refreshInBackground(locationId);
    return cached;
  }
  return await fetchAndCache(locationId);
}
```

### Network-first (for user-critical fresh data)

Rare in tourist apps. Reserve for things like checkout, real-time chat. Skip for TulipDay.

## Mutation queue pattern

When the user takes an action that should sync to the backend (favorite a location, leave a review, etc.):

```typescript
async function favoriteLocation(locationId: string) {
  // 1. Optimistic UI update via local store
  await db.locations.update(locationId, { isFavorite: true });

  // 2. Queue the mutation
  await db.pendingMutations.add({
    table: 'favorites',
    operation: 'create',
    payload: { locationId, userId: currentUserId },
    createdAt: Date.now(),
    retries: 0,
  });

  // 3. Try to sync now if online
  syncPendingMutations(); // fire and forget
}
```

The sync worker drains the queue:

```typescript
async function syncPendingMutations() {
  if (!navigator.onLine) return;

  const pending = await db.pendingMutations
    .orderBy('createdAt')
    .toArray();

  for (const mutation of pending) {
    try {
      await pushToBackend(mutation);
      await db.pendingMutations.delete(mutation.id!);
    } catch (err) {
      // Backoff: don't retry instantly
      await db.pendingMutations.update(mutation.id!, {
        retries: mutation.retries + 1,
      });
      if (mutation.retries > 5) {
        // Give up, surface to user
        notifyUserOfFailedSync(mutation);
      }
      break; // stop processing queue on first failure
    }
  }
}
```

## Detecting connectivity

`navigator.onLine` is unreliable — it only knows if there's a network interface, not if you can actually reach your backend. Use `@capacitor/network` plus a heartbeat:

```typescript
import { Network } from '@capacitor/network';

let isOnline = true;

Network.addListener('networkStatusChange', (status) => {
  isOnline = status.connected;
  if (status.connected) syncPendingMutations();
});

// Initial check
Network.getStatus().then(s => isOnline = s.connected);

// Reachability check (run before critical syncs)
async function canReachBackend(): Promise<boolean> {
  try {
    const res = await fetch('https://your-api.com/health', {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

## Conflict resolution

Three strategies, in increasing complexity:

### Last-write-wins (simplest)
Server timestamp wins. Fine for non-critical data (favorites, preferences). The user might lose a change made offline if someone else edited the same record online, but that's acceptable for most tourist app data.

### Field-level merge
When two changes touch different fields, merge them. Useful for profile data:
```typescript
const merged = { ...serverVersion, ...localVersion, updatedAt: Math.max(...) };
```

### CRDT / operational transform
Overkill for tourist apps. Skip unless building collaborative editing.

For TulipDay, **last-write-wins with optimistic merge for user preferences** is the right call.

## Supabase offline patterns

Supabase doesn't have built-in offline support like Firestore. You implement it yourself:

```typescript
// Wrap Supabase calls with cache layer
async function getLocationsSB() {
  if (!isOnline) return await db.locations.toArray();

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .gte('updated_at', lastSyncTimestamp);

  if (error) return await db.locations.toArray(); // fallback to cache

  // Upsert into local DB
  await db.locations.bulkPut(data.map(d => ({
    ...d,
    lastSyncedAt: Date.now(),
    syncStatus: 'synced',
  })));
  lastSyncTimestamp = Date.now();

  return await db.locations.toArray();
}
```

For real-time, Supabase Realtime works in WebView but needs the network. Subscribe when online, fall back to polling cache when offline.

## Firebase offline patterns

Firebase Firestore has built-in offline persistence — enable it once:

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
```

Then all reads/writes work offline automatically. This is genuinely magical and a strong reason to pick Firebase if offline is a hard requirement and you haven't committed yet. (Note: persistent cache uses IndexedDB under the hood and has size limits — about 40MB by default, configurable.)

## Image caching for offline

Photos are the biggest offline challenge. Strategy:

1. **Manifest of required images** — generate at build time or fetch on first launch
2. **Pre-cache critical images** — village hero shots, attraction primaries
3. **On-demand cache** — when user views a location, download and cache its photos
4. **Cache eviction** — LRU policy, cap at e.g. 200MB total

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

async function cacheImage(url: string): Promise<string> {
  const filename = sha256(url) + '.jpg';
  try {
    // Check if exists
    await Filesystem.stat({
      path: `images/${filename}`,
      directory: Directory.Cache,
    });
    return Capacitor.convertFileSrc(
      (await Filesystem.getUri({
        path: `images/${filename}`,
        directory: Directory.Cache,
      })).uri
    );
  } catch {
    // Download and cache
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: `images/${filename}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    return cacheImage(url); // recurse to return URI
  }
}
```

Use `Directory.Cache` not `Directory.Data` — the OS can clear cache when space is low without breaking your app.

## UI patterns for offline

- **Connectivity badge** in header — subtle, only shown when offline
- **Stale data indicator** — "Updated 2 hours ago" timestamp on cached views
- **Optimistic feedback** — immediate UI update, with a small icon if sync is pending
- **Retry UI** — for failed mutations, show clear retry button
- **No spinners on initial load** — show cached data or skeletons, never a blocking spinner

## Testing offline behavior

- iOS Simulator: Settings → Developer → Network Link Conditioner (or Hardware menu)
- Android Emulator: Extended controls → Cellular → set to "None"
- Real device: Airplane mode toggle, or set Wi-Fi to a network without internet

Test scenarios:
1. Cold start while offline (cache must serve UI)
2. Go offline mid-session (queue mutations)
3. Come back online (queue drains)
4. Backend rejects a queued mutation (conflict handling)
5. App killed during sync (resume on next launch)

## Checklist

- [ ] Local DB schema designed with sync metadata (`lastSyncedAt`, `syncStatus`)
- [ ] All reads check cache first
- [ ] All writes are optimistic + queued
- [ ] Network detection via `@capacitor/network`, not just `navigator.onLine`
- [ ] Sync worker with backoff and retry caps
- [ ] Conflict strategy decided per entity type
- [ ] Image caching with eviction policy
- [ ] Tested in airplane mode end-to-end
