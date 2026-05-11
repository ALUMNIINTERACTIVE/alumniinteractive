import re

with open('app/app.js', 'r') as f:
    content = f.read()

# Pattern matching btnName.addEventListener('click', ...) to the closing });
def wrap_listener(var_name, text):
    # This is a bit risky with regex due to nested braces, so let's do simple string replacement for known blocks.
    return text

# We know the exact text we want to replace.
replace_map = {
    """const btnEditTag = document.getElementById('btn-edit-tag');
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
});""": """const btnEditTag = document.getElementById('btn-edit-tag');
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
}""",

"""const btnSharePub = document.getElementById('btn-share-pub');
btnSharePub.addEventListener('click', async () => {
    if (!currentWallet) return;
    // We must share the exact cryptographic string (PEM format) including headers, 
    // otherwise the backend validator network will reject it due to format mismatch.
    const fullPemKey = currentWallet.publicKey;
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Alumni Blockchain Wallet',
                text: `Send assets to my ALUMNI Wallet Address (Keep exactly as formatted, do not remove headers):\\n\\n${fullPemKey}`
            });
        } catch (e) {
            console.error("Share failed", e);
        }
    } else {
        alert("Web Share API is not supported on this browser/device.");
    }
});""": """const btnSharePub = document.getElementById('btn-share-pub');
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
                    text: `Send assets to my ALUMNI Wallet Address (Keep exactly as formatted, do not remove headers):\\n\\n${fullPemKey}`
                });
            } catch (e) {
                console.error("Share failed", e);
            }
        } else {
            alert("Web Share API is not supported on this browser/device.");
        }
    });
}""",

"""togglePrivKey.addEventListener('click', () => {
    if (privKeyField.style.filter === 'blur(5px)') {
        privKeyField.style.filter = 'none';
        togglePrivKey.textContent = '[Hide]';
    } else {
        privKeyField.style.filter = 'blur(5px)';
        togglePrivKey.textContent = '[Show]';
    }
});""": """if (togglePrivKey) {
    togglePrivKey.addEventListener('click', () => {
        if (privKeyField.style.filter === 'blur(5px)') {
            privKeyField.style.filter = 'none';
            togglePrivKey.textContent = '[Hide]';
        } else {
            privKeyField.style.filter = 'blur(5px)';
            togglePrivKey.textContent = '[Show]';
        }
    });
}""",

"""const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
btnDisconnectWallet.addEventListener('click', () => {
    localStorage.removeItem('alumni_active_wallet_idx');
    currentWallet = null;
    localStorage.removeItem('alumni_wallets');
    localStorage.removeItem('alumni_active_wallet_idx');
    alumniWallets = [];
    renderWalletSelector();
    document.getElementById('wallet-pub-key').textContent = 'Not Connected';
    document.getElementById('wallet-priv-key').textContent = 'Not Connected';
    togglePrivKey.style.display = 'none';
    document.getElementById('btn-show-qr').style.display = 'none';
    document.getElementById('btn-share-pub').style.display = 'none';
    document.getElementById('btn-edit-tag').style.display = 'none';
});""": """const btnDisconnectWallet = document.getElementById('btn-disconnect-wallet');
if (btnDisconnectWallet) {
    btnDisconnectWallet.addEventListener('click', () => {
        localStorage.removeItem('alumni_active_wallet_idx');
        currentWallet = null;
        localStorage.removeItem('alumni_wallets');
        localStorage.removeItem('alumni_active_wallet_idx');
        alumniWallets = [];
        renderWalletSelector();
        document.getElementById('wallet-pub-key').textContent = 'Not Connected';
        document.getElementById('wallet-priv-key').textContent = 'Not Connected';
        if (togglePrivKey) togglePrivKey.style.display = 'none';
        const btnShowQr = document.getElementById('btn-show-qr');
        if (btnShowQr) btnShowQr.style.display = 'none';
        const btnSharePub = document.getElementById('btn-share-pub');
        if (btnSharePub) btnSharePub.style.display = 'none';
        const btnEditTag = document.getElementById('btn-edit-tag');
        if (btnEditTag) btnEditTag.style.display = 'none';
    });
}""",

"""const btnShowQr = document.getElementById('btn-show-qr');
btnShowQr.addEventListener('click', () => {
    if (!currentWallet) return;
    document.getElementById('qr-modal').style.display = 'flex';
    document.getElementById('qr-code-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentWallet.publicKey)}`;
    document.getElementById('qr-pub-key').textContent = currentWallet.publicKey;
});""": """const btnShowQr = document.getElementById('btn-show-qr');
if (btnShowQr) {
    btnShowQr.addEventListener('click', () => {
        if (!currentWallet) return;
        const qrModal = document.getElementById('qr-modal');
        if (qrModal) qrModal.style.display = 'flex';
        const qrCodeImg = document.getElementById('qr-code-img');
        if (qrCodeImg) qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentWallet.publicKey)}`;
        const qrPubKey = document.getElementById('qr-pub-key');
        if (qrPubKey) qrPubKey.textContent = currentWallet.publicKey;
    });
}"""

}

for old, new in replace_map.items():
    content = content.replace(old, new)

with open('app/app.js', 'w') as f:
    f.write(content)
