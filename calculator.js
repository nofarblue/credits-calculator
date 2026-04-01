import { RESOURCE_CATALOG, PRICING } from './multipliers.js';

class HarnessCalculator {
    constructor() {
        // Read version from URL hash, default to v6
        const hash = window.location.hash.replace('#', '');
        this.version = ['v5', 'v6'].includes(hash) ? hash : 'v6';

        // Shared arch options per OS
        this.archOptions = {
            linux:   [{ key: 'amd', label: 'x64' }, { key: 'arm', label: 'ARM64' }],
            windows: [{ key: 'amd', label: 'x64' }],
            macos:   [{ key: 'arm', label: 'Apple Silicon' }],
        };

        // v5 state
        this.v5Runners = [];
        this.v5NextId = 1;
        this.v5Os = 'linux';
        this.v5Arch = 'amd';
        this.v5Size = null;

        // v6 state
        this.v6Runners = [];
        this.v6NextId = 1;
        this.v6Os = 'linux';
        this.v6Arch = 'amd';
        this.v6Size = null;
        this.v6Style = 'A';

        this.init();
    }

    init() {
        this.bindEvents();

        this.v5UpdateArchTabs();
        this.v5BuildSizeGrid();
        this.v6UpdateArchTabs();
        this.v6BuildSizeGrid();

        // Activate correct version tab and layout on load
        document.querySelectorAll('.version-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.version === this.version);
        });
        this.onVersionChange();
    }

    // ── Events ──────────────────────────────────────────────────

    bindEvents() {
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

        // ── v5 Events ────────────────────────────────────────────
        document.getElementById('v5-os-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.v3-tab');
            if (!tab) return;
            document.querySelectorAll('#v5-os-tabs .v3-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.v5Os = tab.dataset.key;
            this.v5UpdateArchTabs();
            this.v5Size = null;
            this.v5BuildSizeGrid();
        });

        document.getElementById('v5-arch-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.v3-tab');
            if (!tab || tab.classList.contains('disabled')) return;
            document.querySelectorAll('#v5-arch-tabs .v3-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.v5Arch = tab.dataset.key;
            this.v5Size = null;
            this.v5BuildSizeGrid();
        });

        document.getElementById('v5-add').addEventListener('click', () => this.v5AddRunner());
        document.getElementById('v5-minutes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.v5AddRunner();
        });

        document.getElementById('v5-runners-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.runner-remove');
            if (!btn) return;
            this.v5Runners = this.v5Runners.filter(r => r.id !== parseInt(btn.dataset.id));
            this.v5RenderRunners();
        });

        document.getElementById('v5-presets').addEventListener('click', (e) => {
            const btn = e.target.closest('.v3-preset');
            if (!btn) return;
            document.querySelectorAll('#v5-presets .v3-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const pct = parseInt(btn.dataset.pct);
            document.getElementById('v5-speed-savings').value = pct;
            document.getElementById('v5-speed-value').textContent = `${pct}%`;
            this.v5UpdateSummary();
        });

        const v5Slider = document.getElementById('v5-speed-savings');
        v5Slider.addEventListener('input', () => {
            const val = parseInt(v5Slider.value);
            document.getElementById('v5-speed-value').textContent = `${val}%`;
            document.querySelectorAll('#v5-presets .v3-preset').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.pct) === val);
            });
            this.v5UpdateSummary();
        });

        // ── v6 Events ────────────────────────────────────────────
        document.getElementById('v6-os-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.v3-tab');
            if (!tab) return;
            document.querySelectorAll('#v6-os-tabs .v3-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.v6Os = tab.dataset.key;
            this.v6UpdateArchTabs();
            this.v6Size = null;
            this.v6BuildSizeGrid();
        });

        document.getElementById('v6-arch-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.v3-tab');
            if (!tab || tab.classList.contains('disabled')) return;
            document.querySelectorAll('#v6-arch-tabs .v3-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            this.v6Arch = tab.dataset.key;
            this.v6Size = null;
            this.v6BuildSizeGrid();
        });

        // Style picker (v6)
        document.getElementById('v6-style-picker').addEventListener('click', (e) => {
            const btn = e.target.closest('.v6-style-btn');
            if (!btn) return;
            document.querySelectorAll('.v6-style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.v6Style = btn.dataset.style;
            document.getElementById('v6-size-grid').dataset.style = this.v6Style;
        });

        document.getElementById('v6-add').addEventListener('click', () => this.v6AddRunner());
        document.getElementById('v6-minutes').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.v6AddRunner();
        });

        document.getElementById('v6-runners-list').addEventListener('click', (e) => {
            const btn = e.target.closest('.runner-remove');
            if (!btn) return;
            this.v6Runners = this.v6Runners.filter(r => r.id !== parseInt(btn.dataset.id));
            this.v6RenderRunners();
        });

        document.getElementById('v6-presets').addEventListener('click', (e) => {
            const btn = e.target.closest('.v3-preset');
            if (!btn) return;
            document.querySelectorAll('#v6-presets .v3-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const pct = parseInt(btn.dataset.pct);
            document.getElementById('v6-speed-savings').value = pct;
            document.getElementById('v6-speed-value').textContent = `${pct}%`;
            this.v6UpdateSummary();
        });

        const v6Slider = document.getElementById('v6-speed-savings');
        v6Slider.addEventListener('input', () => {
            const val = parseInt(v6Slider.value);
            document.getElementById('v6-speed-value').textContent = `${val}%`;
            document.querySelectorAll('#v6-presets .v3-preset').forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.pct) === val);
            });
            this.v6UpdateSummary();
        });
    }

    onVersionChange() {
        const layoutV5 = document.getElementById('layout-v5');
        const layoutV6 = document.getElementById('layout-v6');

        layoutV5.style.display = 'none';
        layoutV6.style.display = 'none';

        if (this.version === 'v5') {
            layoutV5.style.display = '';
            this.v5UpdateSummary();
        } else {
            layoutV6.style.display = '';
            this.v6UpdateSummary();
        }
    }

    // ── v5 Methods ──────────────────────────────────────────────

    v5UpdateArchTabs() {
        const container = document.getElementById('v5-arch-tabs');
        const options = this.archOptions[this.v5Os] || [];
        const validKeys = options.map(o => o.key);
        if (!validKeys.includes(this.v5Arch)) {
            this.v5Arch = validKeys[0];
        }
        container.innerHTML = options.map(o =>
            `<button class="v3-tab${o.key === this.v5Arch ? ' active' : ''}" data-key="${o.key}">${o.label}</button>`
        ).join('');
    }

    v5BuildSizeGrid() {
        const grid = document.getElementById('v5-size-grid');
        const sizes = RESOURCE_CATALOG[this.v5Os]?.[this.v5Arch] || [];

        grid.innerHTML = sizes.map(s => {
            const creditsPerMin = s.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
            const costPerMin = (creditsPerMin * PRICING.COST_PER_CREDIT).toFixed(3);
            const creditWord = creditsPerMin === 1 ? 'credit' : 'credits';
            return `
                <button class="v4-size-card" data-size='${JSON.stringify({ os: this.v5Os, arch: this.v5Arch, ...s })}'>
                    <span class="v4-size-name">${s.label}</span>
                    <span class="v4-size-spec">${s.vcpus} vCPU · ${s.ram} GB</span>
                    <span class="v4-size-rate">${creditsPerMin} ${creditWord} · $${costPerMin}</span>
                </button>
            `;
        }).join('');

        const firstCard = grid.querySelector('.v4-size-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            this.v5Size = JSON.parse(firstCard.dataset.size);
        }

        grid.onclick = (e) => {
            const card = e.target.closest('.v4-size-card');
            if (!card) return;
            grid.querySelectorAll('.v4-size-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            this.v5Size = JSON.parse(card.dataset.size);
        };
    }

    v5AddRunner() {
        if (!this.v5Size) { this.flashError('v5-add', 'Select a size first'); return; }
        const minutesInput = document.getElementById('v5-minutes');
        const raw = minutesInput.value.trim();
        if (!raw) { this.flashError('v5-add', 'Enter monthly minutes'); return; }
        if (!/^\d+$/.test(raw)) { this.flashError('v5-add', 'Whole numbers only'); return; }
        const minutes = parseInt(raw);
        if (minutes <= 0) { this.flashError('v5-add', 'Must be > 0'); return; }

        const data = this.v5Size;
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;
        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.v5Runners.push({
            id: this.v5NextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.vcpus} vCPU, ${data.ram} GB, ${archLabels[data.arch]})`,
            minutes, creditsPerMin, totalCredits,
        });

        minutesInput.value = '1000';
        this.v5RenderRunners();
    }

    v5RenderRunners() {
        const section = document.getElementById('v5-runners-section');
        const intelSection = document.getElementById('v5-intel-section');
        const list = document.getElementById('v5-runners-list');

        if (this.v5Runners.length === 0) {
            section.style.display = 'none';
            intelSection.style.display = 'none';
            this.v5UpdateSummary();
            return;
        }

        section.style.display = '';
        intelSection.style.display = '';
        list.innerHTML = this.v5Runners.map(r => this.renderRunnerRow(r)).join('');
        this.v5UpdateSummary();
    }

    v5UpdateSummary() {
        this.updateSummaryPanel('v5', this.v5Runners);
    }

    // ── v6 Methods ──────────────────────────────────────────────

    v6UpdateArchTabs() {
        const container = document.getElementById('v6-arch-tabs');
        const options = this.archOptions[this.v6Os] || [];
        const validKeys = options.map(o => o.key);
        if (!validKeys.includes(this.v6Arch)) {
            this.v6Arch = validKeys[0];
        }
        container.innerHTML = options.map(o =>
            `<button class="v3-tab${o.key === this.v6Arch ? ' active' : ''}" data-key="${o.key}">${o.label}</button>`
        ).join('');
    }

    v6BuildSizeGrid() {
        const grid = document.getElementById('v6-size-grid');
        grid.dataset.style = this.v6Style;
        const sizes = RESOURCE_CATALOG[this.v6Os]?.[this.v6Arch] || [];

        grid.innerHTML = sizes.map(s => {
            const creditsPerMin = s.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
            const costPerMin = (creditsPerMin * PRICING.COST_PER_CREDIT).toFixed(3);
            const creditWord = creditsPerMin === 1 ? 'credit' : 'credits';
            return `
                <button class="v6-size-card" data-size='${JSON.stringify({ os: this.v6Os, arch: this.v6Arch, ...s })}'>
                    <span class="v6-size-name">${s.label}</span>
                    <span class="v6-size-spec">${s.vcpus} vCPU · ${s.ram} GB</span>
                    <span class="v6-size-rate">${creditsPerMin} ${creditWord} · $${costPerMin}</span>
                </button>
            `;
        }).join('');

        const firstCard = grid.querySelector('.v6-size-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            this.v6Size = JSON.parse(firstCard.dataset.size);
        }

        grid.onclick = (e) => {
            const card = e.target.closest('.v6-size-card');
            if (!card) return;
            grid.querySelectorAll('.v6-size-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            this.v6Size = JSON.parse(card.dataset.size);
        };
    }

    v6AddRunner() {
        if (!this.v6Size) { this.flashError('v6-add', 'Select a size first'); return; }
        const minutesInput = document.getElementById('v6-minutes');
        const raw = minutesInput.value.trim();
        if (!raw) { this.flashError('v6-add', 'Enter monthly minutes'); return; }
        if (!/^\d+$/.test(raw)) { this.flashError('v6-add', 'Whole numbers only'); return; }
        const minutes = parseInt(raw);
        if (minutes <= 0) { this.flashError('v6-add', 'Must be > 0'); return; }

        const data = this.v6Size;
        const creditsPerMin = data.multiplier * PRICING.CREDITS_PER_MINUTE_BASE;
        const totalCredits = minutes * creditsPerMin;
        const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' };
        const archLabels = { amd: 'x64', arm: 'ARM64' };

        this.v6Runners.push({
            id: this.v6NextId++,
            displayName: `${osLabels[data.os]} ${data.label} (${data.vcpus} vCPU, ${data.ram} GB, ${archLabels[data.arch]})`,
            minutes, creditsPerMin, totalCredits,
        });

        minutesInput.value = '1000';
        this.v6RenderRunners();
    }

    v6RenderRunners() {
        const section = document.getElementById('v6-runners-section');
        const intelSection = document.getElementById('v6-intel-section');
        const list = document.getElementById('v6-runners-list');

        if (this.v6Runners.length === 0) {
            section.style.display = 'none';
            intelSection.style.display = 'none';
            this.v6UpdateSummary();
            return;
        }

        section.style.display = '';
        intelSection.style.display = '';
        list.innerHTML = this.v6Runners.map(r => this.renderRunnerRow(r)).join('');
        this.v6UpdateSummary();
    }

    v6UpdateSummary() {
        this.updateSummaryPanel('v6', this.v6Runners);
    }

    // ── Shared Helpers ──────────────────────────────────────────

    renderRunnerRow(r) {
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
    }

    updateSummaryPanel(prefix, runners) {
        const totalCredits = runners.reduce((sum, r) => sum + r.totalCredits, 0);
        const savingsPct = parseInt(document.getElementById(`${prefix}-speed-savings`).value) / 100;
        const savedCredits = Math.round(totalCredits * savingsPct);
        const effectiveCredits = totalCredits - savedCredits;
        const billable = Math.max(0, effectiveCredits - PRICING.FREE_CREDITS_MONTHLY);
        const cost = billable * PRICING.COST_PER_CREDIT;

        document.getElementById(`${prefix}-total-credits`).textContent = this.fmt(totalCredits);
        document.getElementById(`${prefix}-hero-cost`).textContent = this.fmtCurrency(cost);
        document.getElementById(`${prefix}-free-credits`).textContent = `−${this.fmt(PRICING.FREE_CREDITS_MONTHLY)}`;
        document.getElementById(`${prefix}-billable-credits`).textContent = this.fmt(billable);

        const savingsRow = document.getElementById(`${prefix}-savings-row`);
        if (savedCredits > 0 && totalCredits > 0) {
            savingsRow.style.display = '';
            document.getElementById(`${prefix}-savings-credits`).textContent = `−${this.fmt(savedCredits)}`;
        } else {
            savingsRow.style.display = 'none';
        }

        const impact = document.getElementById(`${prefix}-intel-impact`);
        if (totalCredits > 0 && savedCredits > 0) {
            const savedCost = savedCredits * PRICING.COST_PER_CREDIT;
            impact.textContent = `Saving ~${this.fmt(savedCredits)} credits (${this.fmtCurrency(savedCost)}/mo)`;
            impact.style.display = '';
        } else {
            impact.style.display = 'none';
        }
    }

    flashError(btnId, msg) {
        const btn = document.getElementById(btnId);
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
