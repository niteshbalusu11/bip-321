import { test, expect, describe } from "bun:test";
import {
  parseBIP321,
  getPaymentMethodsByNetwork,
  getValidPaymentMethods,
  formatPaymentMethodsSummary,
} from "./index";

describe("BIP-321 Parser", () => {
  describe("Basic Address Parsing", () => {
    test("parses simple mainnet address", () => {
      const result = parseBIP321("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
      expect(result.valid).toBe(true);
      expect(result.address).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
      expect(result.network).toBe("mainnet");
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("onchain");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("parses bech32 mainnet address", () => {
      const result = parseBIP321(
        "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("mainnet");
      expect(result.paymentMethods[0]!.valid).toBe(true);
    });

    test("parses testnet address", () => {
      const result = parseBIP321(
        "bitcoin:tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("testnet");
    });

    test("parses uppercase URI", () => {
      const result = parseBIP321(
        "BITCOIN:BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ",
      );
      expect(result.valid).toBe(true);
      expect(result.network).toBe("mainnet");
    });
  });

  describe("Query Parameters", () => {
    test("parses label parameter", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?label=Luke-Jr",
      );
      expect(result.valid).toBe(true);
      expect(result.label).toBe("Luke-Jr");
    });

    test("parses amount parameter", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=20.3",
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(20.3);
    });

    test("parses message parameter", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?message=Donation%20for%20project%20xyz",
      );
      expect(result.valid).toBe(true);
      expect(result.message).toBe("Donation for project xyz");
    });

    test("parses multiple parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=50&label=Luke-Jr&message=Donation%20for%20project%20xyz",
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(50);
      expect(result.label).toBe("Luke-Jr");
      expect(result.message).toBe("Donation for project xyz");
    });

    test("rejects invalid amount with comma", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=50,000.00",
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid amount format");
    });

    test("rejects multiple label parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?label=Luke-Jr&label=Matt",
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Multiple label parameters not allowed");
    });

    test("rejects multiple amount parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=42&amount=10",
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Multiple amount parameters not allowed");
    });
  });

  describe("Lightning Invoice", () => {
    test("parses lightning invoice with fallback", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
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
        "bitcoin:?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
      );
      expect(result.valid).toBe(true);
      expect(result.address).toBeUndefined();
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("lightning");
    });

    test("detects signet lightning invoice", () => {
      const result = parseBIP321(
        "bitcoin:?lightning=lntbs10u1p5s6wgtsp5d8a763exauvdk6s5gwvl8zmuapmgjq05fdv6trasjd4slvgkvzzqpp56vxdyl24hmkpz0tvqq84xdpqqeql3x7kh8tey4uum2cu8jny6djqdq4g9exkgznw3hhyefqyvenyxqzjccqp2rzjqdwy5et9ygczjl2jqmr9e5xm28u3gksjfrf0pht04uwz2lt9d59cypqelcqqq8gqqqqqqqqpqqqqqzsqqc9qxpqysgq0x0pg2s65rnp2cr35td5tq0vwgmnrghkpzt93eypqvvfu5m40pcjl9k2x2m4kqgvz2ez8tzxqgw0nyeg2w60nfky579uakd4mhr3ncgp0xwars",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("signet");
    });

    test("detects regtest lightning invoice", () => {
      const result = parseBIP321(
        "bitcoin:?lightning=lnbcrt50u1p5s6w2zpp5juf0r9zutj4zv00kpuuqmgn246azqaq0u5kksx93p46ue94gpmrsdqqcqzzsxqyz5vqsp57u7clsm57nas7c0r2p4ujxr8whla6gxmwf44yqt9f862evjzd3ds9qxpqysgqrwvspjd8g3cfrkg2mrmxfdjcwk5nenw2qnmrys0rvkdmxes6jf5xfykunl5g9hnnahsnz0c90u7k42hmr7w90c0qkw3lllwy40mmqgsqjtyzpd",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("regtest");
    });

    test("detects testnet lightning invoice", () => {
      const result = parseBIP321(
        "bitcoin:?lightning=lntb2500n1pwxlkl5pp5g8hz28tlf950ps942lu3dknfete8yax2ctywpwjs872x9kngvvuqdqage5hyum5yp6x2um5yp5kuan0d93k2cqzyskdc5s2ltgm9kklz42x3e4tggdd9lcep2s9t2yk54gnfxg48wxushayrt52zjmua43gdnxmuc5s0c8g29ja9vnxs6x3kxgsha07htcacpmdyl64",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
    });

    test("rejects testnet address in bc parameter", () => {
      const result = parseBIP321(
        "bitcoin:?bc=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
    });
  });

  describe("Alternative Payment Methods", () => {
    test("parses BOLT12 offer", () => {
      const result = parseBIP321("bitcoin:?lno=lno1bogusoffer");
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("lno");
    });

    test("parses silent payment address", () => {
      const result = parseBIP321("bitcoin:?sp=sp1qsilentpayment");
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0]!.type).toBe("silent-payment");
    });

    test("parses multiple payment methods", () => {
      const result = parseBIP321(
        "bitcoin:?lno=lno1bogusoffer&sp=sp1qsilentpayment",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods.length).toBe(2);
    });
  });

  describe("Network-specific Parameters", () => {
    test("parses bc parameter for mainnet", () => {
      const result = parseBIP321(
        "bitcoin:?bc=bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("mainnet");
    });

    test("parses tb parameter for testnet", () => {
      const result = parseBIP321(
        "bitcoin:?tb=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
      );
      expect(result.valid).toBe(true);
      expect(result.paymentMethods[0]!.network).toBe("testnet");
    });

    test("rejects testnet address in bc parameter", () => {
      const result = parseBIP321(
        "bitcoin:?bc=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("network mismatch"))).toBe(
        true,
      );
    });

    test("parses multiple segwit versions", () => {
      const result = parseBIP321(
        "bitcoin:?bc=bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq&bc=bc1pdyp8m5mhurxa9mf822jegnhu49g2zcchgcq8jzrjxg58u2lvudyqftt43a",
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
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?pop=initiatingapp%3a",
      );
      expect(result.valid).toBe(true);
      expect(result.pop).toBe("initiatingapp%3a");
      expect(result.popRequired).toBe(false);
    });

    test("parses req-pop parameter", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?req-pop=callbackuri%3a",
      );
      expect(result.valid).toBe(true);
      expect(result.pop).toBe("callbackuri%3a");
      expect(result.popRequired).toBe(true);
    });

    test("rejects forbidden http scheme in pop", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?pop=https%3aiwantyouripaddress.com",
      );
      expect(
        result.errors.some((e) => e.includes("Forbidden pop scheme")),
      ).toBe(true);
    });

    test("rejects payment when req-pop uses forbidden scheme", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?req-pop=https%3aevilwebsite.com",
      );
      expect(result.valid).toBe(false);
    });

    test("rejects multiple pop parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?pop=callback%3a&req-pop=callback%3a",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Multiple pop"))).toBe(true);
    });
  });

  describe("Required Parameters", () => {
    test("rejects unknown required parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?req-somethingyoudontunderstand=50",
      );
      expect(result.valid).toBe(false);
      expect(result.requiredParams.length).toBeGreaterThan(0);
    });

    test("accepts unknown optional parameters", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?somethingyoudontunderstand=50",
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
        "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?tb=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
      );
      const byNetwork = getPaymentMethodsByNetwork(result);
      expect(byNetwork.mainnet!.length).toBe(1);
      expect(byNetwork.testnet!.length).toBe(1);
    });

    test("getValidPaymentMethods filters correctly", () => {
      const result = parseBIP321(
        "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?lightning=invalidinvoice",
      );
      const valid = getValidPaymentMethods(result);
      expect(valid.length).toBe(1);
      expect(valid[0]!.type).toBe("onchain");
    });

    test("formatPaymentMethodsSummary produces output", () => {
      const result = parseBIP321(
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1.5&label=Test",
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
        "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?AMOUNT=1.5&Label=Test",
      );
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(1.5);
      expect(result.label).toBe("Test");
    });
  });
});
