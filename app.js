const SYSTEM_WALLET = "AqE264DnKyJci9kV4t3eYhDtFB3H88HQusWtH5odSqHM";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const TOKENS = {
    "SHELLRAISER": "D3RjWyMW3uoobJPGUY4HHjFeAduCPCvRUDtWzZ1b2EpE",
    "SHIPYARD": "F6xYweiy1ZEYwYkVH5pptrnP2UULR1RKCSkBfY1QMmAn"
};

// ============================================
// 💰 PAY WHAT YOU WANT SYSTEM
// ============================================
const MIN_PAYMENT_SOL = 0.05;
const SUGGESTED_PAYMENT_SOL = 0.1;
const STORAGE_KEY = 'ryanx_alpha_tier';

let selectedAmount = SUGGESTED_PAYMENT_SOL; // Default to suggested

function getTier() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

function setTier(tier) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tier));
}

function isProUser() {
    const tier = getTier();
    return tier && tier.type === 'pro';
}

function selectAmount(amount) {
    selectedAmount = amount;

    // Update button styles
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'border-blue-500');
        btn.classList.add('bg-slate-800', 'border-slate-700');
    });

    // Highlight selected
    event.target.classList.remove('bg-slate-800', 'border-slate-700');
    event.target.classList.add('bg-blue-600', 'border-blue-500');

    // Clear custom input if preset selected
    const customInput = document.getElementById('custom-amount');
    if (customInput) {
        customInput.value = '';
        customInput.style.borderColor = '';
        customInput.style.color = '';
    }

    // Update display
    updatePaymentDisplay();
}

function updatePaymentDisplay() {
    const displayEl = document.getElementById('selected-amount-display');
    const verifyBtn = document.getElementById('verify-btn');

    if (displayEl) {
        displayEl.textContent = `Selected: ${selectedAmount.toFixed(2)} SOL`;
    }

    if (verifyBtn) {
        verifyBtn.textContent = `Verify ${selectedAmount.toFixed(2)} SOL Payment`;
    }
}

function validateCustomAmount() {
    const input = document.getElementById('custom-amount');
    const value = parseFloat(input.value);

    if (isNaN(value) || value < MIN_PAYMENT_SOL) {
        input.style.borderColor = '#ef4444';
        input.style.color = '#ef4444';
        selectedAmount = MIN_PAYMENT_SOL;
    } else {
        input.style.borderColor = '#22c55e';
        input.style.color = '#22c55e';
        selectedAmount = value;

        // Deselect preset buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'border-blue-500');
            btn.classList.add('bg-slate-800', 'border-slate-700');
        });
    }

    updatePaymentDisplay();
}

// ============================================
// 🔥 EMAIL CAPTURE
// ============================================
function captureEmail() {
    const emailInput = document.getElementById('email-capture');
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
        emailInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            emailInput.style.borderColor = '';
        }, 2000);
        return;
    }

    // Store locally (in production, send to backend)
    const emails = JSON.parse(localStorage.getItem('ryanx_emails') || '[]');
    if (!emails.includes(email)) {
        emails.push(email);
        localStorage.setItem('ryanx_emails', JSON.stringify(emails));
    }

    // Success feedback
    emailInput.value = '';
    emailInput.placeholder = '✓ Subscribed!';
    emailInput.disabled = true;

    console.log('Email captured:', email);
    console.log('Total emails:', emails.length);
}

// ============================================
// 💳 PAYMENT VERIFICATION
// ============================================
async function verifyPayment() {
    const userWallet = document.getElementById('user-wallet').value.trim();
    const log = document.getElementById('verification-log');
    const btn = document.getElementById('verify-btn');

    if (!userWallet) {
        log.innerText = "ERROR: WALLET_ADDRESS_REQUIRED";
        return;
    }

    btn.disabled = true;
    btn.innerText = "SCANNING_BLOCKCHAIN...";
    log.innerText = "QUERYING_SOLANA_MAINNET...";

    // Minimum 0.05 SOL = 50,000,000 lamports
    const minLamports = 50000000;

    try {
        const connection = new solanaWeb3.Connection(SOLANA_RPC);
        const publicKey = new solanaWeb3.PublicKey(SYSTEM_WALLET);

        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });

        let found = false;
        let foundAmount = 0;

        for (let sigInfo of signatures) {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0
            });

            if (tx && tx.meta && !tx.meta.err) {
                const instructions = tx.transaction.message.instructions;
                for (let ix of instructions) {
                    if (ix.program === "system" && ix.parsed && ix.parsed.type === "transfer") {
                        const { info } = ix.parsed;
                        // Minimum 0.05 SOL = 50,000,000 lamports
                        if (info.source === userWallet && info.destination === SYSTEM_WALLET) {
                            const lamports = info.lamports;
                            if (lamports >= minLamports) {
                                found = true;
                                foundAmount = lamports;
                                break;
                            }
                        }
                    }
                }
            }
            if (found) break;
        }

        if (found) {
            const paidSOL = (foundAmount / 1000000000).toFixed(3);
            log.innerText = `✓ PAYMENT CONFIRMED (${paidSOL} SOL). ACCESS GRANTED.`;
            log.style.color = '#22c55e';

            // Set pro tier with payment amount
            setTier({
                type: 'pro',
                activatedAt: new Date().toISOString(),
                amount: foundAmount / 1000000000
            });
            unlockContent();
        } else {
            log.innerText = `NO TRANSACTION ≥ ${MIN_PAYMENT_SOL} SOL FOUND`;
            log.style.color = '#ef4444';
            btn.disabled = false;
            btn.innerText = "RETRY VERIFICATION";
        }
    } catch (err) {
        console.error(err);
        log.innerText = "RPC_ERROR: TIMEOUT_OR_LIMIT_EXCEEDED";
        log.style.color = '#ef4444';
        btn.disabled = false;
        btn.innerText = "RETRY VERIFICATION";
    }
}

// ============================================
// 🔓 CONTENT UNLOCK
// ============================================
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

// ============================================
// 📊 ALPHA STREAM
// ============================================
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

// ============================================
// 🚀 INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if already pro user
    if (isProUser()) {
        const tier = getTier();
        console.log(`Pro user detected. Paid: ${tier.amount} SOL on ${tier.activatedAt}`);
    }

    // Initialize payment display
    updatePaymentDisplay();
});
