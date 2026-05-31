// src/ccc-client.ts
import { ccc } from "@ckb-ccc/core";

// Create a CCC client for CKB Testnet
export const cccClient = new ccc.ClientPublicTestnet();

if (typeof window !== "undefined") {
  (window as any).cccClient = cccClient;
  (window as any).ccc = ccc;
}
