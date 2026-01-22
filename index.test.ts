import { test, expect, describe } from "bun:test";
import {
  parseBIP321,
  getPaymentMethodsByNetwork,
  getValidPaymentMethods,
  formatPaymentMethodsSummary,
  encodeBIP321,
} from "./index";

const TEST_DATA = {
  addresses: {
    mainnet: {
      p2pkh: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      bech32: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      taproot: "bc1pdyp8m5mhurxa9mf822jegnhu49g2zcchgcq8jzrjxg58u2lvudyqftt43a",
    },
    testnet: {
      bech32: "tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
    },
    regtest: {
      bech32: "bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
    },
  },
  lightning: {
    mainnet:
      "lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
    testnet:
      "lntb2500n1pwxlkl5pp5g8hz28tlf950ps942lu3dknfete8yax2ctywpwjs872x9kngvvuqdqage5hyum5yp6x2um5yp5kuan0d93k2cqzyskdc5s2ltgm9kklz42x3e4tggdd9lcep2s9t2yk54gnfxg48wxushayrt52zjmua43gdnxmuc5s0c8g29ja9vnxs6x3kxgsha07htcacpmdyl64",
    regtest:
      "lnbcrt50u1p5s6w2zpp5juf0r9zutj4zv00kpuuqmgn246azqaq0u5kksx93p46ue94gpmrsdqqcqzzsxqyz5vqsp57u7clsm57nas7c0r2p4ujxr8whla6gxmwf44yqt9f862evjzd3ds9qxpqysgqrwvspjd8g3cfrkg2mrmxfdjcwk5nenw2qnmrys0rvkdmxes6jf5xfykunl5g9hnnahsnz0c90u7k42hmr7w90c0qkw3lllwy40mmqgsqjtyzpd",
    signet:
      "lntbs10u1p5s6wgtsp5d8a763exauvdk6s5gwvl8zmuapmgjq05fdv6trasjd4slvgkvzzqpp56vxdyl24hmkpz0tvqq84xdpqqeql3x7kh8tey4uum2cu8jny6djqdq4g9exkgznw3hhyefqyvenyxqzjccqp2rzjqdwy5et9ygczjl2jqmr9e5xm28u3gksjfrf0pht04uwz2lt9d59cypqelcqqq8gqqqqqqqqpqqqqqzsqqc9qxpqysgq0x0pg2s65rnp2cr35td5tq0vwgmnrghkpzt93eypqvvfu5m40pcjl9k2x2m4kqgvz2ez8tzxqgw0nyeg2w60nfky579uakd4mhr3ncgp0xwars",
  },
  ark: {
    mainnet:
      "ark1pwh9vsmezqqpjy9akejayl2vvcse6he97rn40g84xrlvrlnhayuuyefrp9nse2yspqqjl5wpy",
    testnet:
      "tark1pm6sr0fpzqqpnzzwxf209kju4qavs4gtumxk30yv2u5ncrvtp72z34axcvrydtdqpqq5838km",
  },
  silentPayment: {
    mainnet:
      "sp1qqvgwll3hawztz50nx5mcs70ytam4z068c2cw0z37zcg5yj23h65kcqamhqcxal0gerzly0jnkv7x0ar3sjhmh0n5yugyj3kd7ahzfsdw5590ajuk",
    testnet:
      "tsp1qq2svvt45f2rzmfr4vwhgvjfjgna92h09g9a9ttpvmz5x5wmscsepyqhkk6tjxzr6v0vj3q87gcrqjq73z6ljylgk4m6vphvkpg4afzwp4ve0nr78",
  },
} as const;

describe("BIP-321 Parser", () => {
  describe("Basic Address Parsing", () => {
    test("parses simple mainnet address", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}`,
      );
      expect(result.valid).toBe(true);
      expect(result.address).toBe(TEST_DATA.addresses.mainnet.p2pkh);
      expect(result.network).toBe("mainnet");
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]?.type).toBe("onchain");
      expect(result.paymentMethods[0]?.valid).toBe(true);
    });

    test("parses bech32 mainnet address", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}`,
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("mainnet");
      expect(result.paymentMethods[0]?.valid).toBe(true);
    });

    test("parses testnet address", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.testnet.bech32}`,
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("testnet");
    });

    test("parses uppercase URI", () => {
      const result = parseBIP321(
        `BITCOIN:${TEST_DATA.addresses.mainnet.bech32.toUpperCase()}`,
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("mainnet");
    });
  });

  describe("Query Parameters", () => {
    test("parses label parameter", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?label=Luke-Jr`,
      );
      expect(result.valid).toBe(true);
      expect(result.label).toBe("Luke-Jr");
    });

    test("parses amount parameter", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=20.3`,
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(20.3);
    });

    test("parses message parameter", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?message=Donation%20for%20project%20xyz`,
      );
      expect(result.valid).toBe(true);
      expect(result.message).toBe("Donation for project xyz");
    });

    test("parses multiple parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=50&label=Luke-Jr&message=Donation%20for%20project%20xyz`,
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(50);
      expect(result.label).toBe("Luke-Jr");
      expect(result.message).toBe("Donation for project xyz");
    });

    test("rejects invalid amount with comma", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=50,000.00`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid amount format");
    });

    test("rejects multiple label parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?label=Luke-Jr&label=Matt`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Multiple label parameters not allowed");
    });

    test("rejects multiple amount parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=42&amount=10`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Multiple amount parameters not allowed");
    });
  });

  describe("Lightning Invoice", () => {
    test("parses lightning invoice with fallback", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?lightning=${TEST_DATA.lightning.mainnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
      const lightning = result.paymentMethods.find(
        (pm) => pm.type === "lightning",
      );
      expect(lightning).toBeDefined();
      expect(lightning?.valid).toBe(true);
      expect(lightning?.network).toBe("mainnet");
    });

    test("parses lightning invoice without fallback", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.mainnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.address).toBeUndefined();
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("lightning");
    });

    test("detects signet lightning invoice", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.signet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("signet");
    });

    test("detects regtest lightning invoice", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.regtest}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("regtest");
    });

    test("detects testnet lightning invoice", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.testnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
    });

    test("rejects testnet address in bc parameter", () => {
      const result = parseBIP321(
        `bitcoin:?bc=${TEST_DATA.addresses.testnet.bech32}`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
    });
  });

  describe("Alternative Payment Methods", () => {
    test("parses valid BOLT12 offer", () => {
      const result = parseBIP321("bitcoin:?lno=lno1qqqq02k20d");
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("offer");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("rejects invalid BOLT12 offer", () => {
      const result = parseBIP321("bitcoin:?lno=lno1bogusoffer");
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("offer");
      expect(result.paymentMethods[0]!.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("BOLT12 offer"))).toBe(true);
    });

    test("parses mainnet silent payment address", () => {
      const result = parseBIP321(
        `bitcoin:?sp=${TEST_DATA.silentPayment.mainnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("parses testnet silent payment address", () => {
      const result = parseBIP321(
        `bitcoin:?sp=${TEST_DATA.silentPayment.testnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("rejects invalid silent payment address", () => {
      const result = parseBIP321("bitcoin:?sp=sp1qinvalid");
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("silent payment"))).toBe(
        true,
      );
    });

    test("parses multiple payment methods", () => {
      const result = parseBIP321(
        `bitcoin:?lno=lno1qqqq02k20d&sp=${TEST_DATA.silentPayment.mainnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
    });
  });

  describe("Ark Addresses", () => {
    test("parses mainnet Ark address", () => {
      const result = parseBIP321(`bitcoin:?ark=${TEST_DATA.ark.mainnet}`);
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("parses testnet Ark address", () => {
      const result = parseBIP321(`bitcoin:?ark=${TEST_DATA.ark.testnet}`);
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("rejects invalid Ark address", () => {
      const result = parseBIP321("bitcoin:?ark=invalid_ark_address");
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Ark address"))).toBe(true);
    });

    test("parses Ark with Bitcoin address", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?ark=${TEST_DATA.ark.mainnet}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
      expect(result.paymentMethods[0]!.type).toBe("onchain");
      expect(result.paymentMethods[1]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[1]!.network).toBe("mainnet");
    });

    test("validates Ark network matches expected network", () => {
      const result = parseBIP321(
        `bitcoin:?ark=${TEST_DATA.ark.mainnet}`,
        "testnet",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
    });
  });

  describe("Network-specific Parameters", () => {
    test("parses bc parameter for mainnet", () => {
      const result = parseBIP321(
        `bitcoin:?bc=${TEST_DATA.addresses.mainnet.bech32}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
    });

    test("parses tb parameter for testnet", () => {
      const result = parseBIP321(
        `bitcoin:?tb=${TEST_DATA.addresses.testnet.bech32}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
    });

    test("rejects testnet address in bc parameter", () => {
      const result = parseBIP321(
        `bitcoin:?bc=${TEST_DATA.addresses.testnet.bech32}`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
    });

    test("parses multiple segwit versions", () => {
      const result = parseBIP321(
        `bitcoin:?bc=${TEST_DATA.addresses.mainnet.bech32}&bc=${TEST_DATA.addresses.mainnet.taproot}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[1]!.network).toBe("mainnet");
    });
  });

  describe("Proof of Payment", () => {
    test("parses pop parameter", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?pop=initiatingapp%3a`,
      );
      expect(result.valid).toBe(true);
      expect(result.pop).toBe("initiatingapp%3a");
      expect(result.popRequired).toBe(false);
    });

    test("parses req-pop parameter", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?req-pop=callbackuri%3a`,
      );
      expect(result.valid).toBe(true);
      expect(result.pop).toBe("callbackuri%3a");
      expect(result.popRequired).toBe(true);
    });

    test("rejects forbidden http scheme in pop", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?pop=https%3aiwantyouripaddress.com`,
      );
      expect(
        result.errors.some((e) => e.includes("Forbidden pop scheme")),
      ).toBe(true);
    });

    test("rejects payment when req-pop uses forbidden scheme", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?req-pop=https%3aevilwebsite.com`,
      );
      expect(result.valid).toBe(false);
    });

    test("rejects multiple pop parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?pop=callback%3a&req-pop=callback%3a`,
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Multiple pop"))).toBe(true);
    });
  });

  describe("Required Parameters", () => {
    test("rejects unknown required parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?req-somethingyoudontunderstand=50`,
      );
      expect(result.valid).toBe(false);
      expect(result.requiredParams.length).toBeGreaterThan(0);
    });

    test("accepts unknown optional parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?somethingyoudontunderstand=50`,
      );
      expect(result.valid).toBe(true);
      expect(result.optionalParams.somethingyoudontunderstand).toEqual(["50"]);
    });
  });

  describe("Invalid URIs", () => {
    test("rejects non-bitcoin URI", () => {
      const result = parseBIP321("ethereum:0x123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid URI: must start with bitcoin:");
    });

    test("rejects empty URI", () => {
      const result = parseBIP321("");
      expect(result.valid).toBe(false);
    });

    test("rejects invalid bitcoin address", () => {
      const result = parseBIP321("bitcoin:invalidaddress123");
      expect(result.valid).toBe(false);
    });

    test("rejects URI with no payment methods", () => {
      const result = parseBIP321("bitcoin:?label=test");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No valid payment methods found");
    });
  });

  describe("Helper Functions", () => {
    test("getPaymentMethodsByNetwork groups correctly", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}?tb=${TEST_DATA.addresses.testnet.bech32}`,
      );
      const byNetwork = getPaymentMethodsByNetwork(result);
      expect(byNetwork.mainnet!.length).toBe(1);
      expect(byNetwork.testnet!.length).toBe(1);
    });

    test("getValidPaymentMethods filters correctly", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}?lightning=invalidinvoice`,
      );
      const valid = getValidPaymentMethods(result);
      expect(valid.length).toBe(1);
      expect(valid[0]!.type).toBe("onchain");
    });

    test("formatPaymentMethodsSummary produces output", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=1.5&label=Test`,
      );
      const summary = formatPaymentMethodsSummary(result);
      expect(summary).toContain("Valid: true");
      expect(summary).toContain("Amount: 1.5 BTC");
      expect(summary).toContain("Label: Test");
    });
  });

  describe("Case Insensitivity", () => {
    test("handles mixed case in parameters", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?AMOUNT=1.5&Label=Test`,
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(1.5);
      expect(result.label).toBe("Test");
    });
  });

  describe("Network Validation", () => {
    test("accepts mainnet address when expecting mainnet", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}`,
        "mainnet",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("rejects testnet address when expecting mainnet", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.testnet.bech32}`,
        "mainnet",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
      expect(result.paymentMethods[0]!.valid).toBe(false);
    });

    test("accepts testnet lightning invoice when expecting testnet", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.testnet}`,
        "testnet",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
    });

    test("rejects mainnet lightning invoice when expecting testnet", () => {
      const result = parseBIP321(
        `bitcoin:?lightning=${TEST_DATA.lightning.mainnet}`,
        "testnet",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("expected testnet"))).toBe(
        true,
      );
    });

    test("rejects mixed networks when expecting specific network", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}?tb=${TEST_DATA.addresses.testnet.bech32}`,
        "mainnet",
      );
      expect(result.valid).toBe(false);
      expect(result.paymentMethods[0]!.valid).toBe(true);
      expect(result.paymentMethods[1]!.valid).toBe(false);
    });

    test("accepts regtest address when expecting regtest", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.regtest.bech32}`,
        "regtest",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("regtest");
    });

    test("works without network parameter (no validation)", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}?tb=${TEST_DATA.addresses.testnet.bech32}`,
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.paymentMethods[1]!.network).toBe("testnet");
    });

    test("validates all payment methods against expected network", () => {
      const result = parseBIP321(
        `bitcoin:${TEST_DATA.addresses.mainnet.bech32}?lightning=${TEST_DATA.lightning.mainnet}`,
        "mainnet",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
      expect(result.paymentMethods.every((pm) => pm.valid)).toBe(true);
    });

    test("accepts Ark testnet address when expecting regtest", () => {
      const result = parseBIP321(
        `bitcoin:?ark=${TEST_DATA.ark.testnet}`,
        "regtest",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("accepts Ark testnet address when expecting signet", () => {
      const result = parseBIP321(
        `bitcoin:?ark=${TEST_DATA.ark.testnet}`,
        "signet",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("accepts silent payment testnet address when expecting regtest", () => {
      const result = parseBIP321(
        `bitcoin:?sp=${TEST_DATA.silentPayment.testnet}`,
        "regtest",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("accepts silent payment testnet address when expecting signet", () => {
      const result = parseBIP321(
        `bitcoin:?sp=${TEST_DATA.silentPayment.testnet}`,
        "signet",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });
  });
});

describe("BIP-321 Encoder", () => {
  describe("Basic Encoding", () => {
    test("encodes simple address", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh });
      expect(result.valid).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}`);
    });

    test("encodes bech32 address", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.bech32 });
      expect(result.valid).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.bech32}`);
    });

    test("encodes taproot address", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.taproot });
      expect(result.valid).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.taproot}`);
    });

    test("encodes testnet address", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.testnet.bech32 });
      expect(result.valid).toBe(true);
      expect(result.network).toBe("testnet");
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.testnet.bech32}`);
    });

    test("encodes empty address with query params", () => {
      const result = encodeBIP321({ lightning: TEST_DATA.lightning.mainnet });
      expect(result.valid).toBe(true);
      expect(result.uri).toBe(`bitcoin:?lightning=${TEST_DATA.lightning.mainnet}`);
    });
  });

  describe("Query Parameters", () => {
    test("encodes label parameter", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, label: "bip321" });
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?label=bip321`);
    });

    test("encodes message parameter", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, message: "bip321" });
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?message=bip321`);
    });

    test("encodes amount parameter", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, amount: 20.3 });
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(20.3);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=20.3`);
    });

    test("encodes zero amount", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, amount: 0 });
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(0);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=0`)
    });

    test("encodes multiple parameters", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: 50,
        label: "Luke-Jr",
        message: "Donation for project xyz",
      });
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(50);
      expect(result.label).toBe("Luke-Jr");
      expect(result.message).toBe("Donation for project xyz");
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=50&label=Luke-Jr&message=Donation%20for%20project%20xyz`);
    });

    test("encodes special characters in label", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, label: "Test & Label" });
      expect(result.valid).toBe(true);
      expect(result.label).toBe("Test & Label");
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?label=Test%20%26%20Label`);
    });

    test("encodes special characters in message", () => {
      const result = encodeBIP321({ address: TEST_DATA.addresses.mainnet.p2pkh, message: "Donation for project xyz" });
      expect(result.valid).toBe(true);
      expect(result.message).toBe("Donation for project xyz");
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?message=Donation%20for%20project%20xyz`);
    });
  });

  describe("Lightning Invoice", () => {
    test("encodes with single lightning invoice", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        lightning: TEST_DATA.lightning.mainnet,
      });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.some((pm) => pm.type === "lightning")).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?lightning=${TEST_DATA.lightning.mainnet}`);
    });

    test("encodes with multiple lightning invoices", () => {
      const result = encodeBIP321({
        lightning: [TEST_DATA.lightning.mainnet, TEST_DATA.lightning.mainnet],
      });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.filter((pm) => pm.type === "lightning").length).toBe(2);
      expect(result.uri).toBe(`bitcoin:?lightning=${TEST_DATA.lightning.mainnet}&lightning=${TEST_DATA.lightning.mainnet}`);
    });

    test("encodes lightning without address", () => {
      const result = encodeBIP321({ lightning: TEST_DATA.lightning.mainnet });
      expect(result.valid).toBe(true);
      expect(result.uri).toBe(`bitcoin:?lightning=${TEST_DATA.lightning.mainnet}`);
    });

    test("encodes testnet lightning invoice", () => {
      const result = encodeBIP321({ lightning: TEST_DATA.lightning.testnet });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.uri).toBe(`bitcoin:?lightning=${TEST_DATA.lightning.testnet}`);
    });
  });

  describe("Alternative Payment Methods", () => {
    test("encodes silent payment address", () => {
      const result = encodeBIP321({ sp: TEST_DATA.silentPayment.mainnet });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.uri).toBe(`bitcoin:?sp=${TEST_DATA.silentPayment.mainnet}`);
    });

    test("encodes testnet silent payment address", () => {
      const result = encodeBIP321({ sp: TEST_DATA.silentPayment.testnet });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.uri).toBe(`bitcoin:?sp=${TEST_DATA.silentPayment.testnet}`);
    });

    test("encodes multiple silent payment addresses", () => {
      const result = encodeBIP321({
        sp: [TEST_DATA.silentPayment.mainnet, TEST_DATA.silentPayment.mainnet],
      });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.filter((pm) => pm.type === "silent-payment").length).toBe(2);
      expect(result.uri).toBe(`bitcoin:?sp=${TEST_DATA.silentPayment.mainnet}&sp=${TEST_DATA.silentPayment.mainnet}`);
    });

    test("encodes Ark address", () => {
      const result = encodeBIP321({ ark: TEST_DATA.ark.mainnet });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("ark");
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.uri).toBe(`bitcoin:?ark=${TEST_DATA.ark.mainnet}`);
    });

    test("encodes testnet Ark address", () => {
      const result = encodeBIP321({ ark: TEST_DATA.ark.testnet });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.uri).toBe(`bitcoin:?ark=${TEST_DATA.ark.testnet}`);
    });

    test("encodes BOLT12 offer", () => {
      const result = encodeBIP321({ lno: "lno1qqqq02k20d" });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.type).toBe("offer");
      expect(result.uri).toBe("bitcoin:?lno=lno1qqqq02k20d");
    });
  });

  describe("Network-specific Addresses", () => {
    test("encodes bc parameter", () => {
      const result = encodeBIP321({ bc: TEST_DATA.addresses.mainnet.bech32 });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
      expect(result.uri).toBe(`bitcoin:?bc=${TEST_DATA.addresses.mainnet.bech32}`);
    });

    test("encodes tb parameter", () => {
      const result = encodeBIP321({ tb: TEST_DATA.addresses.testnet.bech32 });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
      expect(result.uri).toBe(`bitcoin:?tb=${TEST_DATA.addresses.testnet.bech32}`);
    });

    test("encodes bcrt parameter", () => {
      const result = encodeBIP321({ bcrt: TEST_DATA.addresses.regtest.bech32 });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("regtest");
      expect(result.uri).toBe(`bitcoin:?bcrt=${TEST_DATA.addresses.regtest.bech32}`);
    });

    test("encodes multiple bc addresses", () => {
      const result = encodeBIP321({
        bc: [TEST_DATA.addresses.mainnet.bech32, TEST_DATA.addresses.mainnet.taproot],
      });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
      expect(result.uri).toBe(`bitcoin:?bc=${TEST_DATA.addresses.mainnet.bech32}&bc=${TEST_DATA.addresses.mainnet.taproot}`);
    });
  });

  describe("Proof of Payment", () => {
    test("encodes pop parameter", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        pop: "customapp:",
      });
      expect(result.valid).toBe(true);
      expect(result.pop).toBeDefined();
      expect(result.popRequired).toBe(false);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?pop=customapp%3A`);
    });

    test("encodes req-pop parameter", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        reqPop: "customapp:",
      });
      expect(result.valid).toBe(true);
      expect(result.pop).toBeDefined();
      expect(result.popRequired).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?req-pop=customapp%3A`);
    });
  });

  describe("Optional Parameters", () => {
    test("encodes custom optional parameters", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        optionalParams: { custom: "value" },
      });
      expect(result.valid).toBe(true);
      expect(result.optionalParams.custom).toEqual(["value"]);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?custom=value`);
    });

    test("encodes multiple custom optional parameters", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        optionalParams: { foo: "bar", baz: ["one", "two"] },
      });
      expect(result.valid).toBe(true);
      expect(result.optionalParams.foo).toEqual(["bar"]);
      expect(result.optionalParams.baz).toEqual(["one", "two"]);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?foo=bar&baz=one&baz=two`);
    });
  });

  describe("Combined Payment Methods", () => {
    test("encodes address with lightning and silent payment", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        lightning: TEST_DATA.lightning.mainnet,
        sp: TEST_DATA.silentPayment.mainnet,
      });
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(3);
      expect(result.paymentMethods.some((pm) => pm.type === "onchain")).toBe(true);
      expect(result.paymentMethods.some((pm) => pm.type === "lightning")).toBe(true);
      expect(result.paymentMethods.some((pm) => pm.type === "silent-payment")).toBe(true);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?lightning=${TEST_DATA.lightning.mainnet}&sp=${TEST_DATA.silentPayment.mainnet}`);
    });

    test("encodes all parameters together", () => {
      const result = encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: 0.5,
        label: "Test",
        message: "Payment",
        lightning: TEST_DATA.lightning.mainnet,
        sp: TEST_DATA.silentPayment.mainnet,
        ark: TEST_DATA.ark.mainnet,
      });
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(0.5);
      expect(result.label).toBe("Test");
      expect(result.message).toBe("Payment");
      expect(result.paymentMethods.length).toBe(4);
      expect(result.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=0.5&label=Test&message=Payment&lightning=${TEST_DATA.lightning.mainnet}&sp=${TEST_DATA.silentPayment.mainnet}&ark=${TEST_DATA.ark.mainnet}`);
    });
  });

  describe("Invalid Data", () => {
    test("throws on invalid address", () => {
      expect(() => encodeBIP321({ address: "invalid_bitcoin_address" })).toThrow();
    });

    test("throws on negative amount", () => {
      expect(() => encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: -1,
      })).toThrow("Invalid amount format");
    });

    test("throws on NaN amount", () => {
      expect(() => encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: NaN,
      })).toThrow("Invalid amount format");
    });

    test("throws on Infinity amount", () => {
      expect(() => encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: Infinity,
      })).toThrow("Invalid amount format");
    });

    test("throws on invalid lightning invoice", () => {
      expect(() => encodeBIP321({ lightning: "invalid_invoice" })).toThrow(/lightning/i);
    });

    test("throws on invalid silent payment address", () => {
      expect(() => encodeBIP321({ sp: "sp1invalid" })).toThrow(/silent payment/i);
    });

    test("throws on invalid Ark address", () => {
      expect(() => encodeBIP321({ ark: "ark1invalid" })).toThrow(/Ark/i);
    });

    test("throws on forbidden pop scheme", () => {
      expect(() => encodeBIP321({
        address: TEST_DATA.addresses.mainnet.p2pkh,
        reqPop: "https://example.com",
      })).toThrow(/Forbidden pop scheme/i);
    });

    test("throws on network mismatch in bc parameter", () => {
      expect(() => encodeBIP321({ bc: TEST_DATA.addresses.testnet.bech32 })).toThrow(/network mismatch/i);
    });

    test("throws on empty params with no payment method", () => {
      expect(() => encodeBIP321({ label: "test" })).toThrow("No valid payment methods found");
    });
  });

  describe("Round-trip Encoding", () => {
    test("encoded URI can be parsed back", () => {
      const params = {
        address: TEST_DATA.addresses.mainnet.p2pkh,
        amount: 1.5,
        label: "Test Label",
        message: "Test Message",
      };
      const encoded = encodeBIP321(params);
      expect(encoded.valid).toBe(true);
      expect(encoded.address).toBe(params.address);
      expect(encoded.amount).toBe(params.amount);
      expect(encoded.label).toBe(params.label);
      expect(encoded.message).toBe(params.message);
      expect(encoded.uri).toBe(`bitcoin:${TEST_DATA.addresses.mainnet.p2pkh}?amount=1.5&label=Test%20Label&message=Test%20Message`);
    });

    test("encoded lightning URI can be parsed back", () => {
      const encoded = encodeBIP321({ lightning: TEST_DATA.lightning.mainnet });
      expect(encoded.valid).toBe(true);
      expect(encoded.paymentMethods[0]!.type).toBe("lightning");
      expect(encoded.paymentMethods[0]!.value).toBe(TEST_DATA.lightning.mainnet);
      expect(encoded.uri).toBe(`bitcoin:?lightning=${TEST_DATA.lightning.mainnet}`);
    });
  });
});
