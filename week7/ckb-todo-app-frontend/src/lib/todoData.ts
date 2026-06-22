import { ccc } from "@ckb-ccc/connector-react";

export type TodoStatus = "pending" | "completed";

export type TodoItem = {
  outPoint: ccc.OutPoint;
  lock: ccc.Script;
  text: string;
  status: TodoStatus;
  capacity: ccc.Num;
  createTxHash?: string;
};

export function encodeTodoData(text: string, completed: boolean): ccc.Bytes {
  const textBytes = ccc.bytesFrom(text, "utf8");
  if (textBytes.length === 0) {
    throw new Error("Todo text cannot be empty");
  }
  return ccc.bytesConcat([completed ? 1 : 0], textBytes);
}

export function decodeTodoData(data: ccc.BytesLike): {
  status: TodoStatus;
  text: string;
} {
  const bytes = ccc.bytesFrom(data);
  if (bytes.length === 0) {
    throw new Error("Invalid todo cell data");
  }

  const statusByte = bytes[0];
  if (statusByte !== 0 && statusByte !== 1) {
    throw new Error(`Invalid todo status byte: ${statusByte}`);
  }

  return {
    status: statusByte === 1 ? "completed" : "pending",
    text: ccc.bytesTo(bytes.slice(1), "utf8"),
  };
}

export function cellToTodoItem(cell: ccc.Cell): TodoItem {
  const { status, text } = decodeTodoData(cell.outputData);
  return {
    outPoint: cell.outPoint,
    lock: cell.cellOutput.lock,
    text,
    status,
    capacity: cell.cellOutput.capacity,
  };
}
