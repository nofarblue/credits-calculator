import { RESOURCE_CATALOG, PRICING } from './multipliers.js';

class HarnessCalculator {
    constructor() {
        this.runners = [];
        this.nextId = 1;
        this.os = 'linux';
        this.arch = 'amd';
        this.size = null;

        this.archOptions = {
            linux:   [{ key: 'amd', label: 'x64' }, { key: 'arm', label: 'ARM64' }],
            windows: [{ key: 'amd', label: 'x64' }],
            macos:   [{ key: 'arm', label: 'Apple Silicon' }],
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateArchTabs();
        this.buildSizeGrid();
    }

    bindEvents() {
        // OS tabs
        document.getElementById('os-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (!tab) return;
            document.querySelectorAll('#os-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.os = tab.dataset.key;
            this.updateArchTabs();
            this.size = null;
            this.buildSizeGrid();
        });

        // Arch tabs
        document.getElementById('arch-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (!tab) return;
            document.querySelectorAll('#arch-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.arch = tab.dataset.key;
            this.size = null;
            this.buildSizeGrid();
        });

        // Add runner
        document.getElementById('add-btn').addEventListener('click', () => this.addRunner());
        document.getElementById('minutes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addRunner();
        });

        // Remove runner
        document.getElementById('runners-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.runner-remove');
            if (!btn) return;
            this.runners = this.runners.filter(r => r.id !== parseInt(btn.dataset.id));
            this.renderRunners();
        });

        // Preset buttons
        document.getElementById('presets').addEventListener('click', (e) => {
            const btn = e.target.closest('.preset');
            if (!btn) return;
            document.querySelectorAll('#presets .preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const pct = parseInt(btn.dataset.pct);
            document.getElementById('speed-savings').value = pct;
            document.getElementById('speed-value').textContent = `${pct}%`;
            this.updateSummary();
        });

        // Speed savings slider
        const slider = document.getElementById('speed-savings');
        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            document.getElementById('speed-value').textContent = `${val}%`;
            document.querySelectorAll('#presets .preset').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.pct) === val);
            });
            this.updateSummary();
        });
    }

    updateArchTabs() {
        const container = document.getElementById('arch-tabs');
        const options = this.archOptions[this.os] || [];
        const validKeys = options.map(o => o.key);
        if (!validKeys.includes(this.arch)) {
            this.arch = validKeys[0];
        }
        container.innerHTML = options.map(o =>
            `<button class="tab${o.key === this.arch ? ' active' : ''}" data-key="${o.key}">${o.label}</button>`
        ).join('');
    }

    buildSizeGrid() {
        const grid = document.getElementById('size-grid');
        const sizes = RESOURCE_CATALOG[this.os]?.[this.arch] || [];

        grid.innerHTML = sizes.map(s => {
            const creditsPerMin = s.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
            const costPerMin = (creditsPerMin * PRICING.COST_PER_CREDIT).toFixed(3);
            const creditWord = creditsPerMin === 1 ? 'credit' : 'credits';
            return `
                <button class="size-card" data-size='${JSON.stringify({ os: this.os, arch: this.arch, ...s })}'>
                    <span class="size-name">${s.label}</span>
                    <span class="size-spec">${s.vcpus} vCPU · ${s.ram} GB</span>
                    <span class="size-rate">${creditsPerMin} ${creditWord} · $${costPerMin}</span>
                </button>
            `;
        }).join('');

        const firstCard = grid.querySelector('.size-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            this.size = JSON.parse(firstCard.dataset.size);
        }

        grid.onclick = (e) => {
            const card = e.target.closest('.size-card');
            if (!card) return;
            grid.querySelectorAll('.size-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            this.size = JSON.parse(card.dataset.size);
        };
    }

    addRunner() {
        if (!this.size) { this.flashError('Select a size first'); return; }
        const minutesInput = document.getElementById('minutes');
        const raw = minutesInput.value.trim();
        if (!raw) { this.flashError('Enter monthly minutes'); return; }
        if (!/^\d+$/.test(raw)) { this.flashError('Whole numbers only'); return; }
        const minutes = parseInt(raw);
        if (minutes <= 0) { this.flashError('Must be > 0'); return; }

        const data = this.size;
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;
        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.runners.push({
            id: this.nextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.vcpus} vCPU, ${data.ram} GB, ${archLabels[data.arch]})`,
            minutes, creditsPerMin, totalCredits,
        });

        minutesInput.value = '1000';
        this.renderRunners();
    }

    renderRunners() {
        const section = document.getElementById('runners-section');
        const intelSection = document.getElementById('intel-section');
        const list = document.getElementById('runners-list');

        if (this.runners.length === 0) {
            section.style.display = 'none';
            intelSection.style.display = 'none';
            this.updateSummary();
            return;
        }

        section.style.display = '';
        intelSection.style.display = '';

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

        this.updateSummary();
    }

    updateSummary() {
        const totalCredits = this.runners.reduce((sum, r) => sum + r.totalCredits, 0);
        const savingsPct = parseInt(document.getElementById('speed-savings').value) / 100;
        const savedCredits = Math.round(totalCredits * savingsPct);
        const effectiveCredits = totalCredits - savedCredits;
        const billable = Math.max(0, effectiveCredits - PRICING.FREE_CREDITS_MONTHLY);
        const cost = billable * PRICING.COST_PER_CREDIT;

        document.getElementById('total-credits').textContent = this.fmt(totalCredits);
        document.getElementById('hero-cost').textContent = this.fmtCurrency(cost);
        document.getElementById('free-credits').textContent = `−${this.fmt(PRICING.FREE_CREDITS_MONTHLY)}`;
        document.getElementById('billable-credits').textContent = this.fmt(billable);

        const savingsRow = document.getElementById('savings-row');
        if (savedCredits > 0 && totalCredits > 0) {
            savingsRow.style.display = '';
            document.getElementById('savings-credits').textContent = `−${this.fmt(savedCredits)}`;
        } else {
            savingsRow.style.display = 'none';
        }

        const impact = document.getElementById('intel-impact');
        if (totalCredits > 0 && savedCredits > 0) {
            const savedCost = savedCredits * PRICING.COST_PER_CREDIT;
            impact.textContent = `Saving ~${this.fmt(savedCredits)} credits (${this.fmtCurrency(savedCost)}/mo)`;
            impact.style.display = '';
        } else {
            impact.style.display = 'none';
        }
    }

    flashError(msg) {
        const btn = document.getElementById('add-btn');
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
