import { ccc } from "@ckb-ccc/connector-react";

const STORAGE_KEY = "ckb-todo-create-tx-map";

export function outPointKey(outPoint: ccc.OutPoint): string {
  return `${outPoint.txHash}:${outPoint.index}`;
}

function loadCreateTxMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveCreateTxHash(
  outPoint: ccc.OutPoint,
  txHash: string,
): void {
  const map = loadCreateTxMap();
  map[outPointKey(outPoint)] = txHash;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getCreateTxHash(outPoint: ccc.OutPoint): string | undefined {
  return loadCreateTxMap()[outPointKey(outPoint)];
}

export function applyCreateTxHashes<T extends { outPoint: ccc.OutPoint }>(
  items: T[],
): (T & { createTxHash?: string })[] {
  const map = loadCreateTxMap();
  return items.map((item) => {
    const createTxHash = map[outPointKey(item.outPoint)];
    return createTxHash ? { ...item, createTxHash } : item;
  });
}
