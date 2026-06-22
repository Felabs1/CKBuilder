import React, { useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import ConnectWallet from "./ConnectWallet";
import { useTodos } from "../hooks/useTodos";
import { TodoItem } from "../lib/todoData";
import { getNetwork } from "../config/contract";
import { getTxExplorerUrl } from "../utils/explorer";
import { truncateAddress } from "../utils/stringUtils";

function TodoRow({
  todo,
  disabled,
  onComplete,
  onDelete,
}: {
  todo: TodoItem;
  disabled: boolean;
  onComplete: (todo: TodoItem) => void;
  onDelete: (todo: TodoItem) => void;
}) {
  const isCompleted = todo.status === "completed";

  return (
    <li className="flex items-start gap-3 rounded-lg border border-white/10 bg-[#2d2d2d] px-4 py-3">
      <button
        type="button"
        disabled={disabled || isCompleted}
        onClick={() => onComplete(todo)}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-cyan-500/60 disabled:opacity-40"
        aria-label={isCompleted ? "Completed" : "Mark complete"}
      >
        {isCompleted && <span className="text-xs text-cyan-400">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <span
          className={`block break-words text-sm ${
            isCompleted ? "text-white/50 line-through" : "text-white"
          }`}
        >
          {todo.text}
        </span>
        {todo.createTxHash && (
          <a
            href={getTxExplorerUrl(todo.createTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
            title={todo.createTxHash}
          >
            Mint tx {truncateAddress(todo.createTxHash, 10, 8)}
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(todo)}
        className="shrink-0 text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
      >
        Delete
      </button>
    </li>
  );
}

const TodoApp: React.FC = () => {
  const signer = ccc.useSigner();
  const {
    todos,
    loading,
    actionLoading,
    error,
    refresh,
    addTodo,
    markComplete,
    removeTodo,
  } = useTodos(signer);
  const [text, setText] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !signer) {
      return;
    }

    await addTodo(trimmed);
    setText("");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">CKB Todo</h1>
          <p className="mt-1 text-sm text-white/60">
            On-chain todos secured by your deployed{" "}
            <code className="rounded bg-white/10 px-1">simple-todo</code> type
            script on {getNetwork()}.
          </p>
        </div>
        <ConnectWallet />
      </div>

      {!signer ? (
        <div className="rounded-lg border border-dashed border-white/20 px-6 py-10 text-center text-white/70">
          Connect a wallet to create and manage todos on CKB testnet.
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What needs to be done?"
              disabled={actionLoading}
              className="flex-1 rounded-lg border border-white/10 bg-[#2d2d2d] px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={actionLoading || !text.trim()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
            >
              Add
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-white/50">
            <span>
              {loading
                ? "Loading todos..."
                : `${todos.length} todo${todos.length === 1 ? "" : "s"} on chain`}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading || actionLoading}
              className="hover:text-white disabled:opacity-40"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {todos.length === 0 && !loading ? (
            <div className="rounded-lg border border-white/10 px-6 py-8 text-center text-sm text-white/50">
              No todos yet. Add one above to mint a new on-chain cell.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {todos.map((todo) => (
                <TodoRow
                  key={`${todo.outPoint.txHash}:${todo.outPoint.index}`}
                  todo={todo}
                  disabled={actionLoading}
                  onComplete={markComplete}
                  onDelete={removeTodo}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default TodoApp;
