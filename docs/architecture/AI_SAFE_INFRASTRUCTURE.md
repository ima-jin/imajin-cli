# AI-Safe Infrastructure: Why EventManager is Complex

**Last Updated:** 2025-11-21
**Status:** Core Architecture Document
**Audience:** Developers, AI Agents, Architects

---

## Overview

imajin-cli generates professional CLIs that will be used by **AI agents** to interact with **distributed networks** of AI-powered LED devices (imajin-os). This creates unique requirements:

1. **AI agents can't be trusted to remember multi-step workflows**
2. **Distributed systems require consistency guarantees**
3. **Network failures must be handled automatically**
4. **Side effects must trigger declaratively, not imperatively**

Our EventManager architecture provides **guard rails** that prevent AI agents from leaving systems in inconsistent states.

---

## The Problem: AI Agents Using CLIs

### Without Robust Infrastructure (Fragile)

```bash
# AI agent wants to share an album with the network
# Needs to remember and execute 7 separate steps:

ai-agent: device-cli content share --album sunset-patterns
ai-agent: device-cli transcode --album sunset-patterns          # ← Might forget
ai-agent: device-cli sync-peers --album sunset-patterns         # ← Might forget
ai-agent: device-cli notify-subscribers --album sunset-patterns # ← Might forget
ai-agent: device-cli update-cache --album sunset-patterns       # ← Might forget
ai-agent: device-cli audit-log --action share                   # ← Might forget

# If AI forgets ANY step:
→ System state becomes inconsistent
→ Peer devices never receive content
→ Subscribers aren't notified
→ Cache is stale
→ No audit trail
→ 💥 Silent failure, hard to debug
```

**Failure modes:**
- AI forgets steps (high probability)
- AI executes steps in wrong order (race conditions)
- Network failure mid-sequence (partial state)
- AI doesn't handle errors properly (no retry logic)

### With EventManager Infrastructure (Robust)

```bash
# AI agent runs ONE command:
ai-agent: device-cli content share --album sunset-patterns

# Behind the scenes (automatic, AI-agnostic):
→ Command executes
→ EventManager.emit('content.shared', data)
  → ContentGroomer.onContentShared()      // Transcodes automatically
  → PeerSyncService.onContentShared()     // Syncs with DLQ for offline peers
  → NotificationService.onContentShared() // Notifies automatically
  → CacheManager.onContentShared()        // Updates automatically
  → AuditLogger.onContentShared()         // Logs automatically

# Result: Consistent state guaranteed, AI can't forget steps
```

**Success properties:**
- ✅ AI declares intent ("share this album")
- ✅ Infrastructure ensures all side effects execute
- ✅ Network failures handled via Dead Letter Queue
- ✅ Order guaranteed via event processing pipeline
- ✅ Failures logged and retried automatically

### Real-Time Observability: AI Can See Everything As It Happens

**This is crucial:** The EventManager doesn't just execute operations silently. It **emits progress events in real-time** so the AI can monitor the entire distributed operation **from one place**.

```bash
# AI runs command and watches event stream:
ai-agent: device-cli content share --album sunset-patterns --watch

# Real-time event stream (visible to AI):
[00:00.100] EVENT: command.started { command: "content.share", album: "sunset-patterns" }
[00:00.250] EVENT: content.shared { album: "sunset-patterns", size: "2.4GB", patterns: 127 }
[00:00.300] EVENT: progress.updated { step: "ContentGroomer.transcoding", percent: 0 }
[00:02.450] EVENT: progress.updated { step: "ContentGroomer.transcoding", percent: 50 }
[00:04.890] EVENT: progress.updated { step: "ContentGroomer.transcoding", percent: 100 }
[00:05.100] EVENT: content.groomed { album: "sunset-patterns", format: "optimized" }
[00:05.250] EVENT: progress.updated { step: "PeerSync.syncing", percent: 0, peers: 5 }
[00:06.100] EVENT: peer.sync.success { peerId: "device-002", album: "sunset-patterns" }
[00:07.200] EVENT: peer.sync.success { peerId: "device-003", album: "sunset-patterns" }
[00:08.100] EVENT: error.occurred {
    step: "PeerSync",
    peerId: "device-001",
    error: "Network timeout",
    severity: "medium",
    recovery: "queued in DLQ, will retry"
}
[00:08.150] EVENT: dlq.queued { peerId: "device-001", retryAfter: "30s" }
[00:09.300] EVENT: peer.sync.success { peerId: "device-004", album: "sunset-patterns" }
[00:09.800] EVENT: peer.sync.success { peerId: "device-005", album: "sunset-patterns" }
[00:10.100] EVENT: notification.sent { subscribers: 12, album: "sunset-patterns" }
[00:10.200] EVENT: cache.updated { album: "sunset-patterns" }
[00:10.250] EVENT: audit.logged { action: "content.shared", user: "user-123" }
[00:10.300] EVENT: command.completed {
    duration: "10.2s",
    success: true,
    peers_synced: "4/5 (1 in DLQ)"
}
```

**Why This Matters for AI Agents:**

1. **Immediate Failure Detection**
   - AI sees `error.occurred` event within milliseconds
   - No need to poll multiple services or check logs
   - Structured error data with recovery instructions

2. **Progress Tracking**
   - AI knows exactly where in the workflow we are
   - Can estimate time remaining
   - Can cancel if needed

3. **Single Source of Truth**
   - All distributed operations visible in ONE event stream
   - Not scattered across multiple services/logs
   - AI doesn't need to correlate data from different systems

4. **Actionable Context**
   - Events include `severity` (can AI ignore this?)
   - Events include `recovery` strategy (what's being done?)
   - Events include specific identifiers (which peer failed?)

5. **Chain Visibility**
   - AI sees the ENTIRE cascade of operations
   - Understands dependencies (transcode → sync → notify)
   - Can reason about what failed and why

**Traditional Approach (Opaque):**
```bash
ai-agent: multi-service-cli share --album sunset
# ... silence ...
# ... 30 seconds later ...
# ... did it work? Let me check...
ai-agent: multi-service-cli check-status --album sunset
# ... have to query each service separately ...
ai-agent: service-a-cli get-status --album sunset  # transcoding done?
ai-agent: service-b-cli get-status --album sunset  # sync done?
ai-agent: service-c-cli get-status --album sunset  # notifications sent?
# ... error buried in service-b logs, AI has no idea ...
```

**imajin-cli Approach (Transparent):**
```bash
ai-agent: device-cli content share --album sunset --watch
# ... sees everything in real-time ...
# ... error surfaces immediately with context ...
# ... AI can take action right away ...
```

**This is a core differentiator:** Other CLIs obfuscate distributed operations across multiple systems. imajin-cli **exposes the entire distributed workflow** in a single, AI-readable event stream.

---

## Architecture Components

### 1. EventManager (src/core/events/EventManager.ts)

**Purpose:** Central nervous system for distributed operations

**Key Features:**
- **Event Pipeline:** All events flow through middleware
- **Subscriber Pattern:** Services subscribe to events declaratively
- **Dead Letter Queue:** Failed events are queued for retry
- **Priority System:** Critical events preempt normal operations
- **Metrics:** Network health monitoring

**Why It's Complex:**
```typescript
// Simple EventEmitter (fragile):
events.emit('content.shared', data);
// → AI needs to manually call dependent services
// → No failure handling
// → No retry logic
// → No prioritization

// EventManager (robust):
await eventManager.emit('content.shared', data);
// → All subscribers fire automatically
// → Failures go to DLQ
// → Retries handled automatically
// → Priority respected
// → Metrics tracked
```

### 2. IEventSubscriber Pattern

**Purpose:** Declarative multi-event handling

**Example - Content Grooming Service:**
```typescript
/**
 * ContentGroomer passively curates content for users.
 * AI agents never call this directly - it reacts to events automatically.
 *
 * @see docs/architecture/AI_SAFE_INFRASTRUCTURE.md
 */
class ContentGroomer implements IEventSubscriber {
  getSubscribedEvents() {
    return {
      'content.shared': 'onContentShared',
      'content.deleted': 'onContentDeleted',
      'device.offline': 'onDeviceOffline',
      'user.preferences.changed': 'onPreferencesChanged'
    };
  }

  // These methods fire AUTOMATICALLY when events occur
  // AI agent never needs to know they exist

  async onContentShared(event: IEvent) {
    // Pull content and cache locally
    await this.jobQueue.add('transcode', event.payload);
    await this.jobQueue.add('sync-to-peers', event.payload);
  }

  async onContentDeleted(event: IEvent) {
    // Remove from cache
    await this.cache.invalidate(event.payload.contentId);
  }

  async onDeviceOffline(event: IEvent) {
    // Pause sync jobs for this device
    await this.jobQueue.pause(`device:${event.payload.deviceId}`);
  }

  async onPreferencesChanged(event: IEvent) {
    // Re-prioritize content grooming
    await this.reprioritizeQueue(event.payload.userId);
  }
}
```

**Benefits:**
- ✅ Services self-register for events they care about
- ✅ AI agents don't need to know about these services
- ✅ Adding new services doesn't change AI behavior
- ✅ Decoupled, testable, maintainable

### 3. Dead Letter Queue

**Purpose:** Network failures don't cause data loss

**Scenario - Peer Device Offline:**
```typescript
// AI shares album with network
await cli.execute('content share --album X');

// Behind the scenes:
await eventManager.emit('content.shared', {
  album: 'X',
  targetDevices: ['device-1', 'device-2', 'device-3']
});

// PeerSyncService tries to sync:
async onContentShared(event: IEvent) {
  for (const deviceId of event.payload.targetDevices) {
    try {
      await this.syncToDevice(deviceId, event.payload.album);
    } catch (error) {
      if (error.code === 'DEVICE_OFFLINE') {
        // Event goes to Dead Letter Queue automatically
        // Will retry when device comes back online
        // AI doesn't need to handle this
      }
    }
  }
}

// Later, when device comes back online:
const dlq = eventManager.getDeadLetterQueue();
for (const failedEvent of dlq) {
  await eventManager.emitEvent(failedEvent); // Automatic retry
}
```

**Without DLQ:**
- AI needs to detect failures manually
- AI needs to implement retry logic
- AI needs to track pending operations
- High probability of data loss

### 4. Middleware Pipeline

**Purpose:** Cross-cutting concerns handled automatically

**Example - Device Authentication:**
```typescript
// Middleware validates ALL device-to-device events
eventManager.use(async (event: IEvent, next: () => Promise<void>) => {
  // Authenticate device-to-device communication
  if (event.type.startsWith('device.')) {
    const isValid = await verifyDeviceSignature(
      event.payload,
      event.metadata.source
    );

    if (!isValid) {
      throw new AuthenticationError('Invalid device signature');
    }
  }

  await next();
});

// AI agent just runs command - auth happens automatically:
await cli.execute('device message --to device-2 --text "Hello"');
// → Auth middleware validates signature before event fires
// → AI gets clear error if auth fails
// → AI doesn't need to implement crypto verification
```

**Other Middleware Use Cases:**
- Rate limiting (prevent spam)
- Content filtering (enforce policies)
- Audit logging (all events logged)
- Performance monitoring (track event latency)

### 5. Event Priority System

**Purpose:** Critical operations preempt normal ones

**Scenario - Firmware Update During Content Sync:**
```typescript
// Background: ContentGroomer is syncing large album (10 minutes remaining)

// Critical firmware update arrives:
await eventManager.emit('firmware.update', {
  version: '2.1.0',
  critical: true,
  securityPatch: true
}, {
  priority: EventPriority.CRITICAL  // ← Preempts normal operations
});

// EventManager automatically:
// 1. Pauses content sync jobs
// 2. Processes firmware update immediately
// 3. Resumes content sync after update completes

// AI agent doesn't need to:
// - Detect ongoing operations
// - Pause them manually
// - Resume them after
// - Handle priority conflicts
```

---

## Distributed Systems Context

### The imajin-os Ecosystem

**Physical Reality:**
- Units are volumetric LED displays (512+ LEDs per device)
- Devices form peer-to-peer networks
- Content shared between devices (albums, patterns, configurations)
- Devices "passively groom" content for their users

**Network Topology:**
```
Device 1 (Toronto)  ←→  Device 2 (Vancouver)
        ↓                      ↓
Device 3 (Montreal) ←→  Device 4 (Seattle)
        ↓                      ↓
    (Mesh network with optical verification)
```

**Operations That Need Robust Events:**
1. **Content sharing** - Albums, patterns, files
2. **Configuration sync** - Settings, preferences
3. **Firmware updates** - Critical security patches
4. **Network coordination** - Device discovery, trust establishment
5. **Passive grooming** - Background content curation
6. **Job distribution** - Distributed task processing

### Why Simple EventEmitter Breaks Down

**Problem 1: Network Partitions**
```typescript
// Simple EventEmitter:
events.emit('content.shared', data);
// → If device is offline, event is lost forever
// → No way to retry
// → Data consistency broken

// EventManager with DLQ:
await eventManager.emit('content.shared', data);
// → Failed events queued automatically
// → Retried when device reconnects
// → Consistency guaranteed
```

**Problem 2: Multi-Step Coordination**
```typescript
// Simple EventEmitter (fragile):
events.emit('album.shared', data);
// → Need to manually call:
//   - transcodeService.process(data)
//   - peerSyncService.sync(data)
//   - notificationService.notify(data)
//   - auditLogger.log(data)
// → If any step fails, partial state
// → AI needs to handle errors for each

// EventManager (robust):
await eventManager.emit('album.shared', data);
// → All subscribers fire automatically
// → Failures isolated (one service failing doesn't break others)
// → Retries handled automatically
// → AI just checks final result
```

**Problem 3: Priority Inversion**
```typescript
// Simple EventEmitter:
events.emit('firmware.update', urgentData);
events.emit('content.sync', normalData);
// → Processed in order emitted
// → Firmware update might wait behind slow content sync
// → Security vulnerability

// EventManager with Priority:
await eventManager.emit('firmware.update', urgentData, {
  priority: EventPriority.CRITICAL
});
await eventManager.emit('content.sync', normalData, {
  priority: EventPriority.NORMAL
});
// → Firmware update preempts content sync
// → Security patches applied immediately
```

---

## AI Agent Interaction Patterns

### Pattern 1: Declarative Commands

**AI Agent Behavior:**
```typescript
// AI declares intent (what), not implementation (how)
await cli.execute('content share --album sunset-patterns');
```

**Infrastructure Handles:**
```typescript
class ContentShareCommand extends BaseCommand {
  async execute(options: any) {
    // 1. Validate input
    const album = await this.validateAlbum(options.album);

    // 2. Emit event (declarative)
    await this.eventManager.emit('content.shared', {
      album: album.id,
      source: this.deviceId,
      timestamp: Date.now()
    });

    // 3. Return to AI (simple result)
    return {
      success: true,
      message: 'Album shared with network',
      jobId: 'sync-123' // AI can check job status if needed
    };
  }
}
```

**Subscribers React Automatically:**
- ContentGroomer → transcodes patterns
- PeerSyncService → queues sync jobs
- NotificationService → alerts subscribers
- AuditLogger → logs action
- CacheManager → updates cache

**AI receives simple result, infrastructure guarantees consistency.**

### Pattern 2: Long-Running Operations

**AI Agent Behavior:**
```typescript
// AI starts operation, doesn't wait
const result = await cli.execute('firmware update --version 2.1.0');
console.log(result.jobId); // "firmware-update-456"

// Later, AI checks status
const status = await cli.execute('job status --id firmware-update-456');
console.log(status.progress); // "75% complete"
```

**Infrastructure Handles:**
```typescript
class FirmwareUpdateCommand extends BaseCommand {
  async execute(options: any) {
    // Create job
    const jobId = await this.jobQueue.add('firmware-update', {
      version: options.version,
      priority: 'critical'
    });

    // Emit event for monitoring
    await this.eventManager.emit('firmware.update.started', {
      jobId,
      version: options.version
    });

    // Return immediately (AI doesn't block)
    return {
      success: true,
      jobId,
      message: 'Firmware update queued'
    };
  }
}

// Job processor emits progress events automatically
class FirmwareUpdateProcessor {
  async process(job: Job) {
    await this.eventManager.emit('firmware.update.progress', {
      jobId: job.id,
      progress: 25
    });

    await this.downloadFirmware();

    await this.eventManager.emit('firmware.update.progress', {
      jobId: job.id,
      progress: 50
    });

    await this.flashDevice();

    await this.eventManager.emit('firmware.update.completed', {
      jobId: job.id,
      progress: 100
    });
  }
}
```

**Benefits:**
- ✅ AI doesn't block on long operations
- ✅ Progress tracked automatically
- ✅ Failures handled with retry logic
- ✅ AI gets clear status updates

### Pattern 3: Error Handling

**AI Agent Behavior:**
```typescript
try {
  await cli.execute('content share --album invalid-id');
} catch (error) {
  // Error is structured and clear
  console.error(error.code);        // "ALBUM_NOT_FOUND"
  console.error(error.message);     // "Album 'invalid-id' does not exist"
  console.error(error.recoverable); // true
  console.error(error.suggestion);  // "Run 'content list' to see available albums"
}
```

**Infrastructure Provides:**
```typescript
// Structured exceptions (src/exceptions/)
throw new ValidationError('Album not found', {
  code: 'ALBUM_NOT_FOUND',
  albumId: options.album,
  recoverable: true,
  suggestions: [
    "Run 'content list' to see available albums",
    "Check album ID for typos"
  ]
});
```

**Benefits:**
- ✅ AI gets machine-readable error codes
- ✅ Clear recovery suggestions
- ✅ Knows if operation can be retried
- ✅ Can log structured error data

---

## Testing Strategy

### Focus: AI-Safety Properties

**Test AI-safety, not implementation details:**

```typescript
describe('EventManager - AI Safety Properties', () => {
  describe('Automatic Side Effects', () => {
    it('should trigger all subscribers when AI runs one command', async () => {
      // Setup: Register subscribers
      const groomer = jest.fn();
      const syncer = jest.fn();
      const logger = jest.fn();

      eventManager.registerListener({ eventType: 'content.shared', handle: groomer });
      eventManager.registerListener({ eventType: 'content.shared', handle: syncer });
      eventManager.registerListener({ eventType: 'content.shared', handle: logger });

      // AI runs ONE command
      await cli.execute('content share --album X');

      // Assert: All subscribers fired automatically
      expect(groomer).toHaveBeenCalled();
      expect(syncer).toHaveBeenCalled();
      expect(logger).toHaveBeenCalled();
    });
  });

  describe('Network Failure Resilience', () => {
    it('should queue failed events for retry without AI intervention', async () => {
      // Setup: Peer device is offline
      mockPeerDevice.status = 'offline';

      // AI shares content
      await cli.execute('content share --album X');

      // Assert: Event queued in DLQ (didn't fail)
      const dlq = eventManager.getDeadLetterQueue();
      expect(dlq).toContainEqual(expect.objectContaining({
        type: 'content.shared',
        payload: { album: 'X' }
      }));

      // Later: Device comes back online
      mockPeerDevice.status = 'online';
      await eventManager.retryDeadLetterQueue();

      // Assert: Event delivered successfully
      expect(mockPeerDevice.received).toContainEqual({ album: 'X' });
    });
  });

  describe('Priority Enforcement', () => {
    it('should preempt normal operations for critical events', async () => {
      const executionOrder: string[] = [];

      // Start slow content sync
      eventManager.registerListener({
        eventType: 'content.sync',
        handle: async () => {
          executionOrder.push('sync-start');
          await sleep(1000);
          executionOrder.push('sync-end');
        }
      });

      // Critical firmware update arrives
      eventManager.registerListener({
        eventType: 'firmware.update',
        handle: async () => {
          executionOrder.push('firmware');
        }
      });

      await eventManager.emit('content.sync', {}, { priority: EventPriority.NORMAL });
      await sleep(100);
      await eventManager.emit('firmware.update', {}, { priority: EventPriority.CRITICAL });

      await sleep(1500);

      // Assert: Firmware preempted sync
      expect(executionOrder).toEqual(['sync-start', 'firmware', 'sync-end']);
    });
  });
});
```

---

## Implementation Checklist

When implementing new commands in generated CLIs:

- [ ] **Emit events for side effects** (don't call services directly)
- [ ] **Use IEventSubscriber for multi-event handlers** (not manual registration)
- [ ] **Set priority for critical operations** (firmware, security, etc.)
- [ ] **Return simple results to AI** (let infrastructure handle complexity)
- [ ] **Use structured exceptions** (machine-readable error codes)
- [ ] **Document which events are emitted** (for other subscribers)

---

## Related Documentation

- **EventManager API:** [src/core/events/EventManager.ts](../../src/core/events/EventManager.ts)
- **IEventSubscriber Pattern:** [src/core/events/Event.ts](../../src/core/events/Event.ts)
- **BaseCommand:** [src/core/commands/BaseCommand.ts](../../src/core/commands/BaseCommand.ts)
- **Exception System:** [src/exceptions/README.md](../../src/exceptions/README.md)
- **Job Queue System:** [src/jobs/README.md](../../src/jobs/README.md)

---

## FAQ

**Q: Why not use simple EventEmitter?**
A: Simple EventEmitter requires AI agents to manually coordinate multi-step operations, handle failures, and implement retry logic. This has high failure rate and leads to inconsistent state.

**Q: Is this over-engineered?**
A: For a standalone CLI, yes. For a distributed network of devices used by AI agents, no. The complexity prevents AI agents from leaving systems in inconsistent states.

**Q: What if I just need a simple command?**
A: You can still use simple commands. But when commands have side effects (sync, notify, log), emit events so infrastructure handles them consistently.

**Q: How do I add a new event subscriber?**
A: Implement `IEventSubscriber`, define event mappings in `getSubscribedEvents()`, register with EventManager. New subscribers don't require changes to AI agent code.

**Q: What goes in the Dead Letter Queue?**
A: Failed events that should be retried (network failures, offline devices, rate limits). Not validation errors or permanent failures.

**Q: How do I test event-driven code?**
A: Focus on AI-safety properties: Does one command trigger all necessary side effects? Do failures queue for retry? Are priorities respected?

---

**Last Updated:** 2025-11-21
**Maintainer:** imajin-cli team
**Questions:** See [docs/architecture/](../architecture/) for related documentation
