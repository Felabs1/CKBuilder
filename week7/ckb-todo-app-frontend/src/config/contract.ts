import { ccc } from "@ckb-ccc/connector-react";

type Network = "testnet" | "mainnet";

type ScriptDeployment = {
  codeHash: string;
  hashType: ccc.HashType;
  cellDep: {
    outPoint: { txHash: string; index: number };
    depType: "code" | "depGroup";
  };
};

const DEPLOYMENTS: Record<Network, ScriptDeployment | null> = {
  testnet: {
    codeHash:
      "0xa33bd402447164154f18f605e62328e5082e0790f41b92d5b4143c6a0098d804",
    hashType: "data2",
    cellDep: {
      outPoint: {
        txHash:
          "0xd69a3de2b2decc55a9d02db174d65f2a5d4d6d31ba6f049e598e9fe46db4851d",
        index: 0,
      },
      depType: "code",
    },
  },
  mainnet: null,
};

export function getNetwork(): Network {
  return process.env.REACT_APP_IS_MAINNET === "true" ? "mainnet" : "testnet";
}

export function getSimpleTodoDeployment(): ScriptDeployment {
  const deployment = DEPLOYMENTS[getNetwork()];
  if (!deployment) {
    throw new Error(
      `simple-todo is not deployed on ${getNetwork()}. Deploy the contract first.`,
    );
  }
  return deployment;
}

export function getSimpleTodoTypeScript(): ccc.Script {
  const { codeHash, hashType } = getSimpleTodoDeployment();
  return ccc.Script.from({
    codeHash,
    hashType,
    args: "0x",
  });
}

export function getSimpleTodoCellDep(): ccc.CellDep {
  const { cellDep } = getSimpleTodoDeployment();
  return ccc.CellDep.from(cellDep);
}
