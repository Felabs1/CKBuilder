import { useCallback, useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { TodoItem } from "../lib/todoData";
import {
  applyCreateTxHashes,
  outPointKey,
  saveCreateTxHash,
} from "../lib/todoTxStorage";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  fetchTodos,
  fetchTodosWithRetry,
} from "../services/todoService";

export function useTodos(signer: ccc.Signer | undefined) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!signer) {
      setTodos([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setTodos(applyCreateTxHashes(await fetchTodos(signer)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, [signer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (
    action: () => Promise<string>,
    options?: { recordCreateTx?: boolean },
  ) => {
    if (!signer) {
      throw new Error("Connect your wallet first");
    }

    setActionLoading(true);
    setError(null);
    const previousSnapshot = todos;
    const previousKeys = new Set(
      previousSnapshot.map((todo) => outPointKey(todo.outPoint)),
    );
    try {
      const txHash = await action();
      let updated = applyCreateTxHashes(
        await fetchTodosWithRetry(signer, previousSnapshot),
      );

      if (options?.recordCreateTx) {
        updated = updated.map((todo) => {
          if (previousKeys.has(outPointKey(todo.outPoint))) {
            return todo;
          }
          saveCreateTxHash(todo.outPoint, txHash);
          return { ...todo, createTxHash: txHash };
        });
      }

      setTodos(updated);
      return txHash;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      setError(message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const addTodo = (text: string) =>
    runAction(() => createTodo(signer!, text), { recordCreateTx: true });

  const markComplete = (todo: TodoItem) =>
    runAction(() => completeTodo(signer!, todo));

  const removeTodo = (todo: TodoItem) =>
    runAction(() => deleteTodo(signer!, todo));

  return {
    todos,
    loading,
    actionLoading,
    error,
    refresh,
    addTodo,
    markComplete,
    removeTodo,
  };
}
