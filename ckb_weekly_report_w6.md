# Builder track weekly report - Week 6

**Name**: Felix Awere<br>
**Week Ending**: 7th June 2026

## Courses Completed

- **Digital Objects with Spore** [Lesson 14](https://website-sooty-chi-72.vercel.app/lessons/14-spore-nfts): Explored the Spore protocol architecture, focusing on how CKB enables fully on-chain digital objects (DOBs) compared to traditional off-chain ERC-721 NFTs. Studied the cell model where content, MIME type, and metadata live directly in outputData.
- **Create a Digital Object Using Spore Protocol**: Completed the practical tutorial for building a dApp that converts local image files into Spore output cells using the Spore SDK and CCC transaction builders.
- **CCC Wallet Integration Patterns: Analyzed official examples** [Create DOB](https://docs.nervos.org/docs/dapp/create-dob), [create DOB github example](https://github.com/nervosnetwork/docs.nervos.org/tree/develop/examples/dApp/create-dob) and [wallet connector tutorial](https://docs.nervos.org/docs/integrate-wallets/ccc-wallet) to understand how to replace hardcoded private keys with CCC's universal useSigner and useCcc hooks for production-ready wallet support.

## Key Learnings

- **Intrinsic Value & Economics**: Every Spore is backed by locked CKB (1 CKB = 1 Byte). This provides a guaranteed minimum floor value. Unlike EVM burning, "melting" a Spore destroys the object but returns the exact locked CKB to the creator.
- **Fully On-Chain Storage**: Spore content (images, JSON, Lua scripts) and MIME types are stored directly in the cell's data field using Molecule serialization, completely eliminating reliance on IPFS or external servers.
- **Zero-Cost Receiving**: Because the Spore cell carries its own state rent (capacity), it is self-funded. Users do not need CKB to receive a Spore.
- **Spore Clusters**: Collections are managed via separate Cluster cells that provide on-chain routing, names, and descriptions for related Spores.

## Practical Progress

- **CCC dApp Bootstrap**: Initialized a fresh React frontend using `npx create-ccc-app@latest`, providing pre-configured wallet connector, CCC context provider, and Tailwind styling.
- **JoyID Native Integration**: Replaced the tutorial's hardcoded private key logic with CCC's universal hooks (useCcc, useSigner) to securely request transaction signatures via JoyID's Passkey environment.
- **DOB Minting Engine**: Implemented an upload interface that reads a local file as an ArrayBuffer, validates the byte size against available capacity, and builds a transaction using ccc.spore.createSpore.
- **Successful Mainline Execution**: Successfully connected a JoyID testnet wallet, funded it, and executed a fully on-chain mint of a 71KB image DOB. [DOB transaction](https://testnet.explorer.nervos.org/transaction/0xcfaf80efedb9dcac005335b538eab6c5fe204fa9905aff2cf3c4ceffcac411bc)

## Issues

### Issue 1: State Rent Physics and Capacity Limits

During the first mint attempt, the transaction failed with Not enough capacity in from infos!. The uploaded image size required more capacity (state rent) than the 100,000 CKB currently available from the testnet faucet, highlighting the strict 1 CKB = 1 Byte economic reality of the network.

```javascript
Minting failed: ErrorTransactionInsufficientCapacity: Insufficient CKB, need 251192.00384532 extra CKB
    at async mintSporeWithCCC (lib.ts:22:1)
    at async createSpore (App.tsx:40:1)
```

### Issue 1 fix

- Adjusted mental model: on-chain storage has hard economic limits; every byte costs CKB
- compressed the test asset to 72kb and it was able to upload successfully

### Issue 2: Lumos Indexer Incompatibility with JoyID Omnilock

The standard `@spore-sdk/core` transaction builder (which relies on Lumos under the hood) failed to recognize the testnet funds inside the JoyID wallet, immediately throwing capacity errors because it did not natively understand the JoyID lock script.

### Issue 2 fix

Completely bypassed the legacy Lumos builder. Rewrote the minting logic to utilize CCC's native Spore builder [ccc.spore.createSpore](./week6/my-nft-app/src/lib.ts), which natively maps JoyID addresses and handles fee injection perfectly without requiring third-party patches.

### Issue 3: WebAuthn/Passkey Environment Blocks

![image](./images/Screenshot%202026-06-08%20at%2015.09.29.png)
When triggering the mint, JoyID threw a "Please open this page in your browser" intercept screen rather than prompting for the device fingerprint.

### Issue 3 fix

Identified this as a strict device-level security block rather than a code bug. Apple/Google block WebAuthn calls inside in-app browsers and restricted IDE preview windows. Moved the localhost URL to a standalone, dedicated browser tab, allowing the biometric prompt to fire successfully.
