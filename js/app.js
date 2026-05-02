/* ================================================================
   FANVAULT — PREMIUM CONTENT PLATFORM
   Complete Frontend Application
   No Backend Required — Direct Paystack Integration

   ✅ FILL IN REQUIRED:
   Line ~18: PAYSTACK_PUBLIC_KEY
   Line ~22: SITE_URL
   Line ~25: CREATOR_HANDLE
================================================================ */

'use strict';

/* ================================================================
   1. CONFIGURATION
================================================================ */
const CONFIG = {
  // ✅ FILL IN: Your Paystack PUBLIC key
  // Get from: https://dashboard.paystack.com/#/settings/developer
  // Test: pk_test_xxxxxxxxxxxxxxxxx
  // Live: pk_live_xxxxxxxxxxxxxxxxx
  PAYSTACK_PUBLIC_KEY: 'pk_live_1d48c7981d1abf7396474499a369ab7bef17740a',

  // ✅ FILL IN: Your actual website URL
  SITE_URL: 'https://YOUR_USERNAME.github.io/fanvault',

  // ✅ FILL IN: Your display name / brand
  CREATOR_HANDLE: '@yourhandle',
  BRAND_NAME: 'FanVault',

  // Currency — Paystack uses NGN (Nigerian Naira)
  // The UI shows $ but Paystack charges in NGN
  // Set the NGN equivalent of your USD prices below
  CURRENCY: 'NGN',

  // ✅ FILL IN: Set NGN exchange rate equivalents
  // Example: If $1 = ₦1,600 then $10 = ₦16,000
  // These must match what Paystack will charge
  // Adjust as exchange rates change
  USD_TO_NGN_RATE: 1600,
};

/* ================================================================
   2. TIER DEFINITIONS
   Prices shown in USD, charged in NGN via Paystack
================================================================ */
const TIERS = [
  {
    id:          1,
    name:        'Basic',
    priceUSD:    10,
    icon:        'fa-bolt',
    iconClass:   'basic-icon',
    tagline:     'Photos + Community',
    description: 'Access to all basic photo sets, 50+ exclusive photos, and community feed.',
    features: [
      'Access to all basic photo sets',
      '50+ exclusive photos',
      'Community feed access',
      'Monthly content updates',
    ],
  },
  {
    id:          2,
    name:        'Standard',
    priceUSD:    15,
    icon:        'fa-gem',
    iconClass:   'standard-icon',
    tagline:     'Photos + Videos + Early Access',
    description: 'Everything in Basic plus all video content, behind-the-scenes footage, and early access.',
    features: [
      'Everything in Basic',
      'All video content (20+ videos)',
      'Behind-the-scenes footage',
      'Full photo collection (150+)',
      'Early access to new content',
    ],
  },
  {
    id:          3,
    name:        'Premium',
    priceUSD:    20,
    icon:        'fa-fire-flame-curved',
    iconClass:   'premium-icon',
    tagline:     'Everything + DMs + Live',
    description: 'Full access including direct messages, live streams, voice notes, and HD downloads.',
    features: [
      'Everything in Standard',
      'Personal voice notes & audio',
      'Full HD video downloads',
      'Direct messaging access',
      'Priority content requests',
      'Member-only live streams',
    ],
    popular: true,
  },
  {
    id:          4,
    name:        'VIP',
    priceUSD:    25,
    icon:        'fa-crown',
    iconClass:   'vip-icon',
    tagline:     'Full access + 1-on-1 + Lifetime',
    description: 'The ultimate package — everything included plus VIP exclusives, custom content, and lifetime access.',
    features: [
      'Everything included — full access',
      'VIP exclusive unreleased bundles',
      'Custom content requests',
      '1-on-1 video call (15 min)',
      'Lifetime access to all future content',
      'Name in VIP supporters wall',
      'Priority DM responses',
    ],
  },
];

/* ================================================================
   3. PROMO CODES
   ✅ FILL IN: Add your own promo codes and discounts
   discountType: 'percent' or 'fixed' (fixed = USD amount off)
================================================================ */
const PROMO_CODES = {
  'LAUNCH10':   { discountType: 'percent', value: 10, label: '10% OFF' },
  'FIRST20':    { discountType: 'percent', value: 20, label: '20% OFF' },
  'VIP5OFF':    { discountType: 'fixed',   value: 5,  label: '$5 OFF' },
  'EARLYBIRD':  { discountType: 'percent', value: 15, label: '15% OFF' },
  // Add more codes here...
};

/* ================================================================
   4. APPLICATION STATE
================================================================ */
const STATE = {
  selectedTier:      TIERS[2],       // Default: Premium (index 2)
  currentReference:  null,
  isProcessing:      false,
  buyerEmail:        '',
  buyerName:         '',
  appliedPromo:      null,           // { code, discountType, value, label }
  discountAmount:    0,              // USD
  finalPriceUSD:     20,             // After discount
  ageVerified:       false,
};

/* ================================================================
   5. UTILITY FUNCTIONS
================================================================ */

/**
 * Format price as USD string
 */
function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert USD to NGN (kobo) for Paystack
 * Paystack charges in the smallest unit (kobo = 1/100 of Naira)
 */
function usdToKobo(usdAmount) {
  const ngnAmount = usdAmount * CONFIG.USD_TO_NGN_RATE;
  return Math.round(ngnAmount * 100);
}

/**
 * Format NGN amount from kobo
 */
function formatNGN(kobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100);
}

/**
 * Generate unique payment reference
 */
function generateReference() {
  const ts  = Date.now();
  const rnd = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `FV-${ts}-${rnd}`;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

/**
 * Sanitize string for safe HTML insertion
 */
function sanitize(str) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(String(str)));
  return el.innerHTML;
}

/**
 * Calculate final price after promo discount
 */
function calculateFinalPrice(baseUSD, promo) {
  if (!promo) return baseUSD;

  let discount = 0;
  if (promo.discountType === 'percent') {
    discount = (baseUSD * promo.value) / 100;
  } else if (promo.discountType === 'fixed') {
    discount = promo.value;
  }

  discount = Math.min(discount, baseUSD - 1); // Min $1 charge
  STATE.discountAmount = discount;
  return Math.max(baseUSD - discount, 1);
}

/* ================================================================
   6. DOM HELPER — Safe Query
================================================================ */
function $(id) {
  return document.getElementById(id);
}

/* ================================================================
   7. TOAST NOTIFICATION SYSTEM
================================================================ */
function showToast({ type = 'info', title, message, duration = 5000 }) {
  const container = $('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info',
    warning: 'fa-triangle-exclamation',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
    <div class="toast-body">
      <div class="toast-title">${sanitize(title)}</div>
      ${message ? `<div class="toast-msg">${sanitize(message)}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Close"><i class="fas fa-xmark"></i></button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);

  if (duration > 0) setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast?.parentNode) return;
  toast.classList.add('removing');
  toast.addEventListener('animationend', () => toast.remove());
}

/* ================================================================
   8. STATE MANAGEMENT — Show/Hide Card Panels
================================================================ */
function showState(stateName) {
  const panels = {
    form:    $('formState'),
    success: $('successState'),
    failed:  $('failedState'),
  };

  Object.entries(panels).forEach(([name, el]) => {
    if (!el) return;
    el.style.display = name === stateName ? 'flex' : 'none';
    if (name === stateName) el.style.flexDirection = 'column';
  });
}

/* ================================================================
   9. AGE VERIFICATION
================================================================ */
function initAgeVerification() {
  const modal = $('ageModal');
  if (!modal) return;

  // Check if already verified
  if (localStorage.getItem('fv_age_verified') === 'true') {
    modal.classList.add('hidden');
    STATE.ageVerified = true;
    return;
  }

  // Block scroll while modal is open
  document.body.style.overflow = 'hidden';

  $('ageConfirm')?.addEventListener('click', () => {
    localStorage.setItem('fv_age_verified', 'true');
    STATE.ageVerified = true;
    modal.classList.add('hidden');
    document.body.style.overflow = '';

    showToast({
      type:    'success',
      title:   'Welcome!',
      message: 'Age verified. Enjoy your browsing.',
      duration: 3000,
    });
  });

  $('ageDeny')?.addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });
}

/* ================================================================
   10. TIER SELECTION — Checkout Form
================================================================ */
function initTierSelector() {
  const options = document.querySelectorAll('.tier-option');

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const tierNum = parseInt(opt.dataset.tier);
      selectTierByNumber(tierNum);
    });
  });

  // Also handle tier card buttons in the pricing section
  document.querySelectorAll('.btn-tier').forEach(btn => {
    btn.addEventListener('click', () => {
      const tierNum = parseInt(btn.dataset.tier);
      selectTierByNumber(tierNum);

      // Scroll to checkout
      $('subscribe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Content card clicks scroll to subscribe
  document.querySelectorAll('.content-card').forEach(card => {
    card.addEventListener('click', () => {
      const tierNum = parseInt(card.dataset.tier);
      if (tierNum) selectTierByNumber(tierNum);
      $('subscribe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/**
 * Select a tier by its number (1-4) and update all UI
 */
function selectTierByNumber(num) {
  const tier = TIERS.find(t => t.id === num);
  if (!tier) return;

  STATE.selectedTier = tier;

  // Update radio buttons in checkout
  document.querySelectorAll('.tier-option').forEach(opt => {
    opt.classList.toggle('active', parseInt(opt.dataset.tier) === num);
  });

  // Recalculate price with any applied promo
  STATE.finalPriceUSD = calculateFinalPrice(tier.priceUSD, STATE.appliedPromo);

  // Update order summary
  updateOrderSummary();

  // Update pay button
  updatePayButton();

  // Update side panel preview
  updateTierPreview();
}

/**
 * Update the order summary card
 */
function updateOrderSummary() {
  const tier = STATE.selectedTier;

  const tierNameEl = $('summaryTierName');
  const priceEl    = $('summaryPrice');
  const totalEl    = $('summaryTotal');
  const discountRow = $('discountRow');
  const discountAmt = $('discountAmount');

  if (tierNameEl) tierNameEl.textContent = `${tier.name} Access`;
  if (priceEl)    priceEl.textContent    = formatUSD(tier.priceUSD);

  if (STATE.appliedPromo && STATE.discountAmount > 0) {
    if (discountRow) discountRow.style.display = 'flex';
    if (discountAmt) discountAmt.textContent   = `-${formatUSD(STATE.discountAmount)}`;
  } else {
    if (discountRow) discountRow.style.display = 'none';
  }

  if (totalEl) totalEl.textContent = formatUSD(STATE.finalPriceUSD);
}

/**
 * Update the pay button text
 */
function updatePayButton() {
  const btnText = $('payBtnText');
  if (btnText) {
    btnText.textContent = `Pay ${formatUSD(STATE.finalPriceUSD)} — Unlock Now`;
  }
}

/**
 * Update the side panel tier preview
 */
function updateTierPreview() {
  const container = $('tierPreviewContent');
  if (!container) return;

  const tier = STATE.selectedTier;
  container.innerHTML = `
    <ul class="preview-features">
      ${tier.features.map(f => `
        <li><i class="fas fa-check"></i> ${sanitize(f)}</li>
      `).join('')}
    </ul>
  `;
}

/* ================================================================
   11. PROMO CODE SYSTEM
================================================================ */
function initPromoCode() {
  const toggle  = $('promoToggle');
  const wrap    = $('promoInputWrap');
  const input   = $('promoCode');
  const applyBtn = $('applyPromo');
  const resultEl = $('promoResult');

  if (!toggle || !wrap) return;

  toggle.addEventListener('click', () => {
    const isVisible = wrap.style.display !== 'none';
    wrap.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible && input) input.focus();
  });

  applyBtn?.addEventListener('click', () => applyPromoCode());

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyPromoCode();
    }
  });
}

function applyPromoCode() {
  const input    = $('promoCode');
  const resultEl = $('promoResult');
  if (!input) return;

  const code = input.value.trim().toUpperCase();

  if (!code) {
    if (resultEl) {
      resultEl.innerHTML = `<span style="color:var(--neon-red)">
        <i class="fas fa-circle-xmark"></i> Please enter a promo code
      </span>`;
    }
    return;
  }

  const promo = PROMO_CODES[code];

  if (!promo) {
    if (resultEl) {
      resultEl.innerHTML = `<span style="color:var(--neon-red)">
        <i class="fas fa-circle-xmark"></i> Invalid code "${sanitize(code)}"
      </span>`;
    }
    STATE.appliedPromo   = null;
    STATE.discountAmount = 0;
    STATE.finalPriceUSD  = STATE.selectedTier.priceUSD;
    updateOrderSummary();
    updatePayButton();

    showToast({
      type:    'error',
      title:   'Invalid Code',
      message: `"${code}" is not a valid promo code.`,
    });
    return;
  }

  // Valid promo
  STATE.appliedPromo  = { code, ...promo };
  STATE.finalPriceUSD = calculateFinalPrice(STATE.selectedTier.priceUSD, STATE.appliedPromo);

  if (resultEl) {
    resultEl.innerHTML = `<span style="color:var(--neon-green)">
      <i class="fas fa-circle-check"></i> 
      ${sanitize(promo.label)} applied! You save ${formatUSD(STATE.discountAmount)}
    </span>`;
  }

  updateOrderSummary();
  updatePayButton();

  showToast({
    type:    'success',
    title:   'Promo Applied! 🎉',
    message: `${promo.label} — You save ${formatUSD(STATE.discountAmount)}`,
    duration: 4000,
  });
}

/* ================================================================
   12. FORM VALIDATION
================================================================ */
function validateForm() {
  let isValid = true;
  clearErrors();

  const emailVal = $('buyerEmail')?.value?.trim() || '';

  if (!emailVal) {
    showFieldError('emailError', 'Email address is required to receive your access link.');
    isValid = false;
  } else if (!isValidEmail(emailVal)) {
    showFieldError('emailError', 'Please enter a valid email address.');
    isValid = false;
  } else {
    STATE.buyerEmail = emailVal;
  }

  if (!STATE.selectedTier) {
    showToast({ type: 'warning', title: 'No Tier Selected', message: 'Please select an access tier.' });
    isValid = false;
  }

  return isValid;
}

function showFieldError(id, message) {
  const el = $(id);
  if (el) {
    el.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${message}`;
    el.style.display = 'flex';
  }
}

function clearErrors() {
  ['emailError'].forEach(id => {
    const el = $(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

/* ================================================================
   13. REAL-TIME VALIDATION
================================================================ */
function initRealTimeValidation() {
  const emailInput     = $('buyerEmail');
  const emailValidIcon = $('emailValidIcon');

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();

      if (!val) {
        emailInput.classList.remove('valid', 'invalid');
        if (emailValidIcon) emailValidIcon.innerHTML = '';
        return;
      }

      if (isValidEmail(val)) {
        emailInput.classList.add('valid');
        emailInput.classList.remove('invalid');
        if (emailValidIcon) {
          emailValidIcon.innerHTML = '<i class="fas fa-circle-check" style="color:var(--neon-green)"></i>';
        }
        const errEl = $('emailError');
        if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      } else {
        emailInput.classList.add('invalid');
        emailInput.classList.remove('valid');
        if (emailValidIcon) {
          emailValidIcon.innerHTML = '<i class="fas fa-circle-xmark" style="color:var(--neon-red)"></i>';
        }
      }
    });
  }
}

/* ================================================================
   14. PAYSTACK PAYMENT — DIRECT (No Backend)
================================================================ */
function initPaystackPayment() {
  if (STATE.isProcessing) return;
  if (!validateForm()) return;

  // Check Paystack key
  if (CONFIG.PAYSTACK_PUBLIC_KEY.includes('xxxxxxxx')) {
    showToast({
      type:     'error',
      title:    'Setup Required',
      message:  'Add your Paystack public key to js/app.js line ~18',
      duration: 8000,
    });
    return;
  }

  STATE.isProcessing = true;
  STATE.buyerEmail   = $('buyerEmail')?.value?.trim() || '';
  STATE.buyerName    = $('buyerName')?.value?.trim()  || '';

  setButtonLoading(true);

  const reference = generateReference();
  STATE.currentReference = reference;

  const tier      = STATE.selectedTier;
  const amountKobo = usdToKobo(STATE.finalPriceUSD);

  const paystackConfig = {
    key:      CONFIG.PAYSTACK_PUBLIC_KEY,
    email:    STATE.buyerEmail,
    amount:   amountKobo,
    currency: CONFIG.CURRENCY,
    ref:      reference,
    label:    CONFIG.BRAND_NAME,

    metadata: {
      custom_fields: [
        {
          display_name:  'Buyer Name',
          variable_name: 'buyer_name',
          value:         STATE.buyerName || 'Anonymous',
        },
        {
          display_name:  'Tier',
          variable_name: 'tier',
          value:         `${tier.name} ($${tier.priceUSD})`,
        },
        {
          display_name:  'Tier ID',
          variable_name: 'tier_id',
          value:         String(tier.id),
        },
        {
          display_name:  'Price USD',
          variable_name: 'price_usd',
          value:         String(STATE.finalPriceUSD),
        },
        {
          display_name:  'Promo Code',
          variable_name: 'promo_code',
          value:         STATE.appliedPromo?.code || 'None',
        },
        {
          display_name:  'Discount',
          variable_name: 'discount',
          value:         STATE.discountAmount > 0
                           ? `${STATE.appliedPromo?.label} (-$${STATE.discountAmount})`
                           : 'None',
        },
        {
          display_name:  'Platform',
          variable_name: 'platform',
          value:         CONFIG.BRAND_NAME,
        },
      ],
    },

    channels: ['card', 'bank', 'ussd', 'bank_transfer', 'mobile_money'],

    callback: function (response) {
      setButtonLoading(false);
      console.log('Payment callback:', response);

      if (response.status === 'success' || response.reference) {
        handlePaymentSuccess(response);
      } else {
        handlePaymentFailed('Payment was not completed.');
      }
    },

    onClose: function () {
      setButtonLoading(false);
      STATE.isProcessing = false;

      showToast({
        type:    'info',
        title:   'Payment Cancelled',
        message: 'No charges were made. You can try again anytime.',
        duration: 4000,
      });
    },
  };

  try {
    const handler = PaystackPop.setup(paystackConfig);
    handler.openIframe();
  } catch (e) {
    console.error('Paystack error:', e);
    setButtonLoading(false);
    STATE.isProcessing = false;

    showToast({
      type:    'error',
      title:   'Payment Error',
      message: 'Could not open payment window. Please try again.',
    });
  }
}

/* ================================================================
   15. PAYMENT SUCCESS HANDLER
================================================================ */
function handlePaymentSuccess(response) {
  STATE.isProcessing = false;
  const tier = STATE.selectedTier;

  // Update success UI
  const refEl    = $('successRef');
  const tierEl   = $('successTier');
  const amountEl = $('successAmount');
  const emailEl  = $('successEmail');

  if (refEl)    refEl.textContent    = response.reference || STATE.currentReference || '—';
  if (tierEl)   tierEl.textContent   = `${tier.name} Access`;
  if (amountEl) amountEl.textContent = formatUSD(STATE.finalPriceUSD);
  if (emailEl)  emailEl.textContent  = STATE.buyerEmail || '—';

  showState('success');
  triggerConfetti();

  showToast({
    type:     'success',
    title:    '🎉 Access Unlocked!',
    message:  `${tier.name} tier purchased! Check your email.`,
    duration: 8000,
  });

  // Add to recent buyers
  addRecentBuyer(STATE.buyerName, tier.name);

  // Save locally
  savePurchaseLocally({
    reference: response.reference || STATE.currentReference,
    tier:      tier.name,
    priceUSD:  STATE.finalPriceUSD,
    email:     STATE.buyerEmail,
    promo:     STATE.appliedPromo?.code || null,
    date:      new Date().toISOString(),
  });

  // Simulated: In production, you'd send access credentials via email
  // using a backend webhook or Zapier integration
  console.log('🔓 Grant access to:', STATE.buyerEmail, '| Tier:', tier.name);
}

/* ================================================================
   16. PAYMENT FAILED HANDLER
================================================================ */
function handlePaymentFailed(reason) {
  STATE.isProcessing = false;

  const msgEl = $('failedMessage');
  if (msgEl) {
    msgEl.textContent = `${reason || 'Payment was not completed.'} No money was deducted.`;
  }

  showState('failed');

  showToast({
    type:    'error',
    title:   'Payment Failed',
    message: reason || 'Please try again.',
    duration: 6000,
  });
}

/* ================================================================
   17. LOCAL STORAGE — Purchase History
================================================================ */
function savePurchaseLocally(purchase) {
  try {
    const history = JSON.parse(localStorage.getItem('fv_purchases') || '[]');
    history.unshift(purchase);
    localStorage.setItem('fv_purchases', JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.warn('Could not save purchase locally:', e);
  }
}

/* ================================================================
   18. CONFETTI EFFECT
================================================================ */
function triggerConfetti() {
  const colors = ['#a855f7', '#ec4899', '#38bdf8', '#34d399', '#fbbf24', '#f43f5e'];

  for (let i = 0; i < 70; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 10 + 5;
    el.style.cssText = `
      position: fixed;
      top: -10px;
      left: ${Math.random() * 100}vw;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      z-index: 9999;
      pointer-events: none;
      opacity: 0.9;
      animation: confettiFall ${Math.random() * 2 + 2}s ease-in forwards;
      animation-delay: ${Math.random() * 1.5}s;
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  if (!$('confettiStyles')) {
    const style = document.createElement('style');
    style.id = 'confettiStyles';
    style.textContent = `
      @keyframes confettiFall {
        0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg) scale(0.3); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ================================================================
   19. SOCIAL SHARING
================================================================ */
function initShareButtons() {
  const text = encodeURIComponent(
    `I just unlocked exclusive content on ${CONFIG.BRAND_NAME}! 🔥 Check it out:`
  );
  const url = encodeURIComponent(CONFIG.SITE_URL);

  $('shareTwitter')?.addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
  });

  $('shareWhatsapp')?.addEventListener('click', () => {
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  });

  $('shareTelegram')?.addEventListener('click', () => {
    window.open(`https://t.me/share/url?url=${url}&text=${decodeURIComponent(text)}`, '_blank');
  });
}

/* ================================================================
   20. RECENT BUYERS (Simulated Live Feed)
================================================================ */
function addRecentBuyer(name, tierName) {
  const list = $('recentBuyers');
  if (!list) return;

  const displayName = name
    ? `${name.split(' ')[0]} ${(name.split(' ')[1] || '')[0] || ''}.`.trim()
    : 'Anonymous';

  const avatarId = Math.floor(Math.random() * 70) + 1;

  const item = document.createElement('div');
  item.className = 'buyer-item';
  item.style.animation = 'fadeInDown 0.4s var(--ease-out-expo)';
  item.innerHTML = `
    <img src="https://i.pravatar.cc/32?img=${avatarId}" alt="" />
    <div class="buyer-info">
      <span class="buyer-name">${sanitize(displayName)}</span>
      <span class="buyer-tier">${sanitize(tierName)}</span>
    </div>
    <span class="buyer-time">Just now</span>
  `;

  list.insertBefore(item, list.firstChild);

  const items = list.querySelectorAll('.buyer-item');
  if (items.length > 6) list.removeChild(items[items.length - 1]);
}

/**
 * Simulate periodic fake buyer notifications (social proof)
 * ✅ OPTIONAL: Remove this in production if you have real data
 */
function startFakeBuyerFeed() {
  const names = [
    'Alex M.', 'Jessica L.', 'Chris B.', 'Dana W.', 'Sam K.',
    'Taylor R.', 'Jordan P.', 'Casey N.', 'Riley Q.', 'Morgan T.',
    'Jamie H.', 'Avery G.', 'Blake F.', 'Quinn D.', 'Skyler E.',
  ];
  const tiers = ['Basic', 'Standard', 'Premium', 'Premium', 'VIP', 'Premium', 'Standard'];

  setInterval(() => {
    const name = names[Math.floor(Math.random() * names.length)];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    addRecentBuyer(name, tier);
  }, 25000 + Math.random() * 35000); // Every 25-60 seconds
}

/* ================================================================
   21. BUTTON LOADING STATE
================================================================ */
function setButtonLoading(loading) {
  const btn     = $('payBtn');
  const content = $('payBtnContent');
  const loader  = $('payBtnLoader');

  if (!btn) return;
  btn.disabled = loading;
  if (content) content.style.display = loading ? 'none' : 'flex';
  if (loader)  loader.style.display  = loading ? 'flex' : 'none';
}

/* ================================================================
   22. RESET — Buy Again / Upgrade
================================================================ */
function resetToForm() {
  STATE.isProcessing     = false;
  STATE.currentReference = null;
  STATE.appliedPromo     = null;
  STATE.discountAmount   = 0;

  const form = $('paymentForm');
  if (form) form.reset();

  // Reset promo
  const promoWrap   = $('promoInputWrap');
  const promoResult = $('promoResult');
  if (promoWrap)   promoWrap.style.display = 'none';
  if (promoResult) promoResult.innerHTML    = '';

  // Re-select Premium by default
  selectTierByNumber(3);

  setButtonLoading(false);
  clearErrors();
  showState('form');

  $('paymentCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ================================================================
   23. FAQ ACCORDION
================================================================ */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

      // Toggle this one
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ================================================================
   24. NAVIGATION
================================================================ */
function initNavigation() {
  const navbar    = $('navbar');
  const hamburger = $('hamburger');
  const navLinks  = $('navLinks');
  const backToTop = $('backToTop');

  // Scroll effects
  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  // Mobile menu
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Back to top
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Footer year
  const yearEl = $('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ================================================================
   25. COUNTER ANIMATIONS
================================================================ */
function animateCounter(el, target, duration = 2000) {
  if (!el) return;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = Math.floor(eased * target);

    if (target >= 10000) {
      el.textContent = (eased * target / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      el.textContent = Math.floor(eased * target).toLocaleString();
    }

    if (progress < 1) requestAnimationFrame(update);
    else {
      if (target >= 10000) {
        el.textContent = (target / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      } else {
        el.textContent = target.toLocaleString();
      }
    }
  }
  requestAnimationFrame(update);
}

/* ================================================================
   26. SCROLL ANIMATIONS (AOS Replacement)
================================================================ */
function initScrollAnimations() {
  // AOS elements
  const aosObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('aos-animate');
        aosObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-aos]').forEach(el => aosObs.observe(el));

  // Hero stat counters
  const statObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.target);
        if (target) animateCounter(e.target, target, 2000);
        statObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-value[data-target]').forEach(el => statObs.observe(el));
}

/* ================================================================
   27. CONTENT CARD HOVER — Enhanced Glow
================================================================ */
function initContentCardEffects() {
  document.querySelectorAll('.content-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      const lockIcon = card.querySelector('.lock-icon');
      if (lockIcon) {
        lockIcon.style.animation = 'pulse 1s ease infinite';
      }
    });

    card.addEventListener('mouseleave', () => {
      const lockIcon = card.querySelector('.lock-icon');
      if (lockIcon) {
        lockIcon.style.animation = '';
      }
    });
  });
}

/* ================================================================
   28. ACTION BUTTONS
================================================================ */
function initActionButtons() {
  // Retry (failed state)
  $('retryBtn')?.addEventListener('click', () => {
    showState('form');
    STATE.isProcessing = false;
  });

  // Change tier (failed state)
  $('changeTierBtn')?.addEventListener('click', () => {
    showState('form');
    STATE.isProcessing = false;
  });

  // Buy again / upgrade (success state)
  $('buyAgainBtn')?.addEventListener('click', resetToForm);
}

/* ================================================================
   29. FORM SUBMISSION
================================================================ */
function initFormSubmit() {
  $('paymentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    initPaystackPayment();
  });
}

/* ================================================================
   30. PARALLAX ON HERO ORBS (Subtle Mouse Follow)
================================================================ */
function initHeroParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const orbs = document.querySelectorAll('.hero-gradient-orb');
  if (!orbs.length) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x    = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 to 0.5
    const y    = (e.clientY - rect.top)  / rect.height - 0.5;

    orbs.forEach((orb, i) => {
      const factor = (i + 1) * 15;
      orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    orbs.forEach(orb => {
      orb.style.transform = '';
    });
  });
}

/* ================================================================
   31. TYPING EFFECT FOR HERO SUBTITLE (Optional Polish)
================================================================ */
function initTypingBadge() {
  const badge = document.querySelector('.verified-badge');
  if (!badge) return;

  // Subtle pulse
  setInterval(() => {
    badge.style.animation = 'pulse 0.6s ease';
    setTimeout(() => { badge.style.animation = ''; }, 600);
  }, 8000);
}

/* ================================================================
   32. SMOOTH ANCHOR SCROLLING WITH OFFSET
================================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#') return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      const navHeight = document.querySelector('.navbar')?.offsetHeight || 80;
      const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

      window.scrollTo({ top: targetPos, behavior: 'smooth' });
    });
  });
}

/* ================================================================
   33. LIVE VISITOR COUNTER (Simulated)
   ✅ OPTIONAL: Remove in production if you want real analytics
================================================================ */
function initLiveViewers() {
  // Add a live viewer count to the hero
  const statRow = document.querySelector('.creator-stats');
  if (!statRow) return;

  // Insert before the stat row
  const liveEl = document.createElement('div');
  liveEl.className = 'stat-item';
  liveEl.innerHTML = `
    <span class="stat-value" style="color: var(--neon-green); display: flex; align-items: center; gap: 6px;">
      <span style="width:8px;height:8px;background:var(--neon-green);border-radius:50%;animation:pulse 2s infinite;"></span>
      <span id="liveCount">47</span>
    </span>
    <span class="stat-label">Online Now</span>
  `;

  // Insert divider + live stat at beginning
  const divider = document.createElement('div');
  divider.className = 'stat-divider';

  // Prepend
  statRow.insertBefore(liveEl, statRow.firstChild);
  statRow.insertBefore(divider, liveEl.nextSibling);

  // Update randomly
  setInterval(() => {
    const countEl = $('liveCount');
    if (countEl) {
      const current = parseInt(countEl.textContent);
      const change  = Math.floor(Math.random() * 7) - 3; // -3 to +3
      const newVal  = Math.max(20, Math.min(120, current + change));
      countEl.textContent = newVal;
    }
  }, 5000);
}

/* ================================================================
   34. MAIN INITIALIZATION
================================================================ */
function init() {
  console.log(`🔥 ${CONFIG.BRAND_NAME} — Initializing...`);

  // Core
  initAgeVerification();
  initNavigation();
  initSmoothScroll();
  initScrollAnimations();
  initHeroParallax();
  initTypingBadge();
  initContentCardEffects();
  initFAQ();

  // Payment
  initTierSelector();
  initRealTimeValidation();
  initPromoCode();
  initFormSubmit();
  initActionButtons();
  initShareButtons();

  // Social proof
  startFakeBuyerFeed();
  initLiveViewers();

  // Set initial state
  selectTierByNumber(3); // Default to Premium
  showState('form');

  console.log(`✅ ${CONFIG.BRAND_NAME} ready!`);
  console.log(`🔑 Paystack: ${CONFIG.PAYSTACK_PUBLIC_KEY.startsWith('pk_live') ? '🟢 LIVE' : '🟡 TEST'}`);
  console.log(`💱 Exchange rate: $1 = ₦${CONFIG.USD_TO_NGN_RATE}`);
}

/* ================================================================
   35. DOM READY
================================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ================================================================
   END OF app.js
================================================================ */
