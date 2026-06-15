import { ccc, hexFrom } from "@ckb-ccc/core";
import { cccClient, readEnvNetwork } from "./ccc-client";
import scripts from "../deployment/scripts.json";

const myScripts = scripts[readEnvNetwork()] as any;
const SCRIPT_NAME = "simple-lock";

function getContractScript() {
  const contract = myScripts[SCRIPT_NAME];
  if (!contract) {
    throw new Error(
      `Contract "${SCRIPT_NAME}" not found in deployment/scripts.json`,
    );
  }
  return contract;
}

export function stringToBytesHex(text: string): `0x${string}` {
  return hexFrom(Array.from(text).map((c) => c.charCodeAt(0)));
}

export async function capacityOf(address: string): Promise<bigint> {
  const addr = await ccc.Address.fromString(address, cccClient);
  return cccClient.getBalance([addr.script]);
}

export async function wait(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function shannonToCKB(amount: bigint) {
  return amount / BigInt(100000000);
}

export function generateAccount(hash: string) {
  const contract = getContractScript();
  const lockScript = {
    codeHash: contract.codeHash,
    hashType: contract.hashType,
    args: hexFrom(`0x${hash}`),
  };
  const address = ccc.Address.fromScript(lockScript, cccClient).toString();
  return {
    address,
    lockScript: ccc.Script.from(lockScript),
  };
}

export async function unlock(
  fromAddr: string,
  toAddr: string,
  amountInCKB: string,
): Promise<string> {
  const fromScript = (await ccc.Address.fromString(fromAddr, cccClient)).script;
  const toScript = (await ccc.Address.fromString(toAddr, cccClient)).script;
  const readSigner = new ccc.SignerCkbScriptReadonly(cccClient, fromScript);
  const contract = getContractScript();

  const tx = ccc.Transaction.from({
    outputs: [{ lock: toScript }],
    outputsData: [],
  });

  tx.outputs.forEach((output, i) => {
    if (output.capacity > ccc.fixedPointFrom(amountInCKB)) {
      alert(`Insufficient capacity at output ${i} to store data`);
      return;
    }
    output.capacity = ccc.fixedPointFrom(amountInCKB);
  });

  const preimageAnswer = window.prompt("please enter the preimage: ");
  if (preimageAnswer == null) {
    throw new Error("user abort input!");
  }

  await tx.addCellDeps(contract.cellDeps[0].cellDep);

  const minChangeCapacity = ccc.fixedPointFrom(
    ccc.CellOutput.from({ capacity: BigInt(1000), lock: fromScript })
      .occupiedSize,
  );
  const fee = BigInt(10000);
  await tx.completeInputsByCapacity(readSigner, minChangeCapacity + fee);

  const balanceDiff =
    (await tx.getInputsCapacity(cccClient)) - tx.getOutputsCapacity();
  if (balanceDiff > minChangeCapacity + fee) {
    tx.addOutput({ lock: fromScript, capacity: balanceDiff - fee });
  }

  tx.setWitnessArgsAt(
    0,
    new ccc.WitnessArgs(stringToBytesHex(preimageAnswer)),
  );

  return cccClient.sendTransaction(tx);
}
