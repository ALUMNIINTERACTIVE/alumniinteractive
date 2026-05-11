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
const importForm = document.getElementById('import-wallet-form');
const importPriv = document.getElementById('import-priv-input');
const importPub = document.getElementById('import-pub-input');
const btnSubmitImport = document.getElementById('btn-submit-import');
const pubKeyField = document.getElementById('wallet-pub');
const privKeyField = document.getElementById('wallet-priv');
const togglePrivKey = document.getElementById('toggle-priv-key');
const balanceField = document.getElementById('wallet-balance');
const btnSendTx = document.getElementById('btn-send-tx');
const btnStakeTx = document.getElementById('btn-stake-tx');

// DEX DOM
const btnMintToken = document.getElementById('btn-mint-token');
const btnCreatePool = document.getElementById('btn-create-pool');
const btnSwapTokens = document.getElementById('btn-swap-tokens');

// State
let currentWallet = null;

// Attempt to load persistent wallet from browser storage
const savedWallet = localStorage.getItem('alumni_wallet');
if (savedWallet) {
    try {
        currentWallet = JSON.parse(savedWallet);
    } catch (e) {
        console.error("Failed to parse saved wallet");
    }
}

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
            updateCustomTokens();
            // Ensure keys are visually rendered if loaded from storage
            if (pubKeyField.textContent === 'Not Generated') {
                pubKeyField.textContent = formatKeyDisplay(currentWallet.publicKey);
                privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
                togglePrivKey.style.display = 'inline';
            }
        }

    } catch (err) {
        console.error('Failed to connect to node:', err);
        document.querySelector('.status-indicator').style.background = '#ef4444';
        document.querySelector('.status-indicator').style.boxShadow = '0 0 8px #ef4444';
    }
}

async function updateCustomTokens() {
    if (!currentWallet) return;
    try {
        const res = await fetch(`${API_URL}/state/${DEFI_ADDRESS}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const state = await res.json();
        
        const container = document.getElementById('token-list');
        container.innerHTML = ''; // clear

        if (!state.balances || Object.keys(state.balances).length === 0) {
            container.innerHTML = '<div style="font-size: 0.8rem; opacity: 0.5; text-align: center;">No custom tokens found</div>';
            return;
        }

        let hasTokens = false;
        
        // state.balances is e.g. { "ALC": { "pubKey1": 100, "pubKey2": 50 } }
        for (const symbol in state.balances) {
            const tokenBalances = state.balances[symbol];
            const myBalance = tokenBalances[currentWallet.publicKey];
            
            if (myBalance && myBalance > 0) {
                hasTokens = true;
                const div = document.createElement('div');
                div.className = 'token-item';
                div.innerHTML = `
                    <span class="token-symbol">${symbol}</span>
                    <span class="token-balance">${myBalance.toLocaleString()}</span>
                `;
                container.appendChild(div);
            }
        }

        if (!hasTokens) {
            container.innerHTML = '<div style="font-size: 0.8rem; opacity: 0.5; text-align: center;">No custom tokens found</div>';
        }
    } catch (e) {
        console.error("Failed to fetch custom tokens:", e);
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

function formatKeyDisplay(keyPem) {
    if (!keyPem) return 'Not Generated';
    return keyPem.replace(/-----BEGIN[^-]*-----/g, '').replace(/-----END[^-]*-----/g, '').replace(/\s+/g, '');
}

togglePrivKey.addEventListener('click', () => {
    if (privKeyField.style.filter === 'blur(5px)') {
        privKeyField.style.filter = 'none';
        privKeyField.style.userSelect = 'text';
        togglePrivKey.textContent = '[Hide]';
    } else {
        privKeyField.style.filter = 'blur(5px)';
        privKeyField.style.userSelect = 'none';
        togglePrivKey.textContent = '[Show]';
    }
});

// --- Wallet Logic ---
btnGenerate.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/wallet/generate`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const keys = await res.json();
        
        currentWallet = keys;
        localStorage.setItem('alumni_wallet', JSON.stringify(currentWallet));
        
        pubKeyField.textContent = formatKeyDisplay(keys.publicKey);
        privKeyField.textContent = formatKeyDisplay(keys.privateKey);
        togglePrivKey.style.display = 'inline';
        
        alert('Wallet generated successfully! Keep your private key safe.');
        fetchNetworkData(); // trigger balance update
    } catch (err) {
        alert('Failed to generate wallet: ' + err.message);
    }
});

btnImport.addEventListener('click', () => {
    importForm.style.display = importForm.style.display === 'none' ? 'block' : 'none';
});

btnSubmitImport.addEventListener('click', () => {
    const pk = importPriv.value.trim();
    const pub = importPub.value.trim();
    
    if (pk && pub) {
        currentWallet = { privateKey: pk, publicKey: pub };
        localStorage.setItem('alumni_wallet', JSON.stringify(currentWallet));
        
        pubKeyField.textContent = formatKeyDisplay(pub);
        privKeyField.textContent = formatKeyDisplay(pk);
        togglePrivKey.style.display = 'inline';
        
        importForm.style.display = 'none';
        importPriv.value = '';
        importPub.value = '';
        
        fetchNetworkData();
    } else {
        alert("Please paste both Private and Public keys in PEM format.");
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

btnStakeTx.addEventListener('click', async () => {
    if (!currentWallet) return alert('Please generate or import a wallet first.');
    
    const amount = parseFloat(document.getElementById('tx-stake-amount').value);
    
    if (!amount || amount <= 0) return alert('Invalid stake amount');

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
                toAddress: currentWallet.publicKey, // staking to self
                amount: amount,
                type: 'STAKE'
            })
        });
        
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        
        alert(`Successfully staked ${amount} ALUMNI to become a Validator! Tx Hash: ` + result.hash);
        document.getElementById('tx-stake-amount').value = '';
        
        fetchNetworkData();
    } catch (err) {
        alert('Stake Failed: ' + err.message);
    }
});

// --- DEX Logic ---
btnMintToken.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("MINT BUTTON CLICKED!", currentWallet);
    if (!currentWallet) return alert("Please generate or import a wallet first!");
    const symbol = document.getElementById('mint-symbol').value;
    const supply = document.getElementById('mint-supply').value;
    console.log("Values:", symbol, supply);
    if (!symbol || !supply) return console.log("Returned early due to missing symbol or supply");

    try {
        const btn = document.getElementById('btn-mint-token');
        const originalText = btn.textContent;
        btn.textContent = 'Minting...';
        btn.style.opacity = '0.5';

        console.log("Fetching...", API_URL);
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
        console.log("Fetch finished! Status:", res.status);
        const data = await res.json();
        console.log("Parsed JSON data:", data);
        
        btn.textContent = originalText;
        btn.style.opacity = '1';

        if (data.error) {
            btn.textContent = 'Error!';
            setTimeout(() => btn.textContent = originalText, 2000);
            alert(data.error);
        } else {
            btn.textContent = 'Success!';
            setTimeout(() => btn.textContent = originalText, 2000);
            alert(`Minted ${supply} ${symbol}! Tx Hash: ` + data.hash);
            document.getElementById('mint-symbol').value = '';
            document.getElementById('mint-supply').value = '';
        }
    } catch (err) {
        console.error("MINT ERROR:", err);
        const btn = document.getElementById('btn-mint-token');
        btn.textContent = 'Network Error';
        btn.style.background = '#ef4444';
        setTimeout(() => {
            btn.textContent = 'Mint Token';
            btn.style.background = '';
        }, 3000);
        alert("Error minting token: " + err.message);
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

btnSwapTokens.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentWallet) return alert("Please generate or import a wallet first!");
    const symIn = document.getElementById('swap-sym-in').value;
    const symOut = document.getElementById('swap-sym-out').value;
    const amtIn = document.getElementById('swap-amt-in').value;
    
    if (!symIn || !symOut || !amtIn) return;

    try {
        const btn = document.getElementById('btn-swap-tokens');
        const originalText = btn.textContent;
        btn.textContent = 'Swapping...';
        btn.style.opacity = '0.5';

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
        
        btn.textContent = originalText;
        btn.style.opacity = '1';

        if (data.error) {
            btn.textContent = 'Error!';
            setTimeout(() => btn.textContent = originalText, 2000);
            alert(data.error);
        } else {
            btn.textContent = 'Success!';
            setTimeout(() => btn.textContent = originalText, 2000);
            alert(`Swap Executed! Tx Hash: ` + data.hash);
            document.getElementById('swap-sym-in').value = '';
            document.getElementById('swap-sym-out').value = '';
            document.getElementById('swap-amt-in').value = '';
        }
    } catch (err) {
        const btn = document.getElementById('btn-swap-tokens');
        btn.textContent = 'Network Error';
        btn.style.background = '#ef4444';
        setTimeout(() => {
            btn.textContent = 'Swap Tokens';
            btn.style.background = '';
        }, 3000);
        alert("Error executing swap: " + err.message);
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
                document.querySelector('.status-indicator').parentElement.innerHTML = `<div class="status-indicator"></div>Node Connected<br><span style="font-size:0.7rem;opacity:0.6">Alumni Blockchain</span>`;
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
