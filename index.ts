import {
  validateBitcoinAddress,
  validateLightningInvoice,
  validateBolt12Offer,
  validateSilentPaymentAddress,
  validateArkAddress,
  validatePopUri,
} from "./validators";

// Re-export validation functions for public API
export {
  validateBitcoinAddress,
  validateLightningInvoice,
  validateBolt12Offer,
  validateSilentPaymentAddress,
  validateArkAddress,
  validatePopUri,
};

export type Network = "mainnet" | "testnet" | "regtest" | "signet";

export interface PaymentMethod {
  type: "onchain" | "lightning" | "offer" | "silent-payment" | "ark";
  value: string;
  network?: Network;
  valid: boolean;
  error?: string;
}

export interface BIP321ParseResult {
  address?: string;
  network?: Network;
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

export function parseBIP321(
  uri: string,
  expectedNetwork?: Network,
): BIP321ParseResult {
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
      const count = (seenKeys.get(lowerKey) ?? 0) + 1;
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
        const _popKey = lowerKey === "req-pop" ? "req-pop" : "pop";
        if (result.pop !== undefined || result.popRequired !== undefined) {
          result.errors.push("Multiple pop/req-pop parameters not allowed");
          result.valid = false;
        } else {
          // Keep pop value encoded as per spec
          const validation = validatePopUri(value);
          if (!validation.valid) {
            result.errors.push(validation.error ?? "Invalid pop URI");
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
          result.errors.push(validation.error ?? "Invalid lightning invoice");
        }
      } else if (lowerKey === "lno") {
        const decodedValue = decodeURIComponent(value);
        const validation = validateBolt12Offer(decodedValue);
        result.paymentMethods.push({
          type: "offer",
          value: decodedValue,
          valid: validation.valid,
          error: validation.error,
        });
        if (!validation.valid) {
          result.errors.push(validation.error ?? "Invalid BOLT12 offer");
        }
      } else if (lowerKey === "sp") {
        const decodedValue = decodeURIComponent(value);
        const validation = validateSilentPaymentAddress(decodedValue);
        result.paymentMethods.push({
          type: "silent-payment",
          value: decodedValue,
          network: validation.network,
          valid: validation.valid,
          error: validation.error,
        });
        if (!validation.valid) {
          result.errors.push(
            validation.error ?? "Invalid silent payment address",
          );
        }
      } else if (lowerKey === "ark") {
        const decodedValue = decodeURIComponent(value);
        const validation = validateArkAddress(decodedValue);
        result.paymentMethods.push({
          type: "ark",
          value: decodedValue,
          network: validation.network,
          valid: validation.valid,
          error: validation.error,
        });
        if (!validation.valid) {
          result.errors.push(validation.error ?? "Invalid Ark address");
        }
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
          validation.valid &&
          (validation.network === expectedNetwork ||
            // Testnet and signet are interchangeable for onchain
            (validation.network === "testnet" &&
              expectedNetwork === "signet") ||
            (validation.network === "signet" && expectedNetwork === "testnet"));

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
              ? (validation.error ?? "Invalid address")
              : `Address network mismatch for ${lowerKey} parameter`,
          );
          result.valid = false;
        }
      } else if (lowerKey.startsWith("req-")) {
        result.requiredParams.push(key);
        result.errors.push(`Unknown required parameter: ${key}`);
        result.valid = false;
      } else {
        result.optionalParams[lowerKey] ??= [];
        result.optionalParams[lowerKey].push(decodeURIComponent(value));
      }
    }
  }

  if (result.paymentMethods.length === 0) {
    result.errors.push("No valid payment methods found");
    result.valid = false;
  }

  if (expectedNetwork) {
    for (const method of result.paymentMethods) {
      if (method.network && method.network !== expectedNetwork) {
        // For Ark and Silent Payments, testnet covers testnet/signet/regtest
        // For onchain, testnet and signet are interchangeable
        const isTestnetCompatible =
          ((method.type === "ark" || method.type === "silent-payment") &&
            method.network === "testnet" &&
            (expectedNetwork === "testnet" ||
              expectedNetwork === "signet" ||
              expectedNetwork === "regtest")) ||
          (method.type === "onchain" &&
            ((method.network === "testnet" && expectedNetwork === "signet") ||
              (method.network === "signet" && expectedNetwork === "testnet")));

        if (!isTestnetCompatible) {
          result.errors.push(
            `Payment method network mismatch: expected ${expectedNetwork}, got ${method.network}`,
          );
          result.valid = false;
          method.valid = false;
          method.error = `Network mismatch: expected ${expectedNetwork}`;
        }
      }
    }
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

interface BIP321EncodeParamsBase {
  address?: string;
  amount?: number;
  label?: string;
  message?: string;
  lightning?: string | string[];
  lno?: string | string[];
  sp?: string | string[];
  ark?: string | string[];
  bc?: string | string[];
  tb?: string | string[];
  bcrt?: string | string[];
  tbs?: string | string[];
  optionalParams?: Record<string, string | string[]>;
}

// Make pop and reqPop mutually exclusive using discriminated union
export type BIP321EncodeParams = BIP321EncodeParamsBase &
  (
    | { pop?: string; reqPop?: never }
    | { pop?: never; reqPop?: string }
    | { pop?: never; reqPop?: never }
  );

export type BIP321EncodeResult = BIP321ParseResult & { uri: string }

export function encodeBIP321(params: BIP321EncodeParams): BIP321EncodeResult {
  const searchParams = new URLSearchParams();

  const append = (key: string, value: string | string[] | undefined) => {
    if (value === undefined) return;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      searchParams.append(key, v);
    }
  };

  if (params.amount !== undefined) {
    if (Number.isNaN(params.amount) || !Number.isFinite(params.amount) || params.amount < 0) {
      throw new Error("Invalid amount format");
    }
    searchParams.append("amount", params.amount.toString());
  }

  append("label", params.label);
  append("message", params.message);

  if (params.pop !== undefined) {
    searchParams.append("pop", params.pop);
  } else if (params.reqPop !== undefined) {
    searchParams.append("req-pop", params.reqPop);
  }

  append("lightning", params.lightning);
  append("lno", params.lno);
  append("sp", params.sp);
  append("ark", params.ark);

  append("bc", params.bc);
  append("tb", params.tb);
  append("bcrt", params.bcrt);
  append("tbs", params.tbs);

  if (params.optionalParams) {
    for (const [key, value] of Object.entries(params.optionalParams)) {
      append(key, value);
    }
  }

  const address = params.address ?? "";

  // URLSearchParams encodes spaces as '+', but BIP-321 expects percent encoding
  const query = searchParams.toString().replace(/\+/g, "%20");
  const uri = `bitcoin:${address}${query ? `?${query}` : ""}`;
  const parsed = parseBIP321(uri);

  const hasValidPaymentMethod = parsed.paymentMethods.some((pm) => pm.valid);
  if (!parsed.valid || !hasValidPaymentMethod) {
    throw new Error(parsed.errors.join("; ") || "No valid payment methods");
  }

  return { ...parsed, uri };
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
    const { network } = method;
    if (network && network in byNetwork) {
      const networkArray = byNetwork[network];
      if (networkArray) {
        networkArray.push(method);
      }
    } else {
      const unknownArray = byNetwork.unknown;
      if (unknownArray) {
        unknownArray.push(method);
      }
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
