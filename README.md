# BIP-321 Parser

A TypeScript/JavaScript library for parsing BIP-321 Bitcoin URI scheme. This library validates and extracts payment information from Bitcoin URIs, supporting multiple payment methods including on-chain addresses, Lightning invoices, BOLT12 offers, and silent payments.

## Features

- ✅ **Complete BIP-321 compliance** - Implements the full BIP-321 specification
- ✅ **Multiple payment methods** - Supports on-chain, Lightning (BOLT11), BOLT12 offers, silent payments, and Ark
- ✅ **Network detection** - Automatically detects mainnet, testnet, regtest, and signet networks
- ✅ **Address validation** - Validates Bitcoin addresses (P2PKH, P2SH, Segwit v0, Taproot)
- ✅ **Lightning invoice validation** - Validates BOLT11 Lightning invoices

```typescript
import { parseBIP321, type BIP321ParseResult, type PaymentMethod } from "bip-321";

const result: BIP321ParseResult = parseBIP321("bitcoin:...");

result.valid;           // boolean
result.network;         // "mainnet" | "testnet" | "regtest" | "signet" | undefined
result.paymentMethods;  // PaymentMethod[]
result.errors;          // string[]

result.paymentMethods.forEach((method: PaymentMethod) => {
  method.type;    // "onchain" | "lightning" | "offer" | "silent-payment" | "ark"
  method.network; // "mainnet" | "testnet" | "regtest" | "signet" | undefined
  method.valid;   // boolean
});
```

```typescript
import { encodeBIP321 } from "bip-321";

try {
  const { uri } = encodeBIP321({ address: "bitcoin_address", label: "Label", message: "Message", amount: 0.5 });

  // uri = bitcoin:bitcoin_address?label=Label&message=Message&amount=0.5
} catch (error) {
  console.error(error)
}
```

## Installation

```bash
bun add bip-321
```

Or with npm:

```bash
npm install bip-321
```

## Quick Start

```typescript
import { parseBIP321, encodeBIP321 } from "bip-321";

// Parse a simple Bitcoin address
const result = parseBIP321("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");

console.log(result.valid); // true
console.log(result.network); // "mainnet"
console.log(result.address); // "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
console.log(result.paymentMethods); // Array of payment methods

// Encode a simple Bitcoin address
try {
  const { uri } = encodeBIP321({ address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" });

  console.log(uri); // bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
} catch (error) {
  console.error(error)
}
```

## Validation Functions

The library also exports standalone validation functions that can be used independently:

```typescript
import {
  validateBitcoinAddress,
  validateLightningInvoice,
  validateBolt12Offer,
  validateSilentPaymentAddress,
  validateArkAddress,
  validatePopUri,
} from "bip-321";

// Validate a Bitcoin address
const btcResult = validateBitcoinAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
console.log(btcResult.valid); // true
console.log(btcResult.network); // "mainnet"

// Validate a Lightning invoice
const lnResult = validateLightningInvoice("lnbc15u1p3xnhl2pp5...");
console.log(lnResult.valid); // true
console.log(lnResult.network); // "mainnet"

// Validate a BOLT12 offer
const offerResult = validateBolt12Offer("lno1qqqq02k20d");
console.log(offerResult.valid); // true

// Validate a Silent Payment address
const spResult = validateSilentPaymentAddress("sp1qq...");
console.log(spResult.valid); // true
console.log(spResult.network); // "mainnet"

// Validate an Ark address
const arkResult = validateArkAddress("ark1p...");
console.log(arkResult.valid); // true
console.log(arkResult.network); // "mainnet"

// Validate a pop URI
const popResult = validatePopUri("myapp://callback");
console.log(popResult.valid); // true
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
// Encode lightning-only payment (no on-chain address)
const { uri } = encodeBIP321({ lightning: "lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3s..." });

// Parse lightning-only payment
const result = parseBIP321(uri);

console.log(result.paymentMethods[0].type); // "lightning"
console.log(result.paymentMethods[0].network); // "mainnet"
```

### Ark Payment

```typescript
// Encode Ark-only payment (no on-chain address)
const { uri } = encodeBIP321({ ark: "ark1pwh9vsmezqqpjy9akejayl2vvcse6he97rn40g84xrlvrlnhayuuyefrp9nse2yspqqjl5wpy" });

// Parse Ark payment
const result = parseBIP321(uri);

console.log(result.paymentMethods[0].type); // "ark"
console.log(result.paymentMethods[0].network); // "mainnet"

// Testnet Ark address
const { uri: testnetUri } = encodeBIP321({ ark: "tark1pm6sr0fpzqqpnzzwxf209kju4qavs4gtumxk30yv2u5ncrvtp72z34axcvrydtdqpqq5838km" });
const testnetResult = parseBIP321(testnetUri);

console.log(testnetResult.paymentMethods[0].network); // "testnet"
```

### Network Validation

```typescript
// Ensure all payment methods are mainnet
const result = parseBIP321(
  "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?lightning=lnbc...",
  "mainnet"
);

if (result.valid) {
  // All payment methods are guaranteed to be mainnet
  console.log("All payment methods are mainnet");
}

// Reject testnet addresses when expecting mainnet
const invalid = parseBIP321(
  "bitcoin:tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
  "mainnet"
);

console.log(invalid.valid); // false
console.log(invalid.errors); // ["Payment method network mismatch..."]
```

### Multiple Payment Methods

```typescript
const result = parseBIP321(
  "bitcoin:?lightning=lnbc...&lno=lno1bogusoffer&sp=sp1qsilentpayment"
);

// Returns 3 payment methods: lightning, offer (BOLT12), and silent-payment
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

### `parseBIP321(uri: string, expectedNetwork?: "mainnet" | "testnet" | "regtest" | "signet"): BIP321ParseResult`

Parses a BIP-321 URI and returns detailed information about the payment request.

**Parameters:**
- `uri` - The Bitcoin URI string to parse
- `expectedNetwork` (optional) - Expected network for all payment methods. If specified, all payment methods must match this network or the URI will be marked invalid.

**Returns:** `BIP321ParseResult` object

### `encodeBIP321(params: BIP321EncodeParams): BIP321EncodeResult`

Encodes payment parameters into a BIP-321 URI string. Validates the generated URI before returning.

**Parameters:**
- `params` - The `BIP321EncodeParams` object containing payment details

**Returns:** `BIP321EncodeResult` object

**Throws:** `Error` if the generated URI is invalid or contains no valid payment methods

### `BIP321EncodeParams` Interface

```typescript
interface BIP321EncodeParams {
  address?: string;                              // Main Bitcoin address
  amount?: number;                               // Amount in BTC
  label?: string;                                // Label for the recipient
  message?: string;                              // Message describing the transaction
  lightning?: string | string[];                 // BOLT11 Lightning invoice(s)
  lno?: string | string[];                       // BOLT12 offer(s)
  sp?: string | string[];                        // Silent Payment address(es)
  ark?: string | string[];                       // Ark address(es)
  bc?: string | string[];                        // Mainnet address(es)
  tb?: string | string[];                        // Testnet address(es)
  bcrt?: string | string[];                      // Regtest address(es)
  tbs?: string | string[];                       // Signet address(es)
  pop?: string;                                  // Proof of payment callback URI
  reqPop?: string;                               // Required proof of payment callback URI
  optionalParams?: Record<string, string | string[]>; // Additional optional parameters
}
```

**Note:** `pop` and `reqPop` are mutually exclusive - only one can be provided.

### `BIP321EncodeResult` Interface

```typescript
interface BIP321EncodeResult extends BIP321ParseResult {
  uri: string; // The encoded BIP-321 URI string
}
```

The result includes all fields from `BIP321ParseResult` plus the generated `uri` string.

### Validation Functions

The library exports individual validation functions for each payment method type:

#### `validateBitcoinAddress(address: string)`

Validates a Bitcoin address and returns network information.

**Returns:**
```typescript
{
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
}
```

#### `validateLightningInvoice(invoice: string)`

Validates a BOLT11 Lightning invoice and detects the network.

**Returns:**
```typescript
{
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
}
```

#### `validateBolt12Offer(offer: string)`

Validates a BOLT12 offer. Note: BOLT12 offers are network-agnostic.

**Returns:**
```typescript
{
  valid: boolean;
  error?: string;
}
```

#### `validateSilentPaymentAddress(address: string)`

Validates a BIP-352 Silent Payment address.

**Returns:**
```typescript
{
  valid: boolean;
  network?: "mainnet" | "testnet";
  error?: string;
}
```

**Note:** For Silent Payments, `testnet` covers testnet, signet, and regtest.

#### `validateArkAddress(address: string)`

Validates an Ark address (BOAT-0001).

**Returns:**
```typescript
{
  valid: boolean;
  network?: "mainnet" | "testnet";
  error?: string;
}
```

**Note:** For Ark, `testnet` covers testnet, signet, and regtest.

#### `validatePopUri(uri: string)`

Validates a proof-of-payment URI and checks for forbidden schemes.

**Returns:**
```typescript
{
  valid: boolean;
  error?: string;
}
```
</text>

<old_text line=240>
### BIP321ParseResult

The `parseBIP321` function returns a `BIP321ParseResult` object containing:

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
  type: "onchain" | "lightning" | "offer" | "silent-payment" | "ark";
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
| BOLT12 Offer | `lno` | Lightning BOLT12 offers |
| Silent Payments | `sp` | BIP352 Silent Payment addresses |
| Ark | `ark` | Ark addresses (mainnet: `ark1...`, testnet: `tark1...`) |

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

### Silent Payment Addresses
- **Mainnet**: `sp1q...`
- **Testnet**: `tsp1q...` (covers testnet, signet, and regtest)

### Ark Addresses
- **Mainnet**: `ark1...`
- **Testnet**: `tark1...` (covers testnet, signet, and regtest)

### BOLT12 Offers
- **Network-agnostic**: `lno...` (no network-specific prefix)

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
9. ✅ If `expectedNetwork` is specified, all payment methods must match that network

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

## License

MIT

## Related

- [BIP-321 Specification](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki)
- [BIP-21 (Original)](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki)
- [BIP-352 Silent Payments](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki)
- [BOAT-0001 Ark Address Format](https://github.com/ark-protocol/boats/blob/master/boat-0001.md)
- [BOLT11 Lightning Invoices](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
- [BOLT12 Lightning Offers](https://github.com/lightning/bolts/blob/master/12-offer-encoding.md)
