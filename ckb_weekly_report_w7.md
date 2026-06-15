# Builder track weekly report - Week 7

**Name**: Felix Awere<br>
**Week Ending**: 15th June 2026

## Courses Completed

- **[Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock)**: Completed the full-stack dApp tutorial covering the `hash-lock` toy lock how script args store an expected hash, how the preimage is supplied via `WitnessArgs.lock`, and how CCC builds unlock transactions with `completeInputsByCapacity`, cell deps, and witness injection.
- **[Example: Simple Lock (Rust)](https://docs.nervos.org/docs/script/rust/rust-example-simple-lock)**: Studied the production-oriented Rust counterpart to the JS tutorial same hash-lock validation logic using `load_script()`, `load_witness_args(0, Source::GroupInput)`, and `blake2b_256`, with success and failure test cases via `ckb-testtool`.
- **[simple-lock dApp GitHub Example](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/dApp/simple-lock)**: Reviewed the reference repo structure `contracts/hash-lock` (ckb-js-vm TypeScript), `frontend/` (Next.js + CCC), deployment artifacts in `scripts.json`, and the `generateAccount` / `unlock` flow that maps lock scripts to CKB addresses.
- **[simple-lock Rust GitHub Example](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/ckb-rust-script/contracts/simple-lock)**: Compared the Rust contract crate against the JS version, confirming both implement identical hash-lock semantics (args = hash, witness = preimage, `blake2b_256` validation) while differing in VM target and toolchain.
- **[Type Script Extension (simple-todo)](./week7/ckb-todo-app/)**: Applied the same Rust + `ckb-script-templates` workflow from the lock-script lessons to a custom **type script** todo app validating on-chain state transitions with `load_cell_data` on `Source::GroupInput` / `Source::GroupOutput`, then wiring the deployed contract into a CCC React frontend.

## Key Learnings

- **Lock Script Identity & Addresses**: From the [Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock) tutorial a CKB address is an encoded lock script. When script args change (e.g. a new hash), the address changes entirely. balance is the sum of live cell capacity locked by that script.
- **Witness Field as Unlock Secret**: Both the [JS hash-lock](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/dApp/simple-lock) and [Rust simple-lock](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/ckb-rust-script/contracts/simple-lock) contracts read the preimage from `WitnessArgs.lock` at witness index 0 (`Source::GroupInput`), then compare `blake2b_256(preimage)` against the hash stored in script args.
- **JS vs Rust Script Targets**: The dApp tutorial runs contracts on **ckb-js-vm** via TypeScript. the [Rust example](https://docs.nervos.org/docs/script/rust/rust-example-simple-lock) compiles to native RISC-V bytecode with `ckb-std`. Same logic, different toolchain Rust is recommended for production.
- **Type Script vs Lock Script**: Lock scripts control _who_ can spend a cell. type scripts control _how_ cell data may change. The `simple-todo` extension applies the Rust patterns from simple-lock to a type script each todo is a live cell where the user's lock script owns the CKB and the type script enforces valid state transitions on `outputData`.
- **On-Chain State Encoding**: Todo state is stored as `[status_byte | utf8_text]`, where `0x00` = pending and `0x01` = completed. The contract rejects edits to the text payload after creation and prevents reverting a completed item back to pending.
- **CCC Signer Cell Queries**: `signer.findCells()` accepts only the _filter_ object (e.g. `{ script: typeScript }`). the wallet's lock scripts are applied internally. Passing a full indexer search key as the filter silently returns zero results.

## Practical Progress

- **Hash-Lock Foundations**: Studied the official [simple-lock dApp example](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/dApp/simple-lock) and local hash-lock contract in `week7/simple_dapp`, understanding deposit → transfer → witness-unlock flows from the [Build a Simple Lock](https://docs.nervos.org/docs/dapp/simple-lock) tutorial.
- **Rust Lock Script Reference**: Reviewed the [Rust simple-lock crate](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/ckb-rust-script/contracts/simple-lock) and its [documentation walkthrough](https://docs.nervos.org/docs/script/rust/rust-example-simple-lock), then applied the same `ckb-script-templates` build/test/deploy patterns to the `simple-todo` type script.
- **Testnet Deployment**: Deployed `simple-todo` to CKB testnet with `codeHash` `0xa33bd402447164154f18f605e62328e5082e0790f41b92d5b4143c6a0098d804`, `hashType` `data2`, and code cell dep at [`0xd69a3de2b2decc55a9d02db174d65f2a5d4d6d31ba6f049e598e9fe46db4851d`](https://testnet.explorer.nervos.org/transaction/0xd69a3de2b2decc55a9d02db174d65f2a5d4d6d31ba6f049e598e9fe46db4851d).
- **Frontend Integration**: Initialized `ckb-todo-app-frontend` via `create-ccc-app` (same CCC stack as the simple-lock frontend), wired deployment artifacts into [`src/config/contract.ts`](./week7/ckb-todo-app-frontend/src/config/contract.ts), and built a todo service ([`src/services/todoService.ts`](./week7/ckb-todo-app-frontend/src/services/todoService.ts)) using CCC transaction builders for create, complete, and delete flows.
- **End-to-End dApp**: Connected a testnet wallet through CCC, successfully minted on-chain todo cells, listed them in the UI, and verified complete/delete transactions against the live type script rules.
  ![image1](./images/Screenshot%202026-06-15%20at%2015.47.00.png)
  ![image1](./images/Screenshot%202026-06-15%20at%2015.49.32.png)

## Issues

### Issue 1: Dynamic Address Balance Drop to 0 CKB

When changing the preimage string in the input field from "Hello World" to any custom text, the frontend interface immediately threw a blocking error message: Fund the hash lock address above first (deposit at least 300 CKB). Current balance: 0 CKB.

```TypeScript
const disabledReason =
  !isTransferring && +balance <= +amountInCKB
    ? `Fund the hash lock address above first (deposit at least 300 CKB). Current balance: ${balance} CKB.`
    : null;

```

### Issue 1 fix

- Realized that changing the preimage string causes the useEffect hook to calculate a brand new blake2b hash, which alters the args field inside generateAccount(hash).

- Because CKB addresses are derived directly from the Lock Script structure, this alteration creates a completely new address on the network with no existing history.

- Resolution: Acknowledged that this is intended behavior. To test a new preimage, the newly generated address must be copied from the UI and manually funded using the local CLI command `(offckb deposit --network devnet <new_address> 300)` before running the unlock sequence.

### Issue 2: Type Script Rejected New Todos (Error Code 1)

The first add-todo transaction failed on-chain with `ValidationFailure` error code 1 (`InvalidStateTransition`) on `Outputs[0].Type`.

```javascript
Client request error TransactionFailedToVerify: Verification failed Script(TransactionScriptError {
  source: Outputs[0].Type,
  cause: ValidationFailure: see error code 1 on page
  https://nervosnetwork.github.io/ckb-script-error-codes/by-data-hash/a33bd402447164154f18f605e62328e5082e0790f41b92d5b4143c6a0098d804.html#1
})
```

### Issue 2 fix

- Traced error code 1 to the contract's create branch: `output_data[0]` must be exactly `0x00` for a new pending todo.
- Root cause was a CCC encoding bug in [`encodeTodoData`](./week7/ckb-todo-app-frontend/src/lib/todoData.ts): `ccc.bytesConcat(0, textBytes)` silently dropped the status byte because `ccc.bytesFrom(0)` resolves to an empty array.
- Fixed by wrapping the status byte in an array: `ccc.bytesConcat([0], textBytes)`, producing the expected `[0x00, ...utf8]` layout.

### Issue 3: Transaction Succeeded but UI Showed No Todos

After fixing encoding, todo creation confirmed on-chain, but the React UI still displayed an empty list even after clicking Refresh.

### Issue 3 fix

- Discovered `signer.findCells()` was called with a full indexer search key object instead of just the filter `{ script: typeScript }`.
- CCC already scopes queries to the connected wallet's lock scripts. the malformed call effectively filtered type scripts against the lock script hash, matching nothing.
- Corrected the query in [`fetchTodos`](./week7/ckb-todo-app-frontend/src/services/todoService.ts) and added `fetchTodosWithRetry` to poll the testnet indexer after mutations (indexer lag of 1–5 seconds is common on testnet).

### Issue 4: Indexer Lag After Mutations

Immediately refreshing the todo list after a successful transaction sometimes returned stale results before the new cell was indexed.

### Issue 4 fix

- Added post-transaction retry polling in [`useTodos`](./week7/ckb-todo-app-frontend/src/hooks/useTodos.ts) that re-fetches until the on-chain snapshot changes (new out-point, status flip, or deletion) or a retry limit is reached.
- Documented that manual **Refresh** remains useful if the indexer is unusually slow.
