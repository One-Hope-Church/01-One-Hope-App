// Admin dashboard script for One Hope reporting
const API_BASE = '';

const selectors = {
    adminUserLabel: document.getElementById('admin-user-label'),
    notAdminState: document.getElementById('not-admin-state'),
    adminContent: document.getElementById('admin-content'),
    summaryCards: document.getElementById('summary-cards'),
    stepBuckets: document.getElementById('step-buckets'),
    streakTableBody: document.querySelector('#streak-table tbody'),
    refreshBtn: document.getElementById('refresh-btn'),
    downloadStepsCsvBtn: document.getElementById('download-steps-csv'),
    downloadPeopleStepsCsvBtn: document.getElementById('download-people-steps-csv'),
    downloadStreaksCsvBtn: document.getElementById('download-streaks-csv'),
    downloadAccountsCsvBtn: document.getElementById('download-accounts-csv'),
    streakTableWrapper: document.getElementById('streak-table-wrapper'),
    peopleTotalCount: document.getElementById('people-total-count'),
    streaksTotalCount: document.getElementById('streaks-total-count'),
    accountsTotalCount: document.getElementById('accounts-total-count')
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

function parseDate(dateString) {
    if (!dateString) return null;
    try {
        // Parse date string as local date to avoid timezone issues
        // If it's a date-only string (YYYY-MM-DD), parse it as local time
        let d;
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
            // Date-only format: parse components and create local date
            const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
            d = new Date(year, month - 1, day);
        } else {
            // Full datetime string: use as-is
            d = new Date(dateString);
        }
        
        if (Number.isNaN(d.getTime())) return null;
        return d;
    } catch (error) {
        return null;
    }
}

function formatDate(dateString) {
    const d = parseDate(dateString);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function isWithinLastTwoDays(dateString) {
    const date = parseDate(dateString);
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === today.getTime() || checkDate.getTime() === yesterday.getTime();
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

    const activeReaders = dashboardState.streaks?.rows?.filter(row => 
        row.current_streak > 0 && isWithinLastTwoDays(row.last_reading_date)
    )?.length || 0;
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

    const bucketCards = dashboardState.steps.buckets.map((bucket, index) => `
        <div class="step-bucket">
            <h4>${bucket.label}</h4>
            <small>${bucket.dbStepId ? 'Current step' : 'Completed all steps'}</small>
            <div style="display:flex; align-items:center; gap:12px; margin-top:12px;">
                <strong>${numberWithCommas(bucket.userCount)}</strong>
                <span class="pill">${bucket.dbStepId ? 'In Progress' : 'Complete'}</span>
            </div>
            <button class="btn btn-secondary" style="margin-top:12px; width:100%; font-size:12px; padding:8px 12px;" data-step-bucket-index="${index}">
                Download CSV
            </button>
        </div>
    `).join('');

    selectors.stepBuckets.innerHTML = bucketCards;
    
    // Attach download handlers to each bucket button
    dashboardState.steps.buckets.forEach((bucket, index) => {
        const button = document.querySelector(`[data-step-bucket-index="${index}"]`);
        if (button) {
            button.addEventListener('click', () => downloadStepBucketCsv(bucket));
        }
    });
}

function downloadStepBucketCsv(bucket) {
    if (!bucket.users || bucket.users.length === 0) {
        alert(`No users found in "${bucket.label}" step.`);
        return;
    }

    const rows = bucket.users.map(user => ({
        name: user.name || '',
        email: user.email || '',
        current_step: user.current_step_label || '',
        completed_steps: (user.completed_steps || []).join('; '),
        completed_count: user.completed_count || 0,
        last_completed_date: user.last_completed_date || ''
    }));

    const safeLabel = bucket.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadCsv(rows, `one-hope-step-${safeLabel}-${Date.now()}.csv`);
}

function renderPeopleSummary() {
    const totalCount = dashboardState.steps?.users?.length || 0;
    selectors.peopleTotalCount.textContent = numberWithCommas(totalCount);
}

function renderStreakTable() {
    if (!dashboardState.streaks?.rows?.length) {
        selectors.streakTableWrapper.innerHTML = '<div class="empty-state">No reading streak data yet.</div>';
        selectors.streaksTotalCount.textContent = '0';
        return;
    }

    // Update total count
    const totalCount = dashboardState.streaks.rows.length;
    selectors.streaksTotalCount.textContent = numberWithCommas(totalCount);

    // Sort by current_streak descending and take top 10
    const sortedStreaks = [...dashboardState.streaks.rows]
        .sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0))
        .slice(0, 10);

    if (sortedStreaks.length === 0) {
        selectors.streakTableWrapper.innerHTML = '<div class="empty-state">No reading streak data yet.</div>';
        return;
    }

    const rowsHtml = sortedStreaks.map(row => `
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

function renderAccountsSummary() {
    const totalCount = dashboardState.accounts?.total || dashboardState.accounts?.data?.length || 0;
    selectors.accountsTotalCount.textContent = numberWithCommas(totalCount);
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
        renderPeopleSummary();
        renderStreakTable();
        renderAccountsSummary();
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

