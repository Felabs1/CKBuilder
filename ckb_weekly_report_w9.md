# Builder track weekly report - Week 9
**Name**: Felix Awere<br>
**Week Ending**: 29th June 2026

## Courses Completed
- **What is Fiber network**: I learnt that fiber network is a peer to peer payment and swap network built on Nervos CKB and it's similar to bitcoin lightening network
- **How fiber works**: fiber uses payment channels to move funds offchain while settling on the ckb
- **Run a Fiber Node (Overview) ([fiber.world/docs/quick-start/run-a-node](https://www.fiber.world/docs/quick-start/run-a-node))**: Worked through the official guidance on what a Fiber node does (maintain channels, send/receive payments, swap assets, route, gossip) and the two node forms.
- **Basic Transfer Example**: Learnt how to set up two local nodes, open a channel between them and send ckb payments from one to another

## Key learnings
- **Copying a node directory copies the identity**: cloning `node1` data into `node2` carries the `fiber/sk` file along, hence rendering both nodes with the same pubkey
- **Don't trust head -n 1 blindly**: The docs say to use `head -n 1 ./ckb/exported-key > ./ckb/key` to extract the private key. It can pull binary garbage into the file if the export has weird trailing characters. Writing the key directly with `echo "..." > ckb/key` is more reliable.
- **Channels take a minute to open**: After opening a channel, it shows `AwaitingTxSignatures` while the funding transaction confirms on chain. Only when it shows `ChannelReady` can you actually send payments.
- **Each node runs on its own RPC port**: `fnn-cli` always talks to port 8227 by default. To talk to Node 2 (on port 8237) you have to add `--url http://127.0.0.1:8237` to every command. Forgetting this means you're accidentally querying the wrong node.
- **Payments are instant inside a channel**: once a channel is open, sending ckb through it doesnt touch the blockchain

## Practical progress
- **Node 1 (`my-fnn`) set up on Testnet**: downloaded fiber library, copied the testnet config, created ckb account, saved the key and started the node as per the documentations. the node was live at port 8227 and p2p port 8228
  ![image node 1](./images/Screenshot%202026-06-28%20at%2019.21.45.png)
  ![image node 1](./images/Screenshot%202026-06-28%20at%2019.50.23.png)
- **Node 2 (`my-fnn-2`) set up alongside Node 1**: created a second folder, edited the config to use different ports (RPC 8237, P2P 8238), created a separate CKB account, saved a different key, and started the node.
- **Both nodes Funded**: Got each node's testnet address from `ckb-cli account list`, then requested 100,000 CKB per address from the [Nervos faucet](https://faucet.nervos.org).
- **connected the two nodes**: Used `connect_peer` on Node 1 to dial Node 2. Confirmed the link with `peer list_peers` on both sides.
- **Opened a payment channel**: Funded a public channel from Node 1 with 500 CKB. Waited for the status to change from `AwaitingTxSignatures` to `ChannelReady`.
  ![image peers connected](./images/Screenshot%202026-06-28%20at%2019.50.23.png)
- **Sent the first payment**: Created a 100 CKB invoice on Node 2, paid it from Node 1. After the payment, Node 1's balance dropped from ~500 CKB to ~400 CKB and Node 2's balance rose from 0 to exactly 100 CKB — proving the off-chain transfer worked.
  ![image sent verification](./images/Screenshot%202026-06-29%20at%2019.55.36.png)
- **cloned the phaser game on fibre**: Was able to clone the phaser game from github, configured the fiber nodes to match my local nodes and was able to run and play it successfully.
  
  ![image sent verification](./images/Screenshot%202026-06-29%20at%2023.50.15.png)
  ![image sent verification](./images/Screenshot%202026-06-29%20at%2023.50.44.png)
  ![image sent verification](./images/Screenshot%202026-06-29%20at%2023.50.54.png)

## Issues
 
### Issue 1: Both nodes had the same pubkey
After copying the Node 1 folder to make Node 2, both nodes reported the same identity. Trying to open a channel failed because Node 1 was effectively trying to connect to itself.
 
### Issue 1 Fix
The node identity file (`fiber/sk`) was copied along with everything else. Deleted it from Node 2's folder along with `fiber/store`, then restarted Node 2. It generated a fresh identity on first launch.

### Issue 2: Key files contained gibberish
Running `cat ckb/key` showed unreadable binary characters instead of a clean hex string. The docs' suggested command (`head -n 1`) was grabbing junk along with the real key.
 
### Issue 2 Fix
Looked at the original exported key file, confirmed the first line was a clean hex string, and wrote it into `ckb/key` directly using `echo`. Made sure both nodes had different keys.

### Issue 3: Constant warnings in the log about peer address
Node 1's log kept spamming `Failed to save address to peer store: unable to extract peer id from address`. The connect command from the docs leaves out the `/p2p/<peer_id>` part of the address, which Fiber needs to remember the peer properly.
 
### Issue 3 Fix
The connection still worked in-session but it couldn't get saved. Verified with `peer list_peers` that Node 2 was visible, then continued. For a clean fix, the full address with `/p2p/<peer_id>` (visible in `list_peers` output) should be used when connecting.

### Issue 4: "Waiting for peer to send Init message" when opening channel
Sometimes `open_channel` failed even right after a successful `connect_peer`. The peer connection had dropped between commands.
 
### Issue 4 Fix
Re-ran `connect_peer`, checked `peer list_peers` to confirm the link, then ran `open_channel` immediately.