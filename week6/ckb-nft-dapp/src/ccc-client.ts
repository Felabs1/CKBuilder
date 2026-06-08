// src/ccc-client.ts
import { ccc } from "@ckb-ccc/ccc";

export const cccClient = new ccc.ClientPublicTestnet();

// Helper: Create a private key signer (for dev/testing)
export function createPrivateKeySigner(privateKey: string) {
  return new ccc.SignerCkbPrivateKey(cccClient, privateKey);
}
