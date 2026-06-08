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
  "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb";
// Remove MY_CONTRACT_CODE_HASH - it's not a contract hash
const INDEXER_URL = "https://testnet.ckb.dev/indexer";

const toRpcScript = (s: any) => ({
  code_hash: s.codeHash,
  hash_type: s.hashType,
  args: s.args,
});

async function queryIndexer(searchKey: any) {
  const res = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "get_cells",
      params: [searchKey, "asc", "0x3E8"],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result?.objects || [];
}

function decodeUdtAmount(hex: string): bigint {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = clean.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
  let amount = 0n;
  for (let i = 0; i < 16 && i < bytes.length; i++) {
    if (!isNaN(bytes[i])) {
      amount += BigInt(bytes[i]) << (BigInt(i) * 8n);
    }
  }
  return amount;
}

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
  const FEE_BUFFER = 100_000_000n;

  const sudtTypeRpc = {
    code_hash: XUDT_CODE_HASH,
    hash_type: "type",
    args: SUDT_ARGS,
  };

  // Query by lock first (more reliable)
  const senderCells = await queryIndexer({
    script: toRpcScript(senderLock),
    script_type: "lock",
  });

  let udtSum = 0n;
  let totalCap = 0n;
  const inputs: any[] = [];

  for (const cell of senderCells) {
    const cellOutput = cell.output;
    const outputData = cell.output_data;
    const outPoint = cell.out_point;

    if (!outPoint) continue;

    const cellType = cellOutput.type;
    if (!cellType) continue;

    if (
      cellType.code_hash === XUDT_CODE_HASH &&
      cellType.hash_type === "type" &&
      cellType.args === SUDT_ARGS
    ) {
      // 🔑 FIX: Use helper that handles hex string properly
      const cellAmount = decodeUdtAmount(outputData);

      udtSum += cellAmount;
      totalCap += BigInt(cellOutput.capacity);

      inputs.push({
        previousOutput: {
          txHash: outPoint.tx_hash,
          index: parseInt(outPoint.index),
        },
      });

      if (udtSum >= amt) break;
    }
  }

  if (udtSum < amt) {
    throw new Error(
      `Insufficient SUDT balance. Found: ${udtSum}, Needed: ${amt}`,
    );
  }

  const changeAmt = udtSum - amt;
  const requiredUdtCap = changeAmt > 0n ? MIN_CAP * 2n : MIN_CAP;
  const requiredCap = requiredUdtCap + FEE_BUFFER;

  if (totalCap < requiredCap) {
    const ckbCells = await queryIndexer({
      script: toRpcScript(senderLock),
      script_type: "lock",
    });

    for (const cell of ckbCells) {
      if (totalCap >= requiredCap) break;
      const outPoint = cell.out_point;
      if (!outPoint) continue;
      if (cell.output?.type) continue;

      const alreadyUsed = inputs.some(
        (i) => i.previousOutput.txHash === outPoint.tx_hash,
      );
      if (!alreadyUsed) {
        totalCap += BigInt(cell.output.capacity);
        inputs.push({
          previousOutput: {
            txHash: outPoint.tx_hash,
            index: parseInt(outPoint.index),
          },
        });
      }
    }
  }

  if (totalCap < requiredCap) {
    throw new Error(
      "Insufficient pure CKB capacity. Need more CKB in JoyID wallet.",
    );
  }

  // Build outputs
  const outputs: any[] = [
    {
      lock: recipientLock,
      type: { codeHash: XUDT_CODE_HASH, hashType: "type", args: SUDT_ARGS },
      capacity: MIN_CAP,
    },
  ];
  const outputsData: string[] = [ccc.numLeToBytes(amt, 16)];

  if (changeAmt > 0n) {
    outputs.push({
      lock: senderLock,
      type: { codeHash: XUDT_CODE_HASH, hashType: "type", args: SUDT_ARGS },
      capacity: MIN_CAP,
    });
    outputsData.push(ccc.numLeToBytes(changeAmt, 16));
  }

  const totalOutputCap = outputs.reduce(
    (sum, o) => sum + BigInt(o.capacity),
    0n,
  );
  const ckbChange = totalCap - totalOutputCap - FEE_BUFFER;
  outputs.push({ lock: senderLock, capacity: ckbChange });
  outputsData.push("0x");

  const tx = ccc.Transaction.from({ inputs, outputs, outputsData });

  await tx.addCellDepsOfKnownScripts(cccClient, ccc.KnownScript.XUdt);
  if (
    senderLock.codeHash ===
    "0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac"
  ) {
    await tx.addCellDepsOfKnownScripts(cccClient, ccc.KnownScript.OmniLock);
  }

  const dummy = new ccc.SignerCkbPrivateKey(cccClient, "0x" + "00".repeat(32));
  await tx.completeFeeBy(dummy, 1000);

  const txHex = tx.toString();

  const signedTxHex = await signTransaction({
    transaction: txHex,
    address: joyidAddress,
    redirectURL: window.location.origin,
  } as any);

  return await cccClient.sendTransaction(signedTxHex);
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
