// src/lib.ts
import { ccc } from "@ckb-ccc/connector-react";
import { unpackToRawSporeData } from "@spore-sdk/core";

export async function mintSporeWithCCC(
  signer: ccc.Signer,
  fileContent: Uint8Array,
  fileType: string,
): Promise<{ txHash: string; outputIndex: number }> {
  console.log("Bypassing Lumos. Building Spore natively with CCC...");

  // 1. Use CCC's native Spore builder! It natively understands JoyID.
  const { tx, id } = await ccc.spore.createSpore({
    signer,
    data: {
      contentType: fileType,
      content: fileContent,
    },
  });

  // 2. Instruct CCC to calculate and pay the miner fee
  await tx.completeFeeBy(signer, 2000n);

  // 3. Sign and send the transaction
  const txHash = await signer.sendTransaction(tx);

  console.log(`Spore Minted! TX: ${txHash} | Spore ID: ${id}`);

  // CCC typically places the minted Spore at output index 0
  return { txHash, outputIndex: 0 };
}

export async function showSporeContent(
  signer: ccc.Signer,
  txHash: string,
  index = 0,
) {
  const client = signer.client;

  // CKB RPC requires a hex string for the index
  const indexHex = "0x" + index.toString(16);

  const cell = await client.getCellLive({ txHash, index: indexHex }, true);

  if (!cell) {
    alert("Cell not found! It might still be pending in the mempool.");
    return null;
  }

  // We only use the SDK here to decode the raw hex data back into JSON
  const sporeData = unpackToRawSporeData(cell.outputData);
  console.log("On-chain Spore Data: ", sporeData);
  return sporeData;
}
