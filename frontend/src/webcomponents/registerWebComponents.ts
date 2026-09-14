/**
 * Two small Shadow DOM custom elements used on the dashboard, included
 * deliberately so Playwright locators must learn to pierce a shadow root
 * (Playwright does this automatically for open shadow roots via normal
 * locators, but it's a common source of confusion for newcomers).
 */
const BALANCE_CARD_GRADIENTS: Record<string, string> = {
  brand: 'linear-gradient(135deg, #2447ee 0%, #3a6bfa 45%, #8a55ef 100%)',
  teal: 'linear-gradient(135deg, #128d7a 0%, #1cb096 55%, #3ecbae 100%)',
  sunset: 'linear-gradient(135deg, #ee6207 0%, #fd7d0d 55%, #ffbf6e 100%)',
};

class BalanceCard extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'value', 'trend', 'tone'];
  }

  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const label = this.getAttribute('label') ?? '';
    const value = this.getAttribute('value') ?? '';
    const trend = this.getAttribute('trend');
    const tone = this.getAttribute('tone') ?? 'brand';
    const gradient = BALANCE_CARD_GRADIENTS[tone] ?? BALANCE_CARD_GRADIENTS.brand;

    this.root.innerHTML = `
      <style>
        .card {
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 20px;
          background: ${gradient};
          box-shadow: 0 8px 24px -6px rgba(30, 44, 132, 0.35);
          color: white;
        }
        .glow {
          position: absolute;
          inset: -40% -20% auto auto;
          width: 140px;
          height: 140px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
        }
        .label { position: relative; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.04em; }
        .value { position: relative; font-size: 26px; font-weight: 800; color: white; margin-top: 8px; }
        .trend { position: relative; font-size: 12px; margin-top: 6px; font-weight: 600; color: #d1fae5; }
        .trend[data-negative="true"] { color: #fecaca; }
      </style>
      <div class="card" part="card">
        <div class="glow" aria-hidden="true"></div>
        <div class="label">${label}</div>
        <div class="value" data-testid="shadow-balance-value">${value}</div>
        ${trend ? `<div class="trend" data-negative="${trend.startsWith('-')}">${trend}</div>` : ''}
      </div>
    `;
  }
}

class RatingWidget extends HTMLElement {
  static get observedAttributes() {
    return ['value'];
  }

  private root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const value = Number(this.getAttribute('value') ?? '0');
    const stars = Array.from({ length: 5 }, (_, i) => i < value);

    this.root.innerHTML = `
      <style>
        .stars { display: flex; gap: 4px; font-family: system-ui, sans-serif; }
        button { border: none; background: none; cursor: pointer; font-size: 20px; line-height: 1; padding: 2px; }
        button[data-filled="true"] { color: #f59e0b; }
        button[data-filled="false"] { color: #d5d9e2; }
      </style>
      <div class="stars" role="radiogroup" aria-label="Rate your experience">
        ${stars
          .map(
            (filled, i) =>
              `<button type="button" role="radio" aria-checked="${filled}" data-index="${i + 1}" data-filled="${filled}" data-testid="rating-star">★</button>`,
          )
          .join('')}
      </div>
    `;

    this.root.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number((btn as HTMLElement).dataset.index);
        this.setAttribute('value', String(index));
        this.dispatchEvent(new CustomEvent('rating-change', { detail: { value: index }, bubbles: true }));
      });
    });
  }
}

export function registerWebComponents() {
  if (!customElements.get('bf-balance-card')) {
    customElements.define('bf-balance-card', BalanceCard);
  }
  if (!customElements.get('bf-rating-widget')) {
    customElements.define('bf-rating-widget', RatingWidget);
  }
}
