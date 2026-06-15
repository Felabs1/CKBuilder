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

pub fn program_entry() -> i8 {
    ckb_std::debug!("This is a sample contract!");

    match check_hash() {
        Ok(_) => 0,
        Err(err) => err as i8,
    }
}

fn check_hash() -> Result<(), Error> {
    let script = ckb_std::high_level::load_script()?;
    let expect_hash = script.args().raw_data().to_vec();

    let witness_args = ckb_std::high_level::load_witness_args(0, Source::GroupInput)?;
    let preimage = witness_args.lock().to_opt().ok_or(Error::CheckError)?.raw_data();

    let hash = blake2b_256(preimage.as_ref());

    if hash.eq(&expect_hash.as_ref()) {
        Ok(())
    } else {
        Err(Error::UnMatch)
    }


}
