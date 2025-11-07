import * as bitcoin from "bitcoinjs-lib";
import { decode as decodeLightning } from "light-bolt11-decoder";
import bs58check from "bs58check";
import { bech32, bech32m } from "@scure/base";

export interface PaymentMethod {
  type:
    | "onchain"
    | "lightning"
    | "lno"
    | "silent-payment"
    | "private-payment"
    | "other";
  value: string;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  valid: boolean;
  error?: string;
}

export interface BIP321ParseResult {
  address?: string;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  amount?: number;
  label?: string;
  message?: string;
  pop?: string;
  popRequired?: boolean;
  paymentMethods: PaymentMethod[];
  requiredParams: string[];
  optionalParams: Record<string, string[]>;
  valid: boolean;
  errors: string[];
}

const FORBIDDEN_POP_SCHEMES = ["http", "https", "file", "javascript", "mailto"];

function detectAddressNetwork(
  address: string,
): "mainnet" | "testnet" | "regtest" | "signet" | undefined {
  try {
    const lowerAddress = address.toLowerCase();

    // Bech32/Bech32m addresses
    if (lowerAddress.startsWith("bc1")) {
      try {
        // Try using bitcoinjs-lib first (works for non-taproot)
        bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
        return "mainnet";
      } catch (e) {
        // Fallback to manual bech32/bech32m validation for taproot
        try {
          const decoded = lowerAddress.startsWith("bc1p")
            ? bech32m.decode(address as `${string}1${string}`, 90)
            : bech32.decode(address as `${string}1${string}`, 90);
          if (decoded.prefix === "bc") {
            return "mainnet";
          }
        } catch {
          return undefined;
        }
      }
    } else if (lowerAddress.startsWith("tb1")) {
      try {
        bitcoin.address.toOutputScript(address, bitcoin.networks.testnet);
        return "testnet";
      } catch (e) {
        try {
          const decoded = lowerAddress.startsWith("tb1p")
            ? bech32m.decode(address as `${string}1${string}`, 90)
            : bech32.decode(address as `${string}1${string}`, 90);
          if (decoded.prefix === "tb") {
            return "testnet";
          }
        } catch {
          return undefined;
        }
      }
    } else if (lowerAddress.startsWith("bcrt1")) {
      try {
        bitcoin.address.toOutputScript(address, bitcoin.networks.regtest);
        return "regtest";
      } catch (e) {
        try {
          const decoded = lowerAddress.startsWith("bcrt1p")
            ? bech32m.decode(address as `${string}1${string}`, 90)
            : bech32.decode(address as `${string}1${string}`, 90);
          if (decoded.prefix === "bcrt") {
            return "regtest";
          }
        } catch {
          return undefined;
        }
      }
    }

    // Base58 addresses (P2PKH, P2SH)
    const decoded = bs58check.decode(address);
    const version = decoded[0];

    // Mainnet: P2PKH (0x00), P2SH (0x05)
    if (version === 0x00 || version === 0x05) {
      return "mainnet";
    }
    // Testnet: P2PKH (0x6f), P2SH (0xc4)
    else if (version === 0x6f || version === 0xc4) {
      return "testnet";
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
}

function validateBitcoinAddress(address: string): {
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
} {
  if (!address) {
    return { valid: false, error: "Empty address" };
  }

  const network = detectAddressNetwork(address);
  if (!network) {
    return { valid: false, error: "Invalid bitcoin address" };
  }

  return { valid: true, network };
}

function validateLightningInvoice(invoice: string): {
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
} {
  try {
    const decoded = decodeLightning(invoice);
    let network: "mainnet" | "testnet" | "regtest" | "signet" | undefined;

    const lowerInvoice = invoice.toLowerCase();
    // Check order matters - lnbcrt before lnbc, lntbs before lntb
    if (lowerInvoice.startsWith("lnbcrt")) {
      network = "regtest";
    } else if (lowerInvoice.startsWith("lnbc")) {
      network = "mainnet";
    } else if (lowerInvoice.startsWith("lntbs")) {
      network = "signet";
    } else if (
      lowerInvoice.startsWith("lntb") ||
      lowerInvoice.startsWith("lnbt")
    ) {
      network = "testnet";
    }

    return { valid: true, network };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid lightning invoice: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function validatePopUri(popUri: string): { valid: boolean; error?: string } {
  try {
    const decoded = decodeURIComponent(popUri);
    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):?/);

    if (schemeMatch && schemeMatch[1]) {
      const scheme = schemeMatch[1].toLowerCase();
      if (FORBIDDEN_POP_SCHEMES.includes(scheme)) {
        return { valid: false, error: `Forbidden pop scheme: ${scheme}` };
      }
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: "Invalid pop URI encoding" };
  }
}

export function parseBIP321(uri: string): BIP321ParseResult {
  const result: BIP321ParseResult = {
    paymentMethods: [],
    requiredParams: [],
    optionalParams: {},
    valid: true,
    errors: [],
  };

  if (!uri || typeof uri !== "string") {
    result.valid = false;
    result.errors.push("Invalid URI: must be a non-empty string");
    return result;
  }

  const lowerUri = uri.toLowerCase();
  if (!lowerUri.startsWith("bitcoin:")) {
    result.valid = false;
    result.errors.push("Invalid URI: must start with bitcoin:");
    return result;
  }

  const withoutScheme = uri.substring(8);
  const questionMarkIndex = withoutScheme.indexOf("?");

  let address = "";
  let queryString = "";

  if (questionMarkIndex === -1) {
    address = withoutScheme;
  } else {
    address = withoutScheme.substring(0, questionMarkIndex);
    queryString = withoutScheme.substring(questionMarkIndex + 1);
  }

  if (address) {
    const validation = validateBitcoinAddress(address);
    if (validation.valid) {
      result.address = address;
      result.network = validation.network;
      result.paymentMethods.push({
        type: "onchain",
        value: address,
        network: validation.network,
        valid: true,
      });
    } else {
      result.errors.push(`Invalid address: ${validation.error}`);
      result.valid = false;
    }
  }

  if (queryString) {
    // Parse manually to preserve encoded values for pop parameter
    const paramPairs = queryString.split("&");
    const seenKeys = new Map<string, number>();

    for (const pair of paramPairs) {
      const eqIndex = pair.indexOf("=");
      let key: string;
      let value: string;

      if (eqIndex === -1) {
        key = decodeURIComponent(pair);
        value = "";
      } else {
        key = decodeURIComponent(pair.substring(0, eqIndex));
        // For pop parameters, keep encoded; for others, decode
        const rawValue = pair.substring(eqIndex + 1);
        value = rawValue;
      }

      const lowerKey = key.toLowerCase();
      const count = (seenKeys.get(lowerKey) || 0) + 1;
      seenKeys.set(lowerKey, count);

      if (lowerKey === "label") {
        if (count > 1) {
          result.errors.push("Multiple label parameters not allowed");
          result.valid = false;
        } else {
          result.label = decodeURIComponent(value);
        }
      } else if (lowerKey === "message") {
        if (count > 1) {
          result.errors.push("Multiple message parameters not allowed");
          result.valid = false;
        } else {
          result.message = decodeURIComponent(value);
        }
      } else if (lowerKey === "amount") {
        if (count > 1) {
          result.errors.push("Multiple amount parameters not allowed");
          result.valid = false;
        } else {
          const decodedValue = decodeURIComponent(value);
          const amount = parseFloat(decodedValue);
          if (isNaN(amount) || amount < 0 || decodedValue.includes(",")) {
            result.errors.push("Invalid amount format");
            result.valid = false;
          } else {
            result.amount = amount;
          }
        }
      } else if (lowerKey === "pop" || lowerKey === "req-pop") {
        const popKey = lowerKey === "req-pop" ? "req-pop" : "pop";
        if (result.pop !== undefined || result.popRequired !== undefined) {
          result.errors.push("Multiple pop/req-pop parameters not allowed");
          result.valid = false;
        } else {
          // Keep pop value encoded as per spec
          const validation = validatePopUri(value);
          if (!validation.valid) {
            result.errors.push(validation.error || "Invalid pop URI");
            if (lowerKey === "req-pop") {
              result.valid = false;
            }
          }
          result.pop = value;
          result.popRequired = lowerKey === "req-pop";
        }
      } else if (lowerKey === "lightning") {
        const decodedValue = decodeURIComponent(value);
        const validation = validateLightningInvoice(decodedValue);
        result.paymentMethods.push({
          type: "lightning",
          value: decodedValue,
          network: validation.network,
          valid: validation.valid,
          error: validation.error,
        });
        if (!validation.valid) {
          result.errors.push(validation.error || "Invalid lightning invoice");
        }
      } else if (lowerKey === "lno") {
        const decodedValue = decodeURIComponent(value);
        result.paymentMethods.push({
          type: "lno",
          value: decodedValue,
          valid: true,
        });
      } else if (lowerKey === "sp") {
        const decodedValue = decodeURIComponent(value);
        const isSilentPayment = decodedValue.toLowerCase().startsWith("sp1");
        result.paymentMethods.push({
          type: "silent-payment",
          value: decodedValue,
          valid: isSilentPayment,
          error: isSilentPayment
            ? undefined
            : "Invalid silent payment address format",
        });
        if (!isSilentPayment) {
          result.errors.push("Invalid silent payment address format");
        }
      } else if (lowerKey === "pay") {
        const decodedValue = decodeURIComponent(value);
        result.paymentMethods.push({
          type: "private-payment",
          value: decodedValue,
          valid: true,
        });
      } else if (
        lowerKey === "bc" ||
        lowerKey === "tb" ||
        lowerKey === "bcrt" ||
        lowerKey === "tbs"
      ) {
        let expectedNetwork: "mainnet" | "testnet" | "regtest" | "signet";
        if (lowerKey === "bc") expectedNetwork = "mainnet";
        else if (lowerKey === "tb") expectedNetwork = "testnet";
        else if (lowerKey === "tbs") expectedNetwork = "signet";
        else expectedNetwork = "regtest";

        const decodedValue = decodeURIComponent(value);
        const validation = validateBitcoinAddress(decodedValue);
        const networkMatches =
          validation.valid && validation.network === expectedNetwork;

        result.paymentMethods.push({
          type: "onchain",
          value: decodedValue,
          network: validation.network,
          valid: validation.valid && networkMatches,
          error: !validation.valid
            ? validation.error
            : !networkMatches
              ? `Address network mismatch: expected ${expectedNetwork}`
              : undefined,
        });

        if (!validation.valid || !networkMatches) {
          result.errors.push(
            !validation.valid
              ? validation.error!
              : `Address network mismatch for ${lowerKey} parameter`,
          );
          result.valid = false;
        }
      } else if (lowerKey.startsWith("req-")) {
        result.requiredParams.push(key);
        result.errors.push(`Unknown required parameter: ${key}`);
        result.valid = false;
      } else {
        if (!result.optionalParams[lowerKey]) {
          result.optionalParams[lowerKey] = [];
        }
        result.optionalParams[lowerKey].push(decodeURIComponent(value));
      }
    }
  }

  if (result.paymentMethods.length === 0) {
    result.errors.push("No valid payment methods found");
    result.valid = false;
  }

  if (result.popRequired && result.pop) {
    const hasValidPaymentMethod = result.paymentMethods.some((pm) => pm.valid);
    if (!hasValidPaymentMethod) {
      result.errors.push(
        "req-pop specified but no valid payment method available",
      );
    }
  }

  return result;
}

export function getPaymentMethodsByNetwork(
  result: BIP321ParseResult,
): Record<string, PaymentMethod[]> {
  const byNetwork: Record<string, PaymentMethod[]> = {
    mainnet: [],
    testnet: [],
    regtest: [],
    signet: [],
    unknown: [],
  };

  for (const method of result.paymentMethods) {
    if (method.network && byNetwork[method.network]) {
      byNetwork[method.network]!.push(method);
    } else {
      byNetwork.unknown!.push(method);
    }
  }

  return byNetwork;
}

export function getValidPaymentMethods(
  result: BIP321ParseResult,
): PaymentMethod[] {
  return result.paymentMethods.filter((pm) => pm.valid);
}

export function formatPaymentMethodsSummary(result: BIP321ParseResult): string {
  const lines: string[] = [];

  lines.push(`Valid: ${result.valid}`);
  if (result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.join(", ")}`);
  }

  if (result.address) {
    lines.push(`Address: ${result.address} (${result.network})`);
  }

  if (result.amount !== undefined) {
    lines.push(`Amount: ${result.amount} BTC`);
  }

  if (result.label) {
    lines.push(`Label: ${result.label}`);
  }

  if (result.message) {
    lines.push(`Message: ${result.message}`);
  }

  lines.push(`Payment Methods: ${result.paymentMethods.length}`);
  for (const method of result.paymentMethods) {
    const status = method.valid ? "✓" : "✗";
    const network = method.network ? ` (${method.network})` : "";
    lines.push(`  ${status} ${method.type}${network}`);
  }

  return lines.join("\n");
}
