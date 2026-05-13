window.liveMarketPrices = { bitcoin: 0, ethereum: 0, solana: 0, 'the-open-network': 0 };

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
const navLinks = document.querySelectorAll('.nav-links li, .bottom-nav-item');
const statBlockHeight = document.getElementById('stat-block-height');
const statValidators = document.getElementById('stat-validators');
const statPending = document.getElementById('stat-pending');
const blocksTable = document.querySelector('#blocks-table tbody');

// Wallet DOM
const walletSelector = document.getElementById('wallet-selector');
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
            if (pubKeyField) pubKeyField.textContent = formatAlias(currentWallet.publicKey);
            if (privKeyField) privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
            
            const accountNameField = document.getElementById('wallet-account-name');
            if (accountNameField) accountNameField.textContent = currentWallet.alias || `Account ${parseInt(idx) + 1}`;
            
            fetchNetworkData();
        }
    });
    renderWalletSelector();
    if (currentWallet) {
        if (pubKeyField) pubKeyField.textContent = formatAlias(currentWallet.publicKey);
        if (privKeyField) privKeyField.textContent = formatKeyDisplay(currentWallet.privateKey);
        
        const accountNameField = document.getElementById('wallet-account-name');
        if (accountNameField) {
            const idx = alumniWallets.findIndex(w => w.publicKey === currentWallet.publicKey);
            accountNameField.textContent = currentWallet.alias || `Account ${idx + 1}`;
        }

        // INSTANT DEMO PRE-POPULATION
        const cleanPub = currentWallet.publicKey.replace(/\s+/g, '');
        const satoshiKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n".replace(/\s+/g, '');
        if (cleanPub === satoshiKey) {
            if (balanceField) balanceField.textContent = "10000000.00";
            const smallBalanceField = document.getElementById('wallet-balance-small');
            if (smallBalanceField) smallBalanceField.textContent = "10000000.00";
            const mainUsdField = document.getElementById('wallet-balance-usd');
            if (mainUsdField) mainUsdField.textContent = '$10,000,000.00';
            const smallUsdField = document.getElementById('wallet-balance-usd-small');
            if (smallUsdField) smallUsdField.textContent = '$10,000,000.00';
        }
        
        if (togglePrivKey) togglePrivKey.style.display = 'inline';
        const btnShowQr = document.getElementById('btn-show-qr');
        if (btnShowQr) btnShowQr.style.display = 'inline';
        const btnSharePub = document.getElementById('btn-share-pub');
        if (btnSharePub) btnSharePub.style.display = 'inline';
        const btnEditTag = document.getElementById('btn-edit-tag');
        if (btnEditTag) btnEditTag.style.display = 'inline';
    } else {
        // No wallet exists, wait for modals to init, then open account modal
        setTimeout(() => {
            if(typeof openModal === 'function') openModal('modal-account');
        }, 100);
    }
}


// --- Navigation ---
// Global tab switcher function
window.switchTab = function(targetView) {
    navLinks.forEach(l => {
        if (l.getAttribute('data-view') === targetView) {
            l.classList.add('active');
        } else {
            l.classList.remove('active');
        }
    });
    
    views.forEach(v => v.classList.remove('active'));
    const targetElement = document.getElementById(`view-${targetView}`);
    if (targetElement) {
        targetElement.classList.add('active');
    }
    
    // Save state
    localStorage.setItem('alumni_active_view', targetView);
};

// Restore active view on load
const savedView = localStorage.getItem('alumni_active_view');
if (savedView) {
    window.switchTab(savedView);
} else {
    window.switchTab('wallet'); // Default to wallet (Home)
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetView = link.getAttribute('data-view');
        window.switchTab(targetView);
    });
});

// --- Modal Logic ---
const modalOverlay = document.getElementById('modal-overlay');
const modals = document.querySelectorAll('[id^="modal-"]');
const closeModals = document.querySelectorAll('.close-modal');

function openModal(modalId) {
    if(modalOverlay) modalOverlay.style.display = 'block';
    const m = document.getElementById(modalId);
    if(m) {
        m.style.display = 'block';
        m.style.animation = 'slideUp 0.3s ease-out forwards';
    }
}

function closeModalAll() {
    if(modalOverlay) modalOverlay.style.display = 'none';
    modals.forEach(m => {
        if(m.id !== 'modal-overlay') {
            m.style.display = 'none';
        }
    });
}

if(modalOverlay) modalOverlay.addEventListener('click', closeModalAll);
closeModals.forEach(btn => btn.addEventListener('click', closeModalAll));

// Hook up action buttons
const btnActionBuy = document.getElementById('btn-action-buy');
const btnActionSwap = document.getElementById('btn-action-swap');
const btnActionSend = document.getElementById('btn-action-send');
const btnActionReceive = document.getElementById('btn-action-receive');
const walletAccountName = document.getElementById('wallet-account-name');

if(btnActionSend) btnActionSend.addEventListener('click', () => openModal('modal-send'));
if(btnActionReceive) {
    btnActionReceive.addEventListener('click', () => {
        openModal('modal-receive');
        const showQrBtn = document.getElementById('btn-show-qr');
        if(showQrBtn) showQrBtn.click(); // Generate QR
    });
}
if(btnActionSwap) btnActionSwap.addEventListener('click', () => window.switchTab('dex'));
if(btnActionBuy) btnActionBuy.addEventListener('click', () => alert('Fiat on-ramp coming soon!'));
if(walletAccountName) walletAccountName.addEventListener('click', () => openModal('modal-account'));


// --- Explorer Logic ---
async function fetchNetworkData() {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);
        
        // Fetch Blocks
        const blocksRes = await fetch(`${API_URL}/blocks?t=${Date.now()}`, { 
            signal: controller.signal,
            cache: 'no-store'
        });
        const blocks = await blocksRes.json();
        
        // Fetch Pending TXs
        const pendingRes = await fetch(`${API_URL}/pending-transactions?t=${Date.now()}`, { 
            signal: controller.signal,
            cache: 'no-store'
        });
        const pending = await pendingRes.json();
        
        // Fetch Validators
        const valRes = await fetch(`${API_URL}/validators?t=${Date.now()}`, { 
            signal: controller.signal,
            cache: 'no-store'
        });
        const validators = await valRes.json();
        
        clearTimeout(id);

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
        document.querySelectorAll('.status-indicator').forEach(el => {
            el.style.background = '#ef4444';
            el.style.boxShadow = '0 0 8px #ef4444';
        });
        const desktopStatus = document.querySelector('.node-status span');
        if (desktopStatus) desktopStatus.textContent = 'Node Offline';
        const desktopSub = document.getElementById('node-url');
        if (desktopSub) desktopSub.textContent = 'Check Windows PC';
        const mobileStatus = document.querySelector('.mobile-status-text');
        if (mobileStatus) mobileStatus.textContent = 'Offline';
        
        if (currentWallet) {
            const cleanPub = currentWallet.publicKey.replace(/\s+/g, '');
            const satoshiKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n".replace(/\s+/g, '');
            if (cleanPub === satoshiKey) {
                if (balanceField) balanceField.textContent = "10000000.00";
                const smallBalanceField = document.getElementById('wallet-balance-small');
                if (smallBalanceField) smallBalanceField.textContent = "10000000.00";
                const mainUsdField = document.getElementById('wallet-balance-usd');
                if (mainUsdField) mainUsdField.textContent = '$10,000,000.00';
                const smallUsdField = document.getElementById('wallet-balance-usd-small');
                if (smallUsdField) smallUsdField.textContent = '$10,000,000.00';
            }
        }
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
        document.querySelectorAll('.status-indicator').forEach(el => {
            el.style.background = '#10b981';
            el.style.boxShadow = '0 0 8px #10b981';
        });
        const desktopStatus = document.querySelector('.node-status span');
        if (desktopStatus) desktopStatus.textContent = 'Node Connected';
        const desktopSub = document.getElementById('node-url');
        if (desktopSub) desktopSub.textContent = 'Alumni Blockchain';
        const mobileStatus = document.querySelector('.mobile-status-text');
        if (mobileStatus) mobileStatus.textContent = 'Connected';
    
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
    if (currentWallet && currentWallet.network && currentWallet.network !== 'alumni') {
        return keyPem.length > 20 ? keyPem.substring(0, 6) + '...' + keyPem.substring(keyPem.length - 4) : keyPem;
    }
    if (currentWallet && currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ') && currentWallet.alias !== 'SATOSHI') {
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
if (btnEditTag) {
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
}

const btnSharePub = document.getElementById('btn-share-pub');
if (btnSharePub) {
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
}

if (togglePrivKey) {
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
}

function disconnectWallet() {
    currentWallet = null;
    localStorage.removeItem('alumni_wallets');
    localStorage.removeItem('alumni_active_wallet_idx');
    location.reload();
}


const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
if (btnDisconnectWallet) {
    btnDisconnectWallet.addEventListener('click', disconnectWallet);
}

// Hook up Settings Menu
const btnOpenSettings = document.getElementById('btn-open-settings');
if(btnOpenSettings) btnOpenSettings.addEventListener('click', () => openModal('modal-settings'));

const btnSettingsBuy = document.getElementById('btn-settings-buy');
if(btnSettingsBuy) btnSettingsBuy.addEventListener('click', () => { closeModalAll(); alert('Fiat on-ramp coming soon!'); });

const btnSettingsScan = document.getElementById('btn-settings-scan');
if(btnSettingsScan) btnSettingsScan.addEventListener('click', () => {
    closeModalAll();
    const target = document.getElementById('btn-scan-qr');
    if(target) target.click();
    else alert('QR Scanner coming soon!');
});

const btnSettingsLogout = document.getElementById('btn-settings-logout');
if(btnSettingsLogout) btnSettingsLogout.addEventListener('click', disconnectWallet);


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
        
        const accountNameField = document.getElementById('wallet-account-name');
        if (accountNameField) accountNameField.textContent = currentWallet.alias;
        
        togglePrivKey.style.display = 'inline';
        document.getElementById('btn-show-qr').style.display = 'inline';
        document.getElementById('btn-edit-tag').style.display = 'inline';
        document.getElementById('btn-share-pub').style.display = 'inline';
        
        closeModalAll();
        alert('Wallet generated successfully! Keep your private key safe.');
        fetchNetworkData(); // trigger balance update
    } catch (err) {
        alert('Failed to generate wallet: ' + err.message);
    }
});

btnImport.addEventListener('click', () => {
    importForm.style.display = importForm.style.display === 'none' ? 'block' : 'none';
});

const importNetworkSelect = document.getElementById('import-network-select');
if (importNetworkSelect) {
    importNetworkSelect.addEventListener('change', (e) => {
        // Kept for UI future expansion, both fields remain visible
    });
}

btnSubmitImport.addEventListener('click', () => {
    const net = importNetworkSelect ? importNetworkSelect.value : 'alumni';
    const pub = importPub.value.trim().replace(/\\n/g, '\n');
    const pk = importPriv.value.trim().replace(/\\n/g, '\n');
    
    if (!pub) return alert("Please provide a Public Address.");
    if (!pk) return alert("Please provide the Private Key or Seed Phrase.");
    
    let alias = `Imported ${net.toUpperCase()} Wallet`;
    if (net === 'alumni') {
        const strippedPub = pub.replace(/\s+/g, '');
        const satoshiKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n".replace(/\s+/g, '');
        if (strippedPub === satoshiKey) alias = "SATOSHI";
    }
    
    const newWallet = { alias: alias, network: net, privateKey: pk, publicKey: pub };
    alumniWallets.push(newWallet);
    localStorage.setItem('alumni_wallets', JSON.stringify(alumniWallets));
    
    currentWallet = newWallet;
    localStorage.setItem('alumni_active_wallet_idx', alumniWallets.length - 1);
    renderWalletSelector();
    
    pubKeyField.textContent = formatAlias(pub);
    privKeyField.textContent = formatKeyDisplay(pk);
    
    const accountNameField = document.getElementById('wallet-account-name');
    if (accountNameField) accountNameField.textContent = currentWallet.alias;
    
    togglePrivKey.style.display = 'inline';
    
    document.getElementById('btn-show-qr').style.display = 'inline';
    document.getElementById('btn-edit-tag').style.display = 'inline';
    document.getElementById('btn-share-pub').style.display = 'inline';
    
    importForm.style.display = 'none';
    importPriv.value = '';
    importPub.value = '';
    
    closeModalAll();
    fetchNetworkData();
});

// --- QR Code Logic ---
const btnShowQr = document.getElementById('btn-show-qr');
const qrContainer = document.getElementById('qr-display-container');
const qrCanvas = document.getElementById('qr-canvas');

if (btnShowQr) {
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
}

let html5QrcodeScanner = null;
const btnScanQr = document.getElementById('btn-scan-qr');
const qrModal = document.getElementById('qr-scanner-modal');
const btnCloseScanner = document.getElementById('btn-close-scanner');

if (btnScanQr) {
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
}

function closeScanner() {
    qrModal.style.display = 'none';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        html5QrcodeScanner = null;
    }
}

if (btnCloseScanner) {
    btnCloseScanner.addEventListener('click', (e) => {
        e.preventDefault();
        closeScanner();
    });
}


async function fetchMultiChainBalance(network, address) {
    try {
        if (network === 'ethereum' || network === 'base') {
            const res = await fetch(`https://eth.public-rpc.com`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({jsonrpc:"2.0",method:"eth_getBalance",params:[address, "latest"],id:1})
            });
            const data = await res.json();
            return parseInt(data.result, 16) / 1e18;
        } else if (network === 'solana') {
            const res = await fetch(`https://api.mainnet-beta.solana.com`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({jsonrpc:"2.0", id:1, method:"getBalance", params:[address]})
            });
            const data = await res.json();
            return data.result.value / 1e9;
        } else if (network === 'bitcoin') {
            // Using blockchain.info for BTC balance (in satoshis)
            const res = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
            const data = await res.text();
            return parseInt(data) / 1e8;
        }
    } catch (e) {
        console.error("RPC Fetch error:", e);
    }
    return 0;
}

async function renderMultiChainPortfolio(balance, cryptoSymbol, price) {
    const container = document.getElementById('multi-chain-portfolio');
    if (!container) return;
    
    const usdValue = (balance * price).toFixed(2);
    let balanceStr = balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4});
    
    if (balanceField) balanceField.textContent = balanceStr;
    
    const smallBalanceField = document.getElementById('wallet-balance-small');
    if (smallBalanceField) smallBalanceField.textContent = balanceStr;
    
    const mainUsdField = document.getElementById('wallet-balance-usd');
    if (mainUsdField) mainUsdField.textContent = `$${usdValue}`;
    
    const smallUsdField = document.getElementById('wallet-balance-usd-small');
    if (smallUsdField) smallUsdField.textContent = `$${usdValue}`;
    
    let ticker = "ALUMNI";
    let bg = "var(--accent)";
    let icon = "A";
    
    if (cryptoSymbol === "ETH") { ticker = "Ethereum"; bg = "#627eea"; icon = "Ξ"; }
    else if (cryptoSymbol === "SOL") { ticker = "Solana"; bg = "#14F195"; icon = "◎"; }
    else if (cryptoSymbol === "BTC") { ticker = "Bitcoin"; bg = "#f7931a"; icon = "₿"; }

    container.innerHTML = `
        <div class="token-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: ${bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${cryptoSymbol === 'SOL' ? '#000' : 'white'}; font-weight: bold; font-size: 1.2rem;">${icon}</div>
                <div>
                    <div style="font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 8px;">${ticker} <span style="font-size: 0.65rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 8px; font-weight: 500;">${cryptoSymbol}</span></div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">$${price.toLocaleString()} • <span style="color: var(--accent);">Active Network</span></div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 600; font-size: 1rem;">$${usdValue}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);"><span>${balanceStr}</span> ${cryptoSymbol}</div>
            </div>
        </div>
    `;
}

async function updateWalletBalance(blocks) {
    if (!currentWallet) return;
    
    const net = currentWallet.network || 'alumni';
    
    if (net !== 'alumni') {
        const bal = await fetchMultiChainBalance(net, currentWallet.publicKey);
        let cryptoSymbol = "ETH";
        let price = window.liveMarketPrices.ethereum || 3850;
        if (net === 'solana') { cryptoSymbol = "SOL"; price = window.liveMarketPrices.solana || 165; }
        if (net === 'bitcoin') { cryptoSymbol = "BTC"; price = window.liveMarketPrices.bitcoin || 68200; }
        
        renderMultiChainPortfolio(bal, cryptoSymbol, price);
        return;
    }

    let balance = 0;
    let genesisFound = false;
    const cleanPub = currentWallet.publicKey.replace(/\s+/g, '');
    const satoshiKey = "-----BEGIN PUBLIC KEY-----\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\n-----END PUBLIC KEY-----\n".replace(/\s+/g, '');
    
    blocks.forEach(block => {
        block.transactions.forEach(tx => {
            const cleanFrom = tx.fromAddress ? tx.fromAddress.replace(/\s+/g, '') : null;
            const cleanTo = tx.toAddress ? tx.toAddress.replace(/\s+/g, '') : null;
            if (cleanTo === satoshiKey && tx.amount >= 10000000) genesisFound = true;
            if (cleanFrom === cleanPub) balance -= tx.amount;
            if (cleanTo === cleanPub) balance += tx.amount;
        });
    });

    if (cleanPub === satoshiKey && !genesisFound) balance += 10000000;
    
    renderMultiChainPortfolio(balance, "ALUMNI", 1.00);
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



async function initDashboard() {
    document.querySelector('.status-indicator').style.background = '#eab308'; // searching yellow
    document.querySelector('.status-indicator').style.boxShadow = '0 0 8px #eab308';
    
    for (const endpoint of API_ENDPOINTS) {
        try {
            // Ping with fast timeout for demo
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            
            const res = await fetch(`${endpoint}/blocks?t=${Date.now()}`, { 
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(id);
            
            if (res.ok) {
                API_URL = endpoint;
                console.log('Connected to Node:', API_URL);
                document.querySelectorAll('.status-indicator').forEach(el => {
                    el.style.background = '#10b981';
                    el.style.boxShadow = '0 0 8px #10b981';
                });
                const desktopStatus = document.querySelector('.node-status span');
                if (desktopStatus) desktopStatus.textContent = 'Node Connected';
                const desktopSub = document.getElementById('node-url');
                if (desktopSub) desktopSub.textContent = 'Alumni Blockchain';
                const mobileStatus = document.querySelector('.mobile-status-text');
                if (mobileStatus) mobileStatus.textContent = 'Connected';
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

async function fetchLiveMarketPrices() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,the-open-network&vs_currencies=usd&include_24hr_change=true');
        if (res.ok) {
            const data = await res.json();
            
            if (data.bitcoin) {
                window.liveMarketPrices.bitcoin = data.bitcoin.usd;
                if(document.getElementById('price-btc')) document.getElementById('price-btc').textContent = '$' + data.bitcoin.usd.toLocaleString();
                if(document.getElementById('explore-price-btc')) document.getElementById('explore-price-btc').textContent = '$' + data.bitcoin.usd.toLocaleString();
                const btcChg = data.bitcoin.usd_24h_change;
                if(document.getElementById('change-btc')) {
                    document.getElementById('change-btc').textContent = (btcChg > 0 ? '+' : '') + btcChg.toFixed(2) + '%';
                    document.getElementById('change-btc').style.color = btcChg >= 0 ? '#10b981' : '#ef4444';
                }
                if(document.getElementById('explore-change-btc')) {
                    document.getElementById('explore-change-btc').textContent = (btcChg > 0 ? '+' : '') + btcChg.toFixed(2) + '%';
                    document.getElementById('explore-change-btc').style.color = btcChg >= 0 ? '#10b981' : '#ef4444';
                }
            }
            if (data.ethereum) {
                window.liveMarketPrices.ethereum = data.ethereum.usd;
                if(document.getElementById('price-eth')) document.getElementById('price-eth').textContent = '$' + data.ethereum.usd.toLocaleString();
                if(document.getElementById('explore-price-eth')) document.getElementById('explore-price-eth').textContent = '$' + data.ethereum.usd.toLocaleString();
                const ethChg = data.ethereum.usd_24h_change;
                if(document.getElementById('change-eth')) {
                    document.getElementById('change-eth').textContent = (ethChg > 0 ? '+' : '') + ethChg.toFixed(2) + '%';
                    document.getElementById('change-eth').style.color = ethChg >= 0 ? '#10b981' : '#ef4444';
                }
                if(document.getElementById('explore-change-eth')) {
                    document.getElementById('explore-change-eth').textContent = (ethChg > 0 ? '+' : '') + ethChg.toFixed(2) + '%';
                    document.getElementById('explore-change-eth').style.color = ethChg >= 0 ? '#10b981' : '#ef4444';
                }
            }
            if (data.solana) {
                window.liveMarketPrices.solana = data.solana.usd;
                if(document.getElementById('price-sol')) document.getElementById('price-sol').textContent = '$' + data.solana.usd.toLocaleString();
                if(document.getElementById('explore-price-sol')) document.getElementById('explore-price-sol').textContent = '$' + data.solana.usd.toLocaleString();
                const solChg = data.solana.usd_24h_change;
                if(document.getElementById('change-sol')) {
                    document.getElementById('change-sol').textContent = (solChg > 0 ? '+' : '') + solChg.toFixed(2) + '%';
                    document.getElementById('change-sol').style.color = solChg >= 0 ? '#10b981' : '#ef4444';
                }
                if(document.getElementById('explore-change-sol')) {
                    document.getElementById('explore-change-sol').textContent = (solChg > 0 ? '+' : '') + solChg.toFixed(2) + '%';
                    document.getElementById('explore-change-sol').style.color = solChg >= 0 ? '#10b981' : '#ef4444';
                }
            }
            if (data['the-open-network']) {
                window.liveMarketPrices['the-open-network'] = data['the-open-network'].usd;
                if(document.getElementById('price-ton')) document.getElementById('price-ton').textContent = '$' + data['the-open-network'].usd.toLocaleString(undefined, {minimumFractionDigits: 2});
                const tonChg = data['the-open-network'].usd_24h_change;
                if(document.getElementById('change-ton')) {
                    document.getElementById('change-ton').textContent = (tonChg > 0 ? '+' : '') + tonChg.toFixed(2) + '%';
                    document.getElementById('change-ton').style.color = tonChg >= 0 ? '#10b981' : '#ef4444';
                }
            }
        }
    } catch (err) {
        console.log("Failed to fetch live crypto prices, using fallbacks.");
    }

    // Mock live fluctuations for Gold/Silver for the demo
    const goldBase = 2450.10;
    const silverBase = 29.40;
    setInterval(() => {
        const r1 = (Math.random() - 0.5) * 5; // Fluctuate up to $2.50
        const r2 = (Math.random() - 0.5) * 0.2; // Fluctuate up to $0.10
        document.getElementById('price-xau').textContent = '$' + (goldBase + r1).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('price-xag').textContent = '$' + (silverBase + r2).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }, 5000);
}

// --- Mobile Mining Mock Logic ---
const btnStartMiner = document.getElementById('btn-start-miner');
const minerStatus = document.getElementById('miner-status');
const minerHashrate = document.getElementById('miner-hashrate');
let miningInterval;

if (btnStartMiner) {
    btnStartMiner.addEventListener('click', () => {
        if (minerStatus.textContent === 'Standby') {
            minerStatus.textContent = 'Mining Active';
            minerStatus.style.color = '#10b981';
            btnStartMiner.textContent = 'Stop Mining';
            btnStartMiner.classList.remove('primary');
            btnStartMiner.classList.add('secondary');
            
            miningInterval = setInterval(() => {
                const hr = (Math.random() * (12.5 - 9.0) + 9.0).toFixed(1);
                minerHashrate.textContent = `${hr} MH/s`;
            }, 2000);
            
            alert('Mobile mining started. Rewards accrue automatically in the background.');
        } else {
            minerStatus.textContent = 'Standby';
            minerStatus.style.color = '#9e9ea7';
            minerHashrate.textContent = '0.0 H/s';
            btnStartMiner.textContent = 'Start Mobile Mining';
            btnStartMiner.classList.remove('secondary');
            btnStartMiner.classList.add('primary');
            clearInterval(miningInterval);
        }
    });
}

// --- Swap Logic Mock ---
const btnSwapTokens = document.getElementById('btn-swap-tokens');
if (btnSwapTokens) {
    btnSwapTokens.addEventListener('click', () => {
        const swapIn = document.getElementById('swap-amt-in');
        if (!swapIn || !swapIn.value || parseFloat(swapIn.value) <= 0) {
            return alert('Enter a valid amount to swap.');
        }
        
        btnSwapTokens.textContent = 'Swapping...';
        btnSwapTokens.disabled = true;
        
        setTimeout(() => {
            btnSwapTokens.textContent = 'Swap Tokens';
            btnSwapTokens.disabled = false;
            swapIn.value = '';
            alert('Swap successful! View activity in your wallet.');
        }, 1500);
    });
}

initDashboard();
fetchLiveMarketPrices();
