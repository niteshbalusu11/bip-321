import {
  parseBIP321,
  getPaymentMethodsByNetwork,
  getValidPaymentMethods,
  formatPaymentMethodsSummary,
} from "./index";

console.log("=== BIP-321 Parser Examples ===\n");

// Example 1: Simple mainnet address
console.log("1. Simple Mainnet Address");
console.log("URI: bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
const example1 = parseBIP321("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
console.log(`Valid: ${example1.valid}`);
console.log(`Network: ${example1.network}`);
console.log(`Address: ${example1.address}`);
console.log();

// Example 2: Payment with amount and label
console.log("2. Payment with Amount and Label");
const example2 = parseBIP321(
  "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5&label=Donation&message=Thank%20you%20for%20your%20support",
);
console.log(`Valid: ${example2.valid}`);
console.log(`Amount: ${example2.amount} BTC`);
console.log(`Label: ${example2.label}`);
console.log(`Message: ${example2.message}`);
console.log();

// Example 3: Lightning invoice with fallback
console.log("3. Lightning Invoice with On-Chain Fallback");
const example3 = parseBIP321(
  "bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
);
console.log(`Valid: ${example3.valid}`);
console.log(`Payment methods: ${example3.paymentMethods.length}`);
example3.paymentMethods.forEach((method, i) => {
  console.log(
    `  ${i + 1}. ${method.type} (${method.network}) - Valid: ${method.valid}`,
  );
});
console.log();

// Example 4: Lightning-only payment
console.log("4. Lightning-Only Payment");
const example4 = parseBIP321(
  "bitcoin:?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
);
console.log(`Valid: ${example4.valid}`);
console.log(`Address in path: ${example4.address || "none"}`);
console.log(`Payment type: ${example4.paymentMethods[0]?.type}`);
console.log(`Network: ${example4.paymentMethods[0]?.network}`);
console.log();

// Example 5: Multiple payment methods
console.log("5. Multiple Payment Methods");
const example5 = parseBIP321(
  "bitcoin:?lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs&lno=lno1bogusoffer&sp=sp1qsilentpayment",
);
console.log(`Valid: ${example5.valid}`);
console.log(`Total payment methods: ${example5.paymentMethods.length}`);
example5.paymentMethods.forEach((method) => {
  console.log(`  - ${method.type}: ${method.valid ? "valid" : "invalid"}`);
});
console.log();

// Example 6: Network-specific parameters
console.log("6. Network-Specific Parameters");
const example6 = parseBIP321(
  "bitcoin:?bc=bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq&tb=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
);
const byNetwork = getPaymentMethodsByNetwork(example6);
console.log(`Valid: ${example6.valid}`);
console.log(`Mainnet methods: ${byNetwork.mainnet?.length || 0}`);
console.log(`Testnet methods: ${byNetwork.testnet?.length || 0}`);
console.log();

// Example 7: Testnet lightning invoice
console.log("7. Testnet Lightning Invoice");
const example7 = parseBIP321(
  "bitcoin:?lightning=lntb2500n1pwxlkl5pp5g8hz28tlf950ps942lu3dknfete8yax2ctywpwjs872x9kngvvuqdqage5hyum5yp6x2um5yp5kuan0d93k2cqzyskdc5s2ltgm9kklz42x3e4tggdd9lcep2s9t2yk54gnfxg48wxushayrt52zjmua43gdnxmuc5s0c8g29ja9vnxs6x3kxgsha07htcacpmdyl64",
);
console.log(`Valid: ${example7.valid}`);
console.log(`Network: ${example7.paymentMethods[0]?.network}`);
console.log();

// Example 8: Taproot address
console.log("8. Taproot Address (bc1p...)");
const example8 = parseBIP321(
  "bitcoin:?bc=bc1pdyp8m5mhurxa9mf822jegnhu49g2zcchgcq8jzrjxg58u2lvudyqftt43a",
);
console.log(`Valid: ${example8.valid}`);
console.log(`Network: ${example8.paymentMethods[0]?.network}`);
console.log(
  `Address: ${example8.paymentMethods[0]?.value.substring(0, 20)}...`,
);
console.log();

// Example 9: Error handling - invalid address
console.log("9. Error Handling - Invalid Address");
const example9 = parseBIP321("bitcoin:invalidaddress123");
console.log(`Valid: ${example9.valid}`);
console.log("Errors:");
example9.errors.forEach((error) => console.log(`  - ${error}`));
console.log();

// Example 10: Error handling - network mismatch
console.log("10. Error Handling - Network Mismatch");
const example10 = parseBIP321(
  "bitcoin:?bc=tb1qghfhmd4zh7ncpmxl3qzhmq566jk8ckq4gafnmg",
);
console.log(`Valid: ${example10.valid}`);
console.log("Errors:");
example10.errors.forEach((error) => console.log(`  - ${error}`));
console.log();

// Example 11: Using helper functions
console.log("11. Helper Functions");
const example11 = parseBIP321(
  "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1.5&label=Test%20Payment&lightning=lnbc15u1p3xnhl2pp5jptserfk3zk4qy42tlucycrfwxhydvlemu9pqr93tuzlv9cc7g3sdqsvfhkcap3xyhx7un8cqzpgxqzjcsp5f8c52y2stc300gl6s4xswtjpc37hrnnr3c9wvtgjfuvqmpm35evq9qyyssqy4lgd8tj637qcjp05rdpxxykjenthxftej7a2zzmwrmrl70fyj9hvj0rewhzj7jfyuwkwcg9g2jpwtk3wkjtwnkdks84hsnu8xps5vsq4gj5hs",
);

console.log("Valid payment methods:");
const validMethods = getValidPaymentMethods(example11);
validMethods.forEach((method) => {
  console.log(`  - ${method.type} (${method.network})`);
});

console.log("\nPayment methods by network:");
const grouped = getPaymentMethodsByNetwork(example11);
Object.entries(grouped).forEach(([network, methods]) => {
  if (methods.length > 0) {
    console.log(`  ${network}: ${methods.length} method(s)`);
  }
});

console.log("\nFormatted summary:");
console.log(formatPaymentMethodsSummary(example11));
console.log();

// Example 12: Proof of payment
console.log("12. Proof of Payment Callback");
const example12 = parseBIP321(
  "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?pop=myapp%3acallback",
);
console.log(`Valid: ${example12.valid}`);
console.log(`Pop URI: ${example12.pop}`);
console.log(`Pop required: ${example12.popRequired}`);
console.log();

// Example 13: Case insensitivity
console.log("13. Case Insensitivity");
const example13 = parseBIP321(
  "BITCOIN:BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ?AMOUNT=1.0&LABEL=Test",
);
console.log(`Valid: ${example13.valid}`);
console.log(`Amount: ${example13.amount}`);
console.log(`Label: ${example13.label}`);
console.log();

console.log("=== All examples completed ===");
