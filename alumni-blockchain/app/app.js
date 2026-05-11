const API_ENDPOINTS = [
    'https://spinner-helpline-gout.ngrok-free.dev',
    'http://network.alumniinteractive.com:3001',
    'http://10.0.0.99:3001',
    'http://127.0.0.1:3001'
];
let API_URL = '';

// The hardcoded address of the live AlumniDeFi Smart Contract
const DEFI_ADDRESS = 'f404c8f0e316ce023ee1723dc16fac8cef1aa09519f2d7e780adf5f90c6181ab';

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

// DEX DOM
const btnMintToken = document.getElementById('btn-mint-token');
const btnCreatePool = document.getElementById('btn-create-pool');
const btnSwapTokens = document.getElementById('btn-swap-tokens');

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
        const blocksRes = await fetch(`${API_URL}/blocks`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const blocks = await blocksRes.json();
        
        // Fetch Pending TXs
        const pendingRes = await fetch(`${API_URL}/pending-transactions`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const pending = await pendingRes.json();
        
        // Fetch Validators
        const valRes = await fetch(`${API_URL}/validators`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
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
        const res = await fetch(`${API_URL}/wallet/generate`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
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
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
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

// --- DEX Logic ---
btnMintToken.addEventListener('click', async () => {
    if (!currentWallet) return alert("Please generate or import a wallet first!");
    const symbol = document.getElementById('mint-symbol').value;
    const supply = document.getElementById('mint-supply').value;
    if (!symbol || !supply) return;

    try {
        const res = await fetch(`${API_URL}/transaction/sign-and-send`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                privateKey: currentWallet.privateKey,
                fromAddress: currentWallet.publicKey,
                toAddress: DEFI_ADDRESS,
                amount: 0,
                type: 'CONTRACT_CALL',
                payload: { method: 'createToken', args: { symbol, supply: parseInt(supply) } }
            })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else {
            alert(`Minted ${supply} ${symbol}! Tx Hash: ` + data.hash);
            document.getElementById('mint-symbol').value = '';
            document.getElementById('mint-supply').value = '';
        }
    } catch (e) {
        alert("Error minting token");
    }
});

btnCreatePool.addEventListener('click', async () => {
    if (!currentWallet) return alert("Please generate or import a wallet first!");
    const symA = document.getElementById('pool-sym-a').value;
    const symB = document.getElementById('pool-sym-b').value;
    const amtA = document.getElementById('pool-amt-a').value;
    const amtB = document.getElementById('pool-amt-b').value;
    
    if (!symA || !symB || !amtA || !amtB) return;

    try {
        const res = await fetch(`${API_URL}/transaction/sign-and-send`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                privateKey: currentWallet.privateKey,
                fromAddress: currentWallet.publicKey,
                toAddress: DEFI_ADDRESS,
                amount: 0,
                type: 'CONTRACT_CALL',
                payload: { method: 'createPool', args: { symbolA: symA, symbolB: symB, amountA: parseFloat(amtA), amountB: parseFloat(amtB) } }
            })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else alert(`Pool Created! Tx Hash: ` + data.hash);
    } catch (e) {
        alert("Error creating pool");
    }
});

btnSwapTokens.addEventListener('click', async () => {
    if (!currentWallet) return alert("Please generate or import a wallet first!");
    const symIn = document.getElementById('swap-sym-in').value;
    const symOut = document.getElementById('swap-sym-out').value;
    const amtIn = document.getElementById('swap-amt-in').value;
    
    if (!symIn || !symOut || !amtIn) return;

    try {
        const res = await fetch(`${API_URL}/transaction/sign-and-send`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                privateKey: currentWallet.privateKey,
                fromAddress: currentWallet.publicKey,
                toAddress: DEFI_ADDRESS,
                amount: 0,
                type: 'CONTRACT_CALL',
                payload: { method: 'swap', args: { symbolIn: symIn, symbolOut: symOut, amountIn: parseFloat(amtIn) } }
            })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else alert(`Swap Executed! Tx Hash: ` + data.hash);
    } catch (e) {
        alert("Error executing swap");
    }
});

async function initDashboard() {
    document.querySelector('.status-indicator').style.background = '#eab308'; // searching yellow
    document.querySelector('.status-indicator').style.boxShadow = '0 0 8px #eab308';
    
    for (const endpoint of API_ENDPOINTS) {
        try {
            // Ping with 4s timeout (Mobile + Ngrok can be slower on first connection)
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 4000);
            
            const res = await fetch(`${endpoint}/blocks`, { 
                signal: controller.signal,
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            clearTimeout(id);
            
            if (res.ok) {
                API_URL = endpoint;
                console.log('Connected to Node:', API_URL);
                document.querySelector('.status-indicator').parentElement.innerHTML = `<div class="status-indicator"></div>Node Connected<br><span style="font-size:0.7rem;opacity:0.6">${API_URL}</span>`;
                break;
            }
        } catch (e) {
            console.log(`Endpoint ${endpoint} unreachable, falling back...`);
        }
    }
    
    if (!API_URL) {
        API_URL = API_ENDPOINTS[0]; // Default fail state
    }

    fetchNetworkData();
    setInterval(fetchNetworkData, 3000);
}

initDashboard();
