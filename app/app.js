const API_ENDPOINTS = [
    'https://node.alumniinteractive.com',
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
let alumniWallets = [];

// Attempt to load persistent wallets from browser storage
const savedWallets = localStorage.getItem('alumni_wallets');
if (savedWallets) {
    try {
        alumniWallets = JSON.parse(savedWallets);
    } catch (e) {
        console.error("Failed to parse saved wallets array");
    }
}

// Migration from old single wallet structure
const legacyWallet = localStorage.getItem('alumni_wallet');
if (legacyWallet && alumniWallets.length === 0) {
    try {
        const parsedLegacy = JSON.parse(legacyWallet);
        parsedLegacy.alias = localStorage.getItem('alumni_wallet_alias') || "Main Wallet";
        alumniWallets.push(parsedLegacy);
        localStorage.setItem('alumni_wallets', JSON.stringify(alumniWallets));
        localStorage.removeItem('alumni_wallet');
        localStorage.removeItem('alumni_wallet_alias');
    } catch(e) {}
}

// Set active wallet
const activeWalletIndex = localStorage.getItem('alumni_active_wallet_idx') || 0;
if (alumniWallets.length > 0) {
    currentWallet = alumniWallets[activeWalletIndex] || alumniWallets[0];
}

renderWalletSelector();

// DOM Selector rendering
const walletSelector = document.getElementById('wallet-selector');
function renderWalletSelector() {
    if (!walletSelector) return;
    walletSelector.innerHTML = '<option value="" disabled>Select Wallet...</option>';
    
    alumniWallets.forEach((w, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = w.alias || `Wallet ${idx + 1}`;
        if (currentWallet && currentWallet.publicKey === w.publicKey) {
            opt.selected = true;
        }
        walletSelector.appendChild(opt);
    });

    if (alumniWallets.length === 0) {
        const opt = document.createElement('option');
        opt.value = "none";
        opt.textContent = "No Wallets Found";
        opt.selected = true;
        walletSelector.appendChild(opt);
    }
    
    const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
    if (btnDisconnectWallet) {
        btnDisconnectWallet.style.display = alumniWallets.length > 0 ? 'inline-block' : 'none';
    }
}

if (walletSelector) {
    walletSelector.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx !== "none") {
            currentWallet = alumniWallets[idx];
            localStorage.setItem('alumni_active_wallet_idx', idx);
            // Refresh UI
            pubKeyField.textContent = formatAlias(currentWallet.publicKey);
            privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
            fetchNetworkData();
        }
    });
    renderWalletSelector();
    if (currentWallet) {
        if (pubKeyField) pubKeyField.textContent = formatAlias(currentWallet.publicKey);
        if (privKeyField) privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
        if (togglePrivKey) togglePrivKey.style.display = 'inline';
        const btnShowQr = document.getElementById('btn-show-qr');
        if (btnShowQr) btnShowQr.style.display = 'inline';
        const btnSharePub = document.getElementById('btn-share-pub');
        if (btnSharePub) btnSharePub.style.display = 'inline';
        const btnEditTag = document.getElementById('btn-edit-tag');
        if (btnEditTag) btnEditTag.style.display = 'inline';
    }
}

// --- Navigation ---
// Restore active view on load
const savedView = localStorage.getItem('alumni_active_view');
if (savedView) {
    navLinks.forEach(l => l.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    const link = Array.from(navLinks).find(l => l.getAttribute('data-view') === savedView);
    if (link) link.classList.add('active');
    const view = document.getElementById(`view-${savedView}`);
    if (view) view.classList.add('active');
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const targetView = link.getAttribute('data-view');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${targetView}`).classList.add('active');
        
        // Save state
        localStorage.setItem('alumni_active_view', targetView);
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
                pubKeyField.textContent = formatAlias(currentWallet.publicKey);
                privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
                togglePrivKey.style.display = 'inline';
                document.getElementById('btn-show-qr').style.display = 'inline';
                document.getElementById('btn-edit-tag').style.display = 'inline';
                document.getElementById('btn-share-pub').style.display = 'inline';
            }
        }

    } catch (err) {
        document.querySelector('.status-indicator').parentElement.innerHTML = `<div class="status-indicator" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></div>Node Offline<br><span style="font-size:0.7rem;opacity:0.6">Check Windows PC</span>`;
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
            
            // Find the balance by matching keys (strip all whitespace)
            let myBalance = 0;
            const cleanPub = currentWallet.publicKey.replace(/\s+/g, '');
            for (const holderKey in tokenBalances) {
                if (holderKey.replace(/\s+/g, '') === cleanPub) {
                    myBalance = tokenBalances[holderKey];
                    break;
                }
            }
            
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

function stripPemHeaders(keyPem) {
    return keyPem.replace(/-----BEGIN[^-]*-----/g, '').replace(/-----END[^-]*-----/g, '').replace(/\s+/g, '');
}

function restorePemHeaders(b64) {
    if (!b64 || b64.includes('-----BEGIN')) return b64;
    const formatted = b64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----\n`;
}

function formatAlias(keyPem) {
    if (!keyPem) return 'Not Generated';
    if (currentWallet && currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ')) {
        return `@ALUMNI.${currentWallet.alias}`;
    }
    const b64 = stripPemHeaders(keyPem);
    return `@ALUMNI.${b64.substring(0, 8)}`;
}

// Click to Copy for Alias
pubKeyField.addEventListener('click', async () => {
    if (currentWallet && currentWallet.publicKey) {
        try {
            await navigator.clipboard.writeText(currentWallet.publicKey);
            const originalText = pubKeyField.textContent;
            pubKeyField.textContent = 'Copied to clipboard!';
            setTimeout(() => { pubKeyField.textContent = originalText; }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }
});

const btnEditTag = document.getElementById('btn-edit-tag');
btnEditTag.addEventListener('click', () => {
    if (!currentWallet) return;
    const currentTag = (currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ')) ? currentWallet.alias : "";
    const newTag = prompt("Enter your custom ALUMNI Tag (e.g. SATOSHI):", currentTag);
    if (newTag !== null) {
        const cleanTag = newTag.trim().replace(/[^a-zA-Z0-9_-\s]/g, '').toUpperCase();
        if (cleanTag) {
            currentWallet.alias = cleanTag;
        } else {
            currentWallet.alias = `Wallet ${alumniWallets.findIndex(w => w.publicKey === currentWallet.publicKey) + 1}`;
        }
        
        // Update in array
        const idx = alumniWallets.findIndex(w => w.publicKey === currentWallet.publicKey);
        if (idx > -1) alumniWallets[idx] = currentWallet;
        localStorage.setItem('alumni_wallets', JSON.stringify(alumniWallets));
        renderWalletSelector();
        
        pubKeyField.textContent = formatAlias(currentWallet.publicKey);
    }
});

const btnSharePub = document.getElementById('btn-share-pub');
btnSharePub.addEventListener('click', async () => {
    if (!currentWallet) return;
    // We must share the exact cryptographic string (PEM format) including headers, 
    // otherwise the backend validator network will reject it due to format mismatch.
    const fullPemKey = currentWallet.publicKey;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Alumni Blockchain Wallet',
                text: `Send assets to my ALUMNI Wallet Address (Keep exactly as formatted, do not remove headers):\n\n${fullPemKey}`
            });
        } catch (e) {
            console.error("Share failed", e);
        }
    } else {
        alert("Web Share API is not supported on this browser/device.");
    }
});

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

const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
btnDisconnectWallet.addEventListener('click', () => {
    alumniWallets = [];
    currentWallet = null;
    localStorage.removeItem('alumni_wallets');
    localStorage.removeItem('alumni_active_wallet_idx');
    renderWalletSelector();
    
    pubKeyField.textContent = 'Not Generated';
    pubKeyField.dataset.rawKey = '';
    privKeyField.textContent = 'Not Generated';
    privKeyField.style.filter = 'blur(5px)';
    togglePrivKey.style.display = 'none';
    togglePrivKey.textContent = '[Show]';
    document.getElementById('btn-show-qr').style.display = 'none';
    document.getElementById('btn-share-pub').style.display = 'none';
    document.getElementById('btn-edit-tag').style.display = 'none';
    document.getElementById('qr-display-container').style.display = 'none';
    balanceField.textContent = '0.00';
    customTokensContainer.innerHTML = '<div style="font-size: 0.8rem; opacity: 0.5; text-align: center;">No custom tokens found</div>';
});

// --- Wallet Logic ---
btnGenerate.addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_URL}/wallet/generate`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        const data = await res.json();
        const newWallet = { alias: `Wallet ${alumniWallets.length + 1}`, publicKey: data.publicKey, privateKey: data.privateKey };
        alumniWallets.push(newWallet);
        localStorage.setItem('alumni_wallets', JSON.stringify(alumniWallets));
        
        currentWallet = newWallet;
        localStorage.setItem('alumni_active_wallet_idx', alumniWallets.length - 1);
        renderWalletSelector();
        
        pubKeyField.textContent = formatAlias(data.publicKey);
        privKeyField.textContent = formatKeyDisplay(data.privateKey);
        togglePrivKey.style.display = 'inline';
        document.getElementById('btn-show-qr').style.display = 'inline';
        document.getElementById('btn-edit-tag').style.display = 'inline';
        document.getElementById('btn-share-pub').style.display = 'inline';
        
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
    const pk = importPriv.value.trim().replace(/\\n/g, '\n');
    const pub = importPub.value.trim().replace(/\\n/g, '\n');
    
    if (pk && pub) {
        const strippedPub = pub.replace(/\s+/g, '');
        const satoshiKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n".replace(/\s+/g, '');
        
        let alias = `Imported Wallet ${alumniWallets.length + 1}`;
        if (strippedPub === satoshiKey) {
            alias = "SATOSHI";
        }
        
        const newWallet = { alias: alias, privateKey: pk, publicKey: pub };
        alumniWallets.push(newWallet);
        localStorage.setItem('alumni_wallets', JSON.stringify(alumniWallets));
        
        currentWallet = newWallet;
        localStorage.setItem('alumni_active_wallet_idx', alumniWallets.length - 1);
        renderWalletSelector();
        
        pubKeyField.textContent = formatAlias(pub);
        privKeyField.textContent = formatKeyDisplay(pk);
        togglePrivKey.style.display = 'inline';
        document.getElementById('btn-show-qr').style.display = 'inline';
        document.getElementById('btn-edit-tag').style.display = 'inline';
        document.getElementById('btn-share-pub').style.display = 'inline';
        
        importForm.style.display = 'none';
        importPriv.value = '';
        importPub.value = '';
        
        fetchNetworkData();
    } else {
        alert("Please paste both Private and Public keys in PEM format.");
    }
});

// --- QR Code Logic ---
const btnShowQr = document.getElementById('btn-show-qr');
const qrContainer = document.getElementById('qr-display-container');
const qrCanvas = document.getElementById('qr-canvas');

btnShowQr.addEventListener('click', () => {
    if (!currentWallet) return;
    if (qrContainer.style.display === 'none') {
        const tag = (currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ')) ? currentWallet.alias : '';
        const payload = `${tag}|${stripPemHeaders(currentWallet.publicKey)}`;
        new QRious({
            element: qrCanvas,
            value: payload,
            size: 200,
            background: 'white',
            foreground: 'black'
        });
        qrContainer.style.display = 'flex';
        btnShowQr.textContent = '[Hide QR]';
    } else {
        qrContainer.style.display = 'none';
        btnShowQr.textContent = '[Show QR]';
    }
});

let html5QrcodeScanner = null;
const btnScanQr = document.getElementById('btn-scan-qr');
const qrModal = document.getElementById('qr-scanner-modal');
const btnCloseScanner = document.getElementById('btn-close-scanner');

btnScanQr.addEventListener('click', (e) => {
    e.preventDefault();
    qrModal.style.display = 'flex';
    
    // Initialize Scanner
    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", { fps: 10, qrbox: 250 });
        
    html5QrcodeScanner.render((decodedText, decodedResult) => {
        // Success Callback
        const parts = decodedText.split('|');
        let displayAlias = '';
        let rawBase64 = '';
        
        if (parts.length === 2) {
            displayAlias = parts[0] ? `@ALUMNI.${parts[0]}` : `@ALUMNI.${parts[1].substring(0, 8)}`;
            rawBase64 = parts[1];
        } else {
            // Legacy / raw scan fallback
            displayAlias = `@ALUMNI.${decodedText.substring(0, 8)}`;
            rawBase64 = decodedText;
        }

        const inputField = document.getElementById('tx-to');
        inputField.value = displayAlias;
        inputField.dataset.rawKey = restorePemHeaders(rawBase64);
        
        closeScanner();
    }, (errorMessage) => {
        // Parse error, ignore
    });
});

function closeScanner() {
    qrModal.style.display = 'none';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        html5QrcodeScanner = null;
    }
}

btnCloseScanner.addEventListener('click', (e) => {
    e.preventDefault();
    closeScanner();
});


function updateWalletBalance(blocks) {
    if (!currentWallet) return;
    let balance = 0;
    
    blocks.forEach(block => {
        block.transactions.forEach(tx => {
            const cleanFrom = tx.fromAddress ? tx.fromAddress.replace(/\s+/g, '') : null;
            const cleanTo = tx.toAddress ? tx.toAddress.replace(/\s+/g, '') : null;
            const cleanPub = currentWallet.publicKey.replace(/\s+/g, '');
            
            if (cleanFrom === cleanPub) balance -= tx.amount;
            if (cleanTo === cleanPub) balance += tx.amount;
        });
    });
    
    balanceField.textContent = balance.toFixed(2);
}

btnSendTx.addEventListener('click', async () => {
    if (!currentWallet) return alert('Please generate or import a wallet first.');
    const inputField = document.getElementById('tx-to');
    
    // Check if the alias scanner set a raw key, otherwise try to reconstruct the user input
    let toAddress = inputField.dataset.rawKey;
    if (!toAddress) {
        toAddress = restorePemHeaders(inputField.value.trim());
    }
    
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
        if (result.error) alert(result.error);
        else {
            alert('Transfer Sent! Tx Hash: ' + result.hash);
            document.getElementById('tx-amount').value = '';
            fetchNetworkData();
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
});

btnStakeTx.addEventListener('click', async () => {
    if (!currentWallet) return alert('Please generate or import a wallet first.');
    const amount = parseFloat(document.getElementById('tx-stake-amount').value);
    
    if (!amount || amount < 50) return alert('Minimum stake is 50 ALUMNI.');

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
                toAddress: currentWallet.publicKey, // You stake to yourself for native validating
                amount: amount,
                type: 'STAKE'
            })
        });
        
        const result = await res.json();
        if (result.error) alert(result.error);
        else {
            alert(`Successfully staked ${amount} ALUMNI to become a Delegator/Validator! Tx Hash: ` + result.hash);
            document.getElementById('tx-stake-amount').value = '';
            fetchNetworkData();
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
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
