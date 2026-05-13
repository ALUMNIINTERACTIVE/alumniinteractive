import re

with open('app/alumni-app.js', 'r') as f:
    content = f.read()

# 1. Add window.liveMarketPrices
content = content.replace("const API_ENDPOINTS = [", "window.liveMarketPrices = { bitcoin: 0, ethereum: 0, solana: 0, 'the-open-network': 0 };\n\nconst API_ENDPOINTS = [")

# 2. Update btnSubmitImport listener
old_submit = """btnSubmitImport.addEventListener('click', () => {
    const pk = importPriv.value.trim().replace(/\\\\n/g, '\\n');
    const pub = importPub.value.trim().replace(/\\\\n/g, '\\n');
    
    if (pk && pub) {
        const strippedPub = pub.replace(/\\s+/g, '');
        const satoshiKey = "-----BEGIN PUBLIC KEY-----\\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\\n-----END PUBLIC KEY-----\\n".replace(/\\s+/g, '');
        
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
    } else {
        alert("Please paste both Private and Public keys in PEM format.");
    }
});"""

new_submit = """const importNetworkSelect = document.getElementById('import-network-select');
if (importNetworkSelect) {
    importNetworkSelect.addEventListener('change', (e) => {
        const net = e.target.value;
        if (net === 'alumni') {
            importPriv.style.display = 'block';
            importPub.placeholder = 'Paste Public Address or PEM Key';
        } else {
            importPriv.style.display = 'none';
            importPub.placeholder = 'Paste Public Address';
        }
    });
}

btnSubmitImport.addEventListener('click', () => {
    const net = importNetworkSelect ? importNetworkSelect.value : 'alumni';
    const pub = importPub.value.trim().replace(/\\\\n/g, '\\n');
    const pk = (importPriv.style.display !== 'none') ? importPriv.value.trim().replace(/\\\\n/g, '\\n') : '';
    
    if (!pub) return alert("Please provide a Public Key or Address.");
    if (net === 'alumni' && !pk) return alert("Please paste Private Key in PEM format for Alumni network.");
    
    let alias = `Imported ${net.toUpperCase()} Wallet`;
    if (net === 'alumni') {
        const strippedPub = pub.replace(/\\s+/g, '');
        const satoshiKey = "-----BEGIN PUBLIC KEY-----\\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\\n-----END PUBLIC KEY-----\\n".replace(/\\s+/g, '');
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
    
    if (net === 'alumni') {
        togglePrivKey.style.display = 'inline';
    } else {
        togglePrivKey.style.display = 'none';
    }
    
    document.getElementById('btn-show-qr').style.display = 'inline';
    document.getElementById('btn-edit-tag').style.display = 'inline';
    document.getElementById('btn-share-pub').style.display = 'inline';
    
    importForm.style.display = 'none';
    importPriv.value = '';
    importPub.value = '';
    
    closeModalAll();
    fetchNetworkData();
});"""

content = content.replace(old_submit, new_submit)

# 3. Update formatAlias
old_alias = """function formatAlias(keyPem) {
    if (!keyPem) return 'Not Generated';
    if (currentWallet && currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ')) {
        return `@ALUMNI.${currentWallet.alias}`;
    }
    const b64 = stripPemHeaders(keyPem);
    return `@ALUMNI.${b64.substring(0, 8)}`;
}"""

new_alias = """function formatAlias(keyPem) {
    if (!keyPem) return 'Not Generated';
    if (currentWallet && currentWallet.network && currentWallet.network !== 'alumni') {
        return keyPem.length > 20 ? keyPem.substring(0, 6) + '...' + keyPem.substring(keyPem.length - 4) : keyPem;
    }
    if (currentWallet && currentWallet.alias && !currentWallet.alias.startsWith('Wallet ') && !currentWallet.alias.startsWith('Imported Wallet ') && currentWallet.alias !== 'SATOSHI') {
        return `@ALUMNI.${currentWallet.alias}`;
    }
    const b64 = stripPemHeaders(keyPem);
    return `@ALUMNI.${b64.substring(0, 8)}`;
}"""

content = content.replace(old_alias, new_alias)

# 4. Replace updateWalletBalance
old_update = """function updateWalletBalance(blocks) {
    if (!currentWallet) return;
    let balance = 0;
    let genesisFound = false;
    const cleanPub = currentWallet.publicKey.replace(/\\s+/g, '');
    const satoshiKey = "-----BEGIN PUBLIC KEY-----\\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\\n-----END PUBLIC KEY-----\\n".replace(/\\s+/g, '');
    
    blocks.forEach(block => {
        block.transactions.forEach(tx => {
            const cleanFrom = tx.fromAddress ? tx.fromAddress.replace(/\\s+/g, '') : null;
            const cleanTo = tx.toAddress ? tx.toAddress.replace(/\\s+/g, '') : null;
            
            if (cleanTo === satoshiKey && tx.amount >= 10000000) genesisFound = true;
            
            if (cleanFrom === cleanPub) balance -= tx.amount;
            if (cleanTo === cleanPub) balance += tx.amount;
        });
    });

    // Demo Fallback: If live node hasn't been reset to include Genesis Mint
    if (cleanPub === satoshiKey && !genesisFound) {
        balance += 10000000;
    }
    
    const balanceStr = balance.toFixed(2);
    if (balanceField) balanceField.textContent = balanceStr;
    
    const smallBalanceField = document.getElementById('wallet-balance-small');
    if (smallBalanceField) smallBalanceField.textContent = balanceStr;
    
    // Mock ALUMNI Price = $1.00 USD for visual effect
    const usdValue = (balance * 1.00).toFixed(2);
    
    const mainUsdField = document.getElementById('wallet-balance-usd');
    if (mainUsdField) mainUsdField.textContent = `$${usdValue}`;
    
    const smallUsdField = document.getElementById('wallet-balance-usd-small');
    if (smallUsdField) smallUsdField.textContent = `$${usdValue}`;
}"""

new_update = """async function fetchMultiChainBalance(network, address) {
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
    const cleanPub = currentWallet.publicKey.replace(/\\s+/g, '');
    const satoshiKey = "-----BEGIN PUBLIC KEY-----\\nMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAENwPfFbba+A9l6uFutbQucAOUgPQNujNn\\nTl+oXgr5F0U+SPynvHJbC07kXms5iYwEAtqT1D3ErWnPX+a6XE7NtQ==\\n-----END PUBLIC KEY-----\\n".replace(/\\s+/g, '');
    
    blocks.forEach(block => {
        block.transactions.forEach(tx => {
            const cleanFrom = tx.fromAddress ? tx.fromAddress.replace(/\\s+/g, '') : null;
            const cleanTo = tx.toAddress ? tx.toAddress.replace(/\\s+/g, '') : null;
            if (cleanTo === satoshiKey && tx.amount >= 10000000) genesisFound = true;
            if (cleanFrom === cleanPub) balance -= tx.amount;
            if (cleanTo === cleanPub) balance += tx.amount;
        });
    });

    if (cleanPub === satoshiKey && !genesisFound) balance += 10000000;
    
    renderMultiChainPortfolio(balance, "ALUMNI", 1.00);
}"""

content = content.replace(old_update, new_update)

# 5. Replace fetchLiveMarketPrices to store in window.liveMarketPrices
old_prices = """            if (data.bitcoin) {
                document.getElementById('price-btc').textContent = '$' + data.bitcoin.usd.toLocaleString();
                const btcChg = data.bitcoin.usd_24h_change;
                document.getElementById('change-btc').textContent = (btcChg > 0 ? '+' : '') + btcChg.toFixed(2) + '%';
                document.getElementById('change-btc').style.color = btcChg >= 0 ? '#10b981' : '#ef4444';
            }
            if (data.ethereum) {
                document.getElementById('price-eth').textContent = '$' + data.ethereum.usd.toLocaleString();
                const ethChg = data.ethereum.usd_24h_change;
                document.getElementById('change-eth').textContent = (ethChg > 0 ? '+' : '') + ethChg.toFixed(2) + '%';
                document.getElementById('change-eth').style.color = ethChg >= 0 ? '#10b981' : '#ef4444';
            }
            if (data.solana) {
                document.getElementById('price-sol').textContent = '$' + data.solana.usd.toLocaleString();
                const solChg = data.solana.usd_24h_change;
                document.getElementById('change-sol').textContent = (solChg > 0 ? '+' : '') + solChg.toFixed(2) + '%';
                document.getElementById('change-sol').style.color = solChg >= 0 ? '#10b981' : '#ef4444';
            }
            if (data['the-open-network']) {
                document.getElementById('price-ton').textContent = '$' + data['the-open-network'].usd.toLocaleString(undefined, {minimumFractionDigits: 2});
                const tonChg = data['the-open-network'].usd_24h_change;
                document.getElementById('change-ton').textContent = (tonChg > 0 ? '+' : '') + tonChg.toFixed(2) + '%';
                document.getElementById('change-ton').style.color = tonChg >= 0 ? '#10b981' : '#ef4444';
            }"""

new_prices = """            if (data.bitcoin) {
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
            }"""

content = content.replace(old_prices, new_prices)

with open('app/alumni-app.js', 'w') as f:
    f.write(content)
print("Patch applied successfully.")
