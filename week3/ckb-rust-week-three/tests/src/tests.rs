// use ckb_testtool::ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*};
// use ckb_testtool::context::Context;
// use crate::Loader;

// // Include your tests here
// // See https://github.com/xxuejie/ckb-native-build-sample/blob/main/tests/src/tests.rs for more examples

// // generated unit test for contract error
// #[test]
// fn test_error() {
//     // deploy contract
//     let mut context = Context::default();
//     let out_point = context.deploy_cell_by_name("error");

//     // prepare scripts
//     let lock_script = context
//         .build_script(&out_point, Bytes::from(vec![42]))
//         .expect("script");

//     // prepare cells
//     let input_out_point = context.create_cell(
//         CellOutput::new_builder()
//             .capacity(1000)
//             .lock(lock_script.clone())
//             .build(),
//         Bytes::new(),
//     );
//     let input = CellInput::new_builder()
//         .previous_output(input_out_point)
//         .build();
//     let outputs = vec![
//         CellOutput::new_builder()
//             .capacity(500)
//             .lock(lock_script.clone())
//             .build(),
//         CellOutput::new_builder()
//             .capacity(500)
//             .lock(lock_script)
//             .build(),
//     ];

//     let outputs_data = vec![Bytes::new(); 2];

//     // build transaction
//     let tx = TransactionBuilder::default()
//         .input(input)
//         .outputs(outputs)
//         .outputs_data(outputs_data.pack())
//         .build();
//     let tx = context.complete_tx(tx);

//     // run
//     let cycles = context
//         .verify_tx(&tx, 10_000_000)
//         .expect("pass verification");
//     println!("consume cycles: {}", cycles);
// }

// #[test]
// fn dump_tx_error() {
//     let mut context = Context::default();
//     let contract_bin: Bytes = Loader::default().load_binary("error");
//     let out_point = context.deploy_cell(contract_bin);

//     let lock_script = context
//         .build_script(&out_point, Bytes::from(vec![3u8]))
//         .expect("script");

//     let input_out_point = context.create_cell(
//         CellOutput::new_builder()
//             .capacity(1000u64.pack())
//             .lock(lock_script.clone())
//             .build(),
//         Bytes::new(),
//     );
//     let input = CellInput::new_builder()
//         .previous_output(input_out_point)
//         .build();
//     let outputs = vec![
//         CellOutput::new_builder()
//             .capacity(500u64.pack())
//             .lock(lock_script.clone())
//             .build(),
//         CellOutput::new_builder()
//             .capacity(500u64.pack())
//             .lock(lock_script)
//             .build(),
//     ];
//     let tx = TransactionBuilder::default()
//         .input(input)
//         .outputs(outputs)
//         .outputs_data(vec![Bytes::new(); 2].pack())
//         .build();
//     let tx = context.complete_tx(tx);

//     // Dump the tx to a file
//     let dump = context.dump_tx(&tx).expect("dump");
//     let json = serde_json::to_string_pretty(&dump).expect("json");
//     std::fs::write("mock_tx.json", json).expect("write");
//     println!("mock_tx.json written");
// }


use ckb_testtool::ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*};
use ckb_testtool::context::Context;
use crate::Loader;

#[test]
fn test_error() {
    let mut context = Context::default();
    let out_point = context.deploy_cell_by_name("error");

    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![42]))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script)
            .build(),
    ];

    let outputs_data = vec![Bytes::new(); 2];

    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(outputs_data.pack())
        .build();
    let tx = context.complete_tx(tx);

    let cycles = context
        .verify_tx(&tx, 10_000_000)
        .expect("pass verification");
    println!("consume cycles: {}", cycles);
}


#[test]
fn dump_tx_error() {
    let mut context = Context::default();
    
    // Load binary explicitly so it appears in the dump
    let contract_bin: Bytes = std::fs::read(
        "../build/release/error"
    ).expect("build/release/error not found — run make build first").into();
    
    let out_point = context.deploy_cell(contract_bin.clone());

    // Build lock script with correct code_hash derived from binary
    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![3u8]))
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000)
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );
    let input = CellInput::new_builder()
        .previous_output(input_out_point)
        .build();
    let outputs = vec![
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script.clone())
            .build(),
        CellOutput::new_builder()
            .capacity(500)
            .lock(lock_script)
            .build(),
    ];
    let tx = TransactionBuilder::default()
        .input(input)
        .outputs(outputs)
        .outputs_data(vec![Bytes::new(); 2].pack())
        .build();
    let tx = context.complete_tx(tx);

    let dump = context.dump_tx(&tx).expect("dump");
    let json = serde_json::to_string_pretty(&dump).expect("json");
    std::fs::write("mock_tx.json", json).expect("write");
    println!("mock_tx.json written");
}