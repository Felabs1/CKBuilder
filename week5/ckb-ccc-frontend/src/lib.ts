// src/lib.ts
import { ccc } from "@ckb-ccc/core";
import { signTransaction } from "@joyid/ckb";
// Remove signTransaction, import signRawTransaction instead
import { signRawTransaction } from "@joyid/ckb";
import { cccClient } from "./ccc-client";

// 🔑 YOUR DEPLOYED SUDT IDENTIFIER (from your deployment info)
// This is the unique "contract address" for your token
export const SUDT_ARGS =
  "0x2bac47f8af8f8e61dcfed0ee9300edf42f45c663f8ef7f6a6c51ee02d5e5ebde00000000";
const XUDT_CODE_HASH =
  "0x20965b668e0476d68a090425fd663907587f66c35f8bb2ee5172a6dc2666a37e";
// Remove MY_CONTRACT_CODE_HASH - it's not a contract hash
const INDEXER_URL = "https://testnet.ckb.dev/indexer";

// Query SUDT balance for a given address
export async function getSUDTBalance(address: string): Promise<bigint> {
  try {
    // Parse address → script
    const addrObj = await ccc.Address.fromString(address, cccClient);

    // Build the SUDT type script using CCC's known script helper
    const sudtType = await ccc.Script.fromKnownScript(
      cccClient,
      ccc.KnownScript.XUdt, // Matches your SUDT contract
      SUDT_ARGS,
    );

    // Query all cells with: lock=user's address AND type=SUDT
    let totalBalance = 0n;
    const collector = cccClient.findCellsByType(sudtType, true);

    for await (const cell of collector) {
      // Only count cells owned by this address
      if (cell.cellOutput.lock.args === addrObj.script.args) {
        // Decode 16-byte little-endian amount → BigInt
        const amount = ccc.numLeFromBytes(cell.outputData);
        totalBalance += amount;
      }
    }

    return totalBalance;
  } catch (err) {
    console.error("Balance query failed:", err);
    return 0n;
  }
}

export async function transferSUDT(
  senderPrivKey: string,
  recipientAddress: string,
  amount: string,
): Promise<string> {
  const signer = new ccc.SignerCkbPrivateKey(cccClient, senderPrivKey);
  const senderLock = (await signer.getAddressObjSecp256k1()).script;
  const recipientLock = (
    await ccc.Address.fromString(recipientAddress, cccClient)
  ).script;

  const sudtType = await ccc.Script.fromKnownScript(
    cccClient,
    ccc.KnownScript.XUdt,
    SUDT_ARGS,
  );

  // 🔥 FIX: 150 CKB per UDT output cell
  const MIN_UDT_CELL_CAPACITY = 150n * 100_000_000n;

  const tx = ccc.Transaction.from({
    outputs: [
      { lock: recipientLock, type: sudtType, capacity: MIN_UDT_CELL_CAPACITY },
    ],
    outputsData: [ccc.numLeToBytes(amount, 16)],
  });

  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.XUdt);
  await tx.completeInputsByUdt(signer, sudtType);

  const inputUdtBal = await tx.getInputsUdtBalance(signer.client, sudtType);
  const outputUdtBal = tx.getOutputsUdtBalance(sudtType);
  if (inputUdtBal > outputUdtBal) {
    tx.addOutput(
      { lock: senderLock, type: sudtType, capacity: MIN_UDT_CELL_CAPACITY },
      ccc.numLeToBytes(inputUdtBal - outputUdtBal, 16),
    );
  }

  // Pure CKB change output
  tx.addOutput({ lock: senderLock });

  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);

  return await signer.sendTransaction(tx);
}

export async function recoverFromPrivateKey(privateKey: string) {
  const signer = new ccc.SignerCkbPrivateKey(cccClient, privateKey);
  const addressObj = await signer.getAddressObjSecp256k1();

  return {
    publicKey: signer.publicKey,
    lockScript: addressObj.script,
    address: addressObj.toString(), // ckt1q... testnet address
    // Standard SUDT args derivation: lockScript hash + "00000000"
    sudtArgs: addressObj.script.hash() + "00000000",
  };
}

// Add to src/lib.ts
export async function mintSUDT(
  ownerPrivKey: string,
  recipientAddress: string,
  amount: string,
): Promise<string> {
  const signer = new ccc.SignerCkbPrivateKey(cccClient, ownerPrivKey);
  const ownerLock = (await signer.getAddressObjSecp256k1()).script;
  const recipientLock = (
    await ccc.Address.fromString(recipientAddress, cccClient)
  ).script;

  const ownerModeArgs = ownerLock.hash() + "00000000";
  const sudtType = await ccc.Script.fromKnownScript(
    cccClient,
    ccc.KnownScript.XUdt,
    ownerModeArgs,
  );

  // 🔥 FIX: 150 CKB safely covers lock + type script + 16 bytes data
  const MIN_UDT_CELL_CAPACITY = 150n * 100_000_000n;

  const tx = ccc.Transaction.from({
    outputs: [
      {
        lock: recipientLock,
        type: sudtType,
        capacity: MIN_UDT_CELL_CAPACITY,
      },
    ],
    outputsData: [ccc.numLeToBytes(amount, 16)],
  });

  await tx.addCellDepsOfKnownScripts(signer.client, ccc.KnownScript.XUdt);
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, 1000);

  return await signer.sendTransaction(tx);
}

export async function transferSUDTWithJoyID(
  joyidAddress: string,
  recipientAddress: string,
  amount: string,
): Promise<string> {
  const senderAddr = await ccc.Address.fromString(joyidAddress, cccClient);
  const recipientAddr = await ccc.Address.fromString(
    recipientAddress,
    cccClient,
  );
  const senderLock = senderAddr.script;
  const recipientLock = recipientAddr.script;

  const amt = BigInt(amount);
  const MIN_CAP = 150n * 100_000_000n;

  const sudtType = await ccc.Script.fromKnownScript(
    cccClient,
    ccc.KnownScript.XUdt,
    SUDT_ARGS,
  );

  let udtSum = 0n;
  let totalCap = 0n;
  const inputs: any[] = [];

  const udtCollector = cccClient.findCellsByType(sudtType, true);
  for await (const cell of udtCollector) {
    // ✅ THE FIX: skip any cell the indexer returned without an outPoint
    if (!cell.outPoint) continue;

    if (cell.cellOutput.lock.args === senderLock.args) {
      const cellAmount = ccc.numLeFromBytes(cell.outputData);
      udtSum += cellAmount;
      totalCap += cell.cellOutput.capacity;
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
      });
      if (udtSum >= amt) break;
    }
  }

  if (udtSum < amt)
    throw new Error(
      `Insufficient SUDT balance. Found: ${udtSum}, Needed: ${amt}`,
    );

  const changeAmt = udtSum - amt;
  const requiredUdtCap = changeAmt > 0n ? MIN_CAP * 2n : MIN_CAP;
  const requiredCap = requiredUdtCap + 85n * 100_000_000n + 100000n;

  if (totalCap < requiredCap) {
    const ckbCollector = cccClient.findCellsByLock(senderLock, true);
    for await (const cell of ckbCollector) {
      if (totalCap >= requiredCap) break;
      // ✅ THE FIX: same guard here
      if (!cell.outPoint) continue;
      if (cell.cellOutput.type || cell.outputData !== "0x") continue;

      const alreadyUsed = inputs.some(
        (i) =>
          i.previousOutput.txHash === cell.outPoint!.txHash &&
          i.previousOutput.index === cell.outPoint!.index,
      );
      if (!alreadyUsed) {
        totalCap += cell.cellOutput.capacity;
        inputs.push({
          previousOutput: {
            txHash: cell.outPoint.txHash,
            index: cell.outPoint.index,
          },
        });
      }
    }
  }

  if (totalCap < requiredCap)
    throw new Error(
      "Insufficient pure CKB capacity. Need more CKB in JoyID wallet.",
    );

  const outputs: any[] = [
    { lock: recipientLock, type: sudtType, capacity: MIN_CAP },
  ];
  const outputsData: string[] = [ccc.hexFrom(ccc.numLeToBytes(amt, 16))];

  if (changeAmt > 0n) {
    outputs.push({ lock: senderLock, type: sudtType, capacity: MIN_CAP });
    outputsData.push(ccc.hexFrom(ccc.numLeToBytes(changeAmt, 16)));
  }

  const totalOutputCapSoFar = outputs.reduce(
    (sum, o) => sum + BigInt(o.capacity),
    0n,
  );
  const ckbChange = totalCap - totalOutputCapSoFar - 100000n;
  outputs.push({ lock: senderLock, capacity: ckbChange });
  outputsData.push("0x");

  const tx = ccc.Transaction.from({
    inputs,
    outputs,
    outputsData,
    witnesses: inputs.map(() => "0x"),
    cellDeps: [],
    headerDeps: [],
  });

  await tx.addCellDepsOfKnownScripts(cccClient, ccc.KnownScript.XUdt);
  await tx.addCellDepsOfKnownScripts(cccClient, ccc.KnownScript.OmniLock);

  const rawTx = {
    version: "0x0",
    cellDeps: (tx.cellDeps || []).map((dep: any) => ({
      outPoint: {
        txHash: dep.outPoint.txHash as string,
        index: "0x" + BigInt(dep.outPoint.index).toString(16),
      },
      depType:
        dep.depType === "depGroup" || dep.depType === 1 ? "depGroup" : "code",
    })),
    headerDeps: [] as string[],
    inputs: (tx.inputs || []).map((input: any) => ({
      previousOutput: {
        txHash: input.previousOutput.txHash as string,
        index: "0x" + BigInt(input.previousOutput.index).toString(16),
      },
      since: "0x0",
    })),
    outputs: (tx.outputs || []).map((output: any) => {
      const formatted: any = {
        capacity: "0x" + BigInt(output.capacity).toString(16),
        lock: {
          codeHash: output.lock.codeHash as string,
          hashType: output.lock.hashType,
          args: output.lock.args as string,
        },
      };
      if (output.type) {
        formatted.type = {
          codeHash: output.type.codeHash as string,
          hashType: output.type.hashType,
          args: output.type.args as string,
        };
      }
      return formatted;
    }),
    outputsData,
    witnesses: inputs.map(() => "0x"),
  };

  const signed = await signRawTransaction(rawTx as any, joyidAddress);
  const finalTx = ccc.Transaction.from(signed);
  return await cccClient.sendTransaction(finalTx);
}
// @ts-ignore
window.recoverFromPrivateKey = recoverFromPrivateKey;

// @ts-ignore - expose for debugging
if (typeof window !== "undefined") {
  window.debugSUDT = async (privateKey: string) => {
    const signer = new ccc.SignerCkbPrivateKey(cccClient, privateKey);
    const addrObj = await signer.getAddressObjSecp256k1();
    const address = addrObj.toString();

    const sudtType = await ccc.Script.fromKnownScript(
      cccClient,
      ccc.KnownScript.XUdt,
      SUDT_ARGS, // <-- This is the value we're querying with
    );

    console.log("🔍 Debug Info:");
    console.log("Address:", address);
    console.log("SUDT_ARGS used:", SUDT_ARGS);
    console.log("Expected SUDT type hash:", sudtType.hash());

    let balance = 0n;
    const cells = [];
    const collector = cccClient.findCellsByType(sudtType, true);

    for await (const cell of collector) {
      if (cell.cellOutput.lock.args === addrObj.script.args) {
        const amount = ccc.numLeFromBytes(cell.outputData);
        balance += amount;
        cells.push({
          txHash: cell.outPoint?.txHash,
          index: cell.outPoint?.index,
          capacity: ccc.fixedPointToString(cell.cellOutput.capacity),
          amount: amount.toString(),
        });
      }
    }

    console.log("✅ Total SUDT Balance:", balance.toString());
    console.log("📦 Cells holding your tokens:", cells);
    return { address, balance, cells, sudtTypeHash: sudtType.hash() };
  };
}
