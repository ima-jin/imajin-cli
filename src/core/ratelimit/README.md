# Rate Limiting & API Management

This module provides comprehensive rate limiting and API management capabilities for the imajin-cli framework, ensuring reliable operation across all integrated services.

## Architecture Overview

The rate limiting system consists of three main components:

1. **RateLimiter** - Core rate limiting coordination
2. **CircuitBreaker** - Fault tolerance and resilience
3. **ApiManager** - Connection pooling and request management

## Components

### RateLimiter

Central coordinator for rate limiting across multiple services with pluggable strategies.

```typescript
import { RateLimiter } from './RateLimiter';

const rateLimiter = new RateLimiter();

// Configure rate limiting for a service
rateLimiter.configure({
  serviceId: 'stripe',
  strategy: 'token-bucket',
  limit: 100,
  window: 1000,
  burst: 120,
  enabled: true
});

// Check if request can be made
if (rateLimiter.canMakeRequest('stripe')) {
  // Make request
  rateLimiter.recordRequest('stripe');
}
```

### Rate Limiting Strategies

#### Token Bucket Strategy
- Allows burst requests up to bucket capacity
- Tokens refill over time at a configured rate
- Best for APIs that allow occasional bursts

```typescript
import { TokenBucketStrategy } from './strategies/TokenBucketStrategy';

const strategy = new TokenBucketStrategy(100, 1000, 120);
// 100 requests per second, with burst capacity of 120
```

#### Sliding Window Strategy
- Tracks all requests within a rolling time window
- Precise request counting with automatic cleanup
- Best for strict rate limiting requirements

```typescript
import { SlidingWindowStrategy } from './strategies/SlidingWindowStrategy';

const strategy = new SlidingWindowStrategy(10, 1000);
// 10 requests per sliding 1-second window
```

#### Fixed Window Strategy
- Resets request counts at fixed time intervals
- Efficient memory usage for high-volume APIs
- Best for APIs with reset-based rate limits

```typescript
import { FixedWindowStrategy } from './strategies/FixedWindowStrategy';

const strategy = new FixedWindowStrategy(5000, 3600000);
// 5000 requests per hour (fixed windows)
```

### CircuitBreaker

Implements the circuit breaker pattern for API resilience and fault tolerance.

```typescript
import { CircuitBreaker } from '../api/CircuitBreaker';

const circuitBreaker = new CircuitBreaker();

// Configure circuit breaker
circuitBreaker.configure({
  serviceId: 'external-api',
  failureThreshold: 5,
  recoveryTimeout: 30000,
  successThreshold: 3,
  monitoringWindow: 60000,
  enabled: true
});

// Execute request with circuit breaker protection
const result = await circuitBreaker.execute(
  'external-api',
  async () => {
    return await fetch('/api/data');
  },
  async (error) => {
    // Fallback function
    return { fallback: true, error: error.message };
  }
);
```

### ApiManager

Comprehensive API management with connection pooling, rate limiting integration, and health monitoring.

```typescript
import { ApiManager } from '../api/ApiManager';

const apiManager = new ApiManager(rateLimiter, circuitBreaker);

// Configure API service
apiManager.configureService({
  serviceId: 'my-api',
  baseURL: 'https://api.example.com',
  timeout: 30000,
  maxConcurrent: 10,
  headers: {
    'Authorization': 'Bearer token'
  }
});

// Make requests
const response = await apiManager.request({
  serviceId: 'my-api',
  method: 'GET',
  url: '/data',
  priority: 'high'
});
```

## Integration

### Service Provider

The `RateLimitingServiceProvider` handles automatic registration and configuration:

```typescript
import { RateLimitingServiceProvider } from '../../providers/RateLimitingServiceProvider';

// Automatically configures:
// - Default rate limits for common services (Stripe, Notion, GitHub)
// - Circuit breaker configurations
// - Fallback strategies
// - Graceful shutdown handling
```

### Default Configurations

Pre-configured rate limits for popular services:

- **Stripe**: 100 req/sec with 120 burst (token bucket)
- **Notion**: 3 req/sec (sliding window)
- **GitHub**: 5000 req/hour (fixed window)
- **Default**: 10 req/sec (sliding window)

### Event System

All components emit events for monitoring and debugging:

```typescript
// Rate limiter events
rateLimiter.on('rate-limit-exceeded', (violation) => {
  console.log(`Rate limit exceeded for ${violation.serviceId}`);
});

// Circuit breaker events
circuitBreaker.on('circuit-opened', (serviceId, stats) => {
  console.log(`Circuit opened for ${serviceId}`);
});

// API manager events
apiManager.on('request-completed', (serviceId, requestId, duration) => {
  console.log(`Request ${requestId} completed in ${duration}ms`);
});
```

## Features

### Rate Limiting
- ✅ Multiple strategies (token bucket, sliding window, fixed window)
- ✅ Per-service configuration
- ✅ Violation tracking and reporting
- ✅ Automatic cleanup of old records
- ✅ Real-time status monitoring

### Circuit Breaker
- ✅ Automatic failure detection
- ✅ Configurable thresholds and timeouts
- ✅ Half-open state for recovery testing
- ✅ Fallback function support
- ✅ Comprehensive statistics

### API Management
- ✅ Connection pooling and reuse
- ✅ Request queuing and prioritization
- ✅ Health check monitoring
- ✅ Graceful shutdown handling
- ✅ Performance metrics collection

### Enterprise Patterns
- ✅ Graceful degradation
- ✅ Automatic recovery
- ✅ Performance optimization
- ✅ Monitoring and observability
- ✅ Configuration-driven behavior

## Usage Examples

### Basic Rate Limiting

```typescript
const rateLimiter = container.resolve<RateLimiter>('RateLimiter');

// Configure custom rate limit
rateLimiter.configure({
  serviceId: 'my-service',
  strategy: 'sliding-window',
  limit: 50,
  window: 60000, // 1 minute
  enabled: true
});

// Use in API calls
if (rateLimiter.canMakeRequest('my-service')) {
  const response = await makeApiCall();
  rateLimiter.recordRequest('my-service');
} else {
  const waitTime = rateLimiter.getWaitTime('my-service');
  console.log(`Rate limited. Wait ${waitTime}ms`);
}
```

### Circuit Breaker with Fallback

```typescript
const circuitBreaker = container.resolve<CircuitBreaker>('CircuitBreaker');

// Set up fallback for critical service
circuitBreaker.setFallback('payment-service', async (error) => {
  // Queue payment for later processing
  await queuePayment(paymentData);
  return { queued: true, message: 'Payment queued for processing' };
});

// Execute payment with protection
const result = await circuitBreaker.execute(
  'payment-service',
  () => processPayment(paymentData)
);
```

### Health Monitoring

```typescript
const apiManager = container.resolve<ApiManager>('ApiManager');

// Check service health
const health = await apiManager.healthCheck('payment-service');
if (!health.healthy) {
  console.error(`Service unhealthy: ${health.error}`);
}

// Get connection statistics
const stats = apiManager.getPoolStats('payment-service');
console.log(`Active connections: ${stats.active}/${stats.total}`);
```

## Best Practices

1. **Configure appropriate rate limits** based on service documentation
2. **Use circuit breakers** for external service dependencies
3. **Implement meaningful fallbacks** for critical operations
4. **Monitor rate limit violations** and adjust limits accordingly
5. **Use connection pooling** for better performance
6. **Set up health checks** for proactive monitoring

## Error Handling

The system provides structured error handling with recovery suggestions:

```typescript
try {
  const result = await apiManager.request(options);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
    const waitTime = rateLimiter.getWaitTime(serviceId);
    await delay(waitTime);
    // Retry request
  } else if (error.message.includes('circuit breaker')) {
    // Handle circuit breaker
    // Use fallback or queue operation
  }
}
```

This system ensures reliable API operations across all service integrations while maintaining enterprise-grade performance and resilience. 