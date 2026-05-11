import { Blockchain } from './src/Blockchain.mjs';
import { P2PNode } from './src/P2PNode.mjs';
import { HttpApi } from './src/HttpApi.mjs';
import { Wallet } from './src/Wallet.mjs';

// Parse CLI arguments
const httpPort = process.env.HTTP_PORT || process.argv[2] || 3001;
const p2pPort = process.env.P2P_PORT || 6001;

// DNS Seeding: Default to the global Alumni network if no peers are specified
const defaultSeeders = ['network.alumniinteractive.com:6001'];
let initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : defaultSeeders;
if (process.env.PEERS === 'none') {
    initialPeers = [];
}

// Initialize network components

// Generate a wallet for this specific node to act as a Validator
const nodeWallet = new Wallet();
console.log(`🔐 Node Validator Public Key generated`);

const alumniCoin = new Blockchain();
const p2pServer = new P2PNode(alumniCoin, p2pPort, initialPeers);
const httpServer = new HttpApi(alumniCoin, p2pServer, httpPort, nodeWallet);

console.log('✅ Node successfully started!');
console.log(`📡 API URL: http://localhost:${httpPort}`);
console.log(`🌐 P2P Port: ${p2pPort}`);
if (initialPeers.length > 0) {
  console.log(`🔗 Connecting to global seeders: ${initialPeers.join(', ')}`);
} else {
  console.log(`👑 Genesis Node - Waiting for peers to connect...`);
}
