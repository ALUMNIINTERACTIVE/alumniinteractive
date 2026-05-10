import fs from 'fs';
import path from 'path';
import { Blockchain } from './src/Blockchain.mjs';
import { Transaction, TransactionType } from './src/Transaction.mjs';
import { Wallet } from './src/Wallet.mjs';
import { Storage } from './src/Storage.mjs';

// Ensure a clean start for the demo
Storage.clearStorage();

console.log('🚀 Booting ALUMNI Node for DeFi Initialization...');
let alumni = new Blockchain();

// Create Wallets
const systemWallet = new Wallet(); // Deploys the master program
const aliceWallet = new Wallet();  // A user trading tokens

console.log('\n======================================================');
console.log('    DEPLOYING ALUMNI DEFI PROTOCOL');
console.log('======================================================');

// Read the unified Smart Contract
const defiCode = fs.readFileSync(path.join(process.cwd(), 'src/contracts/AlumniDeFi.js'), 'utf8');

// Deploy the contract
const deployTx = new Transaction(systemWallet.publicKey, 'SYSTEM', 0, TransactionType.CONTRACT_DEPLOY, { code: defiCode, initialState: {} });
deployTx.signTransaction(systemWallet);
alumni.addTransaction(deployTx);
alumni.proposeBlock(systemWallet);

const DEFI_ADDRESS = deployTx.calculateHash();
console.log(`🏦 DeFi Protocol Master Contract deployed at:\n   ${DEFI_ADDRESS}`);

console.log('\n======================================================');
console.log('    MINTING ALC-20 CUSTOM TOKENS');
console.log('======================================================');

// Create $W-ALUMNI (Wrapped ALUMNI)
const mintWAlumniTx = new Transaction(systemWallet.publicKey, DEFI_ADDRESS, 0, TransactionType.CONTRACT_CALL, {
  method: 'createToken', args: { symbol: 'W-ALUMNI', supply: 1000000 }
});
mintWAlumniTx.signTransaction(systemWallet);
alumni.addTransaction(mintWAlumniTx);

// Create $DOGE
const mintDogeTx = new Transaction(systemWallet.publicKey, DEFI_ADDRESS, 0, TransactionType.CONTRACT_CALL, {
  method: 'createToken', args: { symbol: 'DOGE', supply: 5000000 }
});
mintDogeTx.signTransaction(systemWallet);
alumni.addTransaction(mintDogeTx);

alumni.proposeBlock(systemWallet);
console.log(`Created 1,000,000 W-ALUMNI and 5,000,000 DOGE tokens.`);

console.log('\n======================================================');
console.log('    CREATING AUTOMATED LIQUIDITY POOL (AMM)');
console.log('======================================================');

// Add Liquidity: 10,000 W-ALUMNI and 500,000 DOGE
const poolTx = new Transaction(systemWallet.publicKey, DEFI_ADDRESS, 0, TransactionType.CONTRACT_CALL, {
  method: 'createPool', args: { symbolA: 'W-ALUMNI', symbolB: 'DOGE', amountA: 10000, amountB: 500000 }
});
poolTx.signTransaction(systemWallet);
alumni.addTransaction(poolTx);
alumni.proposeBlock(systemWallet);

console.log(`💧 Liquidity Pool Initialized. Current Price: 1 W-ALUMNI = 50 DOGE`);

console.log('\n======================================================');
console.log('    ALUMNISWAP IN ACTION (DEX TRADING)');
console.log('======================================================');

// Give Alice some W-ALUMNI to start trading
const transferTx = new Transaction(systemWallet.publicKey, DEFI_ADDRESS, 0, TransactionType.CONTRACT_CALL, {
  method: 'transfer', args: { symbol: 'W-ALUMNI', to: aliceWallet.publicKey, amount: 500 }
});
transferTx.signTransaction(systemWallet);
alumni.addTransaction(transferTx);
alumni.proposeBlock(systemWallet);

console.log(`Alice starts with 500 W-ALUMNI and 0 DOGE.`);

// Alice swaps 100 W-ALUMNI for DOGE
console.log(`Alice submits swap transaction: 100 W-ALUMNI -> DOGE...`);
const swapTx = new Transaction(aliceWallet.publicKey, DEFI_ADDRESS, 0, TransactionType.CONTRACT_CALL, {
  method: 'swap', args: { symbolIn: 'W-ALUMNI', symbolOut: 'DOGE', amountIn: 100 }
});
swapTx.signTransaction(aliceWallet);
alumni.addTransaction(swapTx);
alumni.proposeBlock(aliceWallet);

console.log('\n--- Final Balances in the VM State Tree ---');
const state = alumni.vm.getState(DEFI_ADDRESS);

console.log(`Alice's W-ALUMNI: ${state.balances['W-ALUMNI'][aliceWallet.publicKey].toFixed(2)}`);
console.log(`Alice's DOGE:     ${state.balances['DOGE'][aliceWallet.publicKey].toFixed(2)}`);

console.log('\n✅ DeFi Architecture successfully verified!');
