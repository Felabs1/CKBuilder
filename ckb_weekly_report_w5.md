# Builder track weekly report - Week 5

**Name**: Felix Awere<br>
**Week Ending**: 31st May 2026

## Courses Completed

- **SUDT Contract Logic**: analysed the rust contract logic in two modes, owner-mode(minting, skips balance validation) and transfer mode
- **CKB Indexer RPC API**: learn't the exact request-response format for get_cells including the required snake_case field names and script type parameters
- **JoyID + CKB Integration**: Studied all in one wallet connector especially how to deal with joyid wallet
- **CCC Basic Usage**: learnt about ccc basic usage and explored transaction building helpers like completeInputsByUdt, completeInputsByCapacity, completeFeeBy, and proper script construction.
- **sudt contract example**: Continued last week's work by connecting the deployed sudt contract example to a frontend hence Understood how SUDT uses args = lock_hash + "00000000" to create unique token instances per owner, vs EVM's single contract address

## Key Learnings

- **JoyID Security Model**: passkey wallets doesnt expose private keys. signing happens in hardware secure enclaves via biometric/PIN approval.
- **Cell Capacity Rules**: Every output cell must have ≥61 CKB capacity for lock script + type script + data. UDT cells typically need ~150 CKB to be safe.
- **Indexer Queries Require `snake_case`**: The CKB Indexer RPC expects `{ code_hash, hash_type, args }`, while CCC SDK objects use `camelCase`
- **CKB ≠ EVM Mental Model**: on CKB deploying a script doesnt create tokens, you must explicitly create cells to be able to mint
- **Transaction Building Order**: inputs have to be collected before output is finalized

## Practical Progress

- **Project Setup**: Initialized Parcel + React + TypeScript frontend with `@ckb-ccc/core` and `@joyid/ckb` dependencies.
- **CCC Client Configuration**: Created `ccc-client.ts` with testnet client initialization and global exposure for debugging.
- **Balance Query**: Implemented `getSUDTBalance()` using CCC's `findCellsByType` iterator with proper address parsing and amount decoding.
- **Mint Function**: Built `mintSUDT()` that uses owner-mode to create new token cells with (150 CKB) and fee handling.
- **Dev Mode Transfer**: Implemented `transferSUDT()` using private key signer for local testing, with UDT input collection, change handling, and fee calculation.
- **JoyID Integration**: Added wallet connect flow with @joyid/ckb, localStorage persistence, and auto-balance refresh.
- **Debug Utilities**: Added `recoverFromPrivateKey()`, `debugSUDT()`, and console-exposed helpers for on-the-fly diagnostics.
- **Successful Mint**: Minted 6000 tokens to JoyID address [ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq84lj7udxgl7rryr90x2g8705jdtm037qgq3z3fm](https://testnet.explorer.nervos.org/address/ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq84lj7udxgl7rryr90x2g8705jdtm037qgq3z3fm) on testnet; confirmed via explorer and frontend balance query.

## Issues

### Issue1: Indexer RPC snake_case vs CCC camelCase

The JoyID wallet was successfully funded with 6002 tokens, this worked flawlessly in dev mod where we used a private key to make the call but transferSUDTWithJoyID function was returning a balance of 0. This was caused by relying on a manual fetch to the indexer using a hardcoded XUDT_CODE_HASH

```bash
JoyID transfer failed: Insufficient SUDT balance. Found: 0, Needed: 1
```

### Issue 1 fix (Unresolved context):

created a helper function to convert ccc objects to indexer compatible format

We attempted to bypass the manual fetch by replacing it with CCC's native cell collector `(cccClient.findCellsByType)`.

While this successfully allowed the console to output `Found JoyID Cell with: 1000 tokens`, the overall transfer mechanism remains broken because fixing the data query immediately triggered the `SDK type mismatch` in Issue 2. We haven't solved the transfer.

### Issue 2:

Severe Structural incompatibility between the transaction builder and the wallet signer.

```javascript
index.d.mts(75, 56): An argument for 'signerAddress' was not provided.

(alias) signRawTransaction(tx: CKBTransaction, signerAddress: string, config?: SignConfig): Promise<SignCkbTxResponseData["tx"]>

import signRawTransaction

```

### Issue 2 fix: (Unresolved Context)

attempted to build a manual mapping function to translate the CCC object into the strict JoyID JSON schema `"0x" + BigInt(output.capacity).toString(16)`. the joyid transaction flow still fails to execute. we havent solved it.

```javascript
💰 Found JoyID Cell with: 1000 tokens
❌ JoyID transfer failed: undefined is not iterable (cannot read property Symbol(Symbol.iterator))
```
