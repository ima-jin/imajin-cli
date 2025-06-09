# Error Handling System Examples

## Overview

The imajin-cli error handling system provides comprehensive error management with automatic recovery, user-friendly messages, and LLM-compatible structured output.

## Exception Hierarchy

### BaseException
All exceptions inherit from `BaseException` which provides:
- Structured error information
- Recovery strategies
- User-friendly messages
- LLM-compatible JSON output

### Specific Exception Types

#### ValidationError
For input validation failures:
```typescript
import { ValidationError } from '../exceptions';

// Missing required field
throw ValidationError.missingRequired('email');

// Invalid value
throw ValidationError.invalidValue('status', 'invalid', ['active', 'inactive']);

// Type mismatch
throw ValidationError.typeMismatch('age', 'not-a-number', 'number');

// From Zod validation
try {
  schema.parse(data);
} catch (zodError) {
  throw ValidationError.fromZodError(zodError);
}
```

#### ApiError
For external API failures:
```typescript
import { ApiError } from '../exceptions';

// From HTTP response
const apiError = ApiError.fromResponse(response, '/api/users', 'POST');

// Network error
const networkError = ApiError.networkError('/api/users', 'GET', originalError);

// Timeout
const timeoutError = ApiError.timeout('/api/users', 'GET', 5000);
```

#### AuthenticationError
For authentication and authorization failures:
```typescript
import { AuthenticationError } from '../exceptions';

// Missing credentials
throw AuthenticationError.missingCredentials('stripe');

// Invalid credentials
throw AuthenticationError.invalidCredentials('github');

// Expired token
throw AuthenticationError.expiredToken('oauth', new Date());

// Insufficient permissions
throw AuthenticationError.insufficientPermissions(
  ['admin', 'write'], 
  ['read'], 
  'github'
);
```

#### SystemError
For system-level failures:
```typescript
import { SystemError } from '../exceptions';

// File not found
throw SystemError.fileNotFound('/path/to/file');

// Permission denied
throw SystemError.permissionDenied('/protected/resource');

// Disk space
throw SystemError.diskSpace(1000, 500); // need 1000MB, have 500MB

// Memory limit
throw SystemError.memoryLimit(2048, 1024); // using 2048MB, limit 1024MB

// Process error
throw SystemError.processError(1234, 1); // PID 1234, exit code 1
```

## Error Handler Usage

### Basic Error Handling
```typescript
import { ErrorHandler } from '../core/ErrorHandler';
import { ValidationError } from '../exceptions';

const errorHandler = new ErrorHandler({
  enableConsoleOutput: true,
  enableLogging: true,
  jsonOutput: false,
  verbose: false
});

try {
  // Some operation that might fail
  validateUserInput(data);
} catch (error) {
  const report = await errorHandler.handleError(error, {
    command: 'user:create',
    args: [data],
    originalOperation: () => validateUserInput(data)
  });
  
  if (!report.handled) {
    console.log('Error could not be handled');
  }
}
```

### Error Recovery
```typescript
import { ErrorRecovery } from '../core/ErrorRecovery';

const errorRecovery = new ErrorRecovery();

const context = ErrorRecovery.createContext(
  // Original operation
  async () => await apiCall(),
  // Fallback operation
  async () => await fallbackApiCall(),
  // User data
  { userId: '123' }
);

const result = await errorRecovery.attemptRecovery(error, context);

if (result.success) {
  console.log(`Recovery successful: ${result.message}`);
} else {
  console.log(`Recovery failed: ${result.message}`);
}
```

## LLM Integration

### JSON Output Mode
```typescript
const errorHandler = new ErrorHandler({
  jsonOutput: true,
  enableConsoleOutput: false
});

// Error output will be structured JSON
{
  "name": "ValidationError",
  "message": "Invalid value for 'status'",
  "code": "VALIDATION_ERROR",
  "severity": "medium",
  "category": "validation",
  "recoverable": false,
  "userMessage": "Invalid value for 'status' (expected string). Allowed values: active, inactive",
  "technicalDetails": {
    "validationDetails": [
      {
        "field": "status",
        "value": 123,
        "expectedType": "string",
        "allowedValues": ["active", "inactive"],
        "constraints": ["Must be one of: active, inactive"]
      }
    ]
  },
  "recoveryStrategy": {
    "type": "manual",
    "manualSteps": ["Set 'status' to one of: active, inactive"]
  }
}
```

### Error Introspection
```typescript
import { ExceptionUtils } from '../exceptions';

// Check if error is recoverable
const recoverableErrors = ExceptionUtils.getRecoverable(errors);

// Group errors by category
const groupedErrors = ExceptionUtils.groupByCategory(errors);

// Filter by severity
const criticalErrors = ExceptionUtils.filterBySeverity(errors, 'critical');

// Convert to JSON for LLM
const jsonErrors = ExceptionUtils.toJsonArray(errors);
```

## Command Integration

### Command Error Handling
```typescript
import { Command } from 'commander';
import { ErrorHandler } from '../core/ErrorHandler';

const command = new Command('user:create')
  .argument('<email>', 'User email')
  .option('--name <name>', 'User name')
  .action(async (email, options) => {
    const errorHandler = container.resolve<ErrorHandler>('errorHandler');
    
    try {
      await createUser(email, options.name);
      console.log('✅ User created successfully');
    } catch (error) {
      await errorHandler.handleError(error, {
        command: 'user:create',
        args: [email],
        options,
        originalOperation: () => createUser(email, options.name)
      });
    }
  });
```

### Automatic Recovery Example
```typescript
// API call with automatic retry on failure
async function makeApiCall(endpoint: string, data: any) {
  const errorHandler = container.resolve<ErrorHandler>('errorHandler');
  
  try {
    return await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (error) {
    const apiError = ApiError.networkError(endpoint, 'POST', error);
    
    const report = await errorHandler.handleError(apiError, {
      originalOperation: () => makeApiCall(endpoint, data)
    });
    
    if (report.recoveryAttempted && !report.error.recoverable) {
      throw report.error;
    }
  }
}
```

## Best Practices

### 1. Use Specific Exception Types
```typescript
// ❌ Generic error
throw new Error('Something went wrong');

// ✅ Specific exception with context
throw ValidationError.missingRequired('email', { 
  command: 'user:create',
  userId: '123' 
});
```

### 2. Provide Recovery Context
```typescript
// ❌ No recovery context
await errorHandler.handleError(error);

// ✅ With recovery context
await errorHandler.handleError(error, {
  originalOperation: () => retryableOperation(),
  fallbackOperation: () => fallbackOperation(),
  command: 'current-command',
  args: commandArgs
});
```

### 3. Handle Different Error Categories
```typescript
if (error instanceof ValidationError) {
  // Show validation errors to user immediately
  console.error(error.getFormattedError());
} else if (error instanceof ApiError) {
  // API errors might be retryable
  const result = await errorRecovery.attemptRecovery(error, context);
} else if (error instanceof AuthenticationError) {
  // Auth errors need user intervention
  console.log('Please login again');
}
```

### 4. Use Error History for Debugging
```typescript
const errorHandler = container.resolve<ErrorHandler>('errorHandler');

// Get recent errors
const recentErrors = errorHandler.getRecentErrors(5);

// Get all error history
const allErrors = errorHandler.getErrorHistory();

// Clear history
errorHandler.clearHistory();
```

This error handling system provides enterprise-grade error management while maintaining perfect compatibility with LLM orchestration through structured JSON output and comprehensive error context. 