import net from 'net';
import { Transaction } from './Transaction.mjs';

const MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2,
  BROADCAST_TRANSACTION: 3
};

export class P2PNode {
  constructor(blockchain, p2pPort, peers) {
    this.blockchain = blockchain;
    this.sockets = [];
    this.p2pPort = p2pPort;
    
    // Create TCP server for inbound connections
    const bindHost = process.env.BIND_HOST || '0.0.0.0';
    const server = net.createServer((socket) => this.initConnection(socket));
    server.listen(this.p2pPort, bindHost, () => {
      console.log(`🌐 P2P Node listening for peer connections on ${bindHost}:${this.p2pPort}`);
    });

    // Connect to outbound peers
    this.connectToPeers(peers);
  }

  connectToPeers(peers) {
    peers.forEach(peer => {
      const [host, port] = peer.split(':');
      const socket = new net.Socket();
      socket.connect(port, host, () => {
        this.initConnection(socket);
      });
      socket.on('error', (err) => {
        console.log(`⚠️  Could not connect to peer ${peer}`);
      });
    });
  }

  initConnection(socket) {
    this.sockets.push(socket);
    console.log(`🔗 New peer connected: ${socket.remoteAddress}:${socket.remotePort}`);

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      // Process complete messages separated by newline
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const messageStr = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        try {
          const message = JSON.parse(messageStr);
          this.handleMessage(socket, message);
        } catch (e) {
          console.error('Failed to parse P2P message', e);
        }
      }
    });

    socket.on('close', () => {
      console.log(`🔌 Peer disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
      this.sockets = this.sockets.filter(s => s !== socket);
    });

    // Request the latest block from the new peer
    this.write(socket, { type: MessageType.QUERY_LATEST });
  }

  handleMessage(socket, message) {
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        this.write(socket, {
          type: MessageType.RESPONSE_BLOCKCHAIN,
          data: [this.blockchain.getLatestBlock()]
        });
        break;
      case MessageType.QUERY_ALL:
        this.write(socket, {
          type: MessageType.RESPONSE_BLOCKCHAIN,
          data: this.blockchain.chain
        });
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        this.handleBlockchainResponse(message.data);
        break;
      case MessageType.BROADCAST_TRANSACTION:
        this.handleTransactionBroadcast(message.data);
        break;
    }
  }

  handleBlockchainResponse(receivedChainData) {
    if (receivedChainData.length === 0) return;
    
    const latestBlockReceived = receivedChainData[receivedChainData.length - 1];
    const latestBlockHeld = this.blockchain.getLatestBlock();

    if (latestBlockReceived.timestamp > latestBlockHeld.timestamp || latestBlockReceived.hash !== latestBlockHeld.hash) {
      // If we only received one block, and it hooks into our chain
      if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
        console.log('We are behind. Requesting full chain to sync...');
        this.broadcast({ type: MessageType.QUERY_ALL });
      } else if (receivedChainData.length === 1) {
        // We have to query the chain from our peer
        console.log('We are behind. Requesting full chain to sync...');
        this.broadcast({ type: MessageType.QUERY_ALL });
      } else {
        // We received the full chain, let's try replacing ours
        this.blockchain.replaceChain(receivedChainData);
      }
    } else {
      console.log('Received blockchain is not longer than current blockchain. Keeping our chain.');
    }
  }

  handleTransactionBroadcast(txData) {
    const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount, txData.type || 'TRANSFER', txData.payload || null);
    tx.timestamp = txData.timestamp;
    tx.signature = txData.signature;
    
    try {
      const added = this.blockchain.addTransaction(tx);
      if (added) {
        console.log('📥 Received new transaction via P2P. Broadcasting to other peers...');
        this.broadcastTransaction(tx);
      }
    } catch (e) {
      console.log('Rejected P2P transaction:', e.message);
    }
  }

  write(socket, message) {
    socket.write(JSON.stringify(message) + '\n');
  }

  broadcast(message) {
    this.sockets.forEach(socket => this.write(socket, message));
  }

  broadcastLatest() {
    this.broadcast({
      type: MessageType.RESPONSE_BLOCKCHAIN,
      data: [this.blockchain.getLatestBlock()]
    });
  }

  broadcastTransaction(transaction) {
    this.broadcast({
      type: MessageType.BROADCAST_TRANSACTION,
      data: transaction
    });
  }
}
