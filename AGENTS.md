# BIP-321 Parser - Agent Development Guide

This document provides guidance for AI agents and developers working on the BIP-321 Bitcoin URI parser library.

## Project Overview

A TypeScript/JavaScript library for parsing BIP-321 Bitcoin URIs with support for multiple payment methods (on-chain, Lightning, BOLT12, Silent Payments). Works natively in Node.js, browsers, and React Native without build tools.

## Tech Stack

### Runtime
- **Bun** - Primary development runtime
- Use `bun test` instead of `jest` or `vitest`
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun install` for package management

### Key Dependencies

**Why These Specific Dependencies:**

1. **`@scure/base`** (^2.0.0)
   - Pure JavaScript base58, bech32, and bech32m encoding
   - Works natively in all environments (Node.js, browser, React Native)
   - No browserify or build tools needed
   - Used for Base58 address decoding and bech32/bech32m validation

2. **`@noble/hashes`** (^2.0.1)
   - Pure JavaScript cryptographic hashing (SHA-256)
   - Properly exports all modules (no import warnings)
   - Used for Base58Check checksum validation
   - Import path: `@noble/hashes/sha2.js` (with .js extension)

3. **`bitcoinjs-lib`** (^7.0.0)
   - Standard Bitcoin library for address validation
   - Note: Taproot addresses require manual bech32m validation (ECC lib not initialized)
   - Fallback to `@scure/base` for taproot validation

4. **`light-bolt11-decoder`** (^3.2.0)
   - Lightweight Lightning BOLT11 invoice parser
   - No heavy dependencies

### What We AVOID

- ❌ `bs58` - Requires browserify for browsers
- ❌ `bs58check` - Has module export warnings with `@noble/hashes`
- ❌ `express` or heavy server frameworks
- ❌ Build tools (webpack, browserify, rollup)

## Development Commands

```bash
# Run tests
bun test

# Run TypeScript type check
bun run check
# or
bunx tsc --noEmit

# Run examples
bun example.ts

# Run linter
bun run lint
```

## Project Structure

```
bip-321/
├── index.ts           # Main parser implementation
├── index.test.ts      # Comprehensive test suite (39 tests)
├── example.ts         # Usage examples
├── README.md          # User documentation
├── CLAUDE.md          # Bun-specific development rules
├── AGENTS.md          # This file
├── package.json       # Dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## Key Design Decisions

### 1. Network Detection Strategy

```typescript
// Order matters for Lightning invoices!
// Check "lnbcrt" before "lnbc" to avoid false positives
if (lowerInvoice.startsWith("lnbcrt")) return "regtest";
else if (lowerInvoice.startsWith("lnbc")) return "mainnet";
else if (lowerInvoice.startsWith("lntbs")) return "signet";
else if (lowerInvoice.startsWith("lntb")) return "testnet";
```

### 2. Taproot Address Validation

bitcoinjs-lib requires ECC library initialization for taproot validation, so we use manual bech32m validation:

```typescript
// Fallback to manual bech32/bech32m validation for taproot
const decoded = lowerAddress.startsWith("bc1p")
  ? bech32m.decode(address as `${string}1${string}`, 90)
  : bech32.decode(address as `${string}1${string}`, 90);
```

### 3. Base58Check Validation

Manual implementation using `@scure/base` + `@noble/hashes` to avoid dependencies with browser compatibility issues:

```typescript
const decoded = base58.decode(address);
const payload = decoded.slice(0, -4);
const checksum = decoded.slice(-4);
const hash = sha256(sha256(payload)); // Double SHA-256
// Verify checksum matches
```

### 4. Query Parameter Parsing

Manual parsing instead of `URLSearchParams` to preserve encoded values for `pop` parameter:

```typescript
// Parse manually to preserve encoded values for pop parameter
const paramPairs = queryString.split("&");
// Keep pop value encoded as per BIP-321 spec
```

## Supported Payment Methods

| Type | Parameter | Validation | Notes |
|------|-----------|------------|-------|
| On-chain | `address`, `bc`, `tb`, `bcrt` | Full validation with network check | P2PKH, P2SH, Segwit, Taproot |
| Lightning | `lightning` | BOLT11 decode + network detection | Mainnet, testnet, regtest, signet |
| BOLT12 | `lno` | Accept any value | Offers (minimal validation) |
| Silent Payments | `sp` | Prefix check (`sp1`) | BIP-352 addresses |

**Removed:** BIP-351 Private Payments (`pay` parameter) - Unused spec, nobody knows what it is

## Testing Guidelines

### Test Structure
- 39 tests covering all functionality
- Use `test()` and `expect()` from `bun:test`
- Group related tests with `describe()`
- Use non-null assertions (`!`) where values are guaranteed to exist

### Example Test Pattern
```typescript
test("parses mainnet address", () => {
  const result = parseBIP321("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
  expect(result.valid).toBe(true);
  expect(result.network).toBe("mainnet");
  expect(result.paymentMethods[0]!.type).toBe("onchain");
});
```

## TypeScript Type Safety

All code must pass strict TypeScript checking with zero errors:

```bash
bunx tsc --noEmit  # Must pass with 0 errors
```

### Common Type Patterns

```typescript
// Use non-null assertions for array access where guaranteed
result.paymentMethods[0]!.type

// Use optional chaining for potentially undefined values
result.paymentMethods[0]?.network

// Use nullish coalescing for fallbacks
byNetwork.mainnet?.length || 0
```

## BIP-321 Compliance Rules

1. ✅ URI must start with `bitcoin:` (case-insensitive)
2. ✅ `label`, `message`, `amount`, `pop` cannot appear multiple times
3. ✅ `pop` and `req-pop` cannot both be present
4. ✅ Required parameters (`req-*`) must be understood or URI is invalid
5. ✅ Network-specific parameters must match address network
6. ✅ `pop` scheme must not be forbidden (http, https, file, javascript, mailto)
7. ✅ `amount` must be decimal BTC (no commas)
8. ✅ At least one valid payment method required

## Common Pitfalls

### ❌ Don't Do This
```typescript
// Wrong: Using .js imports breaks TypeScript
import { sha256 } from "@noble/hashes/sha2";

// Wrong: bs58 requires browserify
import bs58 from "bs58";

// Wrong: Checking lnbc before lnbcrt
if (invoice.startsWith("lnbc")) return "mainnet";
```

### ✅ Do This
```typescript
// Correct: Use .js extension for @noble/hashes
import { sha256 } from "@noble/hashes/sha2.js";

// Correct: Use @scure/base (works everywhere)
import { base58 } from "@scure/base";

// Correct: Check longer prefix first
if (invoice.startsWith("lnbcrt")) return "regtest";
else if (invoice.startsWith("lnbc")) return "mainnet";
```

## Adding New Payment Methods

1. Add to `PaymentMethod` type union
2. Add parameter parsing in `parseBIP321()`
3. Implement validation function if needed
4. Add network detection if applicable
5. Write tests for new method
6. Update README documentation
7. Add example usage

## Browser Compatibility

All dependencies work natively in browsers via ES modules:

```html
<script type="module">
  import { parseBIP321 } from './index.js';
  // No build tools needed!
</script>
```

**No browserify, webpack, rollup, or any build tools required.**

## Performance Considerations

- Address validation is synchronous and fast
- Lightning invoice decoding is the slowest operation
- No async operations in the entire codebase
- Manual Base58 validation is faster than external libraries

## Contributing Guidelines

1. All changes must pass TypeScript type check (`bun run check`)
2. All tests must pass (`bun test`)
3. Add tests for new functionality
4. Update README for API changes
5. Keep dependencies minimal and browser-compatible
6. No build tools or polyfills
7. Maintain cross-platform compatibility (Node.js, browser, React Native)

## Resources

- [BIP-321 Specification](https://bips.dev/321/)
- [BIP-21 (Original)](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki)
- [BIP-352 Silent Payments](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki)
- [@scure/base Documentation](https://github.com/paulmillr/scure-base)
- [@noble/hashes Documentation](https://github.com/paulmillr/noble-hashes)