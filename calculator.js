import { RESOURCE_CATALOG, PRICING } from './multipliers.js';

class HarnessCalculator {
    constructor() {
        this.runners = [];
        this.nextId = 1;

        // Read version from URL hash, default to v1
        const hash = window.location.hash.replace('#', '');
        this.version = ['v1', 'v2', 'v3'].includes(hash) ? hash : 'v1';

        // v3 state
        this.v3Runners = [];
        this.v3NextId = 1;
        this.v3Os = 'linux-amd';   // default OS tab key
        this.v3Size = null;         // selected size object

        this.init();
    }

    init() {
        this.buildDropdown();
        this.bindEvents();
        this.v3BuildSizeGrid();

        // Activate correct version tab and layout on load
        document.querySelectorAll('.version-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.version === this.version);
        });
        this.onVersionChange();
    }

    // ── Build flat dropdown with credits/min and $/min ──────────

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
                    option.textContent = `${size.label} (${size.vcpus} vCPU, ${size.ram} GB)  —  ${creditsPerMin} credits/min · $${costPerMin}/min`;
                    optgroup.appendChild(option);
                }

                select.appendChild(optgroup);
            }
        }
    }

    // ── Events ──────────────────────────────────────────────────

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

        // Version toggle
        document.querySelector('.version-toggle').addEventListener('click', (e) => {
            const tab = e.target.closest('.version-tab');
            if (!tab) return;
            document.querySelectorAll('.version-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.version = tab.dataset.version;
            window.location.hash = this.version;
            this.onVersionChange();
        });

        // Speed savings slider (v1/v2)
        const slider = document.getElementById('speed-savings');
        slider.addEventListener('input', () => {
            document.getElementById('speed-value').textContent = `${slider.value}%`;
            this.updateTotals();
        });

        // ── v3 Events ────────────────────────────────────────────
        // OS/Arch tabs
        document.getElementById('v3-os-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.v3-tab');
            if (!tab) return;
            document.querySelectorAll('#v3-os-tabs .v3-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.v3Os = tab.dataset.key;
            this.v3Size = null;
            this.v3BuildSizeGrid();
        });

        // Add runner (v3)
        document.getElementById('v3-add').addEventListener('click', () => this.v3AddRunner());
        document.getElementById('v3-minutes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.v3AddRunner();
        });

        // Remove runner (v3)
        document.getElementById('v3-runners-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.runner-remove');
            if (!btn) return;
            this.v3Runners = this.v3Runners.filter(r => r.id !== parseInt(btn.dataset.id));
            this.v3RenderRunners();
        });

        // Preset buttons (v3)
        document.querySelector('.v3-presets').addEventListener('click', (e) => {
            const btn = e.target.closest('.v3-preset');
            if (!btn) return;
            document.querySelectorAll('.v3-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const pct = parseInt(btn.dataset.pct);
            const v3Slider = document.getElementById('v3-speed-savings');
            v3Slider.value = pct;
            document.getElementById('v3-speed-value').textContent = `${pct}%`;
            this.v3UpdateSummary();
        });

        // Speed savings slider (v3)
        const v3Slider = document.getElementById('v3-speed-savings');
        v3Slider.addEventListener('input', () => {
            const val = parseInt(v3Slider.value);
            document.getElementById('v3-speed-value').textContent = `${val}%`;
            // Deselect presets if value doesn't match any
            document.querySelectorAll('.v3-preset').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.pct) === val);
            });
            this.v3UpdateSummary();
        });
    }

    onVersionChange() {
        const layoutV1V2 = document.getElementById('layout-v1v2');
        const layoutV3 = document.getElementById('layout-v3');

        if (this.version === 'v3') {
            layoutV1V2.style.display = 'none';
            layoutV3.style.display = '';
            this.v3UpdateSummary();
            return;
        }

        layoutV1V2.style.display = '';
        layoutV3.style.display = 'none';

        const intelSection = document.getElementById('intelligence-section');
        const savingsRow = document.getElementById('savings-row');
        const afterRow = document.getElementById('after-savings-row');

        if (this.version === 'v2') {
            intelSection.style.display = '';
            savingsRow.style.display = '';
            afterRow.style.display = '';
        } else {
            intelSection.style.display = 'none';
            savingsRow.style.display = 'none';
            afterRow.style.display = 'none';
        }

        this.updateTotals();
    }

    // ── Add / render runners ────────────────────────────────────

    addRunner() {
        const select = document.getElementById('resource-select');
        const minutesInput = document.getElementById('minutes-input');
        const raw = minutesInput.value.trim();

        if (!raw) {
            this.flashError('Enter monthly minutes');
            return;
        }

        if (!/^\d+$/.test(raw)) {
            this.flashError('Minutes must be a whole number');
            return;
        }

        const minutes = parseInt(raw);

        if (minutes <= 0) {
            this.flashError('Minutes must be greater than 0');
            return;
        }

        const data = JSON.parse(select.value);
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;

        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.runners.push({
            id: this.nextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.vcpus} vCPU, ${data.ram} GB, ${archLabels[data.arch]})`,
            minutes,
            creditsPerMin,
            totalCredits,
        });

        minutesInput.value = '';
        this.renderRunners();
    }

    renderRunners() {
        const section = document.getElementById('runners-section');
        const totals = document.getElementById('estimate-total');
        const list = document.getElementById('runners-list');

        if (this.runners.length === 0) {
            section.style.display = 'none';
            totals.style.display = 'none';
            return;
        }

        section.style.display = '';
        totals.style.display = '';

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

        let effectiveCredits = totalCredits;

        if (this.version === 'v2' && totalCredits > 0) {
            const savingsPct = parseInt(document.getElementById('speed-savings').value) / 100;
            const savedCredits = Math.round(totalCredits * savingsPct);
            effectiveCredits = totalCredits - savedCredits;

            document.getElementById('savings-credits').textContent = `−${this.fmt(savedCredits)}`;
            document.getElementById('after-savings-credits').textContent = this.fmt(effectiveCredits);
            document.getElementById('savings-row').style.display = '';
            document.getElementById('after-savings-row').style.display = '';
        } else if (this.version === 'v1') {
            document.getElementById('savings-row').style.display = 'none';
            document.getElementById('after-savings-row').style.display = 'none';
        }

        const billable = Math.max(0, effectiveCredits - PRICING.FREE_CREDITS_MONTHLY);
        const cost = billable * PRICING.COST_PER_CREDIT;

        document.getElementById('total-credits').textContent = this.fmt(totalCredits);
        document.getElementById('free-credits').textContent = `−${this.fmt(PRICING.FREE_CREDITS_MONTHLY)}`;
        document.getElementById('billable-credits').textContent = this.fmt(billable);
        document.getElementById('monthly-cost').textContent = this.fmtCurrency(cost);
    }

    // ── v3 Methods ─────────────────────────────────────────────

    v3GetOsArch() {
        const map = {
            'linux-amd': { os: 'linux', arch: 'amd' },
            'linux-arm': { os: 'linux', arch: 'arm' },
            'windows-amd': { os: 'windows', arch: 'amd' },
            'macos-arm': { os: 'macos', arch: 'arm' },
        };
        return map[this.v3Os];
    }

    v3BuildSizeGrid() {
        const grid = document.getElementById('v3-size-grid');
        const { os, arch } = this.v3GetOsArch();
        const sizes = RESOURCE_CATALOG[os]?.[arch] || [];

        grid.innerHTML = sizes.map(s => {
            const creditsPerMin = s.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
            const costPerMin = (creditsPerMin * PRICING.COST_PER_CREDIT).toFixed(3);
            return `
                <button class="v3-size-card" data-size='${JSON.stringify({ os, arch, ...s })}'>
                    <span class="v3-size-name">${s.label}</span>
                    <span class="v3-size-spec">${s.vcpus} vCPU · ${s.ram} GB</span>
                    <span class="v3-size-rate">${creditsPerMin} credits · $${costPerMin}</span>
                </button>
            `;
        }).join('');

        // Auto-select first card
        const firstCard = grid.querySelector('.v3-size-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            this.v3Size = JSON.parse(firstCard.dataset.size);
        }

        // Click handler via delegation
        grid.onclick = (e) => {
            const card = e.target.closest('.v3-size-card');
            if (!card) return;
            grid.querySelectorAll('.v3-size-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            this.v3Size = JSON.parse(card.dataset.size);
        };
    }

    v3AddRunner() {
        if (!this.v3Size) {
            this.v3FlashError('Select a size first');
            return;
        }

        const minutesInput = document.getElementById('v3-minutes');
        const raw = minutesInput.value.trim();

        if (!raw) {
            this.v3FlashError('Enter monthly minutes');
            return;
        }
        if (!/^\d+$/.test(raw)) {
            this.v3FlashError('Whole numbers only');
            return;
        }

        const minutes = parseInt(raw);
        if (minutes <= 0) {
            this.v3FlashError('Must be > 0');
            return;
        }

        const data = this.v3Size;
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;

        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.v3Runners.push({
            id: this.v3NextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.vcpus} vCPU, ${data.ram} GB, ${archLabels[data.arch]})`,
            minutes,
            creditsPerMin,
            totalCredits,
        });

        minutesInput.value = '';
        this.v3RenderRunners();
    }

    v3RenderRunners() {
        const section = document.getElementById('v3-runners-section');
        const intelSection = document.getElementById('v3-intel-section');
        const list = document.getElementById('v3-runners-list');

        if (this.v3Runners.length === 0) {
            section.style.display = 'none';
            intelSection.style.display = 'none';
            this.v3UpdateSummary();
            return;
        }

        section.style.display = '';
        intelSection.style.display = '';

        list.innerHTML = this.v3Runners.map(r => {
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

        this.v3UpdateSummary();
    }

    v3UpdateSummary() {
        const totalCredits = this.v3Runners.reduce((sum, r) => sum + r.totalCredits, 0);
        const savingsPct = parseInt(document.getElementById('v3-speed-savings').value) / 100;
        const savedCredits = Math.round(totalCredits * savingsPct);
        const effectiveCredits = totalCredits - savedCredits;
        const billable = Math.max(0, effectiveCredits - PRICING.FREE_CREDITS_MONTHLY);
        const cost = billable * PRICING.COST_PER_CREDIT;

        document.getElementById('v3-total-credits').textContent = this.fmt(totalCredits);
        document.getElementById('v3-hero-cost').textContent = this.fmtCurrency(cost);
        document.getElementById('v3-free-credits').textContent = `−${this.fmt(PRICING.FREE_CREDITS_MONTHLY)}`;
        document.getElementById('v3-billable-credits').textContent = this.fmt(billable);

        const savingsRow = document.getElementById('v3-savings-row');
        if (savedCredits > 0 && totalCredits > 0) {
            savingsRow.style.display = '';
            document.getElementById('v3-savings-credits').textContent = `−${this.fmt(savedCredits)}`;
        } else {
            savingsRow.style.display = 'none';
        }

        // Intel impact line
        const impact = document.getElementById('v3-intel-impact');
        if (totalCredits > 0 && savedCredits > 0) {
            const savedCost = savedCredits * PRICING.COST_PER_CREDIT;
            impact.textContent = `Saving ~${this.fmt(savedCredits)} credits (${this.fmtCurrency(savedCost)}/mo)`;
            impact.style.display = '';
        } else {
            impact.style.display = 'none';
        }
    }

    v3FlashError(msg) {
        const btn = document.getElementById('v3-add');
        const original = btn.textContent;
        btn.textContent = msg;
        btn.classList.add('error');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('error');
        }, 1500);
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
