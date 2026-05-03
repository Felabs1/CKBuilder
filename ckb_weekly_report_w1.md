# builder track weekly report - week 1

**Name**: Felix Awere <br>
**Week Ending**: 3rd May 2026

## Courses Completed

CKB Academy Lesson 1 & Lesson 2<br>

- CKB theoretical Knowledge
  - What is CKB
  - Structure of a Cell
  - How someone tell's that he owns a cell
  - What is a transaction
- **First CKB Transaction**  
  [View on Nervos Explorer](https://testnet.explorer.nervos.org/transaction/0x11aa73be61cd2f9e464ec5373698d47780570c031a0668fd4e0a90bbec740cb5#0)

## Key learnings

- learnt that CKB got it's name from \_common_knowledge_base
- learnt that you need tokens to actually own a cell
- learnt how to request for faucets from
  https://faucet.nervos.org
- the lock script is the gatekeeper while the typescript is the guardian

## Practical Progress

- Set up a local ckb node successfully
- run the starter files for hello-world and simple-print-args create and made sure everything was in order

### issues

#### issue 1

ran into build errors while running the intro script

<details>
<summary>expand build results</summary>

```bash
rustc-LLVM ERROR: Cannot select: 0x1094552a0: i64,ch = AtomicLoadAdd<(load store release (s64) on %ir.6)> 0x109455bd0:1, 0x109455f50, Constant:i64<-1>, /Users/felabs/.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/src/rust/library/core/src/sync/atomic.rs:3942:24 @[ /Users/felabs/.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/src/rust/library/core/src/sync/atomic.rs:3167:26 @[ src/bytes.rs:1552:23 @[ src/bytes.rs:1459:9 @[ src/loom.rs:20:17 @[ src/bytes.rs:1458:10 ] ] ] ] ]
  0x109455f50: i64 = add nuw 0x109455bd0, Constant:i64<16>, /Users/felabs/.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/src/rust/library/core/src/cell.rs:2447:9 @[ /Users/felabs/.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/src/rust/library/core/src/sync/atomic.rs:3167:44 @[ src/bytes.rs:1552:23 @[ src/bytes.rs:1459:9 @[ src/loom.rs:20:17 @[ src/bytes.rs:1458:10 ] ] ] ] ]
    0x109455bd0: i64,ch = load<(dereferenceable load (s64) from %ir.0)> 0x1098e0108, 0x11c5f2460, undef:i64, src/bytes.rs:1459:24 @[ src/loom.rs:20:17 @[ src/bytes.rs:1458:10 ] ]
      0x11c5f2460: i64,ch = CopyFromReg 0x1098e0108, Register:i64 %2
In function: _ZN5bytes5bytes11shared_drop17h876f552ccf668797E
error: could not compile `bytes` (lib)

Caused by:
  process didn't exit successfully: `/Users/felabs/.rustup/toolchains/stable-aarch64-apple-darwin/bin/rustc --crate-name bytes --edition=2021 /Users/felabs/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/bytes-1.11.1/src/lib.rs --error-format=json --json=diagnostic-rendered-ansi,artifacts,future-incompat --diagnostic-width=161 --crate-type lib --emit=dep-info,metadata,link -C opt-level=3 -C embed-bitcode=no -C codegen-units=1 -C debuginfo=2 --warn=unexpected_cfgs --check-cfg 'cfg(loom)' -C overflow-checks=on --check-cfg 'cfg(docsrs,test)' --check-cfg 'cfg(feature, values("default", "extra-platforms", "serde", "std"))' -C metadata=c90f1fea48b50114 -C extra-filename=-bedf8d9d66ff616e --out-dir /Users/felabs/Documents/CKBuilder/week1/ckb-rust-script/target/riscv64imac-unknown-none-elf/release/deps --target riscv64imac-unknown-none-elf -L dependency=/Users/felabs/Documents/CKBuilder/week1/ckb-rust-script/target/riscv64imac-unknown-none-elf/release/deps -L dependency=/Users/felabs/Documents/CKBuilder/week1/ckb-rust-script/target/release/deps --cap-lints allow -C target-feature=+zba,+zbb,+zbc,+zbs,-a -C debug-assertions` (exit status: 101)
warning: build failed, waiting for other jobs to finish...
make[1]: *** [build] Error 101
make: *** [build] Error 2

```

</details>

#### how I resolved issue 1

checked the Makefile inside and figured out the -a flag was preventing the contract from building, and updated it and it was able to build nicely

```diff
- FULL_RUSTFLAGS := -C target-feature=+zba,+zbb,+zbc,+zbs, a $(CUSTOM_RUSTFLAGS)
```

```diff
+ FULL_RUSTFLAGS := -C target-feature=+zba,+zbb,+zbc,+zbs $(CUSTOM_RUSTFLAGS)
```

#### Issue 2

`Run result: invalid instruction pc=0x1834c instruction=0x140a36af`

came through this issue when building the simple-print-args boilerplate, did my research and figured out by removing the -a, the virtual machine encountered an optcode it does not support even if it built successfully

#### how I resolved issue 2

I figured out i needed to add a certain dependancy (molecule) on cargo.toml to make the optcode build successfully and get supported succesfully

```diff
[dependencies]
ckb-std = "1.1"
+ molecule = { version = "0.9.2", default-features = false, features = ["bytes_vec"] }
```

## Environment

- ckb node and local dev environment installed and functional
- basic cli usage allready started
