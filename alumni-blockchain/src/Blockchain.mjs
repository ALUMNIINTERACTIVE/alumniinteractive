import { Block } from './Block.mjs';
import { Transaction, TransactionType } from './Transaction.mjs';
import { AlumniVM } from './AlumniVM.mjs';
import { Storage } from './Storage.mjs';

export class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.validatorReward = 50; // Block reward for validators
    
    this.vm = new AlumniVM();
    this.validators = {}; // address -> amount staked
    
    const savedChain = Storage.loadChain();
    if (savedChain && savedChain.length > 0) {
        console.log('📦 Restoring persistent ALUMNI blockchain from disk...');
        this.replaceChain(savedChain);
    } else {
        console.log('🌱 No persistent state found. Initializing Genesis block...');
        this.chain = [this.createGenesisBlock()];
        Storage.saveChain(this.chain);
    }
  }

  createGenesisBlock() {
    return new Block(Date.parse('2026-05-09'), [], '0', null);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  executeTransaction(tx) {
    if (tx.type === TransactionType.CONTRACT_DEPLOY) {
      if (!tx.payload || !tx.payload.code) throw new Error('Deployment requires payload.code');
      const contractAddress = tx.calculateHash();
      this.vm.deployContract(contractAddress, tx.payload.code, tx.payload.initialState || {});
    } 
    else if (tx.type === TransactionType.CONTRACT_CALL) {
      if (!tx.payload || !tx.payload.method) throw new Error('Call requires payload.method');
      this.vm.callContract(tx.toAddress, tx.payload.method, tx.payload.args || {}, tx.fromAddress);
    }
    else if (tx.type === TransactionType.STAKE) {
      this.validators[tx.fromAddress] = (this.validators[tx.fromAddress] || 0) + tx.amount;
      console.log(`🥩 PoS: Validator stake registered for ${tx.fromAddress.substring(0, 35)}...`);
    }
  }

  /**
   * Replaces minePendingTransactions. Instant block finality using PoS.
   */
  proposeBlock(validatorKeyPair) {
    const validatorAddress = validatorKeyPair.publicKey;
    
    // Enforce Proof of Stake: Only users who staked tokens can propose blocks,
    // UNLESS the network is brand new and no one has staked yet (bootstrap mode).
    const totalStaked = Object.values(this.validators).reduce((a, b) => a + b, 0);
    if (totalStaked > 0 && (!this.validators[validatorAddress] || this.validators[validatorAddress] <= 0)) {
        throw new Error('Only registered validators with a stake can propose blocks');
    }

    // Add block reward for the validator
    const rewardTx = new Transaction(null, validatorAddress, this.validatorReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash, validatorAddress);
    
    console.log('\n⚡ Instantly proposing block via Proof-of-Stake...');
    block.signBlock(validatorKeyPair); // Instant finality, no mining

    // Execute state changes for contracts and stakes
    for (const tx of block.transactions) {
      try {
        if (tx.type !== TransactionType.TRANSFER) {
          this.executeTransaction(tx);
        }
      } catch (e) {
        console.error(`⚠️ Execution failed for TX ${tx.calculateHash()}: ${e.message}`);
      }
    }

    console.log('✅ Block accepted by the network!');
    this.chain.push(block);
    this.pendingTransactions = [];
    
    // Persist to disk
    Storage.saveChain(this.chain);
    
    return block;
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      if (transaction.type !== TransactionType.CONTRACT_DEPLOY) {
         throw new Error('Transaction must include from and to address');
      }
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    const txExists = this.pendingTransactions.find(tx => tx.signature === transaction.signature);
    if (txExists) return false;

    // Verify balance for transfers and stakes
    if (transaction.type === TransactionType.TRANSFER || transaction.type === TransactionType.STAKE) {
      const senderBalance = this.getBalanceOfAddress(transaction.fromAddress);
      if (senderBalance < transaction.amount) {
        throw new Error(`Not enough balance. Sender has ${senderBalance} ALUMNI.`);
      }
    }

    this.pendingTransactions.push(transaction);
    return true;
  }

  getBalanceOfAddress(address) {
    let balance = 0;
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }
    return balance;
  }

  isChainValid(chain = this.chain) {
    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];

      if (!currentBlock.hasValidTransactions()) return false;
      if (currentBlock.hash !== currentBlock.calculateHash()) return false;
      if (currentBlock.previousHash !== previousBlock.hash) return false;
    }
    return true;
  }

  replaceChain(newChainData) {
    const revivedChain = newChainData.map(blockData => {
      const block = new Block(blockData.timestamp, [], blockData.previousHash, blockData.validator);
      block.hash = blockData.hash;
      block.signature = blockData.signature;
      
      block.transactions = blockData.transactions.map(txData => {
        const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount, txData.type, txData.payload);
        tx.timestamp = txData.timestamp;
        tx.signature = txData.signature;
        return tx;
      });
      return block;
    });

    if (revivedChain.length <= this.chain.length) {
      console.log('❌ Received chain is not longer than current chain.');
      return;
    }

    if (!this.isChainValid(revivedChain)) {
      console.log('❌ Received chain is invalid.');
      return;
    }

    console.log('🔄 Replacing blockchain with the new longer chain!');
    this.chain = revivedChain;
    
    // Replay state
    this.vm = new AlumniVM();
    this.validators = {};
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.type !== TransactionType.TRANSFER) {
          try { this.executeTransaction(tx); } catch(e) {}
        }
      }
    }
    
    // Persist new chain to disk
    Storage.saveChain(this.chain);
  }
}
