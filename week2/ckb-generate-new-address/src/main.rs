use ckb_sdk::types::{Address, AddressPayload, NetworkType};
use rand::Rng;

fn main(){
    let mut rng = rand::thread_rng();
    let privkey_bytes: [u8; 32] = rng.r#gen();
    let secp_secret_key = secp256k1::SecretKey::from_slice(&privkey_bytes).unwrap();
    
    let secp = secp256k1::Secp256k1::new();
    let pubkey = secp256k1::PublicKey::from_secret_key(&secp, &secp_secret_key);

    let payload = AddressPayload::from_pubkey(&pubkey);
    let address = Address::new(NetworkType::Testnet, payload, true);
    println!("address: {}", address.to_string());
    
    // printing your private key
    println!("Your private key (Hex) is : {}", secp_secret_key.display_secret());
}