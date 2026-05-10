import { createHash, createSign, createVerify } from 'crypto';

export class Block {
  constructor(timestamp, transactions, previousHash = '', validator = null) {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validator = validator; // Public key of the validator who proposed this block
    this.signature = ''; // Validator's cryptographic signature
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return createHash('sha256')
      .update(
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        (this.validator || '')
      )
      .digest('hex');
  }

  /**
   * Proposes and instantly finalizes the block (replaces slow PoW mining)
   */
  signBlock(validatorKeyPair) {
    if (this.validator !== validatorKeyPair.publicKey) {
      throw new Error('You cannot sign a block you did not propose');
    }
    
    this.hash = this.calculateHash(); 
    
    const sign = createSign('SHA256');
    sign.update(this.hash);
    sign.end();
    this.signature = sign.sign(validatorKeyPair.privateKey, 'hex');
    
    console.log(`✅ Block signed by Validator ${this.validator.substring(0, 40)}...`);
  }

  /**
   * Verifies the cryptographic integrity of the block and its transactions
   */
  hasValidTransactions() {
    // Genesis block exceptions
    if (this.validator === null && this.previousHash === '0') return true;

    if (!this.signature || this.signature.length === 0) {
      console.log('Block has no signature');
      return false;
    }

    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        console.log('Invalid transaction found in block');
        return false;
      }
    }

    // Verify Validator Signature
    const verify = createVerify('SHA256');
    verify.update(this.hash);
    verify.end();
    
    if (!verify.verify(this.validator, this.signature, 'hex')) {
        console.log('Invalid block signature from validator');
        return false;
    }
    
    return true;
  }
}
