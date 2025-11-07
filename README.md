# BIP-321 Parser

A TypeScript/JavaScript library for parsing BIP-321 Bitcoin URI scheme. This library validates and extracts payment information from Bitcoin URIs, supporting multiple payment methods including on-chain addresses, Lightning invoices, BOLT12 offers, and silent payments.

## Features

- ✅ **Complete BIP-321 compliance** - Implements the full BIP-321 specification
- ✅ **Multiple payment methods** - Supports on-chain, Lightning (BOLT11), BOLT12 offers, silent payments, and private payments
- ✅ **Network detection** - Automatically detects mainnet, testnet, regtest, and signet networks
- ✅ **Address validation** - Validates Bitcoin addresses (P2PKH, P2SH, Segwit v0, Taproot)
- ✅ **Lightning invoice validation** - Validates BOLT11 Lightning invoices
- ✅ **Cross-platform** - Works in Node.js, browsers, and React Native
- ✅ **TypeScript support** - Fully typed with TypeScript definitions
- ✅ **Proof of payment** - Supports pop/req-pop parameters for payment callbacks
- ✅ **Comprehensive error handling** - Clear error messages for invalid URIs

```typescript
import { parseBIP321, type BIP321ParseResult, type PaymentMethod } from "bip-321";

// Fully typed result with autocomplete support
const result: BIP321ParseResult = parseBIP321("bitcoin:...");

// TypeScript knows all available properties
result.valid;           // boolean
result.network;         // "mainnet" | "testnet" | "regtest" | "signet" | undefined
result.paymentMethods;  // PaymentMethod[]
result.errors;          // string[]

// Payment methods are also fully typed
result.paymentMethods.forEach((method: PaymentMethod) => {
  method.type;    // "onchain" | "lightning" | "lno" | "silent-payment" | "private-payment" | "other"
  method.network; // "mainnet" | "testnet" | "regtest" | "signet" | undefined
  method.valid;   // boolean
});
```

## Installation

```bash
bun add bip-321
```

Or with npm:

```bash
npm install bip-321
```

### Note on Dependencies

This library uses modern, browser-native dependencies:
- **`@scure/base`** - Pure JavaScript base58, bech32, and bech32m encoding (no browserify needed)
- **`@noble/hashes`** - Pure JavaScript cryptographic hashing
- **`bitcoinjs-lib`** - Bitcoin address validation
- **`light-bolt11-decoder`** - Lightning invoice parsing

All dependencies work natively in Node.js, browsers, and React Native without any build tools or polyfills required.

## Quick Start

```typescript
import { parseBIP321 } from "bip-321";

// Parse a simple Bitcoin address
const result = parseBIP321("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");

console.log(result.valid); // true
console.log(result.network); // "mainnet"
console.log(result.address); // "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
console.log(result.paymentMethods); // Array of payment methods
```

## Usage Examples

### Basic On-Chain Payment

```typescript
import { parseBIP321 } from "bip-321";

const result = parseBIP321("bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");

if (result.valid) {
  console.log(`Network: ${result.network}`); // mainnet
  console.log(`Address: ${result.address}`);
  console.log(`Payment methods: ${result.paymentMethods.length}`);
}
```

### Payment with Amount and Label

```typescript
const result = parseBIP321(
  "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5&label=Donation&message=Thank%20you"
);

console.log(`Amount: ${result.amount} BTC`); // 0.5 BTC
console.log(`Label: ${result.label}`); // "Donation"
console.log(`Message: ${result.message}`); // "Thank you"
```

### Lightning Invoice with On-Chain Fallback

```typescript
const result = parseBIP321(
  "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?lightning=lnbc15u1p3xnhl2pp5..."
);

// Returns 2 payment methods: onchain and lightning
result.paymentMethods.forEach((method) => {
  console.log(`Type: ${method.type}, Network: ${method.network}, Valid: ${method.valid}`);
});
```

### Lightning-Only Payment

```typescript
const result = parseBIP321(
  "bitcoin:?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3s..."
);

console.log(result.paymentMethods[0].type); // "lightning"
console.log(result.paymentMethods[0].network); // "mainnet"
```

### Multiple Payment Methods

```typescript
const result = parseBIP321(
  "bitcoin:?lightning=lnbc...&lno=lno1bogusoffer&sp=sp1qsilentpayment"
);

// Returns 3 payment methods: lightning, lno (BOLT12), and silent-payment
console.log(`Total payment methods: ${result.paymentMethods.length}`);
```

### Network-Specific Parameters

```typescript
// Mainnet and testnet addresses in one URI
const result = parseBIP321(
  "bitcoin:?bc=bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq&tb=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg"
);

const byNetwork = getPaymentMethodsByNetwork(result);
console.log(`Mainnet methods: ${byNetwork.mainnet.length}`);
console.log(`Testnet methods: ${byNetwork.testnet.length}`);
```

### Error Handling

```typescript
const result = parseBIP321("bitcoin:invalidaddress");

if (!result.valid) {
  console.log("Errors:");
  result.errors.forEach((error) => console.log(`  - ${error}`));
}
```

## API Reference

### `parseBIP321(uri: string): BIP321ParseResult`

Parses a BIP-321 URI and returns detailed information about the payment request.

**Parameters:**
- `uri` - The Bitcoin URI string to parse

**Returns:** `BIP321ParseResult` object containing:

```typescript
interface BIP321ParseResult {
  // Basic information
  address?: string; // Main Bitcoin address from URI path
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  amount?: number; // Amount in BTC
  label?: string; // Label for the recipient
  message?: string; // Message describing the transaction
  
  // Proof of payment
  pop?: string; // Proof of payment callback URI
  popRequired?: boolean; // Whether pop callback is required
  
  // Payment methods
  paymentMethods: PaymentMethod[]; // All available payment methods
  
  // Parameters
  requiredParams: string[]; // Unknown required parameters (req-*)
  optionalParams: Record<string, string[]>; // Unknown optional parameters
  
  // Validation
  valid: boolean; // Whether the URI is valid
  errors: string[]; // Array of error messages
}
```

### `PaymentMethod` Interface

```typescript
interface PaymentMethod {
  type: "onchain" | "lightning" | "lno" | "silent-payment" | "private-payment" | "other";
  value: string; // The actual address/invoice value
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  valid: boolean; // Whether this payment method is valid
  error?: string; // Error message if invalid
}
```

### Helper Functions

#### `getPaymentMethodsByNetwork(result: BIP321ParseResult)`

Groups payment methods by network.

```typescript
const byNetwork = getPaymentMethodsByNetwork(result);
// Returns: { mainnet: [], testnet: [], regtest: [], signet: [], unknown: [] }
```

#### `getValidPaymentMethods(result: BIP321ParseResult)`

Returns only valid payment methods.

```typescript
const valid = getValidPaymentMethods(result);
// Returns: PaymentMethod[]
```

#### `formatPaymentMethodsSummary(result: BIP321ParseResult)`

Generates a human-readable summary of the parsed URI.

```typescript
const summary = formatPaymentMethodsSummary(result);
console.log(summary);
// Outputs:
// Valid: true
// Amount: 0.5 BTC
// Label: Donation
// Payment Methods: 2
//   ✓ onchain (mainnet)
//   ✓ lightning (mainnet)
```

## Supported Payment Methods

| Method | Parameter Key | Description |
|--------|--------------|-------------|
| On-chain | `address` or `bc`/`tb`/`bcrt`/`tbs` | Bitcoin addresses (P2PKH, P2SH, Segwit, Taproot) |
| Lightning | `lightning` | BOLT11 Lightning invoices |
| BOLT12 | `lno` | Lightning BOLT12 offers |
| Silent Payments | `sp` | BIP352 Silent Payment addresses |
| Private Payments | `pay` | BIP351 Private Payment addresses |

## Network Detection

The library automatically detects the network from:

### Bitcoin Addresses
- **Mainnet**: `1...`, `3...`, `bc1...`
- **Testnet**: `m...`, `n...`, `2...`, `tb1...`
- **Regtest**: `bcrt1...`

### Lightning Invoices
- **Mainnet**: `lnbc...`
- **Testnet**: `lntb...`
- **Regtest**: `lnbcrt...`
- **Signet**: `lntbs...`

## Validation Rules

The parser enforces BIP-321 validation rules:

1. ✅ URI must start with `bitcoin:` (case-insensitive)
2. ✅ Address in URI path must be valid or empty
3. ✅ `amount` must be decimal BTC (no commas)
4. ✅ `label`, `message`, and `amount` cannot appear multiple times
5. ✅ `pop` and `req-pop` cannot both be present
6. ✅ Required parameters (`req-*`) must be understood or URI is invalid
7. ✅ Network-specific parameters (`bc`, `tb`, etc.) must match address network
8. ✅ `pop` URI scheme must not be forbidden (http, https, file, javascript, mailto)

## Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { parseBIP321 } from './index.js';
    
    const uri = prompt("Enter Bitcoin URI:");
    const result = parseBIP321(uri);
    
    if (result.valid) {
      alert(`Valid payment request!\nNetwork: ${result.network}\nMethods: ${result.paymentMethods.length}`);
    } else {
      alert(`Invalid URI:\n${result.errors.join('\n')}`);
    }
  </script>
</head>
<body>
  <h1>BIP-321 Parser Demo</h1>
</body>
</html>
```

## React Native Usage

```typescript
import { parseBIP321 } from "bip-321";
import { Alert } from "react-native";

function parseQRCode(data: string) {
  const result = parseBIP321(data);
  
  if (result.valid) {
    Alert.alert(
      "Payment Request",
      `Network: ${result.network}\nAmount: ${result.amount || 'Not specified'} BTC`
    );
  } else {
    Alert.alert("Invalid QR Code", result.errors.join("\n"));
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

BSD-2-Clause (same as BIP-321)

## Related

- [BIP-321 Specification](https://bips.dev/321/)
- [BIP-21 (Original)](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki)
