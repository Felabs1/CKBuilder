#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(any(feature = "library", test))]
extern crate alloc;

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
// By default, the following heap configuration is used:
// * 16KB fixed heap
// * 1.2MB(rounded up to be 16-byte aligned) dynamic heap
// * Minimal memory block in dynamic heap is 64 bytes
// For more details, please refer to ckb-std's default_alloc macro
// and the buddy-alloc alloc implementation.
ckb_std::default_alloc!(16384, 1258306, 64);

// we are importing from core since we are in the no std mode
use core::result::Result;

// let's import a heap related library from allco
use alloc::vec::Vec;

// import ckb syscalls and structures
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
    error::SysError,
    high_level::{load_cell_data, load_cell_lock_hash, load_script, QueryIter}
};

const UDT_AMOUNT_LEN: usize = 16;




pub fn program_entry() -> i8 {
    ckb_std::debug!("this is a simple UDT contract");

    let script = load_script().unwrap();

    let args:Bytes = script.args().unpack();
    ckb_std::debug!("script args is {:?}", args);

    // return success if owner mode is true
    if check_owner_mode(&args) {
        return 0;
    }

    let inputs_amount: u128 = match collect_inputs_amount() {
        Ok(amount) => amount,
        Err(err) => return err as i8,
    };

    let outputs_amount = match collect_outputs_amount() {
        Ok(amount) => amount,
        Err(err) => return err as i8,
    };

    if inputs_amount < outputs_amount {
        return Error::InvalidAmount as i8;
    }

    0
}

fn check_owner_mode(args: &Bytes) -> bool {
    // check if any input cell has owner lock of the UDT
    QueryIter::new(load_cell_lock_hash, Source::Input).any(|lock_hash| args[..] == lock_hash[..])
}

fn collect_inputs_amount()-> Result<u128, Error> {
    // loop through all input cells containing UDTs
    // and gather the sum of all input tokens
    // the source groupInput guarantees only the cells with the same script
    // as the current running scripts are itarating
    
    let mut buf = [0u8; UDT_AMOUNT_LEN];

    let udt_list = QueryIter::new(load_cell_data, Source::GroupInput)
    .map(|data| {
        if data.len() >= UDT_AMOUNT_LEN {
            buf.copy_from_slice(&data);
            // u128 is 16 bytes
            Ok(u128::from_le_bytes(buf))
        } else {
            Err(Error::AmountEncoding)
        }
    }).collect::<Result<Vec<_>, Error>>()?;
    Ok(udt_list.into_iter().sum::<u128>())
}

fn collect_outputs_amount() -> Result<u128, Error> {
     let mut buf = [0u8; UDT_AMOUNT_LEN];

    let udt_list = QueryIter::new(load_cell_data, Source::GroupOutput)
        .map(|data| {
            if data.len() >= UDT_AMOUNT_LEN {
                buf.copy_from_slice(&data);
                // u128 is 16 bytes
                Ok(u128::from_le_bytes(buf))
            } else {
                Err(Error::AmountEncoding)
            }
        })
        .collect::<Result<Vec<_>, Error>>()?;
    Ok(udt_list.into_iter().sum::<u128>())
}

#[repr(i8)]
pub enum Error {
    IndexOutOfBound = 1,
    ItemMissing,
    LengthNotEnough,
    WaitFailure,
    InvalidFd,
    OtherEndClosed,
    MaxVmsSpawned,
    MaxFdsCreated,
    // write our custom error code below
    AmountEncoding = 12,
    InvalidAmount,
}

impl From<SysError> for Error {
    fn from(err: SysError) -> Self {
        use SysError::*;
        match err {
            IndexOutOfBound => Self::IndexOutOfBound,
            ItemMissing => Self::ItemMissing,
            LengthNotEnough(_) => Self::LengthNotEnough,
            WaitFailure => Self::WaitFailure,
            InvalidFd => Self::InvalidFd,
            OtherEndClosed => Self::OtherEndClosed,
            MaxVmsSpawned => Self::MaxVmsSpawned,
            MaxFdsCreated => Self::MaxFdsCreated,
            Encoding => Self::AmountEncoding,
            Unknown(err_code) => panic!("unexpected sys error {}", err_code),
            #[allow(unreachable_patterns)]
            _ => panic!("Unknow SysError"),
        }
    }
}
