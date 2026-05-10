import { Blockchain } from './src/Blockchain.mjs';
import { Transaction, TransactionType } from './src/Transaction.mjs';
import { Wallet } from './src/Wallet.mjs';

console.log('🚀 Booting ALUMNI Node (Proof of Stake Edition)...');
const alumni = new Blockchain();

const userWallet = new Wallet();
const validatorWallet1 = new Wallet();

console.log('\n======================================================');
console.log('    PHASE 1: BOOTSTRAPPING THE NETWORK');
console.log('======================================================');
console.log('Initially, the network is empty. We allow a Genesis bootstrap proposal.');
alumni.proposeBlock(validatorWallet1);

console.log(`\nInitial Validator 1 Balance: ${alumni.getBalanceOfAddress(validatorWallet1.publicKey)} ALUMNI`);

console.log('\n======================================================');
console.log('    PHASE 2: BECOMING A VALIDATOR (STAKING)');
console.log('======================================================');
console.log('Validator 1 locks 25 ALUMNI to officially register their node...');

const stakeTx = new Transaction(
  validatorWallet1.publicKey,
  'SYSTEM',
  25,
  TransactionType.STAKE
);
stakeTx.signTransaction(validatorWallet1);
alumni.addTransaction(stakeTx);

// Validator 1 proposes the block containing their own stake registration
alumni.proposeBlock(validatorWallet1);

console.log('\nActive Validators Pool:');
console.log(alumni.validators);

console.log('\n======================================================');
console.log('    PHASE 3: HIGH-SPEED TRANSACTIONS (SOLANA SPEED)');
console.log('======================================================');
console.log('Sending a transfer transaction...');

const transferTx = new Transaction(validatorWallet1.publicKey, userWallet.publicKey, 10);
transferTx.signTransaction(validatorWallet1);
alumni.addTransaction(transferTx);

console.log('Validator 1 instantly signs and finalizes the block without PoW mining delays...');
const t0 = performance.now();
alumni.proposeBlock(validatorWallet1);
const t1 = performance.now();
console.log(`⚡ Block Finality Time: ${(t1 - t0).toFixed(2)} milliseconds!`);

console.log(`\n--- Final Balances ---`);
console.log(`Validator 1 Balance (Unlocked): ${alumni.getBalanceOfAddress(validatorWallet1.publicKey)} ALUMNI`);
console.log(`Validator 1 Staked (Locked):    ${alumni.validators[validatorWallet1.publicKey]} ALUMNI`);
console.log(`User Balance:                   ${alumni.getBalanceOfAddress(userWallet.publicKey)} ALUMNI`);

console.log('\n======================================================');
console.log('    PHASE 4: NETWORK SECURITY (SLASHING SIMULATION)');
console.log('======================================================');
const maliciousWallet = new Wallet();
console.log('A random user tries to propose a block without staking any tokens...');

try {
  alumni.proposeBlock(maliciousWallet);
} catch (e) {
  console.log(`\n🛡️ Network Rejected Proposal: ${e.message}`);
}
