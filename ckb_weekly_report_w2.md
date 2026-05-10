# builder track weekly report - Week 2

**name**: Felix Awere<br>
**Week ending**: 10th May 2026

## Courses Completed

- Capacity vs Balancer: Capacity(actual CKB tokens representing storage space), balancer(automatically calculates transaction file sizes, network miner fees and change output cells)
- Testing vs Deployment: Difference between simulating transactions locally using ckb-testtool and ckb-debugger with JSON mockups vs deploying to a real blockchain in my instance, (local devnet)
- Transaction Debugging: how to read execution logs

## Key learnings

- learnt how to intergrate with the CKB network directly using rust, libraries involved: `ckb-sdk, serde_json, ckb-types, ckb-crypto, secp256k1`
- learnt how to write a script to create a wallet account
- learnt how to build a transaction using rust and ckb libraries
- learnt that tools like ckb-testtool and ckb-debugger are used to simulate transactions locally using JSON files
- learnt how to deploy to offckb devnet using offckb cli
- learnt that offckb deploy is actually smart enough to determine the release files to deploy all you need to do is list the directory path

## Practical Progress

- Generated Testnet wallet address and managed private keys using the secp256k1 cryptography library
- Created account funded with the tx hash: [View on Nervos Explorer](https://testnet.explorer.nervos.org/transaction/0x541296c455ae9a21f406482fc19bb0a47b0809cc8c8d9319ecb37df388405e17)
- built a transaction on ckb testnet through the same account on this hash: [view on testnet explorer](https://testnet.explorer.nervos.org/transaction/0xd9de0d06b017ecfa7ebbc9f79cdac6308c83bb12881b4666b1682ab6f4998db5)
- deployed simple-print-args: simulated on week1 and interacted with it on devnet

## Issues

### Issue 1: Rust SDK Dependancy Version clashes

I encountered severe `mismatched types` errors eg: `expected ckb_types::core::views::BlockView, found BlockView`

### how I resolved Issue 1

I realized ckb-sdk was pulling in newer versions of crates than i had defined causing the compiler to treat them as entirely different types. I updated the `cargo.toml` file to perfectly align with all the versions in the workspace
Also had to change some lines from the documentation to make this work for example creating an account script below

```diff
- let pubkey = secp256k1::PublicKey::from_secret_key(&ckb_crypto::secp::SECP256K1, &secp_secret_key);

+ let secp = secp256k1::Secp256k1::new();
+ let pubkey = secp256k1::PublicKey::from_secret_key(&secp, &secp_secret_key);
```

### Issue 2: Deployment pathing & binary selection errors

When attempting to deploy to devnet using offckb i encountered a file not found error: `Error: File or folder not exist ../target/riscv64imac-unknown-none-elf`

### How I dealt with issue 2

I realized i was targeting a standard rust cargo build, so i moved to `build/release/simple-print-args` in the workspace root folder and was able to deploy correct path
