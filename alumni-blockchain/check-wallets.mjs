import fs from 'fs';
import { Blockchain } from './src/Blockchain.mjs';

const chainData = JSON.parse(fs.readFileSync('alumni-chain.json', 'utf8'));
const blockchain = new Blockchain();
blockchain.chain = chainData;

console.log("=== WALLET BALANCES ===");

// Check Treasury
const treasuryPublicKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n";
const treasuryBalance = blockchain.getBalanceOfAddress(treasuryPublicKey);
console.log(`Treasury (@ALUMNI.SATOSHI): ${treasuryBalance} ALUMNI`);

// Check Node Wallet
if (fs.existsSync('alumni_node_wallet.json')) {
    const nodeWallet = JSON.parse(fs.readFileSync('alumni_node_wallet.json', 'utf8'));
    const nodeBalance = blockchain.getBalanceOfAddress(nodeWallet.publicKey);
    console.log(`Node Wallet (${nodeWallet.publicKey.substring(27, 47)}...): ${nodeBalance} ALUMNI`);
} else {
    console.log("No Node Wallet found.");
}

console.log("=======================");
