import * as bitcoin from "bitcoinjs-lib";
import { decode as decodeLightning } from "light-bolt11-decoder";
import { sha256 } from "@noble/hashes/sha2.js";
import { base58, bech32, bech32m } from "@scure/base";

// Type declaration for missing export in light-bolt12-decoder
declare module "light-bolt12-decoder" {
  export function decode(offer: string): {
    offerRequest: string;
    sections: Array<{ name: string; value: unknown }>;
  };
}
import { decode as decodeBolt12 } from "light-bolt12-decoder";

const FORBIDDEN_POP_SCHEMES = ["http", "https", "file", "javascript", "mailto"];

export function detectAddressNetwork(
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
      } catch {
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
      } catch {
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
      } catch {
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

    // Base58 addresses (P2PKH, P2SH) - manual validation with checksum
    try {
      const decoded = base58.decode(address);
      if (decoded.length < 25) {
        return undefined;
      }

      // Verify checksum
      const payload = decoded.slice(0, -4);
      const checksum = decoded.slice(-4);
      const hash = sha256(sha256(payload));

      for (let i = 0; i < 4; i++) {
        if (checksum[i] !== hash[i]) {
          return undefined;
        }
      }

      const version = payload[0];

      // Mainnet: P2PKH (0x00), P2SH (0x05)
      if (version === 0x00 || version === 0x05) {
        return "mainnet";
      }
      // Testnet: P2PKH (0x6f), P2SH (0xc4)
      else if (version === 0x6f || version === 0xc4) {
        return "testnet";
      }
    } catch {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function validateBitcoinAddress(address: string): {
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

export function validateLightningInvoice(invoice: string): {
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
} {
  try {
    const decoded = decodeLightning(invoice);
    let network: "mainnet" | "testnet" | "regtest" | "signet" | undefined;

    // Find the coin_network section from decoded invoice
    const coinNetworkSection = decoded.sections.find(
      (section) => section.name === "coin_network",
    );

    if (
      coinNetworkSection &&
      "value" in coinNetworkSection &&
      coinNetworkSection.value &&
      typeof coinNetworkSection.value === "object" &&
      "bech32" in coinNetworkSection.value
    ) {
      const bech32Prefix = coinNetworkSection.value.bech32;
      switch (bech32Prefix) {
        case "bc":
          network = "mainnet";
          break;
        case "tb":
          network = "testnet";
          break;
        case "tbs":
          network = "signet";
          break;
        case "bcrt":
          network = "regtest";
          break;
      }
    }

    return { valid: true, network };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid lightning invoice: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function validateBolt12Offer(offer: string): {
  valid: boolean;
  error?: string;
} {
  try {
    if (!offer || typeof offer !== "string") {
      return { valid: false, error: "Empty or invalid offer" };
    }

    const lowerOffer = offer.toLowerCase();
    if (!lowerOffer.startsWith("ln")) {
      return { valid: false, error: "Invalid BOLT12 offer format" };
    }

    decodeBolt12(offer);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid BOLT12 offer: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function validateSilentPaymentAddress(address: string): {
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
} {
  try {
    const lowerAddress = address.toLowerCase();

    let network: "mainnet" | "testnet" | undefined;
    if (lowerAddress.startsWith("sp1q")) {
      network = "mainnet";
    } else if (lowerAddress.startsWith("tsp1q")) {
      network = "testnet";
    } else {
      return { valid: false, error: "Invalid silent payment address prefix" };
    }

    const decoded = bech32m.decode(address as `${string}1${string}`, 1023);

    const expectedPrefix = network === "mainnet" ? "sp" : "tsp";
    if (decoded.prefix !== expectedPrefix) {
      return { valid: false, error: "Invalid silent payment address prefix" };
    }

    // Check version (first word should be 0 for v0, which encodes as 'q')
    if (decoded.words.length === 0 || decoded.words[0] !== 0) {
      return { valid: false, error: "Unsupported silent payment version" };
    }

    // Convert from 5-bit words to bytes
    const dataWords = decoded.words.slice(1);
    const data = bech32m.fromWordsUnsafe(dataWords);

    if (!data) {
      return { valid: false, error: "Invalid silent payment address data" };
    }

    // BIP-352: v0 addresses must be exactly 66 bytes (33-byte scan key + 33-byte spend key)
    if (data.length !== 66) {
      return { valid: false, error: "Invalid silent payment address length" };
    }

    // Validate both public keys are valid compressed keys (0x02 or 0x03 prefix)
    const scanKey = data[0];
    const spendKey = data[33];
    if (
      (scanKey !== 0x02 && scanKey !== 0x03) ||
      (spendKey !== 0x02 && spendKey !== 0x03)
    ) {
      return {
        valid: false,
        error: "Invalid public key format in silent payment address",
      };
    }

    return { valid: true, network };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid silent payment address: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function validateArkAddress(address: string): {
  valid: boolean;
  network?: "mainnet" | "testnet" | "regtest" | "signet";
  error?: string;
} {
  try {
    const lowerAddress = address.toLowerCase();

    if (lowerAddress.startsWith("ark1")) {
      const decoded = bech32m.decode(address as `${string}1${string}`, 1023);
      if (decoded.prefix === "ark") {
        return { valid: true, network: "mainnet" };
      }
    } else if (lowerAddress.startsWith("tark1")) {
      const decoded = bech32m.decode(address as `${string}1${string}`, 1023);
      if (decoded.prefix === "tark") {
        return { valid: true, network: "testnet" };
      }
    }

    return { valid: false, error: "Invalid Ark address format" };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid Ark address: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function validatePopUri(popUri: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const decoded = decodeURIComponent(popUri);
    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):?/);

    if (schemeMatch?.[1]) {
      const scheme = schemeMatch[1].toLowerCase();
      if (FORBIDDEN_POP_SCHEMES.includes(scheme)) {
        return { valid: false, error: `Forbidden pop scheme: ${scheme}` };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid pop URI encoding" };
  }
}
