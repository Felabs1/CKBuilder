use ckb_sdk::{
    constants::SIGHASH_TYPE_HASH,
    rpc::CkbRpcClient,
    traits::{
        DefaultCellCollector, DefaultCellDepResolver, DefaultHeaderDepResolver, DefaultTransactionDependencyProvider, SecpCkbRawKeySigner,
    },
    tx_builder::{transfer::CapacityTransferBuilder, CapacityBalancer, TxBuilder},
    unlock::{ScriptUnlocker, SecpSighashUnlocker},
    Address, HumanCapacity, ScriptId,
};

use ckb_types::{
    bytes::Bytes,
    core::BlockView,
    h256,
    packed::{CellOutput, Script, WitnessArgs},
    prelude::*,
};



use std::{collections::HashMap, str::FromStr};

fn main(){
    let ckb_rpc = "https://testnet.ckb.dev";
    let sender = Address::from_str("ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvm8ru8r6s869w7mng9e5mrmpz7wsmnq0q7unsnr").unwrap();

    // in production i would reccomend not leaving your private key in the open the way i did my 
    let sender_key = secp256k1::SecretKey::from_slice(
        h256!("0x7ed8e6a6ad65346e4da649f45c03f5f066c50c91765acfb2a545fbfcfc9fa846").as_bytes()
    ).unwrap();
    let receiver = Address::from_str("ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvglkprurm00l7hrs3rfqmmzyy3ll7djdsujdm6z").unwrap();
    let capacity = HumanCapacity::from_str("100").unwrap();

    //build scriptUnlocker
    let signer = SecpCkbRawKeySigner::new_with_secret_keys(vec![sender_key]);
    let sighash_unlocker = SecpSighashUnlocker::from(Box::new(signer) as Box<_>);
    let sighash_script_id = ScriptId::new_type(SIGHASH_TYPE_HASH.clone());
    let mut unlockers = HashMap::default();
    unlockers.insert(
        sighash_script_id,
        Box::new(sighash_unlocker) as Box<dyn ScriptUnlocker>,
    );

    // build capacity balancer
    let placeholder_witness = WitnessArgs::new_builder().lock(Some(Bytes::from(vec![0u8; 65])).pack()).build();

    let balancer = CapacityBalancer::new_simple(sender.payload().into(), placeholder_witness, 1000);

    let ckb_client = CkbRpcClient::new(ckb_rpc);
    let cell_dep_resolver = {
        let genesis_block = ckb_client.get_block_by_number(0.into()).unwrap().unwrap();
        DefaultCellDepResolver::from_genesis(&BlockView::from(genesis_block)).unwrap()
    };
    let header_dep_resolver = DefaultHeaderDepResolver::new(ckb_rpc);
    let mut cell_collector = DefaultCellCollector::new(ckb_rpc);
    let tx_dep_provider = DefaultTransactionDependencyProvider::new(ckb_rpc, 10);

    // build the transaction
    let output = CellOutput::new_builder().lock(Script::from(&receiver)).capacity(capacity.0.pack()).build();
    let builder = CapacityTransferBuilder::new(vec![(output, Bytes::default())]);
    let (tx, _) = builder.build_unlocked(&mut cell_collector, &cell_dep_resolver, &header_dep_resolver, &tx_dep_provider, &balancer, &unlockers).unwrap();

    // broadcasting the network
    let tx_hash = ckb_client.send_transaction(tx.data().into(), None).expect("Failed to broadcast transaction");

    println!("Transaction Hash: {}", tx_hash);
}


