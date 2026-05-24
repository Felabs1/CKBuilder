# builder track weekly report - Week 4
**Name**: Felix Awere<br>
**Week Ending**: 24th May 2026

- [builder track weekly report - Week 4](#builder-track-weekly-report---week-4)
  - [Courses Completed](#courses-completed)
  - [Key Learnings](#key-learnings)
  - [Practical Progress](#practical-progress)
  - [Issues](#issues)
    - [Issue1: Compile Error E0283 In tests, `Type annotations needed for u64.pack() in Cell capacity`](#issue1-compile-error-e0283-in-tests-type-annotations-needed-for-u64pack-in-cell-capacity)
    - [Issue 2: Insufficient CKB for testnet deployment](#issue-2-insufficient-ckb-for-testnet-deployment)
      - [Issue 2 fix](#issue-2-fix)


## Courses Completed
- Token Standard: Studied the difference between simple UDT (sUDT) standard and Extensible UDT (xUDT) regarding onchain and offchain metadata
- A simple UDT script: This is a fungible token standard on CKB blockchain
- Dapp Tutorial: (Create a fungible token) CKB is different from ERC20 and BRC20 where they are named User Defined Tokens

## Key Learnings
- How to issue custom tokens using predeployed xUDT script
- Binary Optimization: a standard `cargo build --release`
- Newer versions of `ckb_gen_types` allow u64 to be passed directly to `capacity()` without needing to call `.pack()` first.
- Deploying a contract doesnt create tokens, it just uploads a script that would need a separate function to mint


## Practical Progress
- set up and ran `docs.nervos.org/examples/dApp/xudt` hereby testing the following
  - Issuing Custom token
  - viewing custom token
  - Transfer Custom token
- created a simple udt contract in rust making reference to the docs and github
- compiled and wrote unit tests for the simple sUDT contract
- deployed the simple sUDT contract to both devnet and testnet with the testnet transaction below [view on testnet](https://testnet.explorer.nervos.org/transaction/0xad4bbd44b52a13db9a49cc6f64e0b5868fb0641b28120850dab206cc6316641f)



## Issues
### Issue1: Compile Error E0283 In tests, `Type annotations needed for u64.pack() in Cell capacity`
- the `.capacity(1000u64.pack())` script generating type annotation error hence causing ambiguity when settling the cell output capacity. I think this could have been an issue due to the recent update where the compiler can no longer impact which type is intended when calling `1000u64.pack()`
<details>
<summary>Expand compilation results</summary>
```bash

   --> tests/src/test_sudt.rs:274:14
     |
 274 |             .capacity(1000u64.pack())
     |              ^^^^^^^^ -------------- type must be known at this point
     |              |
     |              cannot infer type of the type parameter `T` declared on the method `capacity`
     |
     = note: cannot satisfy `_: Into<Uint64>`
note: required by a bound in `CellOutputBuilder::capacity`
    --> /Users/felabs/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/ckb-gen-types-1.1.0/src/generated/blockchain.rs:7473:12
     |
7471 |     pub fn capacity<T>(mut self, v: T) -> Self
     |            -------- required by a bound in this associated function
7472 |     where
7473 |         T: ::core::convert::Into<Uint64>,
     |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ required by this bound in `CellOutputBuilder::capacity`
help: consider specifying the generic argument
     |
 274 |             .capacity::<T>(1000u64.pack())
     |                      +++++
help: consider removing this method call, as the receiver has type `u64` and `u64: Into<Uint64>` trivially holds
     |
 274 -             .capacity(1000u64.pack())
 274 +             .capacity(1000u64)

</details>


#### Issue 1 fix
I figured out newer versions of the ckb crates implements a direct `Into<Uint64>` trait for `u64`, the `pack()` method can just be ignored as demonstrated below for lines using this technique,

```diff
- CellOutput::new_builder().capacity(1000u64.pack()) 
+ CellOutput::new_builder().capacity(1000u64)
```


### Issue 2: Insufficient CKB for testnet deployment
When deploying to the testnet using `offckb deploy`, it failed with: `Error: Insufficient CKB, need 30868.87 extra CKB.`

#### Issue 2 fix
I realized that devnet deployment worked because accounts have unlimited CKB tokens, I referenced to my [week2](./week2/ckb-generate-new-address/) work of generating new address and created a new address, added funds to it through the [ckb faucet](https://faucet.nervos.org/) then tweaked the deployment script by adding a `--privkey` parameter where you paste your private key afterwards to make the deployment

*devnet*<br>
```bash
offckb deploy --type-id --network devnet --target ./build/release/sudt
```

*testnet*<br>
```bash
 offckb deploy --type-id --network testnet --target ./build/release/sudt --privkey YOUR_PRIVATE_KEY
```




