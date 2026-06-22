import { getNetwork } from "../config/contract";

export function getTxExplorerUrl(txHash: string): string {
  const base =
    getNetwork() === "mainnet"
      ? "https://explorer.nervos.org"
      : "https://testnet.explorer.nervos.org";

  return `${base}/transaction/${txHash}`;
}
