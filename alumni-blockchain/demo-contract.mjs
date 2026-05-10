import { Blockchain } from './src/Blockchain.mjs';
import { Transaction, TransactionType } from './src/Transaction.mjs';
import { Wallet } from './src/Wallet.mjs';

console.log('🚀 Booting ALUMNI Node with Smart Contract Support...');
const alumni = new Blockchain();

const userWallet = new Wallet();
const minerWallet = new Wallet();

console.log('\n1. Mining initial block for genesis funds...');
alumni.minePendingTransactions(minerWallet.publicKey);

console.log('\n======================================================');
console.log('    DEPLOYING A DECENTRALIZED VOTING dAPP');
console.log('======================================================');

// The Smart Contract Code (Written in standard JavaScript)
const votingContractCode = `
  function vote(args, state, msg) {
    const candidate = args.candidate;
    
    // Initialize candidate if they don't exist
    if (!state.votes[candidate]) {
      state.votes[candidate] = 0;
    }
    
    // Security Check: Ensure sender hasn't already voted
    if (state.voters[msg.sender]) {
      throw new Error('Security Violation: You have already voted!');
    }
    
    // Mutate the permanent state
    state.votes[candidate] += 1;
    state.voters[msg.sender] = true;
    
    return "Vote cast successfully for " + candidate;
  }
`;

// Initial memory state for the Contract
const initialState = {
  votes: {},
  voters: {}
};

// Create a Deployment Transaction
const deployTx = new Transaction(
  userWallet.publicKey, 
  'SYSTEM', 
  0, 
  TransactionType.CONTRACT_DEPLOY, 
  { code: votingContractCode, initialState: initialState }
);

deployTx.signTransaction(userWallet);
alumni.addTransaction(deployTx);

console.log('\n2. Mining the block to execute deployment...');
alumni.minePendingTransactions(minerWallet.publicKey);

// The contract address is deterministically the hash of the deploy transaction
const contractAddress = deployTx.calculateHash();
console.log(`\n✅ Vote Contract permanently deployed at address:`);
console.log(`   ${contractAddress}`);


console.log('\n======================================================');
console.log('    INTERACTING WITH THE dAPP');
console.log('======================================================');

console.log('\nUser signs a transaction to cast a vote for "Alice"...');
const callTx = new Transaction(
  userWallet.publicKey,
  contractAddress, // Target the contract address
  0,
  TransactionType.CONTRACT_CALL,
  { method: 'vote', args: { candidate: 'Alice' } }
);

callTx.signTransaction(userWallet);
alumni.addTransaction(callTx);

console.log('\n3. Mining the block to execute the contract logic...');
alumni.minePendingTransactions(minerWallet.publicKey);

console.log('\n--- Final Smart Contract State ---');
console.log(JSON.stringify(alumni.vm.getState(contractAddress), null, 2));


console.log('\n======================================================');
console.log('    TESTING dAPP SECURITY (DOUBLE VOTING)');
console.log('======================================================');

console.log('\nSame User signs another transaction to vote for "Bob"...');
const callTx2 = new Transaction(
  userWallet.publicKey,
  contractAddress,
  0,
  TransactionType.CONTRACT_CALL,
  { method: 'vote', args: { candidate: 'Bob' } }
);
callTx2.signTransaction(userWallet);
alumni.addTransaction(callTx2);

console.log('\n4. Mining the block to process the double-vote attempt...');
alumni.minePendingTransactions(minerWallet.publicKey);

console.log('\n--- Resulting Smart Contract State (Should be completely unchanged) ---');
console.log(JSON.stringify(alumni.vm.getState(contractAddress), null, 2));
