use ckb_sdk::rpc::CkbRpcClient;


fn main() {
    // setup client
    let testnet_url = "https://testnet.ckb.dev";
    let devnet_url = "http://127.0.0.1:8114";
    let mainnet_url = "https://mainnet.ckb.dev/rpc";

    let mut ckb_client =CkbRpcClient::new(testnet_url);

    // getting block info
    let block = ckb_client.get_block_by_number(0.into()).unwrap();
    println!("block: {}", serde_json::to_string_pretty(&block).unwrap());

}
