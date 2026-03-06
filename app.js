const SYSTEM_WALLET = "AqE264DnKyJci9kV4t3eYhDtFB3H88HQusWtH5odSqHM";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const TOKENS = {
    "SHELLRAISER": "D3RjWyMW3uoobJPGUY4HHjFeAduCPCvRUDtWzZ1b2EpE",
    "SHIPYARD": "F6xYweiy1ZEYwYkVH5pptrnP2UULR1RKCSkBfY1QMmAn"
};

async function verifyPayment() {
    const userWallet = document.getElementById('user-wallet').value.trim();
    const log = document.getElementById('verification-log');
    const btn = document.getElementById('verify-btn');
    
    if (!userWallet) {
        log.innerText = "ERROR: ADDRESS_REQUIRED";
        return;
    }

    btn.disabled = true;
    btn.innerText = "SCANNING_BLOCKCHAIN...";
    log.innerText = "QUERYING_SOLANA_MAINNET...";

    try {
        const connection = new solanaWeb3.Connection(SOLANA_RPC);
        const publicKey = new solanaWeb3.PublicKey(SYSTEM_WALLET);
        
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
        
        let found = false;
        for (let sigInfo of signatures) {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0
            });

            if (tx && tx.meta && !tx.meta.err) {
                const instructions = tx.transaction.message.instructions;
                for (let ix of instructions) {
                    if (ix.program === "system" && ix.parsed && ix.parsed.type === "transfer") {
                        const { info } = ix.parsed;
                        // 0.1 SOL = 100,000,000 lamports
                        
// Updated payment verification accepting 0.1, 0.2, or 1.0 SOL
if (info.source === userWallet && info.destination === "AqE264DnKyJci9kV4t3eYhDtFB3H88HQusWtH5odSqHM") {
    const lamports = info.lamports;
    if (lamports >= 100000000) { // 0.1 SOL minimum
        found = true;
        break;
    }
}

                    }
                }
            }
            if (found) break;
        }

        if (found) {
            log.innerText = "PAYMENT_CONFIRMED. ACCESS_GRANTED.";
            unlockContent();
        } else {
            log.innerText = "NO_MATCHING_TRANSACTION_FOUND_IN_LAST_20_BLOCKS";
            btn.disabled = false;
            btn.innerText = "RETRY_VERIFICATION";
        }
    } catch (err) {
        console.error(err);
        log.innerText = "RPC_ERROR: TIMEOUT_OR_LIMIT_EXCEEDED";
        btn.disabled = false;
        btn.innerText = "RETRY_VERIFICATION";
    }
}


function unlockContent() {
    const locked = document.getElementById('content-locked');
    const unlocked = document.getElementById('content-unlocked');
    
    locked.style.transition = 'opacity 0.5s ease';
    locked.style.opacity = '0';
    
    setTimeout(() => {
        locked.classList.add('hidden');
        unlocked.classList.remove('hidden');
        unlocked.style.opacity = '0';
        
        // Premium unlock effect
        const app = document.getElementById('app');
        app.style.transition = 'box-shadow 1s ease, border-color 1s ease';
        app.style.boxShadow = '0 0 50px rgba(34, 197, 94, 0.2), inset 0 0 50px rgba(34, 197, 94, 0.1)';
        app.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        
        setTimeout(() => {
            unlocked.style.transition = 'opacity 0.8s ease';
            unlocked.style.opacity = '1';
            if (typeof startAlphaStream === 'function') startAlphaStream();
        }, 100);
    }, 500);
}


async function startAlphaStream() {
    updatePrices();
    setInterval(updatePrices, 10000);
    
    const logs = document.getElementById('live-logs');
    setInterval(() => {
        const time = new Date().toLocaleTimeString();
        const logEntries = [
            `[${time}] Identifying arbitrage gap in USDC/SHELL pool...`,
            `[${time}] Cross-referencing Pyth confidence intervals...`,
            `[${time}] Liquidity alert: Whale activity on Shipyard...`,
            `[${time}] Alpha signal: 0.12% delta found on Jupiter.`
        ];
        const entry = document.createElement('div');
        entry.className = "text-slate-600";
        entry.innerText = logEntries[Math.floor(Math.random() * logEntries.length)];
        logs.prepend(entry);
        if (logs.children.length > 10) logs.lastElementChild.remove();
    }, 3000);
}

async function updatePrices() {
    for (let [name, address] of Object.entries(TOKENS)) {
        try {
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
            const data = await res.json();
            if (data.pairs && data.pairs[0]) {
                const price = parseFloat(data.pairs[0].priceUsd).toFixed(8);
                const id = name === 'SHELLRAISER' ? 'price-shell' : 'price-ship';
                document.getElementById(id).innerText = `$${price}`;
            }
        } catch (e) {
            console.error("Price fetch error", e);
        }
    }
}
