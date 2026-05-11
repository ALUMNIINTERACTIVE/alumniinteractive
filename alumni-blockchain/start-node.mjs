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

// ---------------------------------------------------------
// 👑 GENESIS BOOTSTRAP & AUTO-STAKING
// ---------------------------------------------------------
const totalStaked = Object.values(alumniCoin.validators).reduce((a, b) => a + b, 0);

if (alumniCoin.chain.length === 1 && totalStaked === 0) {
    console.log('🌱 Network is fresh. Bootstrapping Genesis Node & Treasury...');
    const { Transaction, TransactionType } = await import('./src/Transaction.mjs');
    const fs = await import('fs');
    
    // 1. Set the ALUMNI Ecosystem Treasury Wallet (@ALUMNI.SATOSHI)
    const treasuryPublicKey = 'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNnTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==';
    console.log(`🏦 Treasury Address locked to @ALUMNI.SATOSHI`);
    
    // 2. Genesis Pre-mine: 10,000,000 ALUMNI to Treasury (10% of Max Supply)
    const treasuryMint = new Transaction(null, treasuryPublicKey, 10000000);
    alumniCoin.pendingTransactions.push(treasuryMint);

    // 3. Give the Node Wallet an initial supply of ALUMNI to stake
    const genesisMint = new Transaction(null, nodeWallet.publicKey, 1000);
    alumniCoin.pendingTransactions.push(genesisMint);
    
    // Mine the bootstrap block
    alumniCoin.proposeBlock(nodeWallet);
    console.log(`💰 Minted 10,000,000 ALUMNI to Treasury.`);
    console.log(`💰 Minted 1,000 ALUMNI to Genesis Node (${nodeWallet.publicKey.substring(0, 16)}...)`);
    
    // 4. Auto-Stake 50 ALUMNI to lock the network into PoS Mode
    const stakeTx = new Transaction(nodeWallet.publicKey, '0000000000000000000000000000000000000000', 50, TransactionType.STAKE);
    stakeTx.signTransaction(nodeWallet.keyPair);
    alumniCoin.addTransaction(stakeTx);
    
    // Mine the staking block
    alumniCoin.proposeBlock(nodeWallet);
    console.log(`🥩 Node Auto-Staked 50 ALUMNI. Network is now strictly Proof-of-Stake!`);
} else if (totalStaked > 0) {
    console.log(`🛡️ Network is in PoS mode. Total Staked ALUMNI: ${totalStaked}`);
}

// ---------------------------------------------------------
// ⚙️ BACKGROUND CONSENSUS ENGINE (Validator Loop)
// ---------------------------------------------------------
setInterval(() => {
    if (alumniCoin.pendingTransactions.length > 0) {
        // Only propose if we are a valid staker
        const myStake = alumniCoin.validators[nodeWallet.publicKey] || 0;
        const netStaked = Object.values(alumniCoin.validators).reduce((a, b) => a + b, 0);
        
        if (netStaked === 0 || myStake > 0) {
            console.log(`\n⏳ Background Engine: Found ${alumniCoin.pendingTransactions.length} pending TX(s). Processing...`);
            try {
                alumniCoin.proposeBlock(nodeWallet);
            } catch (err) {
                console.error('❌ Background consensus failed to propose block:', err.message);
            }
        }
    }
}, 5000);

console.log('✅ Node successfully started!');
console.log(`📡 API URL: http://localhost:${httpPort}`);
console.log(`🌐 P2P Port: ${p2pPort}`);
if (initialPeers.length > 0) {
  console.log(`🔗 Connecting to global seeders: ${initialPeers.join(', ')}`);
} else {
  console.log(`👑 Genesis Node - Waiting for peers to connect...`);
}
