import { FiberNode } from "./node";

export const amountPerPoint = 1 * 10 ** 8; // 1 CKB per point

const node1 = {
    pubkey: "0x0257cece99c3f584d3e44d991115c71c1169238428ac093efd2c3d94b4ebad9c86",
    address:
        "/ip4/127.0.0.1/tcp/8228/p2p/QmNn4L24uFejtKVKvRDDD84bU33DADnLv16DeQWSM7u2GE",
    url: "/node1-api",
};

const node2 = {
    pubkey: "0x021ebbaf3ebe084ebfb0e8d4e2d2c578cb06ff68f86d4d2d4a2bbcf4d043a51b84",
    address:
        "/ip4/127.0.0.1/tcp/8238/p2p/QmRkPYh4y9x9LZHjDsAjbhxxjuQSJyKopATVHTsaxmJsBh",
    url: "/node2-api",
};

export async function prepareNodes() {
    const bossNode = new FiberNode(node1.url, node1.pubkey, node1.address);
    const playerNode = new FiberNode(node2.url, node2.pubkey, node2.address);
    console.log("bossNode", bossNode);
    console.log("playerNode", playerNode);

    await bossNode.sdk.connectPeer({
        address: playerNode.address,
    });

    const channels = await bossNode.sdk.listChannels({
        pubkey: playerNode.pubkey,
    });
    const activeChannel = channels.filter(
        (channel: any) => channel.state.stateName === "CHANNEL_READY",
    );
    console.log("activeChannel", activeChannel);
    return { bossNode, playerNode };
}

export async function payPlayerPoints(
    bossNode: FiberNode,
    playerNode: FiberNode,
    points: number,
) {
    const amount = `0x${(amountPerPoint * points).toString(16)}`;

    const invoice = await playerNode.createCKBInvoice(
        amount,
        "player hit the boss!",
    );
    const result = await bossNode.sendPayment(invoice.invoiceAddress);
    console.log(`boss pay player ${points} CKB`);
    console.log("invoice", invoice);
    console.log("payment result", result);
}

export async function payBossPoints(
    bossNode: FiberNode,
    playerNode: FiberNode,
    points: number,
) {
    const amount = `0x${(amountPerPoint * points).toString(16)}`;
    const invoice = await bossNode.createCKBInvoice(
        amount,
        "boss hit the player!",
    );
    const result = await playerNode.sendPayment(invoice.invoiceAddress);
    console.log(`player pay boss ${points} CKB`);
    console.log("invoice", invoice);
    console.log("payment result", result);
}
