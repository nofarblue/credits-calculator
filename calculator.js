import { RESOURCE_CATALOG, PRICING } from './multipliers.js';

class HarnessCalculator {
    constructor() {
        this.runners = [];
        this.nextId = 1;
        this.init();
    }

    init() {
        this.buildDropdown();
        this.bindEvents();
    }

    // ── Build flat dropdown with $/min visible ──────────────────

    buildDropdown() {
        const select = document.getElementById('resource-select');
        const groups = {
            linux: { amd: 'Linux / x64', arm: 'Linux / ARM64' },
            windows: { amd: 'Windows / x64' },
            macos: { arm: 'macOS / Apple Silicon' },
        };

        for (const [os, archs] of Object.entries(RESOURCE_CATALOG)) {
            for (const [arch, sizes] of Object.entries(archs)) {
                const groupLabel = groups[os]?.[arch] || `${os} / ${arch}`;
                const optgroup = document.createElement('optgroup');
                optgroup.label = groupLabel;

                for (const size of sizes) {
                    const creditsPerMin = size.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
                    const costPerMin = (creditsPerMin * PRICING.COST_PER_CREDIT).toFixed(3);
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ os, arch, ...size });
                    option.textContent = `${size.label} (${size.cores}-core)  —  $${costPerMin}/min  ·  ${creditsPerMin} credits/min`;
                    optgroup.appendChild(option);
                }

                select.appendChild(optgroup);
            }
        }
    }

    // ── Events (all delegated, no leaks) ────────────────────────

    bindEvents() {
        document.getElementById('add-to-estimate').addEventListener('click', () => this.addRunner());

        document.getElementById('minutes-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addRunner();
        });

        document.getElementById('runners-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.runner-remove');
            if (!btn) return;
            this.runners = this.runners.filter(r => r.id !== parseInt(btn.dataset.id));
            this.renderRunners();
        });
    }

    // ── Add / render runners ────────────────────────────────────

    addRunner() {
        const select = document.getElementById('resource-select');
        const minutesInput = document.getElementById('minutes-input');
        const minutes = parseInt(minutesInput.value);

        if (!minutes || minutes <= 0) {
            this.flashError('Enter monthly minutes');
            return;
        }

        const data = JSON.parse(select.value);
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;

        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.runners.push({
            id: this.nextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.cores}-core, ${archLabels[data.arch]})`,
            minutes,
            creditsPerMin,
            totalCredits,
        });

        minutesInput.value = '';
        this.renderRunners();
    }

    renderRunners() {
        const section = document.getElementById('runners-section');
        const list = document.getElementById('runners-list');

        if (this.runners.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';

        list.innerHTML = this.runners.map(r => {
            const cost = r.totalCredits * PRICING.COST_PER_CREDIT;
            return `
                <div class="runner-row">
                    <div class="runner-info">
                        <span class="runner-name">${r.displayName}</span>
                        <span class="runner-detail">${this.fmt(r.minutes)} min · ${this.fmt(r.creditsPerMin)} credits/min</span>
                    </div>
                    <div class="runner-cost">
                        <span class="runner-credits">${this.fmt(r.totalCredits)} credits</span>
                        <span class="runner-dollars">${this.fmtCurrency(cost)}</span>
                    </div>
                    <button class="runner-remove" data-id="${r.id}" title="Remove">&times;</button>
                </div>
            `;
        }).join('');

        this.updateTotals();
    }

    updateTotals() {
        const totalCredits = this.runners.reduce((sum, r) => sum + r.totalCredits, 0);
        const billable = Math.max(0, totalCredits - PRICING.FREE_CREDITS_MONTHLY);
        const cost = billable * PRICING.COST_PER_CREDIT;

        document.getElementById('total-credits').textContent = this.fmt(totalCredits);
        document.getElementById('free-credits').textContent = `−${this.fmt(PRICING.FREE_CREDITS_MONTHLY)}`;
        document.getElementById('billable-credits').textContent = this.fmt(billable);
        document.getElementById('monthly-cost').textContent = this.fmtCurrency(cost);
    }

    // ── Helpers ──────────────────────────────────────────────────

    flashError(msg) {
        const btn = document.getElementById('add-to-estimate');
        const original = btn.textContent;
        btn.textContent = msg;
        btn.classList.add('error');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('error');
        }, 1500);
    }

    fmt(num) {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    }

    fmtCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HarnessCalculator();
});
