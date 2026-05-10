# ALUMNI Network ⚡

A high-performance, dependency-free Layer 1 Blockchain Engine engineered entirely in native Node.js. 

ALUMNI features Proof-of-Stake consensus, an isolated JavaScript Virtual Machine (AlumniVM) for Smart Contracts, and a fully functional Decentralized Finance (DeFi) application layer.

## 🌟 Key Features
- **Zero Dependencies**: Runs entirely on the native Node.js standard library (`net`, `crypto`, `fs`, `vm`, `http`). No `npm install` needed for the core protocol.
- **Proof of Stake (PoS)**: High-speed, mathematically secure block validation.
- **AlumniVM**: Write and deploy Smart Contracts in native JavaScript.
- **Built-in DeFi**: Includes the ALC-20 Token Standard and an Automated Market Maker (AMM) Decentralized Exchange natively deployed.
- **Persistent Storage**: The ledger and VM state are automatically flushed to and restored from the local disk.

## 🚀 How to Run a Node

Joining the ALUMNI network is incredibly simple. You do not need any external packages.

### Prerequisites
- Node.js v18 or higher installed on your machine.

### Booting the Network

1. Clone the repository and navigate to the directory:
```bash
git clone https://github.com/alumni-interactive/alumni-network.git
cd alumni-network
```

2. Start your Node:
```bash
node start-node.mjs
```

Your node will automatically generate a Validator Public/Private keypair, read any existing ledger data from `alumni-chain.json`, boot a P2P socket server on port `6001`, and start the HTTP JSON-RPC API on port `3001`.

## 💻 Interacting with the Network

Once your node is running, you can connect to its REST API to read the ledger:
- `GET http://localhost:3001/blocks` : Returns the full blockchain.
- `GET http://localhost:3001/validators` : Returns the active staking pool.

## 🧪 Running Demos

We have included scripts to simulate massive network activity without manually submitting HTTP requests. Open a new terminal window and run:

**Simulate High-Speed Transactions:**
```bash
node demo-storage.mjs
```

**Simulate The DeFi Ecosystem (Tokens & DEX Swaps):**
```bash
node demo-defi.mjs
```

---
*Developed by Alumni Interactive.*
