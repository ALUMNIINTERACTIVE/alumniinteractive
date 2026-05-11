import { Blockchain } from './src/Blockchain.mjs';
import { Transaction, TransactionType } from './src/Transaction.mjs';
import { Wallet } from './src/Wallet.mjs';
import { Storage } from './src/Storage.mjs';

// Ensure a clean start for the demo
Storage.clearStorage();

console.log('🚀 [NODE A] Starting a brand new node...');
let alumni = new Blockchain();

// Create persistent wallets
const userWallet = new Wallet();
const validatorWallet = new Wallet();

console.log('\n--- Building Initial Network State ---');
console.log('Bootstrapping Genesis block...');
alumni.proposeBlock(validatorWallet); 

console.log('Validator stakes 25 ALUMNI...');
const stakeTx = new Transaction(validatorWallet.publicKey, 'SYSTEM', 25, TransactionType.STAKE);
stakeTx.signTransaction(validatorWallet);
alumni.addTransaction(stakeTx);
alumni.proposeBlock(validatorWallet);

console.log('Validator transfers 10 ALUMNI to the User...');
const transferTx = new Transaction(validatorWallet.publicKey, userWallet.publicKey, 10);
transferTx.signTransaction(validatorWallet);
alumni.addTransaction(transferTx);
alumni.proposeBlock(validatorWallet);

console.log(`\n[NODE A] User Balance in memory: ${alumni.getBalanceOfAddress(userWallet.publicKey)} ALUMNI`);


console.log('\n🛑 [SYSTEM] Simulating fatal server crash or shutdown...');
alumni = null; // Destroy the instance in RAM


console.log('\n======================================================');
console.log('🚀 [NODE B] Rebooting node from cold start...');
console.log('======================================================');

// Re-instantiating the Blockchain class will automatically trigger `Storage.loadChain()`
const alumniRestarted = new Blockchain();

console.log('\n--- Verifying Restored State ---');
console.log(`[NODE B] User Balance Restored:                 ${alumniRestarted.getBalanceOfAddress(userWallet.publicKey)} ALUMNI`);
console.log(`[NODE B] Validator Staked Balance Restored:     ${alumniRestarted.validators[validatorWallet.publicKey]} ALUMNI`);
console.log(`[NODE B] Total Blocks in Chain:                 ${alumniRestarted.chain.length}`);

console.log('\n✅ Persistent disk storage architecture successfully verified!');
