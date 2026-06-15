import { ccc } from "@ckb-ccc/connector-react";
import {
  getSimpleTodoCellDep,
  getSimpleTodoTypeScript,
} from "../config/contract";
import {
  cellToTodoItem,
  encodeTodoData,
  TodoItem,
} from "../lib/todoData";

const FEE_RATE = 1000;

async function prepareAndSend(
  signer: ccc.Signer,
  tx: ccc.Transaction,
): Promise<string> {
  tx.addCellDeps(getSimpleTodoCellDep());
  await tx.completeInputsByCapacity(signer);
  await tx.completeFeeBy(signer, FEE_RATE);
  return signer.sendTransaction(tx);
}

export async function fetchTodos(signer: ccc.Signer): Promise<TodoItem[]> {
  const typeScript = getSimpleTodoTypeScript();
  const todos: TodoItem[] = [];

  // signer.findCells() only accepts the filter object; it applies the
  // connected wallet's lock scripts internally.
  for await (const cell of signer.findCells({ script: typeScript }, true, "desc")) {
    try {
      todos.push(cellToTodoItem(cell));
    } catch {
      // Skip cells with invalid data format.
    }
  }

  return todos;
}

function todoSnapshotKey(todo: TodoItem): string {
  return `${todo.outPoint.txHash}:${todo.outPoint.index}:${todo.status}`;
}

export async function fetchTodosWithRetry(
  signer: ccc.Signer,
  previousSnapshot: TodoItem[] = [],
  maxAttempts = 8,
  delayMs = 1500,
): Promise<TodoItem[]> {
  const previousKeys = new Set(previousSnapshot.map(todoSnapshotKey));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const todos = await fetchTodos(signer);
    const changed =
      todos.length !== previousSnapshot.length ||
      todos.some((todo) => !previousKeys.has(todoSnapshotKey(todo)));

    if (changed || attempt === maxAttempts - 1) {
      return todos;
    }
  }

  return fetchTodos(signer);
}

export async function createTodo(
  signer: ccc.Signer,
  text: string,
): Promise<string> {
  const lockScript = (await signer.getRecommendedAddressObj()).script;
  const typeScript = getSimpleTodoTypeScript();
  const outputData = encodeTodoData(text.trim(), false);

  const tx = ccc.Transaction.from({
    outputs: [{ lock: lockScript, type: typeScript }],
    outputsData: [outputData],
  });

  return prepareAndSend(signer, tx);
}

export async function completeTodo(
  signer: ccc.Signer,
  todo: TodoItem,
): Promise<string> {
  if (todo.status === "completed") {
    throw new Error("Todo is already completed");
  }

  const outputData = encodeTodoData(todo.text, true);
  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: todo.outPoint }],
    outputs: [
      {
        lock: todo.lock,
        type: getSimpleTodoTypeScript(),
        capacity: todo.capacity,
      },
    ],
    outputsData: [outputData],
  });

  return prepareAndSend(signer, tx);
}

export async function deleteTodo(
  signer: ccc.Signer,
  todo: TodoItem,
): Promise<string> {
  const tx = ccc.Transaction.from({
    inputs: [{ previousOutput: todo.outPoint }],
  });

  return prepareAndSend(signer, tx);
}
