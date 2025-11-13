// App State Management
let currentUser = null;
let userProgress = {
    streak: 7,
    completedSteps: [],
    bibleReadings: [],
    currentStep: 'assessment'
};

// Assessment State (DISABLED - Not in use)
let assessmentState = {
    currentQuestion: 0,
    answers: {},
    totalQuestions: 11,
    isNewUser: false
};

// API Configuration
const API_BASE = window.location.origin;

function getRememberPreference() {
    if (typeof window === 'undefined') return true;
    try {
        const stored = localStorage.getItem('remember_me_preference');
        if (stored === 'false') return false;
        if (stored === 'true') return true;
    } catch (error) {
        console.warn('⚠️ Unable to read remember preference:', error);
    }
    return true;
}

// Streak tracking variables
let userStreak = 0;
let totalReadings = 0;
let lastReadingDate = null;
let userSteps = []; // Store user steps from Supabase
let isSavingReading = false; // Flag to prevent multiple simultaneous saves

// Note Editor State
let noteEditor = null;
let currentEditingNote = null;
let noteSaveTimeout = null;

// URL Routing System
const routeMap = {
    'home': 'homeScreen',
    'bible': 'bibleScreen',
    'next-steps': 'nextStepsScreen',
    'events': 'eventsScreen',
    'notes': 'notesScreen',
    'profile': 'profileScreen'
};

const screenToRoute = {
    'homeScreen': 'home',
    'bibleScreen': 'bible',
    'nextStepsScreen': 'next-steps',
    'eventsScreen': 'events',
    'notesScreen': 'notes',
    'profileScreen': 'profile'
};

// Get current route from hash
function getRouteFromHash() {
    const hash = window.location.hash.replace('#', '');
    return hash || null;
}

// Navigate to route
function navigateToRoute(route) {
    if (routeMap[route]) {
        const screenId = routeMap[route];
        // Update URL hash without triggering navigation
        if (window.location.hash !== `#${route}`) {
            window.history.replaceState(null, '', `#${route}`);
        }
        showAppScreen(screenId);
        return true;
    }
    return false;
}

// Handle hash changes (browser back/forward buttons)
function handleHashChange() {
    const route = getRouteFromHash();
    if (route) {
        // Check if user is authenticated and on main app
        const storedToken = localStorage.getItem('onehope_token');
        if (storedToken) {
            const mainApp = document.getElementById('mainApp');
            if (mainApp && mainApp.classList.contains('active')) {
                navigateToRoute(route);
            }
        }
    }
}



// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting app initialization');
    
    // Check for auth parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const auth = urlParams.get('auth');
    const error = urlParams.get('error');
    const token = urlParams.get('token');
    
    console.log('URL params:', { code, auth, error, token, currentUser });
    
    // Check for auth success/error
    if (auth === 'success' && token) {
        console.log('Auth successful with token, processing authentication');
        processAuthToken(token);
    } else if (auth === 'success') {
        console.log('Auth successful, checking user session');
        // Add a small delay to ensure session is saved
        setTimeout(() => {
        checkUserSession();
        }, 1000);
    } else if (error) {
        console.log('Auth error:', error);
        showNotification('Authentication failed. Please try again.', 'error');
        showScreen('loginScreen');
    } else if (code) {
        console.log('Found OAuth code, handling callback');
        // Handle Planning Center OAuth callback
        handlePlanningCenterCallback(code);
    } else {
        console.log('No auth parameters, checking for stored token');
        
        // Check for stored token in localStorage
        const storedToken = localStorage.getItem('onehope_token');
        const storedUser = localStorage.getItem('onehope_user');
        
        if (storedToken) {
            try {
                console.log('🔍 Found stored token');
                // Ensure onehope_user exists for UI if missing
                let userData = storedUser ? JSON.parse(storedUser) : null;
                if (!userData) {
                    const payload = JSON.parse(atob(storedToken));
                    userData = {
                        id: payload.supabase_id || null,
                        planning_center_id: payload.planning_center_id || null,
                        name: payload.name || payload.email || 'Friend',
                        email: payload.email || 'user@example.com',
                        avatar_url: payload.avatar_url || null
                    };
                    localStorage.setItem('onehope_user', JSON.stringify(userData));
                }
                currentUser = userData;
                updateUserInfo();

                // Pull latest profile (name, avatar) from Supabase
                try {
                    const headers = { 'Content-Type': 'application/json' };
                    const storedToken = localStorage.getItem('onehope_token');
                    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
                    fetch(`${API_BASE}/api/user/profile`, { headers, credentials: 'include' })
                        .then(r => r.ok ? r.json() : null)
                        .then(j => {
                            if (j && j.data) {
                                const prof = j.data;
                                currentUser.name = prof.name || currentUser.name;
                                currentUser.email = prof.email || currentUser.email;
                                currentUser.avatar_url = prof.avatar_url || currentUser.avatar_url;
                                currentUser.planning_center_id = prof.planning_center_id || currentUser.planning_center_id;
                                localStorage.setItem('onehope_user', JSON.stringify(currentUser));
                updateUserInfo();
                                // Planning Center linking is now manual via profile button
                            }
                        })
                        .catch(() => {});
                } catch {}

                // Proactively refresh server-side profile/groups/registrations
                const tokenPayload = JSON.parse(atob(storedToken));
                if (tokenPayload?.planning_center_id && tokenPayload?.planning_center_id !== 'null') {
                    fetch('/api/auth/pc/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            supabase_user_id: tokenPayload.supabase_id || userData.id,
                            planning_center_id: tokenPayload.planning_center_id
                        })
                    }).catch(() => {});
                }

                // Load user data then show app
                Promise.all([fetchUserStreak(), fetchUserSteps()])
                    .then(() => {
                        showScreen('mainApp');
                        // Check for route in URL hash after showing main app
                        const route = getRouteFromHash();
                        if (route && navigateToRoute(route)) {
                            // Route navigation handled
                        } else {
                            // Default to home if no route specified
                            showAppScreen('homeScreen');
                        }
                    })
                    .catch(() => {
                        showScreen('mainApp');
                        // Check for route in URL hash after showing main app
                        const route = getRouteFromHash();
                        if (route && navigateToRoute(route)) {
                            // Route navigation handled
                        } else {
                            // Default to home if no route specified
                            showAppScreen('homeScreen');
                        }
                    });
            } catch (error) {
                console.error('❌ Error processing stored token:', error);
                localStorage.removeItem('onehope_token');
                localStorage.removeItem('onehope_user');
                showScreen('loginScreen');
            }
        } else {
            console.log('No stored token, redirecting to login page');
            // Redirect to login page immediately (no splash screen delay)
            // Early redirect script in HTML should handle this, but ensure it happens
            if (typeof window !== 'undefined' && !localStorage.getItem('onehope_token')) {
                const hash = window.location.hash;
                const returnUrl = window.location.pathname + (hash || '');
                window.location.replace('/login?return=' + encodeURIComponent(returnUrl));
            }
        }
    }

    // Setup form handlers
    console.log('Setting up form handlers');
    setupFormHandlers();
    
    // Setup navigation
    console.log('Setting up navigation');
    setupNavigation();
    
    // Setup hash-based routing
    console.log('Setting up hash-based routing');
    window.addEventListener('hashchange', handleHashChange);
    
    // Initialize homepage next step (will be called after user data loads)
    console.log('Initializing homepage next step');
    // updateHomepageNextStep(); // REMOVED - will be called after user data loads
    
    // Initialize bible data
    console.log('Initializing bible data');
    initializeBibleData();
    
    // Update dates
    console.log('Updating dates');
    updateDates();
    
    console.log('App initialization complete');
});

// Function to refresh reading status from database (called on page load)
async function refreshReadingStatus() {
    const currentDate = getChicagoDate();
    await loadDailyReadingStatus(currentDate);
}

// Process authentication token
async function processAuthToken(token) {
    try {
        console.log('🔍 Processing auth token...');
        const userData = JSON.parse(atob(token));
        console.log('🔍 User data from token:', userData);
        
        // Store user data
        currentUser = userData;
        
        // Store token in localStorage for persistence
        localStorage.setItem('onehope_token', token);
        localStorage.setItem('onehope_user', JSON.stringify(userData));
        
        // Sign in user
        await signInUser(userData);
        showNotification('Successfully signed in!', 'success');
        
        // Clean up URL parameters but preserve hash for routing
        const hash = window.location.hash;
        window.history.replaceState({}, document.title, window.location.pathname + (hash || ''));
        
        console.log('✅ User signed in:', currentUser.name);
        
    } catch (error) {
        console.error('❌ Error processing auth token:', error);
        showNotification('Authentication failed. Please try again.', 'error');
        showScreen('loginScreen');
    }
}

// Check user session from server
async function checkUserSession(retryCount = 0) {
    try {
        console.log(`🔍 Checking user session... (attempt ${retryCount + 1})`);
        const response = await fetch(`${API_BASE}/api/user`);
        console.log('🔍 Session response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('🔍 User data received:', data);
            currentUser = data.user;
            await signInUser(data.user);
            showNotification('Successfully signed in!', 'success');
        } else {
            console.log('🔍 No valid session');
            
            // Retry up to 3 times with increasing delays
            if (retryCount < 3) {
                console.log(`🔄 Retrying session check in ${(retryCount + 1) * 1000}ms...`);
                setTimeout(() => {
                    checkUserSession(retryCount + 1);
                }, (retryCount + 1) * 1000);
            } else {
                console.log('❌ Max retries reached, showing login screen');
            showScreen('loginScreen');
            }
        }
    } catch (error) {
        console.error('Error checking user session:', error);
        
        // Retry on network errors too
        if (retryCount < 3) {
            console.log(`🔄 Retrying session check due to error in ${(retryCount + 1) * 1000}ms...`);
            setTimeout(() => {
                checkUserSession(retryCount + 1);
            }, (retryCount + 1) * 1000);
        } else {
            console.log('❌ Max retries reached, showing login screen');
        showScreen('loginScreen');
        }
    }
}

// Update date displays
function updateDates() {
    const today = new Date();
    const month = today.toLocaleDateString('en-US', { month: 'long' });
    const day = today.getDate();
    const year = today.getFullYear();
    
    // Add ordinal suffix to day (1st, 2nd, 3rd, etc.)
    const getOrdinalSuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };
    
    const formattedDate = `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
    
    // Update home page date
    const homeDate = document.getElementById('home-bible-date');
    if (homeDate) {
        homeDate.textContent = formattedDate;
    }
    
    // Update bible page date
    const bibleDate = document.getElementById('bible-page-date');
    if (bibleDate) {
        bibleDate.textContent = formattedDate;
    }
    
    // Calculate and update day of year
    const startOfYear = new Date(year, 0, 1); // January 1st of current year
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const progressPercentage = (dayOfYear / 365) * 100;
    
    // Update day of year text
    const dayOfYearElement = document.getElementById('day-of-year');
    if (dayOfYearElement) {
        dayOfYearElement.textContent = `Day ${dayOfYear} of 365`;
    }
    
    // Update year progress bar
    const yearProgressFill = document.getElementById('year-progress-fill');
    if (yearProgressFill) {
        yearProgressFill.style.width = `${progressPercentage}%`;
    }
}

// Screen Management
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

async function showAppScreen(screenId) {
    // Hide all app screens
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update URL hash for routing
    const route = screenToRoute[screenId];
    if (route && window.location.hash !== `#${route}`) {
        window.history.replaceState(null, '', `#${route}`);
    }
    
    // Update navigation
    updateNavigation(screenId);
    
    // Load data for specific screens
    if (screenId === 'eventsScreen') {
        fetchEvents();
    } else if (screenId === 'bibleScreen') {
        // Always load reading status when Bible screen is shown
        const today = getChicagoDate();
        await loadDailyReadingStatus(today);
    } else if (screenId === 'notesScreen') {
        // Load all message notes when Notes screen is shown
        await fetchAllMessageNotes();
    } else if (screenId === 'nextStepsScreen') {
        // Check if user needs to take assessment
        if (needsAssessment()) {
            console.log('🎯 User needs assessment, showing assessment screen');
            showScreen('spiritualAssessmentScreen');
            initializeAssessment();
        } else {
            console.log('✅ User has steps data, showing steps screen');
            // Make sure assessment screen is hidden
            const assessmentScreen = document.getElementById('spiritualAssessmentScreen');
            if (assessmentScreen) {
                assessmentScreen.classList.remove('active');
            }
            // Update step items visual state when steps screen is shown
            updateStepItemsVisualState();
        }
    }
}

function updateNavigation(activeScreenId) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to corresponding nav item
    const navMap = {
        'homeScreen': 0,
        'bibleScreen': 1,
        'nextStepsScreen': 2,
        // 'eventsScreen': 3, // Temporarily hidden
        'notesScreen': 3, // Adjusted after hiding events
        'profileScreen': 4 // Adjusted after hiding events
    };
    
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[activeScreenId] !== undefined) {
        navItems[navMap[activeScreenId]].classList.add('active');
    }
}

// Supabase Auth Initialization
let supabaseClient = null;
async function initSupabaseClient() {
    try {
        const resp = await fetch('/api/config');
        const cfg = await resp.json();
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
            console.warn('Supabase config missing');
            return;
        }
        supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    } catch (e) {
        console.error('Failed to init Supabase:', e);
    }
}
initSupabaseClient();

function togglePasswordVisibility(inputId, buttonEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (buttonEl) {
        const icon = buttonEl.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
        buttonEl.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    }
}

async function supabaseForgotPassword() {
    try {
        const email = document.getElementById('auth-email')?.value?.trim();
        if (!email) {
            setAuthMessage('Enter your email first to reset your password.', 'warning');
            return;
        }
        if (!supabaseClient) await initSupabaseClient();
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        setAuthMessage('Password reset email sent. Check your inbox.', 'success');
    } catch (e) {
        setAuthMessage(e.message || 'Failed to start password reset.', 'error');
    }
}

function setAuthMessage(message, variant = 'info') {
    const el = document.getElementById('auth-message');
    if (!el) return;
    el.textContent = message || '';
    el.className = `helper-text ${variant}`;
}

async function supabaseEmailSignIn() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) {
        showNotification('Email and password required', 'error');
        return;
    }
    if (!supabaseClient) await initSupabaseClient();
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showNotification(error.message || 'Sign in failed', 'error');
        return;
    }
    try {
        await fetch('/api/auth/profile/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supabase_user_id: data.user.id, email })
        });
    } catch {}
    await afterSupabaseAuth(data.user);
}

async function supabaseEmailSignUp() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) {
        showNotification('Email and password required', 'error');
        return;
    }
    if (!supabaseClient) await initSupabaseClient();
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        showNotification(error.message || 'Sign up failed', 'error');
        return;
    }
    
    // Initialize profile even if email confirmation is required
    try {
        await fetch('/api/auth/profile/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supabase_user_id: data.user.id, email })
        });
    } catch {}
    
    // Check if email confirmation is required (session will be null)
    if (!data.session) {
        showNotification('Account created! Please check your email to confirm your account before signing in.', 'success');
        // Clear the form
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        return;
    }
    
    showNotification('Account created. You are signed in.', 'success');
    await afterSupabaseAuth(data.user);
}

async function afterSupabaseAuth(user) {
    if (!user) return;
    // Determine current link status from DB and cache
    let linked = JSON.parse(localStorage.getItem('onehope_pc_link') || 'null');
    if (linked && linked.supabase_user_id && linked.supabase_user_id !== user.id) {
        localStorage.removeItem('onehope_pc_link');
        linked = null;
    }
    // Read DB user to see if already linked
    let dbUser = null;
    try {
        if (!supabaseClient) await initSupabaseClient();
        const { data } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        dbUser = data || null;
    } catch {}

    const alreadyLinked = !!(linked?.planning_center_id || dbUser?.planning_center_id);

    if (!alreadyLinked) {
        // Run Planning Center check and prompt before proceeding
        try {
            const checkResp = await fetch('/api/auth/pc/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            if (checkResp.ok) {
                const body = await checkResp.json();
                const profiles = body.matches || [];
                if (profiles.length === 1) {
                    await showPcLinkModal(user, profiles[0]);
                } else if (profiles.length > 1) {
                    await showPcLinkChooser(user, profiles);
                }
            }
        } catch {}
    } else if (linked?.planning_center_id) {
        // Refresh if linked via cache
        await fetch('/api/auth/pc/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supabase_user_id: user.id, planning_center_id: linked.planning_center_id })
        });
        // Store app token so backend endpoints authorize
        setAppAuthToken({
            planning_center_id: linked.planning_center_id,
            name: dbUser?.name || user.email,
            email: dbUser?.planning_center_email || user.email,
            avatar_url: dbUser?.avatar_url || null
        });
    }
    await loadUserProfileIntoUI(user.id);
    showScreen('mainApp');
}

function setAppAuthToken(profile) {
    try {
        const rememberPreference = getRememberPreference();
        const tokenPayload = {
            planning_center_id: profile.planning_center_id,
            name: profile.name || null,
            email: profile.email || null,
            avatar_url: profile.avatar_url || null,
            timestamp: Date.now(),
            remember_me: rememberPreference
        };
        const token = btoa(JSON.stringify(tokenPayload));
        localStorage.setItem('onehope_token', token);
        localStorage.setItem('remember_me_preference', rememberPreference ? 'true' : 'false');
    } catch {}
}

async function showPcLinkModal(user, profile) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Is this you?</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <img src="${profile.avatar_url || ''}" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'"/>
                        <div>
                            <div><strong>${profile.name || 'Unknown'}</strong></div>
                            <div style="color:#6B7280;">${profile.email || ''}</div>
                        </div>
                    </div>
                    <p style="margin-top:12px;">We found a Planning Center profile with this email. Link it to personalize your experience.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="pc-link-skip">Not me</button>
                    <button class="btn-primary" id="pc-link-confirm">Yes, link</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        modal.querySelector('#pc-link-skip').onclick = () => {
            modal.remove();
            resolve();
        };
        modal.querySelector('#pc-link-confirm').onclick = async () => {
            try {
                const resp = await fetch('/api/auth/pc/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supabase_user_id: user.id, profile })
                });
                if (resp.ok) {
                    localStorage.setItem('onehope_pc_link', JSON.stringify({ supabase_user_id: user.id, planning_center_id: profile.planning_center_id }));
                    await fetch('/api/auth/pc/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ supabase_user_id: user.id, planning_center_id: profile.planning_center_id })
                    });
                    // Store app token so backend endpoints authorize
                    setAppAuthToken({
                        planning_center_id: profile.planning_center_id,
                        name: profile.name || user.email,
                        email: profile.email || user.email,
                        avatar_url: profile.avatar_url || null
                    });
                    
                    // Update current user with Planning Center data
                    currentUser.planning_center_id = profile.planning_center_id;
                    currentUser.name = profile.name || currentUser.name;
                    currentUser.avatar_url = profile.avatar_url || currentUser.avatar_url;
                    localStorage.setItem('onehope_user', JSON.stringify(currentUser));
                    
                    // Show success message and countdown
                    showNotification('Successfully linked to Planning Center! Refreshing page in 2 seconds...', 'success');
                    
                    // Update the link button to show success state
                    updatePlanningCenterLinkButton();
                    
                    // Auto-refresh page after 2 seconds
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    const errorData = await resp.json();
                    
                    // Handle specific Planning Center linking errors
                    if (errorData.code === 'PC_ALREADY_LINKED') {
                        showNotification(`Planning Center account already linked to: ${errorData.message.split('(')[1].split(')')[0]}`, 'warning');
                    } else {
                        showNotification('Failed to link Planning Center', 'error');
                    }
                }
            } catch (e) {
                showNotification('Failed to link Planning Center', 'error');
            }
            modal.remove();
            resolve();
        };
    });
}

async function showPcLinkChooser(user, profiles) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        const list = profiles.map(p => `
            <li style="display:flex;align-items:center;gap:12px; padding:8px 0; cursor:pointer;" data-pcid="${p.planning_center_id}">
                <img src="${p.avatar_url || ''}" alt="Avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;${p.avatar_url ? '' : 'display:none;'}"/>
                <div style="flex:1;">
                    <div><strong>${p.name || 'Unknown'}</strong></div>
                    <div style="color:#6B7280; font-size:12px;">${p.email}${p.email_is_primary ? ' (primary)' : ''}</div>
                </div>
                <button class="btn-small">Select</button>
            </li>`).join('');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Select Your Planning Center Account</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <ul style="list-style:none; margin:0; padding:0;">
                        ${list}
                    </ul>
                </div>
            </div>`;

        document.body.appendChild(modal);

        modal.querySelectorAll('li[data-pcid]').forEach(li => {
            li.onclick = async () => {
                const pcid = li.getAttribute('data-pcid');
                const profile = profiles.find(p => p.planning_center_id === pcid);
                if (!profile) return;
                await showPcLinkModal(user, profile);
                modal.remove();
                resolve();
            };
        });
    });
}

async function loadUserProfileIntoUI(supabaseUserId) {
    try {
        if (!supabaseClient) await initSupabaseClient();
        // Use service-backed endpoints if needed; for now we read from Supabase client-side
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', supabaseUserId)
            .single();
        if (error) return;

        const name = data?.name || 'Welcome back';
        const email = data?.planning_center_email || '';
        const avatarUrl = data?.avatar_url || '';

        const welcome = document.getElementById('home-welcome');
        if (welcome) welcome.textContent = name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back';

        const homeAvatarImg = document.getElementById('home-avatar-img');
        const homeAvatarFallback = document.getElementById('home-avatar-fallback');
        if (avatarUrl && homeAvatarImg) {
            homeAvatarImg.src = avatarUrl;
            homeAvatarImg.style.display = 'block';
            if (homeAvatarFallback) homeAvatarFallback.style.display = 'none';
        } else {
            if (homeAvatarImg) homeAvatarImg.style.display = 'none';
            if (homeAvatarFallback) homeAvatarFallback.style.display = '';
        }

        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const profileAvatarFallback = document.getElementById('profile-avatar-fallback');
        if (profileName) profileName.textContent = data?.name || 'Your Name';
        if (profileEmail) profileEmail.textContent = email || '';
        if (avatarUrl && profileAvatarImg) {
            profileAvatarImg.src = avatarUrl;
            profileAvatarImg.style.display = 'block';
            if (profileAvatarFallback) profileAvatarFallback.style.display = 'none';
        } else {
            if (profileAvatarImg) profileAvatarImg.style.display = 'none';
            if (profileAvatarFallback) profileAvatarFallback.style.display = '';
        }
        
        // Update edit button visibility based on Planning Center linking
        // Check if user has Planning Center linked
        const hasPlanningCenter = !!(data?.planning_center_id);
        
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const editAvatarBtn = document.getElementById('edit-avatar-btn');
        
        if (hasPlanningCenter) {
            // Hide edit buttons if Planning Center is linked
            if (editProfileBtn) editProfileBtn.style.display = 'none';
            if (editAvatarBtn) editAvatarBtn.style.display = 'none';
        } else {
            // Show edit buttons if Planning Center is not linked
            if (editProfileBtn) editProfileBtn.style.display = 'block';
            if (editAvatarBtn) editAvatarBtn.style.display = 'block';
        }
        
        // Update Planning Center link button
        if (typeof updatePlanningCenterLinkButton === 'function') {
            updatePlanningCenterLinkButton();
        }
    } catch {}
}

function showPlanningCenterModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Create Planning Center Account</h3>
                <button class="modal-close" onclick="closePlanningCenterModal()">×</button>
            </div>
                                        <div class="modal-body">
                                <p>To use the One Hope App, you'll need a Planning Center account. Here's what will happen:</p>
                                <ul>
                                    <li>A new tab will open to the Planning Center login page</li>
                                    <li>You can create a new account or sign in with an existing one</li>
                                    <li>After creating your account, return here and click "Sign in with Planning Center"</li>
                                    <li>This will connect your account to the One Hope App</li>
                                </ul>
                                <p><strong>Ready to continue?</strong></p>
                            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closePlanningCenterModal()">Cancel</button>
                <button class="btn-primary" onclick="proceedToPlanningCenter()">Continue to Planning Center</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closePlanningCenterModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function proceedToPlanningCenter() {
    closePlanningCenterModal();
    
    // Redirect to Planning Center login page
    const loginUrl = 'https://onehopenola.churchcenter.com/login';
    console.log('🔗 Opening Planning Center login URL:', loginUrl);
    showNotification('Opening Planning Center...', 'info');
    window.location.href = loginUrl;
    
    // Show a message to the user about what to do next
    setTimeout(() => {
        showNotification('After creating your account, return here and sign in with Planning Center', 'info');
    }, 1000);
}

function redirectToPlanningCenterSignup() {
    // Redirect to Planning Center login page
    const loginUrl = 'https://onehopenola.churchcenter.com/login';
    console.log('🔗 Opening Planning Center login URL:', loginUrl);
    showNotification('Redirecting to Planning Center...', 'info');
    window.location.href = loginUrl;
    
    // Show a message to the user about what to do next
    setTimeout(() => {
        showNotification('After creating your account, return here and sign in with Planning Center', 'info');
    }, 1000);
}

async function handlePlanningCenterCallback(code) {
    try {
        showNotification('Authenticating with Planning Center...', 'info');
        
        // In a real implementation, you would exchange the code for an access token
        // This would typically be done on your backend server
        const tokenResponse = await exchangeCodeForToken(code);
        
        if (tokenResponse.access_token) {
            // Fetch user profile from Planning Center
            const userProfile = await fetchPlanningCenterProfile(tokenResponse.access_token);
            
            // Create or update user in app
            await createOrUpdateUser(userProfile);
            
            // Sign in user
            await signInUser(userProfile);
            
            showNotification('Successfully signed in with Planning Center!', 'success');
        } else {
            throw new Error('Failed to get access token');
        }
    } catch (error) {
        console.error('Planning Center authentication error:', error);
        showNotification('Authentication failed. Please try again.', 'error');
        showScreen('loginScreen');
    }
}

async function exchangeCodeForToken(code) {
    // This would typically be done on your backend server
    // For now, we'll simulate the token exchange
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                access_token: 'mock_access_token_' + Date.now(),
                refresh_token: 'mock_refresh_token',
                expires_in: 3600
            });
        }, 1000);
    });
}

async function fetchPlanningCenterProfile(accessToken) {
    // Fetch user profile from Planning Center People API
    // This would make an actual API call to Planning Center
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: 'pc_' + Date.now(),
                name: 'Planning Center User',
                email: 'user@example.com',
                phone: '+1234567890',
                member_status: 'member',
                created_at: new Date().toISOString()
            });
        }, 1000);
    });
}

async function createOrUpdateUser(profile) {
    // Create or update user in app's user management system
    // Note: This function is now mainly for backward compatibility
    // User data is primarily managed through Supabase
    const existingUser = localStorage.getItem('onehope_user');
    
    if (existingUser) {
        // Update existing user
        const user = JSON.parse(existingUser);
        Object.assign(user, profile);
        localStorage.setItem('onehope_user', JSON.stringify(user));
        return user;
    } else {
        // Create new user
        const newUser = {
            ...profile,
            appUserId: 'app_' + Date.now(),
            createdAt: new Date().toISOString(),
            progress: {
                streak: 0,
                completedSteps: [],
                bibleReadings: []
            }
        };
        localStorage.setItem('onehope_user', JSON.stringify(newUser));
        return newUser;
    }
}

async function signInUser(userProfile) {
    // Set current user and navigate to main app
    currentUser = userProfile;
    localStorage.setItem('onehope_user', JSON.stringify(userProfile));
    
    // Clear URL parameters but preserve hash for routing
    const hash = window.location.hash;
    window.history.replaceState({}, document.title, window.location.pathname + (hash || ''));
    
    // Update UI with user info
    updateUserInfo();
    
    // Load user streak and steps data BEFORE showing the main app
    console.log('🔄 Loading user data...');
    await Promise.all([
        fetchUserStreak(),
        fetchUserSteps()
    ]);
    
    // Update progress UI with loaded data
    updateProgressUI();
    
    // Navigate to main app AFTER data is loaded
    showScreen('mainApp');
    
    // Check for route in URL hash after showing main app
    const route = getRouteFromHash();
    if (route && navigateToRoute(route)) {
        // Route navigation handled
    } else {
        // Default to home if no route specified
        showAppScreen('homeScreen');
    }
    
    console.log('✅ User signed in successfully:', userProfile);
}

// Form Handlers
function setupFormHandlers() {
    // Assessment radio buttons and date inputs
    document.addEventListener('change', function(e) {
        if (e.target.type === 'radio' && e.target.name) {
            selectAssessmentOption(e.target.name, e.target.value);
        }
        
        // Handle date input changes
        if (e.target.type === 'date' && e.target.name) {
            assessmentState.answers[e.target.name] = e.target.value;
            
            // Enable next button if date is selected
            const nextBtn = document.getElementById('next-assessment-btn');
            if (nextBtn && e.target.value) {
                nextBtn.disabled = false;
            }
        }
    });
    
    // Handle form submission - prevent default and use our function
    document.addEventListener('submit', function(e) {
        if (e.target.id === 'spiritualAssessmentForm') {
            e.preventDefault();
            e.stopPropagation();
            console.log('🛑 Preventing form submission, calling completeAssessment()');
            completeAssessment();
            return false;
        }
    });
}

// Planning Center authentication replaces the old login/signup functions
// Users now authenticate through Planning Center OAuth

function updateUserInfo() {
    if (!currentUser) return;
    
    console.log('📧 Updating user info:', currentUser);
    
    // Update welcome message
    const welcomeElement = document.querySelector('#homeScreen .header h1');
    if (welcomeElement) {
        const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Friend';
        welcomeElement.textContent = `Welcome back, ${firstName}`;
        console.log('✅ Updated welcome message:', firstName);
    }
    
    // Update profile info
    const profileName = document.querySelector('#profileScreen .profile-card h3');
    const profileEmail = document.querySelector('#profileScreen .profile-card p');
    const profileAvatar = document.querySelector('#profileScreen .profile-avatar');
    
    console.log('🔍 Profile elements found:', { profileName: !!profileName, profileEmail: !!profileEmail, profileAvatar: !!profileAvatar });
    console.log('📧 Email value:', currentUser.email);
    console.log('🖼️ Avatar URL:', currentUser.avatar_url);
    
    if (profileName) {
        profileName.textContent = currentUser.name || 'Planning Center User';
        console.log('✅ Updated profile name:', currentUser.name);
    }
    
    if (profileEmail) {
        profileEmail.textContent = currentUser.email || 'user@example.com';
        console.log('✅ Updated profile email:', currentUser.email);
    } else {
        console.log('❌ Profile email element not found');
    }
    
    // Update profile avatar
    if (profileAvatar) {
        if (currentUser.avatar_url) {
            // Show user's Planning Center avatar
            profileAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            console.log('✅ Updated profile avatar with Planning Center image');
        } else {
            // Show default user icon
            profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
            console.log('✅ Using default user icon (no avatar URL)');
        }
    } else {
        console.log('❌ Profile avatar element not found');
    }
    
    // Update home screen avatar
    const homeAvatar = document.querySelector('#homeScreen .user-avatar');
    if (homeAvatar) {
        if (currentUser.avatar_url) {
            // Show user's Planning Center avatar
            homeAvatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            console.log('✅ Updated home screen avatar with Planning Center image');
        } else {
            // Show default user icon
            homeAvatar.innerHTML = '<i class="fas fa-user"></i>';
            console.log('✅ Using default user icon for home screen (no avatar URL)');
        }
    } else {
        console.log('❌ Home screen avatar element not found');
    }
    
    // Update Planning Center link button
    updatePlanningCenterLinkButton();
}

// Update Planning Center link button visibility and text
function updatePlanningCenterLinkButton() {
    const linkButton = document.getElementById('link-pc-button');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editAvatarBtn = document.getElementById('edit-avatar-btn');
    
    if (currentUser && currentUser.planning_center_id) {
        // User is already linked - hide edit buttons
        if (linkButton) {
            linkButton.innerHTML = '<i class="fas fa-check"></i> Planning Center Linked';
            linkButton.className = 'btn-success';
            linkButton.disabled = true;
            linkButton.onclick = null;
        }
        if (editProfileBtn) editProfileBtn.style.display = 'none';
        if (editAvatarBtn) editAvatarBtn.style.display = 'none';
    } else {
        // User is not linked - show edit buttons
        if (linkButton) {
            linkButton.innerHTML = '<i class="fas fa-link"></i> Link Planning Center Account';
            linkButton.className = 'btn-primary';
            linkButton.disabled = false;
            linkButton.onclick = initiatePlanningCenterLink;
        }
        if (editProfileBtn) editProfileBtn.style.display = 'block';
        if (editAvatarBtn) editAvatarBtn.style.display = 'block';
    }
}

// Toggle profile edit mode
function toggleProfileEdit() {
    const editSection = document.getElementById('profile-edit-section');
    if (!editSection) return;
    
    const isEditing = editSection.style.display !== 'none';
    
    if (isEditing) {
        // Cancel editing
        cancelProfileEdits();
    } else {
        // Start editing
        const currentName = document.getElementById('profile-name')?.textContent || '';
        const nameParts = currentName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        document.getElementById('profile-first-name').value = firstName;
        document.getElementById('profile-last-name').value = lastName;
        editSection.style.display = 'block';
    }
}

// Cancel profile edits
function cancelProfileEdits() {
    const editSection = document.getElementById('profile-edit-section');
    if (editSection) editSection.style.display = 'none';
    const firstNameInput = document.getElementById('profile-first-name');
    const lastNameInput = document.getElementById('profile-last-name');
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
    uploadedAvatarBase64 = null; // Reset uploaded avatar
}

// Handle avatar upload
let uploadedAvatarBase64 = null;

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size must be less than 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        uploadedAvatarBase64 = base64;
        
        // Update preview
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarFallback = document.getElementById('profile-avatar-fallback');
        if (avatarImg) {
            avatarImg.src = base64;
            avatarImg.style.display = 'block';
        }
        if (avatarFallback) avatarFallback.style.display = 'none';
        
        showNotification('Avatar updated. Click "Save Changes" to save.', 'success');
    };
    reader.readAsDataURL(file);
}

// Save profile edits
async function saveProfileEdits() {
    if (!currentUser || !currentUser.id) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    const firstName = document.getElementById('profile-first-name')?.value?.trim() || '';
    const lastName = document.getElementById('profile-last-name')?.value?.trim() || '';
    
    if (!firstName && !lastName) {
        showNotification('Please enter at least a first name', 'error');
        return;
    }
    
    const fullName = `${firstName} ${lastName}`.trim();
    
    try {
        showNotification('Saving profile...', 'info');
        
        const response = await fetch('/api/user/profile/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('onehope_token')}`
            },
            body: JSON.stringify({
                name: fullName,
                avatar_url: uploadedAvatarBase64 || null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }));
            throw new Error(errorData.error || 'Failed to update profile');
        }
        
        const result = await response.json();
        
        // Update currentUser
        if (result.data) {
            currentUser.name = result.data.name || currentUser.name;
            currentUser.avatar_url = result.data.avatar_url || currentUser.avatar_url;
            localStorage.setItem('onehope_user', JSON.stringify(currentUser));
            
            // Update token
            try {
                const tokenBase64 = localStorage.getItem('onehope_token');
                if (tokenBase64) {
                    const tokenPayload = JSON.parse(atob(tokenBase64));
                    tokenPayload.name = result.data.name || tokenPayload.name;
                    tokenPayload.avatar_url = result.data.avatar_url || tokenPayload.avatar_url;
                    localStorage.setItem('onehope_token', btoa(JSON.stringify(tokenPayload)));
                }
            } catch (e) {
                console.warn('Could not update token:', e);
            }
        }
        
        // Update UI
        await loadUserProfileIntoUI(currentUser.id);
        updateUserInfo();
        cancelProfileEdits();
        uploadedAvatarBase64 = null; // Reset uploaded avatar
        
        showNotification('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification(error.message || 'Failed to update profile', 'error');
    }
}

// Initiate Planning Center account linking
async function initiatePlanningCenterLink() {
    if (!currentUser || !currentUser.email) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    try {
        // Show loading state
        const linkButton = document.getElementById('link-pc-button');
        if (linkButton) {
            linkButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            linkButton.disabled = true;
        }
        
        // Check for Planning Center profiles
        const response = await fetch('/api/auth/pc/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
        });
        
        if (!response.ok) {
            throw new Error('Failed to check Planning Center profiles');
        }
        
        const body = await response.json();
        const profiles = (body && body.matches) ? body.matches : [];
        
        if (profiles.length === 0) {
            showNotification('No Planning Center profile found for this email', 'info');
            if (linkButton) {
                linkButton.innerHTML = '<i class="fas fa-link"></i> Link Planning Center Account';
                linkButton.disabled = false;
            }
        } else if (profiles.length === 1) {
            // Single profile found - show confirmation modal
            await showPcLinkModal({ id: currentUser.id }, profiles[0]);
        } else {
            // Multiple profiles found - show chooser modal
            await showPcLinkChooser({ id: currentUser.id }, profiles);
        }
        
    } catch (error) {
        console.error('Error initiating Planning Center link:', error);
        showNotification('Failed to check Planning Center profiles', 'error');
        
        // Reset button state
        const linkButton = document.getElementById('link-pc-button');
        if (linkButton) {
            linkButton.innerHTML = '<i class="fas fa-link"></i> Link Planning Center Account';
            linkButton.disabled = false;
        }
    }
}

// Get date in Chicago timezone (Central Time)
function getChicagoDate() {
    const now = new Date();
    // Chicago is UTC-6 (CST) or UTC-5 (CDT)
    const chicagoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    return chicagoTime.toISOString().split('T')[0];
}

// Bible Reading Functions
let dailyReadings = {
    devotional: false,
    oldTestament: false,
    newTestament: false,
    psalms: false,
    proverbs: false
};

// Bible API Integration
let currentBibleData = null;
let bibleCache = {};

// Fetch daily bible reading from API
async function fetchDailyBibleReading() {
    console.log('📖 fetchDailyBibleReading called');
    try {
        showLoadingState('bible', true);
        
        console.log('🔗 Calling API:', `${API_BASE}/api/bible/daily`);
        
        // Use our backend API
        const response = await fetch(`${API_BASE}/api/bible/daily`);
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const dailyReading = await response.json();
        console.log('📖 Daily reading received:', dailyReading);
        
        // Transform to expected format
        const transformedData = {
            Date: [dailyReading.date],
            Devotional: [{
                Author: ['Pastor Larry Stockstill'],
                _: dailyReading.devotional
            }],
            OldTestament: [{
                Verses: [dailyReading.oldTestament]
            }],
            NewTestament: [{
                Verses: [dailyReading.newTestament]
            }],
            Psalm: [{
                Verses: [dailyReading.psalms]
            }],
            Proverbs: [{
                Verses: [dailyReading.proverbs]
            }]
        };
        
        console.log('🔄 Transformed data:', transformedData);
        
        currentBibleData = transformedData;
        
        // Cache the data for today
        const today = new Date().toDateString();
        bibleCache[today] = transformedData;
        
        // Update UI with real data
        updateBibleUI();
        
        return transformedData;
    } catch (error) {
        console.error('❌ Error fetching bible reading:', error);
        showNotification('Unable to load today\'s reading. Using cached content.', 'warning');
        
        // Try to use cached data
        const today = new Date().toDateString();
        if (bibleCache[today]) {
            currentBibleData = bibleCache[today];
            updateBibleUI();
        }
        
        return null;
    } finally {
        showLoadingState('bible', false);
    }
}

// Parse Highlands XML data to expected format
function parseHighlandsXML(xmlString) {
    try {
        // Create a simple XML parser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        // Extract the Reading element
        const readingElement = xmlDoc.querySelector('Reading');
        if (!readingElement) {
            throw new Error('No Reading element found in XML');
        }
        
        // Extract date
        const date = readingElement.getAttribute('Date') || new Date().toISOString().split('T')[0];
        
        // Extract devotional
        const devotionalElement = readingElement.querySelector('Devotional');
        const devotionalAuthor = devotionalElement?.getAttribute('Author') || 'Pastor Larry Stockstill';
        const devotionalContent = devotionalElement?.textContent?.trim() || 'Daily devotional content';
        
        // Extract readings
        const oldTestament = readingElement.querySelector('OldTestament')?.getAttribute('Verses') || 'Genesis 1:1-31';
        const newTestament = readingElement.querySelector('NewTestament')?.getAttribute('Verses') || 'Matthew 1:1-17';
        const psalm = readingElement.querySelector('Psalm')?.getAttribute('Verses') || 'Psalm 1:1-6';
        const proverbs = readingElement.querySelector('Proverbs')?.getAttribute('Verses') || 'Proverbs 1:1-7';
        
        return {
            Date: [date],
            Devotional: [{
                Author: [devotionalAuthor],
                _: devotionalContent
            }],
            OldTestament: [{
                Verses: [oldTestament]
            }],
            NewTestament: [{
                Verses: [newTestament]
            }],
            Psalm: [{
                Verses: [psalm]
            }],
            Proverbs: [{
                Verses: [proverbs]
            }]
        };
    } catch (error) {
        console.error('Error parsing XML:', error);
        // Return fallback data
        return {
            Date: [new Date().toISOString().split('T')[0]],
            Devotional: [{
                Author: ['Pastor Larry Stockstill'],
                _: 'Daily devotional content from the One Hope Bible reading plan.'
            }],
            OldTestament: [{
                Verses: ['Genesis 1:1-31']
            }],
            NewTestament: [{
                Verses: ['Matthew 1:1-17']
            }],
            Psalm: [{
                Verses: ['Psalm 1:1-6']
            }],
            Proverbs: [{
                Verses: ['Proverbs 1:1-7']
            }]
        };
    }
}

// Fetch bible verse content
async function fetchBibleVerse(verse) {
    try {
        // Use our backend API
        const response = await fetch(`${API_BASE}/api/bible/verse/${encodeURIComponent(verse)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Return the data directly as expected by loadScriptureContent
        return data;
    } catch (error) {
        console.error('Error fetching bible verse:', error);
        return null;
    }
}

// Convert verse reference to passage ID format
function convertVerseToPassageId(verse) {
    // Map of book names to their IDs
    const bookMap = {
        'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
        'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
        '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
        'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalm': 'PSA', 'Psalms': 'PSA',
        'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA',
        'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN',
        'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
        'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP',
        'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
        'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Acts': 'ACT',
        'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
        'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH',
        '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT',
        'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
        '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
    };
    
    // Parse the verse reference (e.g., "1 Corinthians 2:6-3:4")
    const match = verse.match(/^(\d*\s*[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+):?(\d+)?)?$/);
    if (!match) {
        console.log(`Could not parse verse reference: ${verse}`);
        return null;
    }
    
    const bookName = match[1].trim();
    const chapter = match[2];
    const verseStart = match[3];
    const chapterEnd = match[4];
    const verseEnd = match[5];
    
    const bookId = bookMap[bookName];
    if (!bookId) {
        console.log(`Unknown book: ${bookName}`);
        return null;
    }
    
    // Handle verse ranges
    if (chapterEnd && verseEnd) {
        // Cross-chapter range (e.g., "2:6-3:4")
        return `${bookId}.${chapter}.${verseStart}-${bookId}.${chapterEnd}.${verseEnd}`;
    } else if (chapterEnd && !verseEnd) {
        // Same chapter range (e.g., "2:6-4")
        return `${bookId}.${chapter}.${verseStart}-${bookId}.${chapter}.${chapterEnd}`;
    } else if (!chapterEnd && !verseEnd) {
        // Single verse (e.g., "2:6")
        return `${bookId}.${chapter}.${verseStart}`;
    } else {
        // Fallback to single verse
        return `${bookId}.${chapter}.${verseStart}`;
    }
}

// Update bible UI with real data
function updateBibleUI() {
    if (!currentBibleData) return;
    
    // Update date - use current date for consistency with homepage
    const dateElement = document.querySelector('.reading-date span');
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Update verse references
    console.log('Updating verse references with data:', currentBibleData);
    console.log('New Testament data:', currentBibleData.NewTestament?.[0]?.Verses?.[0]);
    
    updateVerseReference('old-testament', currentBibleData.OldTestament?.[0]?.Verses?.[0]);
    updateVerseReference('new-testament', currentBibleData.NewTestament?.[0]?.Verses?.[0]);
    updateVerseReference('psalms', currentBibleData.Psalm?.[0]?.Verses?.[0]);
    updateVerseReference('proverbs', currentBibleData.Proverbs?.[0]?.Verses?.[0]);
    
    // Update devotional
    if (currentBibleData.Devotional?.[0]) {
        const devotionalTitle = document.querySelector('.reading-section[onclick*="devotional"] .reading-content h5');
        if (devotionalTitle) {
            devotionalTitle.textContent = currentBibleData.Devotional[0].Author?.[0] || 'Daily Devotional';
        }
    }
    
    console.log('Bible UI updated with real data:', currentBibleData);
}

// Update verse reference in UI
function updateVerseReference(section, verse) {
    console.log(`updateVerseReference called for ${section} with verse: ${verse}`);
    
    if (!verse) {
        console.log(`No verse provided for section: ${section}`);
        return;
    }
    
    const titleElement = document.querySelector(`.reading-section[onclick*="${section}"] .reading-content h5`);
    console.log(`Looking for element with selector: .reading-section[onclick*="${section}"] .reading-content h5`);
    console.log(`Found element:`, titleElement);
    
    if (titleElement) {
        titleElement.textContent = verse;
        console.log(`✅ Updated ${section} to: ${verse}`);
    } else {
        console.log(`❌ Could not find element for section: ${section}`);
    }
}

// Show/hide loading state
function showLoadingState(screen, isLoading) {
    const loadingElement = document.querySelector(`#${screen}Screen .loading-overlay`);
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'flex' : 'none';
    }
}

// Initialize bible data
async function initializeBibleData() {
    console.log('📖 Initializing Bible data...');
    
    // Create loading overlay for bible screen if it doesn't exist
    const bibleScreen = document.getElementById('bibleScreen');
    if (bibleScreen && !bibleScreen.querySelector('.loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading today's reading...</p>
            </div>
        `;
        bibleScreen.appendChild(loadingOverlay);
    }
    
    // Fetch daily reading data immediately
    if (!currentBibleData) {
        console.log('📖 No current Bible data, fetching daily reading...');
        await fetchDailyBibleReading();
    } else {
        console.log('📖 Bible data already loaded:', currentBibleData);
    }
    
    // Always load reading status for today to ensure we have the latest state
    const today = getChicagoDate();
    console.log('📅 Today\'s date (Chicago time):', today);
    
    // Load from database
    await loadDailyReadingStatus(today);
    
    // Load bible data when user first accesses bible screen
    const bibleButton = document.querySelector('.bible-button');
    if (bibleButton) {
        bibleButton.addEventListener('click', async function() {
            if (!currentBibleData) {
                console.log('📖 Bible button clicked, fetching daily reading...');
                await fetchDailyBibleReading();
            }
        });
    }
}

async function markReadingComplete(section) {
    // Map section names to match dailyReadings keys
    const sectionMap = {
        'devotional': 'devotional',
        'old-testament': 'oldTestament',
        'new-testament': 'newTestament',
        'psalms': 'psalms',
        'proverbs': 'proverbs'
    };
    
    const mappedSection = sectionMap[section] || section;
    
    if (dailyReadings[mappedSection]) {
        showNotification('Already completed!', 'info');
        return;
    }
    
    // Prevent multiple simultaneous saves
    if (isSavingReading) {
        console.log('⚠️ Save already in progress, ignoring request');
        return;
    }
    
    // Set saving flag
    isSavingReading = true;
    
    // Show loading state immediately
    const homeButton = document.getElementById(`${section}-btn`);
    const statusElement = document.getElementById(`${section}-status`);
    
    // Update home button to show loading
    if (homeButton) {
        homeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        homeButton.disabled = true;
        homeButton.classList.add('saving');
    }
    
    // Update status indicator to show loading
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        statusElement.classList.add('saving');
    }
    
    try {
        // Save reading status to database FIRST
        const currentDate = getChicagoDate();
        const saveSuccess = await saveDailyReadingStatus(currentDate);
        
        // Only update UI if database save was successful
        if (saveSuccess) {
            // Mark section as complete in local state
            dailyReadings[mappedSection] = true;
            
            // Update buttons on home page
            if (homeButton) {
                homeButton.innerHTML = '<i class="fas fa-check"></i> Completed';
                homeButton.classList.remove('saving');
                homeButton.classList.add('completed');
                homeButton.disabled = true;
            }
            
            // Update status indicators on Bible page
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-check"></i>';
                statusElement.classList.remove('saving');
                statusElement.classList.add('completed');
                
                // Add a brief success animation
                setTimeout(() => {
                    statusElement.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        statusElement.style.transform = 'scale(1)';
                    }, 200);
                }, 100);
            }
            
            // Update section styling on both pages
            const homeSection = homeButton ? homeButton.closest('.reading-section') : null;
            const bibleSection = statusElement ? statusElement.closest('.reading-section') : null;
            
            [homeSection, bibleSection].forEach(section => {
                if (section) {
                    section.classList.add('completed');
                }
            });
            
            // Update completion progress on both pages
            updateDailyCompletion();
            
            // Check if all sections are complete
            if (Object.values(dailyReadings).every(completed => completed)) {
                markAllComplete();
            }
            
            // Show brief success notification
            showNotification('Reading completed successfully!', 'success');
            
        } else {
            // Revert loading state if save failed
            if (homeButton) {
                homeButton.innerHTML = 'Mark Complete';
                homeButton.disabled = false;
                homeButton.classList.remove('saving');
            }
            if (statusElement) {
                statusElement.innerHTML = '';
                statusElement.classList.remove('saving');
            }
            showNotification('Failed to save completion status. Please try again.', 'error');
        }
    } catch (error) {
        // Revert loading state if there was an error
        if (homeButton) {
            homeButton.innerHTML = 'Mark Complete';
            homeButton.disabled = false;
            homeButton.classList.remove('saving');
        }
        if (statusElement) {
            statusElement.innerHTML = '';
            statusElement.classList.remove('saving');
        }
        console.error('❌ Error marking reading complete:', error);
        showNotification('Error saving completion status. Please try again.', 'error');
    } finally {
        // Always reset the saving flag
        isSavingReading = false;
    }
}

function updateDailyCompletion() {
    const completedCount = Object.values(dailyReadings).filter(completed => completed).length;
    const totalSections = Object.keys(dailyReadings).length;
    const percentage = (completedCount / totalSections) * 100;
    
    // Update progress bars on both pages
    const progressFillHome = document.getElementById('daily-completion-fill');
    const progressFillBible = document.getElementById('daily-completion-fill-bible');
    const completionTextHome = document.getElementById('completion-text');
    const completionTextBible = document.getElementById('completion-text-bible');
    const markAllBtnHome = document.getElementById('mark-all-btn');
    const markAllBtnBible = document.getElementById('mark-all-btn-bible');
    
    // Update home page
    if (progressFillHome) progressFillHome.style.width = `${percentage}%`;
    if (completionTextHome) completionTextHome.textContent = `${completedCount} of ${totalSections} sections completed`;
    // Button should be enabled when there are incomplete sections, disabled only when all complete
    if (markAllBtnHome) {
        markAllBtnHome.disabled = completedCount >= totalSections;
        // Restore button styling if re-enabled
        if (completedCount < totalSections) {
            markAllBtnHome.classList.remove('btn-secondary');
            markAllBtnHome.classList.add('btn-primary');
            markAllBtnHome.innerHTML = '<i class="fas fa-check-double"></i> Mark All Complete';
        }
    }
    
    // Update Bible page
    if (progressFillBible) progressFillBible.style.width = `${percentage}%`;
    if (completionTextBible) completionTextBible.textContent = `${completedCount} of ${totalSections} sections completed`;
    // Button should be enabled when there are incomplete sections, disabled only when all complete
    if (markAllBtnBible) {
        markAllBtnBible.disabled = completedCount >= totalSections;
        // Restore button styling if re-enabled
        if (completedCount < totalSections) {
            markAllBtnBible.classList.remove('btn-secondary');
            markAllBtnBible.classList.add('btn-primary');
            markAllBtnBible.innerHTML = '<i class="fas fa-check-double"></i> Mark All Complete';
        }
        console.log(`Mark All Button - Completed: ${completedCount}, Total: ${totalSections}, Disabled: ${completedCount >= totalSections}`);
    }
    
    // Update steps completed count in profile
    updateStepsCompletedCount();
}

async function markAllComplete() {
    console.log('markAllComplete function called');
    
    // Map section names for marking
    const sectionMap = {
        'devotional': 'devotional',
        'old-testament': 'oldTestament',
        'new-testament': 'newTestament',
        'psalms': 'psalms',
        'proverbs': 'proverbs'
    };
    
    // Mark each section individually (will skip already completed ones)
    const sections = ['devotional', 'old-testament', 'new-testament', 'psalms', 'proverbs'];
    let newlyCompleted = 0;
    
    for (const section of sections) {
        const mappedSection = sectionMap[section];
        
        // Only mark if not already completed
        if (!dailyReadings[mappedSection]) {
            // Mark as complete in local state first
            dailyReadings[mappedSection] = true;
            
            // Update UI immediately for this section
            const homeButton = document.getElementById(`${section}-btn`);
            const statusElement = document.getElementById(`${section}-status`);
            
            if (homeButton) {
                homeButton.innerHTML = '<i class="fas fa-check"></i> Completed';
                homeButton.classList.remove('saving');
                homeButton.classList.add('completed');
                homeButton.disabled = true;
            }
            
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-check"></i>';
                statusElement.classList.remove('saving');
                statusElement.classList.add('completed');
            }
            
            // Update section styling
            const homeSection = homeButton ? homeButton.closest('.reading-section') : null;
            const bibleSection = statusElement ? statusElement.closest('.reading-section') : null;
            
            [homeSection, bibleSection].forEach(sec => {
                if (sec) {
                    sec.classList.add('completed');
                }
            });
            
            newlyCompleted++;
        }
    }
    
    // Save all reading statuses to database
    const currentDate = getChicagoDate();
    await saveDailyReadingStatus(currentDate);
    
    // Check if all sections are now complete
    const allComplete = Object.values(dailyReadings).every(completed => completed);
    
    // Only complete daily reading in streak tracking if all sections are now complete
    // and we haven't already completed today
    if (allComplete && !userProgress.bibleReadings.includes(currentDate)) {
        await completeDailyReading();
        userProgress.bibleReadings.push(currentDate);
        userProgress.streak += 1;
    }
    
    // Update UI
    updateProgressUI();
    updateDailyCompletion();
    
    // Show success message
    if (newlyCompleted > 0) {
        if (allComplete) {
            showNotification('Excellent! Daily reading complete!', 'success');
        } else {
            showNotification(`${newlyCompleted} section(s) marked as complete!`, 'success');
        }
    } else {
        showNotification('All sections already completed!', 'info');
    }
    
    // Update mark all buttons on both pages if all complete
    if (allComplete) {
        const markAllBtnHome = document.getElementById('mark-all-btn');
        const markAllBtnBible = document.getElementById('mark-all-btn-bible');
        
        [markAllBtnHome, markAllBtnBible].forEach(btn => {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check-double"></i> All Complete!';
                btn.disabled = true;
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        });
    }
}

// Legacy function for backward compatibility
function markBibleComplete() {
    markAllComplete();
}

function updateProgressUI() {
    // Update streak display using new streak tracking
    updateStreakUI();
    
    // Update profile stats
    updateStepsCompletedCount();
    
    // Update homepage next step
    updateHomepageNextStep();
    
    // Update step items visual state
    updateStepItemsVisualState();
}

function updateStepItemsVisualState() {
    // Define the step progression to match the HTML order
    const stepProgression = [
        'faith',
        'baptism', 
        'attendance',
        'bible-prayer',
        'giving',
        'small-group',
        'serve-team',
        'invite-pray',
        'share-story',
        'lead-group',
        'live-mission'
    ];
    
    const activeIndex = stepProgression.findIndex(stepId => !userProgress.completedSteps.includes(stepId));
    const activeStepId = activeIndex === -1 ? null : stepProgression[activeIndex];
    
    const stepItems = document.querySelectorAll('.step-item[data-step-id]');
    
    stepItems.forEach((stepItem) => {
        const stepId = stepItem.dataset.stepId;
        const isCompleted = userProgress.completedSteps.includes(stepId);
        const isActiveStep = !isCompleted && stepId === activeStepId;
        
        const actionsContainer = stepItem.querySelector('.step-actions');
        const learnButton = stepItem.querySelector('[data-action="learn"]');
        const completeButton = stepItem.querySelector('[data-action="complete"]');
        
        stepItem.classList.remove('completed', 'active');
        
        if (learnButton) {
            learnButton.classList.add('btn-secondary', 'btn-link');
            learnButton.disabled = false;
        }
        
        if (isCompleted) {
            stepItem.classList.add('completed');
            
            if (completeButton) {
                completeButton.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
                completeButton.classList.remove('btn-primary');
                completeButton.classList.add('btn-secondary', 'completed-button');
                completeButton.disabled = true;
                completeButton.setAttribute('aria-disabled', 'true');
            }
            
            if (actionsContainer) {
                const statusDiv = actionsContainer.querySelector('.step-status');
                if (statusDiv) {
                    statusDiv.remove();
                }
            }
        } else {
            if (completeButton) {
                completeButton.innerHTML = 'Mark as completed';
                completeButton.disabled = false;
                completeButton.removeAttribute('aria-disabled');
                completeButton.classList.remove('btn-secondary', 'completed-button');
                completeButton.classList.add('btn-primary');
            }
            
            if (isActiveStep) {
                stepItem.classList.add('active');
            }
            
            if (actionsContainer) {
                const statusDiv = actionsContainer.querySelector('.step-status');
                if (statusDiv) {
                    statusDiv.remove();
                }
            }
        }
    });
}

function updateStepsCompletedCount() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 2) {
        statNumbers[0].textContent = userStreak;
        statNumbers[1].textContent = userProgress.completedSteps.length;
    }
}

function updateHomepageNextStep() {
    console.log('🔄 Updating homepage next step...');
    console.log('📊 Current userProgress.completedSteps:', userProgress.completedSteps);
    
    // Check if user data is loaded - if not, skip updating
    if (!currentUser) {
        console.log('⏳ User not logged in yet, skipping homepage next step update');
        return;
    }
    
    // Check if user steps data is loaded from Supabase
    if (userSteps.length === 0) {
        console.log('📊 User steps is empty - user needs assessment');
        // Don't return here - this is exactly when we want to show the assessment
    }
    
    // Check if completed steps array is properly populated
    if (userProgress.completedSteps.length === 0 && userSteps.some(step => step.completed)) {
        console.log('📊 Completed steps array not populated yet, but continuing to check assessment needs');
        // Don't return here - we still want to check if user needs assessment
    }
    
    const nextStepContainer = document.getElementById('homepage-next-step');
    if (!nextStepContainer) {
        console.log('❌ Homepage next step container not found');
        return;
    }
    console.log('✅ Found homepage next step container');
    
    // Check if user needs to take the assessment first
    if (needsAssessment()) {
        const assessmentStep = {
            title: 'Take Next Steps Assessment',
            description: 'Complete a quick assessment to personalize your spiritual growth journey',
            icon: 'fas fa-clipboard-list',
            link: '#'
        };
        
        // Update the homepage next step display
        const stepIcon = nextStepContainer.querySelector('.step-icon i');
        const stepTitle = nextStepContainer.querySelector('.step-content h4');
        const stepDescription = nextStepContainer.querySelector('.step-content p');
        const stepButton = nextStepContainer.querySelector('button');
        
        console.log('🔍 DOM elements found:', { stepIcon: !!stepIcon, stepTitle: !!stepTitle, stepDescription: !!stepDescription, stepButton: !!stepButton });
        
        if (stepIcon) {
            stepIcon.className = assessmentStep.icon;
            console.log('✅ Updated icon to:', assessmentStep.icon);
        }
        if (stepTitle) {
            stepTitle.textContent = assessmentStep.title;
            console.log('✅ Updated title to:', assessmentStep.title);
        }
        if (stepDescription) {
            stepDescription.textContent = assessmentStep.description;
            console.log('✅ Updated description to:', assessmentStep.description);
        }
        if (stepButton) {
            stepButton.textContent = 'Take Assessment';
            console.log('✅ Updated button text to: Take Assessment');
        }
        
        // Store the current step's link for the button
        nextStepContainer.dataset.currentStepLink = assessmentStep.link;
        console.log('✅ Updated step link to:', assessmentStep.link);
        return;
    }
    
    // Define the step progression
    const stepProgression = [
        { id: 'assessment', title: 'Take Next Steps Assessment', description: 'Complete a quick assessment to personalize your spiritual growth journey', icon: 'fas fa-clipboard-list', link: '#' },
        { id: 'faith', title: 'Make Jesus Lord', description: 'Start your relationship with Jesus', icon: 'fas fa-cross', link: 'https://staging.onehopechurch.com/blog/begin-a-relationship-with-jesus' },
        { id: 'baptism', title: 'Get Baptized', description: 'Take the next step in your faith journey', icon: 'fas fa-water', link: 'https://staging.onehopechurch.com/connect/baptism' },
        { id: 'attendance', title: 'Attend Regularly', description: 'Make Sunday church a weekly rhythm', icon: 'fas fa-church', link: 'https://onehopechurch.com/visit' },
        { id: 'bible-prayer', title: 'Daily Bible & Prayer', description: 'Build a habit of Bible reading and prayer', icon: 'fas fa-book-open', link: 'https://staging.onehopechurch.com/prayer' },
        { id: 'giving', title: 'Give Consistently', description: 'Learn to give generously and consistently', icon: 'fas fa-heart', link: 'https://staging.onehopechurch.com/giving' },
        { id: 'small-group', title: 'Join a Small Group', description: 'Find people to grow with', icon: 'fas fa-users', link: 'https://staging.onehopechurch.com/connect' },
        { id: 'serve-team', title: 'Serve on Team', description: 'Make a difference and meet new friends', icon: 'fas fa-hands-helping', link: 'https://staging.onehopechurch.com/connect' },
        { id: 'invite-pray', title: 'Invite & Pray', description: 'Pray for and invite people far from God', icon: 'fas fa-pray', link: 'https://staging.onehopechurch.com/visit' },
        { id: 'share-story', title: 'Share Your Story', description: 'Share your faith story with others', icon: 'fas fa-comment', link: 'https://staging.onehopechurch.com/connect' },
        { id: 'leadership', title: 'Lead Others', description: 'Lead a group or serve team area', icon: 'fas fa-crown', link: 'https://staging.onehopechurch.com/connect' },
        { id: 'mission-living', title: 'Live on Mission', description: 'Look for ways to live on mission daily', icon: 'fas fa-compass', link: 'https://staging.onehopechurch.com/connect' }
    ];
    
    // Find the next incomplete step
    let nextStep = null;
    for (const step of stepProgression) {
        if (!userProgress.completedSteps.includes(step.id)) {
            nextStep = step;
            console.log('🎯 Found next step:', step.title);
            break;
        }
    }
    
    // If all steps are completed, show a completion message
    if (!nextStep) {
        nextStep = {
            title: 'All Steps Complete! 🎉',
            description: 'Congratulations! You\'ve completed all the spiritual growth steps. Keep growing in your faith!',
            icon: 'fas fa-trophy',
            allComplete: true
        };
        console.log('🏆 All steps completed!');
    }
    
    // Update the homepage next step display
    const stepIcon = nextStepContainer.querySelector('.step-icon i');
    const stepTitle = nextStepContainer.querySelector('.step-content h4');
    const stepDescription = nextStepContainer.querySelector('.step-content p');
    const stepButton = nextStepContainer.querySelector('button');
    
    console.log('🔍 DOM elements found:', { stepIcon: !!stepIcon, stepTitle: !!stepTitle, stepDescription: !!stepDescription, stepButton: !!stepButton });
    
    if (stepIcon) {
        stepIcon.className = nextStep.icon;
        console.log('✅ Updated icon to:', nextStep.icon);
    }
    if (stepTitle) {
        stepTitle.textContent = nextStep.title;
        console.log('✅ Updated title to:', nextStep.title);
    }
    if (stepDescription) {
        stepDescription.textContent = nextStep.description;
        console.log('✅ Updated description to:', nextStep.description);
    }
    
    // Handle button differently for completed vs incomplete steps
    if (stepButton) {
        if (nextStep.allComplete) {
            // All steps completed - show celebration message, no link
            stepButton.textContent = '🎉 All Complete!';
            stepButton.classList.remove('btn-primary');
            stepButton.classList.add('btn-secondary', 'disabled');
            stepButton.disabled = true;
            stepButton.onclick = null; // Remove click handler
            console.log('✅ Updated button for completed state');
        } else {
            // Normal step - show action button
            stepButton.textContent = 'View Next Step';
            stepButton.classList.remove('btn-secondary', 'disabled');
            stepButton.classList.add('btn-primary');
            stepButton.disabled = false;
            console.log('✅ Updated button text to: View Next Step');
        }
    }
    
    // Store the current step's link for the button (only if not all complete)
    if (!nextStep.allComplete) {
        nextStepContainer.dataset.currentStepLink = nextStep.link || '#';
        console.log('✅ Updated step link to:', nextStep.link || '#');
    } else {
        // Remove the link data attribute for completed state
        delete nextStepContainer.dataset.currentStepLink;
        console.log('✅ Removed step link for completed state');
    }
}

// Next Steps Functions
async function completeStep(stepId, buttonEl) {
    if (userProgress.completedSteps.includes(stepId)) {
        updateProgressUI();
        showNotification('Step already completed!', 'info');
        return;
    }

    const completeButton = buttonEl || document.querySelector(`[data-step-id="${stepId}"] [data-action="complete"]`);

    if (completeButton) {
        completeButton.disabled = true;
        completeButton.classList.add('loading');
    }
    
    try {
        // Save to Supabase
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/user/steps/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({
                stepId: stepId,
                notes: `Completed on ${new Date().toLocaleDateString()}`
            })
        });

        if (response.ok) {
            // Add to completed steps
            userProgress.completedSteps.push(stepId);
            
            // Update UI
            updateProgressUI();
            
            // Update steps completed count
            updateStepsCompletedCount();
            
            showNotification('Step completed and saved!', 'success');
        } else {
            console.error('❌ Failed to save step completion');
            if (completeButton) {
                completeButton.disabled = false;
                completeButton.classList.remove('loading');
            }
            showNotification('Failed to save step completion. Please try again.', 'error');
        }
    } catch (error) {
        console.error('❌ Error completing step:', error);
        if (completeButton) {
            completeButton.disabled = false;
            completeButton.classList.remove('loading');
        }
        showNotification('Failed to save step completion. Please try again.', 'error');
    } finally {
        if (completeButton) {
            completeButton.classList.remove('loading');
        }
    }
}

// Open the current step's link
function openCurrentStepLink() {
    const nextStepContainer = document.getElementById('homepage-next-step');
    if (!nextStepContainer) return;
    
    // Check if all steps are completed
    const stepTitle = nextStepContainer.querySelector('.step-content h4');
    if (stepTitle && stepTitle.textContent.includes('All Steps Complete')) {
        showNotification('🎉 Congratulations! All steps completed!', 'success');
        return;
    }
    
    if (nextStepContainer.dataset.currentStepLink) {
        const link = nextStepContainer.dataset.currentStepLink;
        
        // Check if this is the assessment step
        if (stepTitle && (stepTitle.textContent === 'Take Your Spiritual Assessment' || stepTitle.textContent === 'Take Next Steps Assessment')) {
            // Navigate to the steps tab
            showAppScreen('nextStepsScreen');
            return;
        }
        
        if (link && link !== '#') {
            window.location.href = link;
        } else {
            showNotification('Link not available for this step', 'info');
        }
    }
}

// Navigation Setup
function setupNavigation() {
    // Handle back button for auth screens
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Go back to login from signup
            if (document.getElementById('signupScreen').classList.contains('active')) {
                showScreen('loginScreen');
            }
        }
    });
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#667eea'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideDown 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function signOut() {
    // Call the sign-out API endpoint
    fetch(`${API_BASE}/api/signout`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log('✅ Sign out response:', data);
        
        // Clear local storage
        localStorage.removeItem('onehope_token');
        localStorage.removeItem('onehope_user');
        localStorage.removeItem('userProgress');
        localStorage.removeItem('bibleCache');
        localStorage.removeItem('dailyReadings');
        
        // Reset app state
        currentUser = null;
        userProgress = {};
        currentBibleData = null;
        dailyReadings = null;
        
        // Redirect to dedicated login page
        window.location.replace('/login');
        
        // Show notification
        showNotification('Signed out successfully', 'success');
    })
    .catch(error => {
        console.error('❌ Error signing out:', error);
        
        // Even if API call fails, clear local data and go to login
        localStorage.removeItem('onehope_token');
        localStorage.removeItem('onehope_user');
        localStorage.removeItem('userProgress');
        localStorage.removeItem('bibleCache');
        localStorage.removeItem('dailyReadings');
        
        currentUser = null;
        userProgress = {};
        currentBibleData = null;
        dailyReadings = null;
        
        window.location.replace('/login');
    });
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Touch and gesture support for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', function(e) {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Only handle horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        // Swipe left (next)
        if (diffX > 0) {
            handleSwipe('left');
        }
        // Swipe right (previous)
        else {
            handleSwipe('right');
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
});

function handleSwipe(direction) {
    const currentScreen = document.querySelector('.app-screen.active');
    if (!currentScreen) return;
    
    const screens = ['homeScreen', 'bibleScreen', 'nextStepsScreen', /* 'eventsScreen', */ 'profileScreen']; // Events temporarily hidden
    const currentIndex = screens.indexOf(currentScreen.id);
    
    if (direction === 'left' && currentIndex < screens.length - 1) {
        showAppScreen(screens[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
        showAppScreen(screens[currentIndex - 1]);
    }
}

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Reading Section Data - Dynamic content loaded from API
let readingSections = {
    'devotional': {
        title: 'Daily Devotional',
        content: `
            <div class="verse-reference-header">Loading...</div>
            <h2>Daily Devotional</h2>
            <p>Loading today's devotional content...</p>
        `
    },
    'old-testament': {
        title: 'Old Testament: Genesis 15:1-21',
        content: `
            <div class="verse-reference-header">Genesis 15:1-21</div>
            <h2>Genesis 15:1-21</h2>
            <h3>The Lord's Covenant with Abram</h3>
            <div class="scripture-text">
                <p><strong>1</strong> After this, the word of the Lord came to Abram in a vision: "Do not be afraid, Abram. I am your shield, your very great reward."</p>
                <p><strong>2</strong> But Abram said, "Sovereign Lord, what can you give me since I remain childless and the one who will inherit my estate is Eliezer of Damascus?"</p>
                <p><strong>3</strong> And Abram said, "You have given me no children; so a servant in my household will be my heir."</p>
                <p><strong>4</strong> Then the word of the Lord came to him: "This man will not be your heir, but a son who is your own flesh and blood will be your heir."</p>
                <p><strong>5</strong> He took him outside and said, "Look up at the sky and count the stars—if indeed you can count them." Then he said to him, "So shall your offspring be."</p>
                <p><strong>6</strong> Abram believed the Lord, and he credited it to him as righteousness.</p>
                <p><strong>7</strong> He also said to him, "I am the Lord, who brought you out of Ur of the Chaldeans to give you this land to take possession of it."</p>
                <p><strong>8</strong> But Abram said, "Sovereign Lord, how can I know that I will gain possession of it?"</p>
                <p><strong>9</strong> So the Lord said to him, "Bring me a heifer, a goat and a ram, each three years old, along with a dove and a young pigeon."</p>
                <p><strong>10</strong> Abram brought all these to him, cut them in two and arranged the halves opposite each other; the birds, however, he did not cut in half.</p>
                <p><strong>11</strong> Then birds of prey came down on the carcasses, but Abram drove them away.</p>
                <p><strong>12</strong> As the sun was setting, Abram fell into a deep sleep, and a thick and dreadful darkness came over him.</p>
                <p><strong>13</strong> Then the Lord said to him, "Know for certain that for four hundred years your descendants will be strangers in a country not their own and that they will be enslaved and mistreated there.</p>
                <p><strong>14</strong> But I will punish the nation they serve as slaves, and afterward they will come out with great possessions.</p>
                <p><strong>15</strong> You, however, will go to your ancestors in peace and be buried at a good old age.</p>
                <p><strong>16</strong> In the fourth generation your descendants will come back here, for the sin of the Amorites has not yet reached its full measure."</p>
                <p><strong>17</strong> When the sun had set and darkness had fallen, a smoking firepot with a blazing torch appeared and passed between the pieces.</p>
                <p><strong>18</strong> On that day the Lord made a covenant with Abram and said, "To your descendants I give this land, from the Wadi of Egypt to the great river, the Euphrates—</p>
                <p><strong>19</strong> the land of the Kenites, Kenizzites, Kadmonites,</p>
                <p><strong>20</strong> Hittites, Perizzites, Rephaites,</p>
                <p><strong>21</strong> Amorites, Canaanites, Girgashites and Jebusites."</p>
            </div>
        `
    },
    'new-testament': {
        title: 'New Testament: Matthew 15:1-20',
        content: `
            <div class="verse-reference-header">Matthew 15:1-20</div>
            <h2>Matthew 15:1-20</h2>
            <h3>Jesus and the Tradition of the Elders</h3>
            <div class="scripture-text">
                <p><strong>1</strong> Then some Pharisees and teachers of the law came to Jesus from Jerusalem and asked, "Why do your disciples break the tradition of the elders? They don't wash their hands before they eat!"</p>
                <p><strong>2</strong> Jesus replied, "And why do you break the command of God for the sake of your tradition?</p>
                <p><strong>3</strong> For God said, 'Honor your father and mother' and 'Anyone who curses their father or mother is to be put to death.'</p>
                <p><strong>4</strong> But you say that if anyone declares that what might have been used to help their father or mother is 'devoted to God,'</p>
                <p><strong>5</strong> they are not to 'honor their father or mother' with it. Thus you nullify the word of God for the sake of your tradition.</p>
                <p><strong>6</strong> You hypocrites! Isaiah was right when he prophesied about you:</p>
                <p><strong>7</strong> "'These people honor me with their lips, but their hearts are far from me.</p>
                <p><strong>8</strong> They worship me in vain; their teachings are merely human rules.'"</p>
                <p><strong>9</strong> Jesus called the crowd to him and said, "Listen and understand.</p>
                <p><strong>10</strong> What goes into someone's mouth does not defile them, but what comes out of their mouth, that is what defiles them."</p>
                <p><strong>11</strong> Then the disciples came to him and asked, "Do you know that the Pharisees were offended when they heard this?"</p>
                <p><strong>12</strong> He replied, "Every plant that my heavenly Father has not planted will be pulled up by the roots.</p>
                <p><strong>13</strong> Leave them; they are blind guides. If the blind lead the blind, both will fall into a pit."</p>
                <p><strong>14</strong> Peter said, "Explain the parable to us."</p>
                <p><strong>15</strong> "Are you still so dull?" Jesus asked them.</p>
                <p><strong>16</strong> "Don't you see that whatever enters the mouth goes into the stomach and then out of the body?</p>
                <p><strong>17</strong> But the things that come out of a person's mouth come from the heart, and these defile them.</p>
                <p><strong>18</strong> For out of the heart come evil thoughts—murder, adultery, sexual immorality, theft, false testimony, slander.</p>
                <p><strong>19</strong> These are what defile a person; but eating with unwashed hands does not defile them."</p>
                <p><strong>20</strong> Then the disciples came to him and asked, "Do you know that the Pharisees were offended when they heard this?"</p>
            </div>
        `
    },
    'psalms': {
        title: 'Psalms: Psalm 19:1-14',
        content: `
            <div class="verse-reference-header">Psalm 19:1-14</div>
            <h2>Psalm 19:1-14</h2>
            <h3>The Heavens Declare the Glory of God</h3>
            <div class="scripture-text">
                <p><strong>1</strong> The heavens declare the glory of God; the skies proclaim the work of his hands.</p>
                <p><strong>2</strong> Day after day they pour forth speech; night after night they reveal knowledge.</p>
                <p><strong>3</strong> They have no speech, they use no words; no sound is heard from them.</p>
                <p><strong>4</strong> Yet their voice goes out into all the earth, their words to the ends of the world. In the heavens God has pitched a tent for the sun.</p>
                <p><strong>5</strong> It is like a bridegroom coming out of his chamber, like a champion rejoicing to run his course.</p>
                <p><strong>6</strong> It rises at one end of the heavens and makes its circuit to the other; nothing is deprived of its warmth.</p>
                <p><strong>7</strong> The law of the Lord is perfect, refreshing the soul. The statutes of the Lord are trustworthy, making wise the simple.</p>
                <p><strong>8</strong> The precepts of the Lord are right, giving joy to the heart. The commands of the Lord are radiant, giving light to the eyes.</p>
                <p><strong>9</strong> The fear of the Lord is pure, enduring forever. The decrees of the Lord are firm, and all of them are righteous.</p>
                <p><strong>10</strong> They are more precious than gold, than much pure gold; they are sweeter than honey, than honey from the honeycomb.</p>
                <p><strong>11</strong> By them your servant is warned; in keeping them there is great reward.</p>
                <p><strong>12</strong> But who can discern their own errors? Forgive my hidden faults.</p>
                <p><strong>13</strong> Keep your servant also from willful sins; may they not rule over me. Then I will be blameless, innocent of great transgression.</p>
                <p><strong>14</strong> May these words of my mouth and this meditation of my heart be pleasing in your sight, Lord, my Rock and my Redeemer.</p>
            </div>
        `
    },
    'proverbs': {
        title: 'Proverbs: Proverbs 4:1-9',
        content: `
            <div class="verse-reference-header">Proverbs 4:1-9</div>
            <h2>Proverbs 4:1-9</h2>
            <h3>A Father's Instruction to His Sons</h3>
            <div class="scripture-text">
                <p><strong>1</strong> Listen, my sons, to a father's instruction; pay attention and gain understanding.</p>
                <p><strong>2</strong> I give you sound learning, so do not forsake my teaching.</p>
                <p><strong>3</strong> For I too was a son to my father, still tender, and cherished by my mother.</p>
                <p><strong>4</strong> Then he taught me, and he said to me, "Take hold of my words with all your heart; keep my commands, and you will live.</p>
                <p><strong>5</strong> Get wisdom, get understanding; do not forget my words or turn away from them.</p>
                <p><strong>6</strong> Do not forsake wisdom, and she will protect you; love her, and she will watch over you.</p>
                <p><strong>7</strong> The beginning of wisdom is this: Get wisdom. Though it cost all you have, get understanding.</p>
                <p><strong>8</strong> Cherish her, and she will exalt you; embrace her, and she will honor you.</p>
                <p><strong>9</strong> She will give you a garland to grace your head and present you with a glorious crown."</p>
            </div>
        `
    }
};

let currentReadingSection = null;

// Reading Section Functions
async function openReadingSection(section) {
    currentReadingSection = section;
    
    // Show loading state
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('reading-detail-content');
    
    if (detailTitle && detailContent) {
        detailTitle.textContent = 'Loading...';
        detailContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading content...</div>';
    }
    
    // Show detail screen
    showAppScreen('readingDetailScreen');
    
    // Load dynamic content
    await loadReadingSectionContent(section);
}

// Load dynamic content for reading sections
async function loadReadingSectionContent(section) {
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('reading-detail-content');
    
    try {
        let content = null;
        
        if (section === 'devotional') {
            content = await loadDevotionalContent();
        } else {
            content = await loadScriptureContent(section);
        }
        
        if (detailTitle && detailContent) {
            detailTitle.textContent = content.title;
            detailContent.innerHTML = content.content;
        }
    } catch (error) {
        console.error('Error loading reading section content:', error);
        
        if (detailTitle && detailContent) {
            detailTitle.textContent = 'Content Unavailable';
            detailContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load content at this time. Please try again later.</p>
                    <button class="btn-primary" onclick="loadReadingSectionContent('${section}')">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// Load devotional content
async function loadDevotionalContent() {
    if (!currentBibleData?.Devotional?.[0]) {
        throw new Error('No devotional data available');
    }
    
    const devotional = currentBibleData.Devotional[0];
    const author = devotional.Author?.[0] || 'Pastor Larry Stockstill';
    let content = devotional._ || 'Daily devotional content';
    
    // Convert newline characters to HTML line breaks for proper formatting
    content = content.replace(/\n/g, '<br>');
    
    return {
        title: 'Devotional',
        content: `
            <div class="verse-reference-header">Devotional</div>
            <h2>${author}</h2>
            <div class="devotional-content">
                ${content}
            </div>
        `
    };
}

// Load scripture content
async function loadScriptureContent(section) {
    console.log(`loadScriptureContent called for section: ${section}`);
    
    let verseReference = '';
    let sectionTitle = '';
    
    // Get verse reference from current bible data
    switch (section) {
        case 'old-testament':
            verseReference = currentBibleData?.OldTestament?.[0]?.Verses?.[0] || 'Genesis 1:1';
            sectionTitle = 'Old Testament';
            break;
        case 'new-testament':
            verseReference = currentBibleData?.NewTestament?.[0]?.Verses?.[0] || 'Matthew 1:1';
            sectionTitle = 'New Testament';
            break;
        case 'psalms':
            verseReference = currentBibleData?.Psalm?.[0]?.Verses?.[0] || '';
            sectionTitle = 'Psalms';
            break;
        case 'proverbs':
            verseReference = currentBibleData?.Proverbs?.[0]?.Verses?.[0] || '';
            sectionTitle = 'Proverbs';
            break;
        default:
            throw new Error('Unknown section');
    }
    
    // Only try to fetch if we have a valid verse reference
    let verseData = null;
    if (verseReference && verseReference.trim()) {
        verseData = await fetchBibleVerse(verseReference);
    }
    
    if (verseData?.data) {
        const passage = verseData.data;
        return {
            title: sectionTitle,
            content: `
                <div class="verse-reference-header">${sectionTitle}</div>
                <h2>${passage.reference}</h2>
                <div class="scripture-text">
                    ${passage.content}
                </div>
                <div class="bible-version">NIV</div>
            `
        };
    } else {
        // Fallback to reference only
        if (verseReference && verseReference.trim()) {
            return {
                title: sectionTitle,
                content: `
                    <div class="verse-reference-header">${sectionTitle}</div>
                    <h2>${verseReference}</h2>
                    <div class="scripture-text">
                        <p>Scripture content for ${verseReference} will be available shortly.</p>
                        <p>Please check back later or refer to your Bible for the complete passage.</p>
                    </div>
                `
            };
        } else {
            return {
                title: sectionTitle,
                content: `
                    <div class="verse-reference-header">${sectionTitle}</div>
                    <h2>No reading for today</h2>
                    <div class="scripture-text">
                        <p>There is no ${sectionTitle.toLowerCase()} reading scheduled for today.</p>
                        <p>Please check back tomorrow or refer to your Bible reading plan.</p>
                    </div>
                `
            };
        }
    }
}

function closeReadingSection() {
    // Automatically mark the section as complete when navigating back
    if (currentReadingSection) {
        markReadingComplete(currentReadingSection);
        currentReadingSection = null;
    }
    
    // Return to Bible screen
    showAppScreen('bibleScreen');
}

function markCurrentSectionComplete() {
    if (currentReadingSection) {
        markReadingComplete(currentReadingSection);
        closeReadingSection();
    }
}

// Assessment Functions (DISABLED - Not in use)
function initializeAssessment() {
    console.log('🔄 Initializing spiritual assessment...');
    assessmentState.currentQuestion = 0;
    assessmentState.answers = {};
    assessmentState.isNewUser = true;
    
    // Show first question
    showAssessmentQuestion(0);
    updateAssessmentProgress();
}

function showAssessmentQuestion(questionIndex) {
    console.log('📝 Showing assessment question:', questionIndex);
    
    // Hide all questions
    document.querySelectorAll('.assessment-question').forEach(q => {
        q.style.display = 'none';
    });
    
    // Show the current question
    const currentQuestion = document.getElementById(`question-${getQuestionId(questionIndex)}`);
    if (currentQuestion) {
        currentQuestion.style.display = 'block';
    }
    
    // Update button text
    const nextBtn = document.getElementById('next-assessment-btn');
    if (nextBtn) {
        nextBtn.textContent = questionIndex === assessmentState.totalQuestions - 1 ? 'Complete Assessment' : 'Next Question';
        nextBtn.disabled = true;
    }
}



function getQuestionId(index) {
    const questionIds = [
        'salvation', 'baptism', 'attendance', 'bible-prayer', 'giving',
        'small-group', 'serve-team', 'invite-pray', 'share-story', 'leadership',
        'mission-living'
    ];
    return questionIds[index];
}

function showConditionalQuestion(questionType) {
    // Hide all questions
    document.querySelectorAll('.assessment-question').forEach(q => {
        q.style.display = 'none';
    });
    
    // Show the conditional question
    const conditionalQuestion = document.getElementById(`question-${questionType}`);
    if (conditionalQuestion) {
        conditionalQuestion.style.display = 'block';
    }
    
    // Update button text
    const nextBtn = document.getElementById('next-assessment-btn');
    if (nextBtn) {
        nextBtn.textContent = 'Continue to Next Question';
        nextBtn.disabled = true;
    }
}

function selectAssessmentOption(questionName, value) {
    console.log('✅ Assessment option selected:', questionName, value);
    assessmentState.answers[questionName] = value;
    
    // Enable next button
    const nextBtn = document.getElementById('next-assessment-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
    }
    
    // Handle conditional questions
    if (questionName === 'salvation_status' && value === 'yes') {
        showConditionalQuestion('salvation-date');
    } else if (questionName === 'leadership' && value === 'no') {
            showConditionalQuestion('leadership-ready');
    }
}

function nextAssessmentQuestion() {
    // Check if we're currently on a conditional question
    const currentQuestion = document.querySelector('.assessment-question[style*="block"]');
    if (currentQuestion) {
        const questionId = currentQuestion.id;
        if (questionId === 'question-salvation-date' || questionId === 'question-leadership-ready') {
            // We're on a conditional question, move to next main question
            assessmentState.currentQuestion++;
            showAssessmentQuestion(assessmentState.currentQuestion);
            updateAssessmentProgress();
            
            // Reset button text
            const nextBtn = document.getElementById('next-assessment-btn');
            if (nextBtn) {
                nextBtn.textContent = 'Next Question';
            }
            return;
        }
    }
    
    // Regular question flow
    if (assessmentState.currentQuestion < assessmentState.totalQuestions - 1) {
        assessmentState.currentQuestion++;
        showAssessmentQuestion(assessmentState.currentQuestion);
        updateAssessmentProgress();
    } else {
        completeAssessment();
    }
}

function updateAssessmentProgress() {
    const progressFill = document.getElementById('assessment-progress-fill');
    const progressText = document.getElementById('assessment-progress-text');
    
    if (progressFill && progressText) {
        const percentage = (assessmentState.currentQuestion / assessmentState.totalQuestions) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `Question ${assessmentState.currentQuestion + 1} of ${assessmentState.totalQuestions}`;
    }
}

async function completeAssessment() {
    try {
        console.log('🎯 Completing assessment...');
        
    // Store assessment results
    currentUser.assessmentResults = assessmentState.answers;
    
    // Mark assessment as completed
    assessmentState.isNewUser = false;
    
        // Send assessment to backend to save steps
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/user/steps/assessment`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({
                assessmentAnswers: assessmentState.answers
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Assessment processed and steps saved:', result.data);
            
            // Update local user progress with completed steps
            userProgress.completedSteps = result.data
                .filter(step => step.completed)
                .map(step => step.stepId);
            
            // Update user steps data
            userSteps = result.data;
            
            // Refresh user steps from server to ensure consistency
            await fetchUserSteps();
            
            // Update the homepage next step display
            updateHomepageNextStep();
            
            // Navigate directly to steps screen
            showScreen('mainApp');
            showAppScreen('nextStepsScreen');
            
            // Show success notification
            showNotification('Assessment completed! Your steps have been updated.', 'success');
        } else {
            console.error('❌ Failed to process assessment');
            showNotification('Failed to save assessment results. Please try again.', 'error');
        }
    } catch (error) {
        console.error('❌ Error completing assessment:', error);
        showNotification('Failed to save assessment results. Please try again.', 'error');
    }
}

function showAssessmentResults() {
    // Update user name in all result cards
    const firstName = currentUser.firstName || currentUser.name.split(' ')[0];
    document.querySelectorAll('#user-first-name, #user-first-name-connect, #user-first-name-give, #user-first-name-lead').forEach(element => {
        element.textContent = firstName;
    });
    
    // Determine which results to show based on assessment answers
    const results = determineAssessmentResults();
    
    // Hide all result cards
    document.querySelectorAll('.result-card').forEach(card => {
        card.style.display = 'none';
    });
    
    // Show the appropriate result card
    const resultCard = document.getElementById(`${results.focus}-results`);
    if (resultCard) {
        resultCard.style.display = 'block';
    }
    
    // Show results screen
    showScreen('assessmentResultsScreen');
}

function determineAssessmentResults() {
    const answers = assessmentState.answers;
    
    // Foundation Focus Logic
    if (answers.salvation_status === 'no' || 
        answers.baptism_status === 'no' || 
        answers.sunday_attendance <= 2 || 
        answers.bible_prayer <= 2) {
        return { focus: 'foundation', priority: 'Start' };
    }
    
    // Connect Focus Logic
    if (answers.small_group === 'no' || answers.serve_team === 'no') {
        return { focus: 'connect', priority: 'Grow' };
    }
    
    // Give & Go Focus Logic
    if (answers.giving_status <= 2 || 
        answers.invite_pray <= 2 || 
        answers.share_story === 'no') {
        return { focus: 'give-go', priority: 'Grow' };
    }
    
    // Lead Focus Logic
    if (answers.leadership === 'yes' || 
        answers.leadership_ready === 'yes' || 
        answers.mission_living >= 3) {
        return { focus: 'lead', priority: 'Lead & Multiply' };
    }
    
    // Default to Give & Go if no specific conditions met
    return { focus: 'give-go', priority: 'Grow' };
}

function skipResults() {
    showScreen('mainApp');
    showAppScreen('nextStepsScreen');
    showNotification('Your spiritual steps have been updated!', 'success');
}

function skipAssessment() {
    console.log('⏭️ Skipping assessment, returning to home screen');
    showScreen('mainApp');
    showAppScreen('homeScreen');
    showNotification('You can take the assessment later from the Steps page', 'info');
}

// External Link Functions
function openExternalLink(type) {
    let url = '';
    let message = '';
    
    switch(type) {
        case 'salvation':
            url = 'https://staging.onehopechurch.com/blog/begin-a-relationship-with-jesus';
            message = 'Opening Make Jesus Lord of Your Life...';
            break;
        case 'baptism-info':
            url = 'https://staging.onehopechurch.com/connect/baptism';
            message = 'Opening Baptism information...';
            break;
        case 'small-group':
            url = 'https://onehopechurch.com/connect/directory';
            message = 'Opening Small Groups page...';
            break;
        case 'give':
            url = 'https://donate.overflow.co/onehopechurch';
            message = 'Opening Giving page...';
            break;
        case 'give-info':
            url = 'https://staging.onehopechurch.com/giving';
            message = 'Opening Giving Page...';
            break;
        case 'watch-message':
            url = 'https://staging.onehopechurch.com/media';
            message = 'Opening Messages page...';
            break;
        case 'next-step':
            url = 'https://staging.onehopechurch.com/connect';
            message = 'Opening Next Steps page...';
            break;
        case 'connect':
            url = 'https://staging.onehopechurch.com/connect';
            message = 'Opening Connect page...';
            break;
        case 'visit':
            url = 'https://onehopechurch.com/visit';
            message = 'Opening Visit page...';
            break;
        case 'prayer':
            url = 'https://onehopechurch.com/prayer';
            message = 'Opening Prayer resources...';
            break;
        case 'give-go':
            url = 'https://onehopechurch.com/give-go';
            message = 'Opening Give & Go resources...';
            break;
        case 'lead':
            url = 'https://staging.onehopechurch.com/connect';
            message = 'Opening Leadership opportunities...';
            break;
        case 'share-testimony':
            url = 'https://staging.onehopechurch.com/blog/how-to-share-your-testimony';
            message = 'Opening testimony resources...';
            break;
        default:
            url = 'https://staging.onehopechurch.com';
            message = 'Opening One Hope Church website...';
    }
    
    showNotification(message, 'info');
    setTimeout(() => {
        window.location.href = url;
    }, 1000);
}

// Events Functions
let currentEvents = [];

async function fetchEvents() {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            // First check session
            const sessionResponse = await fetch(`${API_BASE}/api/session-check`, {
                credentials: 'include',
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
            const sessionData = await sessionResponse.json();
            
            // Get stored token for authentication
            const storedToken = localStorage.getItem('onehope_token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add Authorization header if token exists
            if (storedToken) {
                headers['Authorization'] = `Bearer ${storedToken}`;
            }
            
            // Add credentials to ensure cookies are sent with timeout
            const response = await fetch(`${API_BASE}/api/events`, {
                credentials: 'include',
                headers: headers,
                signal: AbortSignal.timeout(15000) // 15 second timeout for events
            });
            

            
                    if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentEvents = data.events || [];
            
            displayEvents(currentEvents);
            return; // Success, exit retry loop
            
        } catch (error) {
            retryCount++;
            
            // If it's the last attempt, show error notification and display no events
            if (retryCount >= maxRetries) {
                if (error.name === 'AbortError') {
                    showNotification('Request timed out. Please check your connection and try again.', 'error');
                } else if (error.message.includes('Load failed')) {
                    showNotification('Network error. Please check your connection and try again.', 'error');
                } else {
                    showNotification('Unable to load events at this time', 'error');
                }
                
                // Show no events
                currentEvents = [];
                displayEvents([]);
            } else {
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

function displayEvents(events) {
    const eventsList = document.querySelector('.events-list');
    if (!eventsList) return;

    if (events.length === 0) {
        eventsList.innerHTML = `
            <div class="no-events">
                <i class="fas fa-calendar-times"></i>
                <h3>No upcoming events</h3>
                <p>Check back soon for new events!</p>
            </div>
        `;
        return;
    }

    // Sort events by date (TBD events at the end)
    const sortedEvents = events.sort((a, b) => {
        const dateA = a.starts_at ? new Date(a.starts_at) : null;
        const dateB = b.starts_at ? new Date(b.starts_at) : null;
        
        // If both have valid dates, sort by date
        if (dateA && dateB && !isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
            return dateA - dateB;
        }
        
        // If only A has a valid date, A comes first
        if (dateA && !isNaN(dateA.getTime()) && (!dateB || isNaN(dateB.getTime()))) {
            return -1;
        }
        
        // If only B has a valid date, B comes first
        if (dateB && !isNaN(dateB.getTime()) && (!dateA || isNaN(dateA.getTime()))) {
            return 1;
        }
        
        // If neither has a valid date, maintain original order
        return 0;
    });

    eventsList.innerHTML = sortedEvents.map(event => {
        // Handle date formatting
        let day = 'TBD';
        let month = 'TBD';
        let timeString = 'TBD';
        
        if (event.starts_at && event.starts_at !== 'Invalid Date') {
        const startDate = new Date(event.starts_at);
            if (!isNaN(startDate.getTime())) {
                day = startDate.getDate();
                month = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                
        const endDate = event.ends_at ? new Date(event.ends_at) : null;
                if (endDate && !isNaN(endDate.getTime())) {
                    timeString = `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                } else {
                    timeString = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                }
            }
        }

        // Handle description formatting with character limit
        let description = '';
        if (event.description) {
            // Remove HTML tags and clean up the text
            const cleanDescription = event.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            
            // Limit to 150 characters and add ellipsis if longer
            if (cleanDescription.length > 150) {
                description = cleanDescription.substring(0, 150) + '...';
            } else {
                description = cleanDescription;
            }
        }

        const isFull = event.capacity && event.registered_count >= event.capacity;
        const rsvpButtonText = isFull ? 'Event Full' : 'RSVP';
        const rsvpButtonClass = isFull ? 'btn-secondary disabled' : 'btn-primary';
        const rsvpButtonDisabled = isFull ? 'disabled' : '';

        return `
            <div class="event-item ${event.featured ? 'featured' : ''}">
                <div class="event-date">
                    <div class="date-day">${day}</div>
                    <div class="date-month">${month}</div>
                </div>
                <div class="event-content">
                    ${event.featured ? '<div class="event-badge">Featured</div>' : ''}
                    <h4>${event.title}</h4>
                    <p class="event-time"><i class="fas fa-clock"></i> ${timeString}</p>
                    ${event.location ? `<p class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ''}
                    ${description ? `<p class="event-description">${description}</p>` : ''}
                    <div class="event-actions">
                        <button class="${rsvpButtonClass} event-rsvp-btn" data-event-id="${event.id}" ${rsvpButtonDisabled}>
                            <i class="fas fa-calendar-plus"></i> ${rsvpButtonText}
                        </button>
                        <button class="btn-secondary event-details-btn" data-event-id="${event.id}">
                            <i class="fas fa-info-circle"></i> More Info
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Fetch all message notes from Supabase
async function fetchAllMessageNotes() {
    const notesLoading = document.getElementById('notes-loading');
    const notesEmpty = document.getElementById('notes-empty');
    const notesList = document.getElementById('notes-list');
    
    // Show loading state
    if (notesLoading) notesLoading.style.display = 'flex';
    if (notesEmpty) notesEmpty.style.display = 'none';
    if (notesList) notesList.innerHTML = '';
    
    try {
        // Check if user is authenticated
        const storedToken = localStorage.getItem('onehope_token');
        if (!storedToken) {
            throw new Error('User not authenticated');
        }
        
        // Get Supabase client
        if (!supabaseClient) {
            await initSupabaseClient();
        }
        
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        // Set auth session
        const sbAccessToken = localStorage.getItem('sb_access_token');
        const sbRefreshToken = localStorage.getItem('sb_refresh_token');
        
        if (sbAccessToken && sbRefreshToken) {
            await supabaseClient.auth.setSession({
                access_token: sbAccessToken,
                refresh_token: sbRefreshToken
            });
        }
        
        // Get current user
        const user = currentUser || JSON.parse(localStorage.getItem('onehope_user') || '{}');
        if (!user.id) {
            throw new Error('User ID not found');
        }
        
        // Fetch all notes for this user, sorted by message date (most recent first)
        // Fall back to updated_at if message_date is null or column doesn't exist
        let { data, error } = await supabaseClient
            .from('message_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('message_date', { ascending: false, nullsFirst: false })
            .order('updated_at', { ascending: false });
        
        // If error is about missing column, try again without message_date ordering
        if (error && (error.message?.includes('message_date') || error.code === '42703')) {
            console.log('message_date column not found, using updated_at for sorting');
            const result = await supabaseClient
                .from('message_notes')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });
            data = result.data;
            error = result.error;
        }
        
        if (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
        
        console.log('Fetched notes:', data?.length || 0, 'notes');
        
        // Display notes
        displayMessageNotes(data || []);
        
    } catch (error) {
        console.error('Error fetching message notes:', error);
        
        // Hide loading, show empty state
        if (notesLoading) notesLoading.style.display = 'none';
        if (notesEmpty) notesEmpty.style.display = 'flex';
        if (notesList) notesList.innerHTML = '';
        
        // Only show error notification if it's not just "no notes found"
        if (error && error.code !== 'PGRST116') {
            showNotification('Unable to load notes. Please try again.', 'error');
        }
    }
}

// Display message notes grouped by date
function displayMessageNotes(notes) {
    const notesLoading = document.getElementById('notes-loading');
    const notesEmpty = document.getElementById('notes-empty');
    const notesList = document.getElementById('notes-list');
    
    // Hide loading and empty states
    if (notesLoading) notesLoading.style.display = 'none';
    
    if (!notes || notes.length === 0) {
        if (notesEmpty) notesEmpty.style.display = 'flex';
        if (notesList) notesList.innerHTML = '';
        return;
    }
    
    if (notesEmpty) notesEmpty.style.display = 'none';
    
    // Group notes by date
    const notesByDate = {};
    const dateKeys = [];
    
    notes.forEach(note => {
        // Use message_date if available, otherwise fall back to updated_at
        const date = note.message_date 
            ? new Date(note.message_date) 
            : new Date(note.updated_at || note.created_at);
        const dateKey = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!notesByDate[dateKey]) {
            notesByDate[dateKey] = [];
            dateKeys.push({ key: dateKey, timestamp: date.getTime() });
        }
        
        notesByDate[dateKey].push(note);
    });
    
    // Sort dates (most recent first) using timestamp
    const sortedDates = dateKeys
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(item => item.key);
    
    // Build HTML
    let html = '';
    
    sortedDates.forEach(dateKey => {
        const dateNotes = notesByDate[dateKey];
        
        html += `
            <div class="notes-date-group">
                <h3 class="notes-date-header">${dateKey}</h3>
                <div class="notes-date-items">
        `;
        
        dateNotes.forEach(note => {
            // Extract message title from url_path (format: /media/message/slug)
            const urlParts = note.url_path.split('/');
            const slug = urlParts[urlParts.length - 1];
            const messageTitle = slug
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Extract preview from content (strip HTML tags)
            const contentPreview = note.content
                ? note.content.replace(/<[^>]*>/g, '').substring(0, 150).trim()
                : '';
            
            // Format time
            const updatedDate = new Date(note.updated_at || note.created_at);
            const timeString = updatedDate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
            });
            
            html += `
                <div class="note-item" onclick="openNoteEditor('${note.message_id}', '${note.url_path.replace(/'/g, "\\'")}')">
                    <div class="note-item-header">
                        <h4>${messageTitle}</h4>
                        <span class="note-time">${timeString}</span>
                    </div>
                    ${contentPreview ? `<p class="note-preview">${contentPreview}${contentPreview.length >= 150 ? '...' : ''}</p>` : ''}
                    <div class="note-item-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); openNoteInBrowser('${note.url_path.replace(/'/g, "\\'")}')" title="View Message">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    if (notesList) {
        notesList.innerHTML = html;
    }
}

// Open note editor
async function openNoteEditor(messageId, urlPath) {
    try {
        // Show loading state
        showAppScreen('noteEditScreen');
        const editorContainer = document.getElementById('note-editor-container');
        if (editorContainer) {
            editorContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading note...</div>';
        }
        
        // Get Supabase client
        if (!supabaseClient) {
            await initSupabaseClient();
        }
        
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        // Set auth session
        const sbAccessToken = localStorage.getItem('sb_access_token');
        const sbRefreshToken = localStorage.getItem('sb_refresh_token');
        
        if (sbAccessToken && sbRefreshToken) {
            await supabaseClient.auth.setSession({
                access_token: sbAccessToken,
                refresh_token: sbRefreshToken
            });
        }
        
        // Get current user
        const user = currentUser || JSON.parse(localStorage.getItem('onehope_user') || '{}');
        if (!user.id) {
            throw new Error('User ID not found');
        }
        
        // Fetch the note
        const { data, error } = await supabaseClient
            .from('message_notes')
            .select('*')
            .eq('user_id', user.id)
            .eq('message_id', messageId)
            .eq('url_path', urlPath)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Store current note
        currentEditingNote = {
            message_id: messageId,
            url_path: urlPath,
            content: data?.content || '',
            id: data?.id || null,
            message_date: data?.message_date || null // Preserve message_date if it exists
        };
        
        // Extract message title from URL
        const urlParts = urlPath.split('/');
        const slug = urlParts[urlParts.length - 1];
        const messageTitle = slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        // Update header
        const titleElement = document.getElementById('note-edit-title');
        if (titleElement) {
            titleElement.textContent = messageTitle;
        }
        
        // Update meta info
        const metaElement = document.getElementById('note-edit-meta');
        if (metaElement) {
            const updatedDate = data ? new Date(data.updated_at || data.created_at) : new Date();
            const dateString = updatedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timeString = updatedDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            
            metaElement.innerHTML = `
                <div class="note-meta-info">
                    <p><i class="fas fa-calendar"></i> ${dateString} • ${timeString}</p>
                </div>
            `;
        }
        
        // Initialize Quill editor
        if (editorContainer) {
            editorContainer.innerHTML = '<div id="quill-editor"></div>';
            
            // Wait for Quill to be available
            if (typeof Quill === 'undefined') {
                throw new Error('Quill editor not loaded');
            }
            
            // Destroy existing editor if any
            if (noteEditor) {
                noteEditor = null;
            }
            
            // Create new Quill instance
            noteEditor = new Quill('#quill-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                    ]
                },
                placeholder: 'Start editing your notes...'
            });
            
            // Set content
            noteEditor.root.innerHTML = currentEditingNote.content || '';
            
            // Set up auto-save on content change
            noteEditor.on('text-change', function() {
                // Clear existing timeout
                if (noteSaveTimeout) {
                    clearTimeout(noteSaveTimeout);
                }
                
                // Set new timeout for auto-save (2 seconds after typing stops)
                noteSaveTimeout = setTimeout(() => {
                    saveEditedNote(true); // Auto-save (silent)
                }, 2000);
            });
            
            // Update save status
            updateNoteSaveStatus('Ready');
        }
        
    } catch (error) {
        console.error('Error opening note editor:', error);
        showNotification('Unable to load note. Please try again.', 'error');
        showAppScreen('notesScreen');
    }
}

// Save edited note
async function saveEditedNote(isAutoSave = false) {
    if (!noteEditor || !currentEditingNote) {
        return;
    }
    
    try {
        const content = noteEditor.root.innerHTML;
        
        // Don't save empty notes
        const textContent = noteEditor.root.textContent || '';
        if (!textContent.trim()) {
            updateNoteSaveStatus('Note is empty');
            return;
        }
        
        // Update save status
        if (!isAutoSave) {
            updateNoteSaveStatus('Saving...');
        }
        
        // Get Supabase client
        if (!supabaseClient) {
            await initSupabaseClient();
        }
        
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        // Set auth session
        const sbAccessToken = localStorage.getItem('sb_access_token');
        const sbRefreshToken = localStorage.getItem('sb_refresh_token');
        
        if (sbAccessToken && sbRefreshToken) {
            await supabaseClient.auth.setSession({
                access_token: sbAccessToken,
                refresh_token: sbRefreshToken
            });
        }
        
        // Get current user
        const user = currentUser || JSON.parse(localStorage.getItem('onehope_user') || '{}');
        if (!user.id) {
            throw new Error('User ID not found');
        }
        
        // Prepare upsert data
        const upsertData = {
            user_id: user.id,
            message_id: currentEditingNote.message_id,
            url_path: currentEditingNote.url_path,
            content: content,
            updated_at: new Date().toISOString()
        };
        
        // Preserve message_date if it exists (for sorting by message date)
        if (currentEditingNote.message_date) {
            upsertData.message_date = currentEditingNote.message_date;
        }
        
        // Save to Supabase
        const { data, error } = await supabaseClient
            .from('message_notes')
            .upsert(upsertData, {
                onConflict: 'user_id,message_id,url_path'
            })
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Update current note
        currentEditingNote.id = data.id;
        currentEditingNote.content = content;
        
        // Update save status
        const savedDate = new Date(data.updated_at);
        const timeString = savedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        updateNoteSaveStatus(`Saved at ${timeString}`);
        
        if (!isAutoSave) {
            showNotification('Note saved successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Error saving note:', error);
        updateNoteSaveStatus('Error saving');
        showNotification('Unable to save note. Please try again.', 'error');
    }
}

// Update save status display
function updateNoteSaveStatus(status) {
    const statusElement = document.getElementById('note-save-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = 'note-save-status';
        if (status.includes('Error')) {
            statusElement.classList.add('error');
        } else if (status.includes('Saved')) {
            statusElement.classList.add('saved');
        }
    }
}

// Close note editor
async function closeNoteEditor() {
    // Check if there are unsaved changes
    if (noteEditor && currentEditingNote) {
        const currentContent = noteEditor.root.innerHTML;
        const textContent = noteEditor.root.textContent || '';
        
        // Only warn if there's actual content and it's different
        if (textContent.trim() && currentContent !== currentEditingNote.content) {
            if (confirm('You have unsaved changes. Do you want to save before closing?')) {
                // Save before closing
                await saveEditedNote();
            }
        }
    }
    
    // Clear editor
    if (noteEditor) {
        noteEditor = null;
    }
    currentEditingNote = null;
    if (noteSaveTimeout) {
        clearTimeout(noteSaveTimeout);
    }
    
    // Go back to notes screen
    showAppScreen('notesScreen');
    // Refresh notes list
    fetchAllMessageNotes();
}

// Open note in browser from editor
function openNoteInBrowserFromEditor() {
    if (currentEditingNote) {
        openNoteInBrowser(currentEditingNote.url_path);
    }
}

// Open note in browser (opens the onehope-production message page)
function openNoteInBrowser(urlPath) {
    // Determine the production URL based on current environment
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const productionUrl = isLocal 
        ? 'http://localhost:3000' 
        : 'https://onehopechurch.com';
    
    // Open in new tab/window
    window.open(`${productionUrl}${urlPath}`, '_blank');
}

// Add event delegation for event buttons
document.addEventListener('click', function(event) {
    // Handle RSVP button clicks
    if (event.target.closest('.event-rsvp-btn')) {
        const button = event.target.closest('.event-rsvp-btn');
        const eventId = button.getAttribute('data-event-id');
        if (eventId && !button.disabled) {
            rsvpEvent(eventId);
        }
    }
    
    // Handle event details button clicks
    if (event.target.closest('.event-details-btn')) {
        const button = event.target.closest('.event-details-btn');
        const eventId = button.getAttribute('data-event-id');
        if (eventId) {
            viewEventDetails(eventId);
        }
    }
});

async function rsvpEvent(eventId) {
    try {
        console.log(`📝 RSVP for event ${eventId}...`);
        
        // Check if user is authenticated
        const storedToken = localStorage.getItem('onehope_token');
        const userProfile = localStorage.getItem('onehope_user');
        

        
        if (!storedToken && !userProfile) {
            // Show sign-in modal instead of just an error
            showNotification('Please sign in to RSVP for events', 'error');
            
            // Create a simple sign-in prompt
            const signInModal = document.createElement('div');
            signInModal.className = 'modal-overlay';
            signInModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Sign In Required</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <p>You need to sign in to RSVP for events.</p>
                        <p>Would you like to sign in with Planning Center?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="btn-primary" onclick="signInWithPlanningCenter(); this.closest('.modal-overlay').remove()">Sign In</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(signInModal);
            document.body.style.overflow = 'hidden';
            return;
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Authorization header if token exists
        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }
        
        const response = await fetch(`${API_BASE}/api/events/${eventId}/rsvp`, {
            method: 'POST',
            credentials: 'include',
            headers: headers
        });
        


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Check if we need to redirect to registration page
            if (result.redirect && result.url) {
                console.log(`🔗 Redirecting to registration: ${result.url}`);
                showNotification('Opening registration page...', 'info');
                
                // iOS-friendly approach: redirect in current tab
                window.location.href = result.url;
                
                // Note: Button state won't update since we're leaving the page
            } else {
                // No redirect needed, just show success message
                showNotification(result.message || 'RSVP sent successfully!', 'success');
            
            // Update button state
                const button = document.querySelector(`button.event-rsvp-btn[data-event-id="${eventId}"]`);
                if (button) {
            button.innerHTML = '<i class="fas fa-check"></i> RSVP\'d';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            button.disabled = true;
                }
            }
        }
    } catch (error) {
        console.error('❌ Error RSVPing for event:', error);
        showNotification('Unable to RSVP at this time', 'error');
    }
}

function viewEventDetails(eventId) {
    const event = currentEvents.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }

    // Use the details URL for the event details page
    if (event.details_url) {
        console.log(`🔗 Opening event details: ${event.details_url}`);
        showNotification('Opening event details...', 'info');
        window.location.href = event.details_url;
    } else {
        // Fallback to Church Center events page
        const churchCenterUrl = 'https://onehopenola.churchcenter.com/registrations/events';
        console.log(`🔗 Opening Church Center events page: ${churchCenterUrl}`);
        showNotification('Opening Church Center events page...', 'info');
        window.location.href = churchCenterUrl;
    }
}

// Initialize progress UI
updateProgressUI(); 

// Streak tracking functions
async function fetchUserStreak() {
    try {
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/user/streak`, {
            credentials: 'include',
            headers: headers
        });

        if (response.ok) {
            const result = await response.json();
            userStreak = result.data.current_streak || 0;
            totalReadings = result.data.total_readings || 0;
            lastReadingDate = result.data.last_reading_date;
            console.log('✅ User streak loaded:', { userStreak, totalReadings, lastReadingDate });
            updateStreakUI();
        } else {
            console.log('⚠️ No user streak found (new user)');
            userStreak = 0;
            totalReadings = 0;
            lastReadingDate = null;
        }
    } catch (error) {
        console.error('❌ Error fetching user streak:', error);
        userStreak = 0;
        totalReadings = 0;
        lastReadingDate = null;
    }
}

async function fetchUserSteps() {
    try {
        console.log('🎯 Fetching user steps data...');
        
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/user/steps`, {
            credentials: 'include',
            headers: headers
        });

        if (response.ok) {
            const result = await response.json();
            userSteps = result.data || [];
            
            // Update userProgress with completed steps
            userProgress.completedSteps = userSteps
                .filter(step => step.completed)
                .map(step => step.step_id);
            
            console.log('✅ User steps loaded:', userSteps);
            console.log('✅ Completed steps:', userProgress.completedSteps);
            updateStepsCompletedCount();
            
            // Update homepage next step after steps are loaded
            updateHomepageNextStep();
        } else {
            console.log('⚠️ No steps data found, starting fresh');
            userSteps = [];
            userProgress.completedSteps = [];
            updateStepsCompletedCount();
        }
    } catch (error) {
        console.error('❌ Error fetching user steps:', error);
        userSteps = [];
        userProgress.completedSteps = [];
        updateStepsCompletedCount();
    }
}

function needsAssessment() {
    console.log('🔍 needsAssessment() called');
    console.log('📊 userSteps.length:', userSteps.length);
    console.log('📊 userSteps:', userSteps);
    
    // Check if user has taken the assessment by looking for the assessment step
    if (userSteps.length === 0) {
        console.log('✅ No steps found, needs assessment');
        return true; // No steps at all, definitely need assessment
    }
    
    // Check if the assessment step exists and is completed
    const assessmentStep = userSteps.find(step => step.step_id === 'assessment');
    console.log('🔍 Assessment step found:', assessmentStep);
    
    if (!assessmentStep) {
        console.log('✅ Assessment step not found, needs assessment');
        return true; // Assessment step doesn't exist, need to take it
    }
    
    console.log('✅ Assessment step found, completed:', assessmentStep.completed);
    return !assessmentStep.completed;
}

async function completeDailyReading() {
    try {
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/user/streak/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: headers
        });

        if (response.ok) {
            const result = await response.json();
            userStreak = result.data.current_streak || 0;
            totalReadings = result.data.total_readings || 0;
            lastReadingDate = result.data.last_reading_date;
            console.log('✅ Daily reading completed! Streak updated:', { userStreak, totalReadings });
            updateStreakUI();
            showNotification(`🎉 Daily reading completed! Your streak is now ${userStreak} days!`, 'success');
        } else {
            console.error('❌ Failed to complete daily reading');
            showNotification('Failed to save reading completion. Please try again.', 'error');
        }
    } catch (error) {
        console.error('❌ Error completing daily reading:', error);
        showNotification('Failed to save reading completion. Please try again.', 'error');
    }
}

function updateStreakUI() {
    // Update streak display
    const streakElements = document.querySelectorAll('.streak span, .streak-badge span');
    streakElements.forEach(element => {
        element.textContent = `${userStreak} day Bible streak`;
    });

    // Update profile stats
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 2) {
        statNumbers[0].textContent = userStreak;
        statNumbers[1].textContent = totalReadings;
    }

    // Update total readings display
    const totalReadingsElements = document.querySelectorAll('.total-readings span');
    totalReadingsElements.forEach(element => {
        element.textContent = `${totalReadings} total readings`;
    });

    // Show motivational button when streak is 0
    const streakContainer = document.querySelector('.streak');
    if (streakContainer && userStreak === 0) {
        // Hide the fire icon when streak is 0
        const fireIcon = streakContainer.querySelector('i.fas.fa-fire');
        if (fireIcon) {
            fireIcon.style.display = 'none';
        }
        
        // Replace streak text with motivational button
        const streakSpan = streakContainer.querySelector('span');
        if (streakSpan) {
            streakSpan.innerHTML = `
                <button class="btn-primary start-streak-btn" onclick="showAppScreen('bibleScreen')">
                    Click Here to Start Your Streak of Reading The Bible
                </button>
            `;
        }
    } else if (streakContainer && userStreak > 0) {
        // Show the fire icon when streak > 0
        const fireIcon = streakContainer.querySelector('i.fas.fa-fire');
        if (fireIcon) {
            fireIcon.style.display = 'inline';
        }
        
        // Restore normal streak display
        const streakSpan = streakContainer.querySelector('span');
        if (streakSpan) {
            streakSpan.textContent = `${userStreak} day Bible streak`;
        }
    }
}

// Daily reading status functions
async function loadDailyReadingStatus(date) {
    try {
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/bible/status/${date}`, {
            credentials: 'include',
            headers: headers
        });

        if (response.ok) {
            const result = await response.json();
            console.log('🔍 Database response:', result);
            
            if (result.data && result.data.sections_completed) {
                // Check if the loaded data is from today
                const today = getChicagoDate();
                const loadedDate = result.data.reading_date || date;
                
                console.log('🔍 Date comparison:', { today, loadedDate, requestedDate: date });
                console.log('🔍 Sections completed:', result.data.sections_completed);
                
                if (loadedDate === today) {
                    // Don't overwrite local state if we're currently saving
                    if (!isSavingReading) {
                        dailyReadings = { ...dailyReadings, ...result.data.sections_completed };
                        console.log('✅ Daily reading status loaded from database for today:', dailyReadings);
                        updateReadingUI();
                    } else {
                        console.log('⚠️ Skipping database load - save in progress');
                    }
                } else {
                    // Data is from a different day, reset checkmarks for today
                    console.log('🔄 Data from different day detected, resetting checkmarks for today');
                    dailyReadings = {
                        devotional: false,
                        oldTestament: false,
                        newTestament: false,
                        psalms: false,
                        proverbs: false
                    };
                    updateReadingUI();
                }
            } else {
                // No data found, reset checkmarks for today
                console.log('🔄 No reading data found, resetting checkmarks for today');
                dailyReadings = {
                    devotional: false,
                    oldTestament: false,
                    newTestament: false,
                    psalms: false,
                    proverbs: false
                };
                updateReadingUI();
            }
        } else {
            console.log('⚠️ No reading status found for date:', date);
            // Reset checkmarks for today
            dailyReadings = {
                devotional: false,
                oldTestament: false,
                newTestament: false,
                psalms: false,
                proverbs: false
            };
            updateReadingUI();
        }
    } catch (error) {
        console.error('❌ Error loading daily reading status:', error);
        // Reset checkmarks on error
        dailyReadings = {
            devotional: false,
            oldTestament: false,
            newTestament: false,
            psalms: false,
            proverbs: false
        };
        updateReadingUI();
    }
}

async function saveDailyReadingStatus(date) {
    try {
        const storedToken = localStorage.getItem('onehope_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (storedToken) {
            headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch(`${API_BASE}/api/bible/status`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({
                date: date,
                sections_completed: dailyReadings
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Daily reading status saved:', result.data);
            return true; // Return success
        } else {
            console.error('❌ Failed to save daily reading status');
            return false; // Return failure
        }
    } catch (error) {
        console.error('❌ Error saving daily reading status:', error);
        return false; // Return failure
    }
}

function updateReadingUI() {
    // Update the visual state of reading sections based on completion
    const sections = ['devotional', 'old-testament', 'new-testament', 'psalms', 'proverbs'];
    
    sections.forEach(section => {
        // Map section names to match dailyReadings keys
        const sectionMap = {
            'devotional': 'devotional',
            'old-testament': 'oldTestament',
            'new-testament': 'newTestament',
            'psalms': 'psalms',
            'proverbs': 'proverbs'
        };
        
        const mappedSection = sectionMap[section] || section;
        
        // Update status indicators on Bible page
        const statusElement = document.getElementById(`${section}-status`);
        if (statusElement) {
            if (dailyReadings[mappedSection]) {
                statusElement.innerHTML = '<i class="fas fa-check"></i>';
                statusElement.classList.add('completed');
            } else {
                statusElement.innerHTML = '';
                statusElement.classList.remove('completed');
            }
        }
        
        // Update section styling
        const sectionElement = statusElement ? statusElement.closest('.reading-section') : null;
        if (sectionElement) {
            if (dailyReadings[mappedSection]) {
                sectionElement.classList.add('completed');
            } else {
                sectionElement.classList.remove('completed');
            }
        }
    });

    // Update completion count and button state
    updateDailyCompletion();
    
    // Update "Mark All Complete" button text if all sections are completed
    const completedCount = Object.values(dailyReadings).filter(completed => completed).length;
    const totalSections = Object.keys(dailyReadings).length;
    
    if (completedCount === totalSections && totalSections > 0) {
        const markAllBtnHome = document.getElementById('mark-all-btn');
        const markAllBtnBible = document.getElementById('mark-all-btn-bible');
        
        [markAllBtnHome, markAllBtnBible].forEach(btn => {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check-double"></i> All Complete!';
                btn.disabled = true;
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        });
    }
}