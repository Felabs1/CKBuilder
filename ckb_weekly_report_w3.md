# builder track weekly report - Week 3

**name**: Felix Awere<br>
**Week ending**: 17th May 2026

## Contents
- [builder track weekly report - Week 3](#builder-track-weekly-report---week-3)
  - [Contents](#contents)
  - [Courses Completed](#courses-completed)
  - [Key Learnings](#key-learnings)
  - [Practical Progress](#practical-progress)
  - [Issues](#issues)
    - [Issue 1: ckb-debugger panics with --tx-file](#issue-1-ckb-debugger-panics-with---tx-file)
      - [How I dealt with Issue 1](#how-i-dealt-with-issue-1)


## Courses Completed

- SysError Concept: studied the full SysError enum in ckb-std covering IndexOutOfBound, ItemMissing, LengthNotEnough
- no_std Contract Architecture: Understood the `#![cfg_attr] conditional compilation pattern
- Read about Script Basics Lock & type and Script Debugging and testing from _Learning CKB - 24 lessons across 5 phases by Jnr.bit_

## Key Learnings

- CKB Syscalls follow unix convention meaning a return of `0` = success and non-zero return means there's an error whereas ckb-std wraps it into `Result<T, SysError>`
- `IndexOutOfBound` is not a true error, rather it is a standard loop termination treating exceeded inputs or outputs as an end of list
- Unknown(u64) is used to return error codes ckb-std doesnt recognise
- LengthNotEnough carries actual required buffer size inside the variant

## Practical Progress

- Went through Error Example contract at https://github.com/nervosnetwork/docs.nervos.org/tree/master/examples/ckb-rust-script/contracts/error
- Implemented the error contract: a lock script that read args[0] as a selector and deliberately triggers IndexOutOfBound, ItemMissing or LengthNotEnough to demonstrate each SysError variant
- Went through the tests file for the error contract at https://github.com/nervosnetwork/docs.nervos.org/blob/master/examples/ckb-rust-script/tests/src/tests_error.rs
- Wrote Intergration tests using `ckb-testtool` simulating a full CKB transaction locally with all the three tests passing
  ![Alt text](./images/Screenshot%202026-05-17%20at%2023.37.06.png)
- Generated a mock transaction JSON from ckb-testtool, and successfully ran through ckb-debugger with run result: 0
  ![Alt text](./images/Screenshot%202026-05-17%20at%2023.39.47.png)
- Deployed the error contract to offckb devnet
  ![Alt text](./images/Screenshot%202026-05-17%20at%2023.45.57.png)

## Issues

The codebase I made reference to was using version `ckb-std = "0.17.0"`. When I scaffold a new ckb-rust-script the version is updated and is `ckb-std = "1.1"` with this I realized some issues described on [week 1](./ckb_weekly_report_w1.md) I was able to fix them here.

This week however I encountered some issues below,

### Issue 1: ckb-debugger panics with --tx-file

ckb-debugger panicked with `internal error: Entered unreachable code at main.rs:356` when given a mock tx JSON.

#### How I dealt with Issue 1

discovered the mock transaction was being written to tests/ and not the workspace root. pointing to the correct path resolved the issue
