const API_BASE = '';

const selectors = {
    adminUserLabel: document.getElementById('admin-user-label'),
    notAdminState: document.getElementById('not-admin-state'),
    adminContent: document.getElementById('admin-content'),
    summaryCards: document.getElementById('summary-cards'),
    stepBuckets: document.getElementById('step-buckets'),
    peopleTableBody: document.querySelector('#people-table tbody'),
    streakTableBody: document.querySelector('#streak-table tbody'),
    accountsTableBody: document.querySelector('#accounts-table tbody'),
    refreshBtn: document.getElementById('refresh-btn'),
    downloadStepsCsvBtn: document.getElementById('download-steps-csv'),
    downloadPeopleStepsCsvBtn: document.getElementById('download-people-steps-csv'),
    downloadStreaksCsvBtn: document.getElementById('download-streaks-csv'),
    downloadAccountsCsvBtn: document.getElementById('download-accounts-csv'),
    peopleTableWrapper: document.getElementById('people-table-wrapper'),
    streakTableWrapper: document.getElementById('streak-table-wrapper'),
    accountsTableWrapper: document.getElementById('accounts-table-wrapper')
};

const dashboardState = {
    admin: null,
    accounts: null,
    steps: null,
    streaks: null
};

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const storedToken = localStorage.getItem('onehope_token');
    if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
    }
    return headers;
}

async function fetchJson(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Request failed: ${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json();
}

function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        return '—';
    }
}

function formatList(items, emptyFallback = '—') {
    if (!items || !items.length) return emptyFallback;
    if (items.length === 1) return items[0];
    return `${items[0]} +${items.length - 1}`;
}

function numberWithCommas(value) {
    if (value === null || value === undefined) return '0';
    return value.toLocaleString();
}

function downloadCsv(rows, filename) {
    if (!rows || !rows.length) {
        alert('No data available for export yet. Please refresh the dashboard.');
        return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
        headers.join(','),
        ...rows.map(row => headers.map(header => {
            const cell = row[header];
            if (cell === null || cell === undefined) return '';
            const stringValue = String(cell).replace(/"/g, '""');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue}"`;
            }
            return stringValue;
        }).join(','))
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function renderSummaryCards() {
    const summaryData = [];

    const totalAccounts = dashboardState.accounts?.total || dashboardState.accounts?.data?.length || 0;
    summaryData.push({
        label: 'Total Accounts',
        value: totalAccounts
    });

    const totalAdmins = dashboardState.accounts?.data?.filter(user => user.is_admin)?.length || 0;
    summaryData.push({
        label: 'Admins',
        value: totalAdmins
    });

    const completedCount = dashboardState.steps?.buckets?.find(bucket => bucket.stepId === 'completed')?.userCount || 0;
    summaryData.push({
        label: 'All Steps Complete',
        value: completedCount
    });

    const activeReaders = dashboardState.streaks?.rows?.filter(row => row.current_streak > 0)?.length || 0;
    summaryData.push({
        label: 'Active Reading Streaks',
        value: activeReaders
    });

    selectors.summaryCards.innerHTML = summaryData.map(card => `
        <div class="card">
            <h3>${card.label}</h3>
            <div class="stat">${numberWithCommas(card.value)}</div>
        </div>
    `).join('');
}

function renderStepBuckets() {
    if (!dashboardState.steps?.buckets) {
        selectors.stepBuckets.innerHTML = '<div class="empty-state">No step data available.</div>';
        return;
    }

    const bucketCards = dashboardState.steps.buckets.map(bucket => `
        <div class="step-bucket">
            <h4>${bucket.label}</h4>
            <small>${bucket.dbStepId ? 'Current step' : 'Completed all steps'}</small>
            <div style="display:flex; align-items:center; gap:12px; margin-top:12px;">
                <strong>${numberWithCommas(bucket.userCount)}</strong>
                <span class="pill">${bucket.dbStepId ? 'In Progress' : 'Complete'}</span>
            </div>
        </div>
    `).join('');

    selectors.stepBuckets.innerHTML = bucketCards;
}

function renderPeopleTable() {
    const tbody = selectors.peopleTableBody;
    if (!dashboardState.steps?.users?.length) {
        selectors.peopleTableWrapper.innerHTML = '<div class="empty-state">No assessment data yet.</div>';
        return;
    }

    const rowsHtml = dashboardState.steps.users.map(user => `
        <tr>
            <td>${user.name || '—'}</td>
            <td>${user.email || '—'}</td>
            <td>
                ${user.current_step_label}
                ${user.current_step_label === 'All Steps Completed' ? '<span class="status-badge success">Complete</span>' : ''}
            </td>
            <td>${formatList(user.completed_steps, 'None')}</td>
            <td>${formatDate(user.last_completed_date)}</td>
        </tr>
    `).join('');

    tbody.innerHTML = rowsHtml;
}

function renderStreakTable() {
    if (!dashboardState.streaks?.rows?.length) {
        selectors.streakTableWrapper.innerHTML = '<div class="empty-state">No reading streak data yet.</div>';
        return;
    }

    const rowsHtml = dashboardState.streaks.rows.map(row => `
        <tr>
            <td>${row.name || '—'}</td>
            <td>${row.email || '—'}</td>
            <td>${numberWithCommas(row.current_streak)}</td>
            <td>${numberWithCommas(row.total_readings)}</td>
            <td>${formatDate(row.last_reading_date)}</td>
        </tr>
    `).join('');

    selectors.streakTableBody.innerHTML = rowsHtml;
}

function renderAccountsTable() {
    if (!dashboardState.accounts?.data?.length) {
        selectors.accountsTableWrapper.innerHTML = '<div class="empty-state">No accounts found.</div>';
        return;
    }

    const rowsHtml = dashboardState.accounts.data.map(user => `
        <tr>
            <td>${user.name || '—'}</td>
            <td>${user.planning_center_email || '—'}</td>
            <td>${user.phone || '—'}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>${formatDate(user.last_login)}</td>
            <td>
                <span class="status-badge ${user.is_admin ? 'success' : ''}">
                    ${user.is_admin ? 'Admin' : 'Standard'}
                </span>
            </td>
        </tr>
    `).join('');

    selectors.accountsTableBody.innerHTML = rowsHtml;
}

function attachDownloadHandlers() {
    selectors.downloadStepsCsvBtn.addEventListener('click', () => {
        if (!dashboardState.steps?.flatSteps?.length) {
            alert('No step data available to download yet.');
            return;
        }

        const rows = dashboardState.steps.flatSteps.map(row => ({
            name: row.name || '',
            email: row.email || '',
            step_id: row.step_id,
            step_label: row.step_label,
            completed: row.completed ? 'Yes' : 'No',
            completed_date: row.completed_date || '',
            updated_at: row.updated_at || '',
            notes: row.notes || ''
        }));

        downloadCsv(rows, `one-hope-steps-${Date.now()}.csv`);
    });

    selectors.downloadPeopleStepsCsvBtn.addEventListener('click', () => {
        if (!dashboardState.steps?.users?.length) {
            alert('No assessment summaries available yet.');
            return;
        }

        const rows = dashboardState.steps.users.map(user => ({
            name: user.name || '',
            email: user.email || '',
            current_step: user.current_step_label || '',
            completed_steps: (user.completed_steps || []).join('; '),
            completed_count: user.completed_count || 0,
            last_completed_date: user.last_completed_date || ''
        }));

        downloadCsv(rows, `one-hope-step-status-${Date.now()}.csv`);
    });

    selectors.downloadStreaksCsvBtn.addEventListener('click', () => {
        if (!dashboardState.streaks?.rows?.length) {
            alert('No streak data available yet.');
            return;
        }

        const rows = dashboardState.streaks.rows.map(row => ({
            name: row.name || '',
            email: row.email || '',
            current_streak: row.current_streak,
            total_readings: row.total_readings,
            last_reading_date: row.last_reading_date || ''
        }));

        downloadCsv(rows, `one-hope-streaks-${Date.now()}.csv`);
    });

    selectors.downloadAccountsCsvBtn.addEventListener('click', () => {
        if (!dashboardState.accounts?.data?.length) {
            alert('No account data available yet.');
            return;
        }

        const rows = dashboardState.accounts.data.map(user => ({
            name: user.name || '',
            email: user.planning_center_email || '',
            phone: user.phone || '',
            created_at: user.created_at || '',
            last_login: user.last_login || '',
            is_admin: user.is_admin ? 'Yes' : 'No'
        }));

        downloadCsv(rows, `one-hope-accounts-${Date.now()}.csv`);
    });
}

async function loadDashboardData(showToast = true) {
    if (showToast) {
        selectors.refreshBtn.textContent = 'Refreshing...';
        selectors.refreshBtn.disabled = true;
    }

    try {
        const [accounts, steps, streaks] = await Promise.all([
            fetchJson('/api/admin/reports/accounts'),
            fetchJson('/api/admin/reports/steps'),
            fetchJson('/api/admin/reports/streaks')
        ]);

        dashboardState.accounts = accounts;
        dashboardState.steps = steps;
        dashboardState.streaks = streaks;

        renderSummaryCards();
        renderStepBuckets();
        renderPeopleTable();
        renderStreakTable();
        renderAccountsTable();
    } catch (error) {
        console.error('❌ Failed to load admin data:', error);
        alert('Failed to load admin reports. Please try again or verify your admin access.');
    } finally {
        if (showToast) {
            selectors.refreshBtn.textContent = 'Refresh Data';
            selectors.refreshBtn.disabled = false;
        }
    }
}

async function initAdminDashboard() {
    attachDownloadHandlers();

    selectors.refreshBtn.addEventListener('click', () => loadDashboardData());

    try {
        selectors.adminUserLabel.textContent = 'Verifying admin status...';
        const adminStatus = await fetchJson('/api/admin/status');
        dashboardState.admin = adminStatus;

        if (!adminStatus.is_admin) {
            selectors.adminUserLabel.textContent = 'Admin access denied';
            selectors.notAdminState.classList.remove('hidden');
            selectors.adminContent.classList.add('hidden');
            return;
        }

        selectors.adminUserLabel.textContent = `Signed in as ${adminStatus.user?.name || adminStatus.user?.email || 'Admin'}`;
        selectors.notAdminState.classList.add('hidden');
        selectors.adminContent.classList.remove('hidden');

        await loadDashboardData(false);
    } catch (error) {
        console.error('❌ Admin status check failed:', error);
        selectors.adminUserLabel.textContent = 'Unable to verify admin status';
        selectors.notAdminState.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', initAdminDashboard);

