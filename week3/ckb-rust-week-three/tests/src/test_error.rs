use crate::loader;
use ckb::ckb_testtool::ckb_types::{
    bytes::Bytes,
    core::TransactionBuilder,
    packed::*,
    prelude::*
};

use ckb_testtool::context::Context;

fn test_error(num: u8) {
    let mut context = Context::default();

    // deploy the compiled contract binary into the simulated chain
    let contract_bin: Bytes = Loader::default().load_binary("error");
    let out_point = context.deploy_cell(contract_bin);

    // building the lock script referencing the contract, args[0] = num
    let lock_script = context.build_script(&out_point, Bytes::from(vec![num])).expect("script");

    // create the input cell protected by our lock script
    let input_out_point = context.create_cell(
        CellOutput::new_builder().capacity(1000u64.pack()).lock(lock_script.clone()).build(), Bytes::new()
    );

    let input = CellInput::new_builder().previous_output(input_out_point).build();

    //4.  two output cells 500CKB each (balanced: 500 + 500=1000)
    let outputs = vec![
        CellOutput::new_builder()
        .capacity(500u64.pack())
        .lock(lock_script.clone()).build(),
        CellOutput::new_builder()
        .capacity(500u64.pack())
        .lock(lock_script()).build()
    ];

    //5. build and complete the transaction
    let tx = TransactionBuilder::default()
    .input(input)
    .outputs(output)
    .outputs_data(vec![Bytes::new(); 2].pack())
    .build();

    let tx = context.complete_tx(tx); // auto attaches cell deps

    // 6. verify
    // expects exit code 0 (success)
    let cycles = context.verify_tx(&tx, 10_000_000).expect("pass verification");

    println!("consume cycles: {}", cycles);

}

#[test]
fn test_error_index_out_of_bounds() {
    test_error(1);
}

#[test]
fn test_error_item_missing() {
    test_error(2);
}

#[test]
fn test_error_length_not_enough() {
    test_error(3);
}

