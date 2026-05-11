import http from 'http';
import { Transaction } from './Transaction.mjs';

export class HttpApi {
  constructor(blockchain, p2pNode, httpPort, nodeWallet) {
    this.blockchain = blockchain;
    this.p2pNode = p2pNode;
    this.httpPort = httpPort;
    this.nodeWallet = nodeWallet; // The node's internal wallet for proposing blocks

    const server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning, Cache-Control');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url === '/blocks') {
        // Strip trailing newlines from addresses so frontend string matching always succeeds
        const cleanChain = this.blockchain.chain.map(block => ({
            ...block,
            transactions: block.transactions.map(tx => ({
                ...tx,
                fromAddress: tx.fromAddress ? tx.fromAddress.trim() : null,
                toAddress: tx.toAddress ? tx.toAddress.trim() : null
            }))
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cleanChain, null, 2));
      }
      else if (req.method === 'GET' && req.url === '/pending-transactions') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.blockchain.pendingTransactions, null, 2));
      }
      else if (req.method === 'GET' && req.url === '/validators') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.blockchain.validators, null, 2));
      }
      else if (req.method === 'GET' && req.url === '/wallet/generate') {
        import('crypto').then(({ generateKeyPairSync }) => {
          const { publicKey, privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ publicKey, privateKey }, null, 2));
        });
      }
      else if (req.method === 'GET' && req.url.startsWith('/state/')) {
        const address = req.url.split('/')[2];
        const state = this.blockchain.vm.getState(address);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(state || { error: 'Contract state not found' }, null, 2));
      }
      else if (req.method === 'POST' && req.url === '/propose') {
        // Propose a block using the node's validator key
        try {
          const newBlock = this.blockchain.proposeBlock(this.nodeWallet);
          this.p2pNode.broadcastLatest(); // Gossip the new block
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Block successfully proposed and signed', block: newBlock }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      }
      else if (req.method === 'POST' && req.url === '/stake') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const txData = JSON.parse(body);
            // Reconstruct the transaction
            const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount, Transaction.STAKE);
            tx.signature = txData.signature;
            
            // Assuming 50 ALUMNI is the required minimum to stake
            if (tx.amount < 50) {
              throw new Error("A minimum of 50 ALUMNI is required to stake.");
            }

            this.blockchain.addTransaction(tx);
            this.p2pNode.broadcastTransaction(tx);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Stake transaction successfully added to pending pool' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      }
      else if (req.method === 'POST' && req.url === '/transaction') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const txData = JSON.parse(body);
            const tx = new Transaction(txData.fromAddress, txData.toAddress, txData.amount, txData.type || 'TRANSFER', txData.payload || null);
            tx.timestamp = txData.timestamp || Date.now();
            tx.signature = txData.signature;

            this.blockchain.addTransaction(tx);
            this.p2pNode.broadcastTransaction(tx);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Transaction added to mempool and broadcasted' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      }
      else if (req.method === 'POST' && req.url === '/transaction/sign-and-send') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { privateKey, fromAddress, toAddress, amount, type, payload } = JSON.parse(body);
            const tx = new Transaction(fromAddress, toAddress, amount, type || 'TRANSFER', payload);
            
            // Generate temporary wallet just to sign the transaction locally
            const { Wallet } = await import('./Wallet.mjs');
            const tempWallet = new Wallet();
            tempWallet.publicKey = fromAddress;
            tempWallet.privateKey = privateKey;
            
            tx.signTransaction(tempWallet);
            
            this.blockchain.addTransaction(tx);
            this.p2pNode.broadcastTransaction(tx);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Transaction signed and broadcast successfully', hash: tx.calculateHash() }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
      else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    const bindHost = process.env.BIND_HOST || '0.0.0.0';
    server.listen(this.httpPort, bindHost, () => {
      console.log(`📡 HTTP API listening on http://${bindHost}:${this.httpPort}`);
    });
  }
}
