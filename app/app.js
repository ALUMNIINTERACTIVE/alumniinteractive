const API_URL = 'http://network.alumniinteractive.com:3001';

// DOM Elements
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links li');
const statBlockHeight = document.getElementById('stat-block-height');
const statValidators = document.getElementById('stat-validators');
const statPending = document.getElementById('stat-pending');
const blocksTable = document.querySelector('#blocks-table tbody');

// Wallet DOM
const btnGenerate = document.getElementById('btn-generate-wallet');
const btnImport = document.getElementById('btn-import-wallet');
const pubKeyField = document.getElementById('wallet-pub');
const privKeyField = document.getElementById('wallet-priv');
const balanceField = document.getElementById('wallet-balance');
const btnSendTx = document.getElementById('btn-send-tx');

// State
let currentWallet = null;

// --- Navigation ---
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const targetView = link.getAttribute('data-view');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${targetView}`).classList.add('active');
    });
});

// --- Explorer Logic ---
async function fetchNetworkData() {
    try {
        // Fetch Blocks
        const blocksRes = await fetch(`${API_URL}/blocks`);
        const blocks = await blocksRes.json();
        
        // Fetch Pending TXs
        const pendingRes = await fetch(`${API_URL}/pending-transactions`);
        const pending = await pendingRes.json();
        
        // Fetch Validators
        const valRes = await fetch(`${API_URL}/validators`);
        const validators = await valRes.json();

        updateDashboard(blocks, pending, validators);
        
        if (currentWallet) {
            updateWalletBalance(blocks);
        }

    } catch (err) {
        console.error('Failed to connect to node:', err);
        document.querySelector('.status-indicator').style.background = '#ef4444';
        document.querySelector('.status-indicator').style.boxShadow = '0 0 8px #ef4444';
    }
}

function updateDashboard(blocks, pending, validators) {
    document.querySelector('.status-indicator').style.background = '#10b981';
    document.querySelector('.status-indicator').style.boxShadow = '0 0 8px #10b981';
    
    statBlockHeight.textContent = blocks.length;
    statPending.textContent = pending.length;
    statValidators.textContent = Object.keys(validators).length;

    blocksTable.innerHTML = '';
    // Reverse blocks to show newest first, limit to 10
    const recentBlocks = [...blocks].reverse().slice(0, 10);
    
    recentBlocks.forEach(block => {
        const tr = document.createElement('tr');
        const age = Math.floor((Date.now() - block.timestamp) / 1000);
        
        tr.innerHTML = `
            <td class="hash-text">${block.hash.substring(0, 16)}...</td>
            <td>${age}s ago</td>
            <td>${block.transactions.length}</td>
            <td>${block.validator ? block.validator.substring(27, 40) + '...' : 'Genesis'}</td>
        `;
        blocksTable.appendChild(tr);
    });
}

// --- Wallet Logic ---
btnGenerate.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/wallet/generate`);
        const keys = await res.json();
        
        currentWallet = keys;
        pubKeyField.textContent = keys.publicKey;
        privKeyField.textContent = keys.privateKey;
        
        alert('Wallet generated successfully! Keep your private key safe.');
        fetchNetworkData(); // trigger balance update
    } catch (err) {
        alert('Failed to generate wallet: ' + err.message);
    }
});

btnImport.addEventListener('click', () => {
    const pk = prompt('Enter your Private Key (PEM format):');
    const pub = prompt('Enter your Public Key (PEM format):');
    if (pk && pub) {
        currentWallet = { privateKey: pk, publicKey: pub };
        pubKeyField.textContent = pub;
        privKeyField.textContent = pk;
        fetchNetworkData();
    }
});

function updateWalletBalance(blocks) {
    if (!currentWallet) return;
    let balance = 0;
    
    blocks.forEach(block => {
        block.transactions.forEach(tx => {
            if (tx.fromAddress === currentWallet.publicKey) balance -= tx.amount;
            if (tx.toAddress === currentWallet.publicKey) balance += tx.amount;
        });
    });
    
    balanceField.textContent = balance.toFixed(2);
}

btnSendTx.addEventListener('click', async () => {
    if (!currentWallet) return alert('Please generate or import a wallet first.');
    
    const toAddress = document.getElementById('tx-to').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    
    if (!toAddress || !amount || amount <= 0) return alert('Invalid inputs');

    try {
        const res = await fetch(`${API_URL}/transaction/sign-and-send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                privateKey: currentWallet.privateKey,
                fromAddress: currentWallet.publicKey,
                toAddress: toAddress,
                amount: amount,
                type: 'TRANSFER'
            })
        });
        
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        alert('Transaction successfully signed and broadcasted to mempool!');
        document.getElementById('tx-to').value = '';
        document.getElementById('tx-amount').value = '';
        
        fetchNetworkData();
    } catch (err) {
        alert('Transaction Failed: ' + err.message);
    }
});

// Start auto-refresh loop
fetchNetworkData();
setInterval(fetchNetworkData, 3000);
