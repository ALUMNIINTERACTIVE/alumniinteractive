import { createSign, createVerify, createHash } from 'crypto';

export const TransactionType = {
  TRANSFER: 'TRANSFER',
  CONTRACT_DEPLOY: 'CONTRACT_DEPLOY',
  CONTRACT_CALL: 'CONTRACT_CALL',
  STAKE: 'STAKE'
};

export class Transaction {
  /**
   * @param {string|null} fromAddress Public key of sender
   * @param {string} toAddress Public key of receiver (or Contract Address)
   * @param {number} amount Amount of ALUMNI to send
   * @param {string} type Transaction Type
   * @param {object|null} payload Additional data for contracts
   */
  constructor(fromAddress, toAddress, amount, type = TransactionType.TRANSFER, payload = null) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.type = type;
    this.payload = payload; 
    this.timestamp = Date.now();
    this.signature = '';
  }

  calculateHash() {
    return createHash('sha256')
      .update(
        String(this.fromAddress) + 
        String(this.toAddress) + 
        this.amount + 
        this.type +
        JSON.stringify(this.payload) +
        this.timestamp
      )
      .digest('hex');
  }

  signTransaction(keyPair) {
    if (this.fromAddress === null) {
        throw new Error('Cannot sign mining reward transaction');
    }
    
    if (keyPair.publicKey !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sign = createSign('SHA256');
    sign.update(hashTx);
    sign.end();
    this.signature = sign.sign(keyPair.privateKey, 'hex');
  }

  isValid() {
    if (this.fromAddress === null) return true; // Mining reward

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    const hashTx = this.calculateHash();
    const verify = createVerify('SHA256');
    verify.update(hashTx);
    verify.end();
    
    return verify.verify(this.fromAddress, this.signature, 'hex');
  }
}
