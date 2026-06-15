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

use ckb_std::{
    ckb_constants::Source,
    high_level::load_cell_data,
    error::SysError,
};

#[repr(i8)]
pub enum Error {
    InvalidStateTransition = 1,
    DataLengthMismatch = 2,
}



pub fn program_entry() -> i8 {
    // try loading the input cell data (old state)
    let input_res = load_cell_data(0, Source::GroupInput);

    // trying to laod the output cell data (new state)
    let output_res = load_cell_data(0, Source::GroupOutput);

    match(input_res, output_res) {
        // Creating a brand new todo item
        (Err(SysError::IndexOutOfBound), Ok(output_data)) => {
            if output_data.is_empty() {
                return Error::DataLengthMismatch as i8;
            }

            // First byte: 0x00 = Pending, 0x01 = Completed
            if output_data[0] != 0 {
                return Error::InvalidStateTransition as i8;
            }

            0
        }

        // updating an existing todo item (e.g) marking as completed
        (Ok(input_data), Ok(output_data)) => {
            if input_data.len() != output_data.len() {
                return Error::DataLengthMismatch as i8;
            }

            // ensuring the text content (everything after byte 0 didnt change maliciously)
            if input_data[1..] != output_data[1..] {
                return Error::InvalidStateTransition as i8;
            }

            if input_data[0] == 1 && output_data[0] == 0 {
                return Error::InvalidStateTransition as i8;
            }

            0
        }

        // CASE3: Deleting a todo item (consuming the cell to release CKB capacity )
        (Ok(_input_data), Err(SysError::IndexOutOfBound)) => {
            0 // allow users to clear out their completed lists and get their ckb back
        }

        _ => Error::InvalidStateTransition as i8,
    }
}
