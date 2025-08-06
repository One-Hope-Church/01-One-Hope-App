// App State Management
let currentUser = null;
let userProgress = {
    streak: 7,
    completedSteps: ['faith'],
    bibleReadings: [],
    currentStep: 'baptism'
};

// Assessment State
let assessmentState = {
    currentQuestion: 0,
    answers: {},
    totalQuestions: 11, // Fixed: should be 11 questions total
    isNewUser: false
};

// API Configuration
const API_BASE = window.location.origin;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting app initialization');
    
    // Check for auth parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const auth = urlParams.get('auth');
    const error = urlParams.get('error');
    
    console.log('URL params:', { code, auth, error, currentUser });
    
    // Check for auth success/error
    if (auth === 'success') {
        console.log('Auth successful, checking user session');
        // Add a small delay to ensure session is saved
        setTimeout(() => {
            checkUserSession();
        }, 1000);
    } else if (error) {
        console.log('Auth error:', error);
        showNotification('Authentication failed. Please try again.', 'error');
        setTimeout(() => showScreen('loginScreen'), 3000);
    } else if (code) {
        console.log('Found OAuth code, handling callback');
        // Handle Planning Center OAuth callback
        handlePlanningCenterCallback(code);
    } else {
        console.log('No auth parameters, setting up normal flow');
        // Auto-navigate from splash screen after 3 seconds
        setTimeout(() => {
            console.log('Timeout reached, navigating to:', currentUser ? 'mainApp' : 'loginScreen');
            if (currentUser) {
                showScreen('mainApp');
            } else {
                showScreen('loginScreen');
            }
        }, 3000);
    }

    // Setup form handlers
    console.log('Setting up form handlers');
    setupFormHandlers();
    
    // Setup navigation
    console.log('Setting up navigation');
    setupNavigation();
    
    // Initialize homepage next step
    console.log('Initializing homepage next step');
    updateHomepageNextStep();
    
    // Initialize bible data
    console.log('Initializing bible data');
    initializeBibleData();
    
    // Update dates
    console.log('Updating dates');
    updateDates();
    
    console.log('App initialization complete');
});

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
            signInUser(data.user);
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

function showAppScreen(screenId) {
    // Hide all app screens
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update navigation
    updateNavigation(screenId);
    
    // Load data for specific screens
    if (screenId === 'eventsScreen') {
        fetchEvents();
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
        'eventsScreen': 3,
        'profileScreen': 4
    };
    
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[activeScreenId] !== undefined) {
        navItems[navMap[activeScreenId]].classList.add('active');
    }
}

// Planning Center Authentication Functions
function signInWithPlanningCenter() {
    showNotification('Redirecting to Planning Center...', 'info');
            window.location.href = `${API_BASE}/auth/planningcenter`;
}

function createPlanningCenterAccount() {
    showScreen('planningCenterSignupScreen');
}

function redirectToPlanningCenterSignup() {
    // Redirect to Planning Center account creation
    const signupUrl = 'https://onehopenola.churchcenter.com/people/sign_up';
    showNotification('Opening Planning Center signup...', 'info');
    window.open(signupUrl, '_blank');
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
            signInUser(userProfile);
            
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
    const existingUser = localStorage.getItem('planningCenterUser');
    
    if (existingUser) {
        // Update existing user
        const user = JSON.parse(existingUser);
        Object.assign(user, profile);
        localStorage.setItem('planningCenterUser', JSON.stringify(user));
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
        localStorage.setItem('planningCenterUser', JSON.stringify(newUser));
        return newUser;
    }
}

function signInUser(userProfile) {
    // Set current user and navigate to main app
    currentUser = userProfile;
    localStorage.setItem('currentUser', JSON.stringify(userProfile));
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Update UI with user info
    updateUserInfo();
    
    // Navigate to main app
    showScreen('mainApp');
    showAppScreen('homeScreen');
    
    console.log('✅ User signed in successfully:', userProfile);
}

// Form Handlers
function setupFormHandlers() {
    // Remove old form handlers since we're using Planning Center only
    // The old login/signup forms have been replaced with Planning Center buttons
    
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
    
    console.log('🔍 Profile elements found:', { profileName: !!profileName, profileEmail: !!profileEmail });
    console.log('📧 Email value:', currentUser.email);
    
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
    
    // Update date
    const dateElement = document.querySelector('.reading-date span');
    if (dateElement && currentBibleData.Date && currentBibleData.Date[0]) {
        // Handle date format from API (YYYY-MM-DD)
        let date;
        if (currentBibleData.Date[0].includes('-')) {
            // API date format: YYYY-MM-DD
            date = new Date(currentBibleData.Date[0]);
        } else {
            // Fallback to current date
            date = new Date();
        }
        
        dateElement.textContent = date.toLocaleDateString('en-US', { 
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
function initializeBibleData() {
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
        fetchDailyBibleReading();
    } else {
        console.log('📖 Bible data already loaded:', currentBibleData);
    }
    
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

function markReadingComplete(section) {
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
    
    // Mark section as complete
    dailyReadings[mappedSection] = true;
    
    // Update buttons on home page
    const homeButton = document.getElementById(`${section}-btn`);
    if (homeButton) {
        homeButton.innerHTML = '<i class="fas fa-check"></i> Completed';
        homeButton.classList.add('completed');
        homeButton.disabled = true;
    }
    
    // Update status indicators on Bible page
    const statusElement = document.getElementById(`${section}-status`);
    if (statusElement) {
        statusElement.innerHTML = '<i class="fas fa-check"></i>';
        statusElement.classList.add('completed');
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
    if (markAllBtnHome) markAllBtnHome.disabled = completedCount < totalSections;
    
    // Update Bible page
    if (progressFillBible) progressFillBible.style.width = `${percentage}%`;
    if (completionTextBible) completionTextBible.textContent = `${completedCount} of ${totalSections} sections completed`;
    if (markAllBtnBible) {
        markAllBtnBible.disabled = completedCount < totalSections;
        console.log(`Mark All Button - Completed: ${completedCount}, Total: ${totalSections}, Disabled: ${completedCount < totalSections}`);
    }
    
    // Update steps completed count in profile
    updateStepsCompletedCount();
}

function markAllComplete() {
    console.log('markAllComplete function called');
    const today = new Date().toDateString();
    
    // Check if already completed today
    if (userProgress.bibleReadings.includes(today)) {
        showNotification('Already completed today!', 'info');
        return;
    }
    
    // Mark all daily readings as complete
    Object.keys(dailyReadings).forEach(section => {
        dailyReadings[section] = true;
    });
    
    // Add to completed readings
    userProgress.bibleReadings.push(today);
    userProgress.streak += 1;
    
    // Update UI
    updateProgressUI();
    updateDailyCompletion();
    
    // Show success message
    showNotification('Excellent! Daily reading complete!', 'success');
    
    // Update mark all buttons on both pages
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
    
    // Update all individual section status indicators
    const sections = ['devotional', 'old-testament', 'new-testament', 'psalms', 'proverbs'];
    sections.forEach(section => {
        // Update status indicators on Bible page
        const statusElement = document.getElementById(`${section}-status`);
        if (statusElement) {
            statusElement.innerHTML = '<i class="fas fa-check"></i>';
            statusElement.classList.add('completed');
        }
        
        // Update section styling
        const sectionElement = statusElement ? statusElement.closest('.reading-section') : null;
        if (sectionElement) {
            sectionElement.classList.add('completed');
        }
    });
}

// Legacy function for backward compatibility
function markBibleComplete() {
    markAllComplete();
}

function updateProgressUI() {
    // Update streak
    const streakElements = document.querySelectorAll('.streak span, .streak-badge span');
    streakElements.forEach(element => {
        element.textContent = `${userProgress.streak} day Bible streak`;
    });
    
    // Update profile stats
    updateStepsCompletedCount();
    
    // Update homepage next step
    updateHomepageNextStep();
}

function updateStepsCompletedCount() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 2) {
        statNumbers[0].textContent = userProgress.streak;
        statNumbers[1].textContent = userProgress.completedSteps.length;
    }
}

function updateHomepageNextStep() {
    const nextStepContainer = document.getElementById('homepage-next-step');
    if (!nextStepContainer) return;
    
    // Define the step progression
    const stepProgression = [
        { id: 'faith', title: 'Make Jesus Lord', description: 'Start your relationship with Jesus', icon: 'fas fa-cross', link: 'https://onehopechurch.com/about' },
        { id: 'baptism', title: 'Get Baptized', description: 'Take the next step in your faith journey', icon: 'fas fa-water', link: 'https://onehopechurch.com/connect/baptism' },
        { id: 'attendance', title: 'Attend Regularly', description: 'Make Sunday church a weekly rhythm', icon: 'fas fa-church', link: 'https://onehopechurch.com/visit' },
        { id: 'bible-prayer', title: 'Daily Bible & Prayer', description: 'Build a habit of Bible reading and prayer', icon: 'fas fa-book-open', link: 'https://onehopechurch.com/prayer' },
        { id: 'giving', title: 'Give Consistently', description: 'Learn to give generously and consistently', icon: 'fas fa-heart', link: 'https://onehopechurch.com/giving' },
        { id: 'small-group', title: 'Join a Small Group', description: 'Find people to grow with', icon: 'fas fa-users', link: 'https://onehopechurch.com/connect' },
        { id: 'serve-team', title: 'Serve on Team', description: 'Make a difference and meet new friends', icon: 'fas fa-hands-helping', link: 'https://onehopechurch.com/connect' },
        { id: 'invite-pray', title: 'Invite & Pray', description: 'Pray for and invite people far from God', icon: 'fas fa-pray', link: 'https://onehopechurch.com/visit' },
        { id: 'share-story', title: 'Share Your Story', description: 'Share your faith story with others', icon: 'fas fa-comment', link: 'https://onehopechurch.com/connect' },
        { id: 'leadership', title: 'Lead Others', description: 'Lead a group or serve team area', icon: 'fas fa-crown', link: 'https://onehopechurch.com/connect' },
        { id: 'mission-living', title: 'Live on Mission', description: 'Look for ways to live on mission daily', icon: 'fas fa-compass', link: 'https://onehopechurch.com/connect' }
    ];
    
    // Find the next incomplete step
    let nextStep = null;
    for (const step of stepProgression) {
        if (!userProgress.completedSteps.includes(step.id)) {
            nextStep = step;
            break;
        }
    }
    
    // If all steps are completed, show a completion message
    if (!nextStep) {
        nextStep = {
            title: 'All Steps Complete!',
            description: 'You\'ve completed all the spiritual growth steps',
            icon: 'fas fa-trophy'
        };
    }
    
    // Update the homepage next step display
    const stepIcon = nextStepContainer.querySelector('.step-icon i');
    const stepTitle = nextStepContainer.querySelector('.step-content h4');
    const stepDescription = nextStepContainer.querySelector('.step-content p');
    
    if (stepIcon) stepIcon.className = nextStep.icon;
    if (stepTitle) stepTitle.textContent = nextStep.title;
    if (stepDescription) stepDescription.textContent = nextStep.description;
    
    // Store the current step's link for the button
    nextStepContainer.dataset.currentStepLink = nextStep.link || '#';
}

// Next Steps Functions
function completeStep(stepId) {
    if (userProgress.completedSteps.includes(stepId)) {
        showNotification('Step already completed!', 'info');
        return;
    }
    
    // Add to completed steps
    userProgress.completedSteps.push(stepId);
    
    // Update UI
    updateProgressUI();
    
    // Update step item
    const stepItem = document.querySelector(`[onclick="completeStep('${stepId}')"]`).closest('.step-item');
    if (stepItem) {
        stepItem.classList.remove('active');
        stepItem.classList.add('completed');
        
        const button = stepItem.querySelector('button');
        button.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
        button.disabled = true;
        
        // Add status indicator
        const stepContent = stepItem.querySelector('.step-content');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'step-status';
        statusDiv.innerHTML = '<i class="fas fa-check-circle"></i><span>Completed</span>';
        stepContent.appendChild(statusDiv);
    }
    
    // Update steps completed count
    updateStepsCompletedCount();
    
    showNotification('Step completed!', 'success');
}

// Open the current step's link
function openCurrentStepLink() {
    const nextStepContainer = document.getElementById('homepage-next-step');
    if (nextStepContainer && nextStepContainer.dataset.currentStepLink) {
        const link = nextStepContainer.dataset.currentStepLink;
        if (link && link !== '#') {
            window.open(link, '_blank');
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
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userProgress');
        localStorage.removeItem('bibleCache');
        localStorage.removeItem('dailyReadings');
        
        // Reset app state
        currentUser = null;
        userProgress = {};
        currentBibleData = null;
        dailyReadings = null;
        
        // Show login screen
        showScreen('loginScreen');
        
        // Show notification
        showNotification('Signed out successfully', 'success');
    })
    .catch(error => {
        console.error('❌ Error signing out:', error);
        
        // Even if API call fails, clear local data and show login
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userProgress');
        localStorage.removeItem('bibleCache');
        localStorage.removeItem('dailyReadings');
        
        currentUser = null;
        userProgress = {};
        currentBibleData = null;
        dailyReadings = null;
        
        showScreen('loginScreen');
        showNotification('Signed out successfully', 'success');
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
    
    const screens = ['homeScreen', 'bibleScreen', 'nextStepsScreen', 'eventsScreen', 'profileScreen'];
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

// Assessment Functions
function initializeAssessment() {
    assessmentState.currentQuestion = 0;
    assessmentState.answers = {};
    showAssessmentQuestion(0);
    updateAssessmentProgress();
}

function showAssessmentQuestion(questionIndex) {
    // Hide all questions
    document.querySelectorAll('.assessment-question').forEach(q => {
        q.style.display = 'none';
    });
    
    // Get the main question to show
    const questionId = getQuestionId(questionIndex);
    
    // Debug logging
    console.log('Showing question:', questionIndex, 'with ID:', questionId);
    
    // Show current question
    const currentQuestion = document.getElementById(`question-${questionId}`);
    if (currentQuestion) {
        currentQuestion.style.display = 'block';
        console.log('Question found and displayed');
    } else {
        console.log('Question not found:', `question-${questionId}`);
    }
    

    
    // Reset radio button selections for current question only
    if (currentQuestion) {
        currentQuestion.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });
    }
    
    // Disable next button
    const nextBtn = document.getElementById('next-assessment-btn');
    if (nextBtn) {
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
    assessmentState.answers[questionName] = value;
    
    // Handle conditional logic for salvation date
    if (questionName === 'salvation_status') {
        if (value === 'yes') {
            // Show salvation date question as separate screen
            showConditionalQuestion('salvation-date');
            return; // Don't enable next button yet
        } else {
            // Clear salvation date value
            assessmentState.answers['salvation_date'] = '';
            const dateInput = document.getElementById('salvation_date');
            if (dateInput) {
                dateInput.value = '';
            }
        }
    }
    
    // Handle conditional logic for leadership ready question
    if (questionName === 'leadership') {
        if (value === 'no') {
            // Show leadership ready question as separate screen
            showConditionalQuestion('leadership-ready');
            return; // Don't enable next button yet
        } else {
            // Clear leadership ready value
            assessmentState.answers['leadership_ready'] = '';
        }
    }
    
    // Enable next button for regular questions
    const nextBtn = document.getElementById('next-assessment-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
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

function completeAssessment() {
    // Store assessment results
    currentUser.assessmentResults = assessmentState.answers;
    
    // Mark assessment as completed
    assessmentState.isNewUser = false;
    
    // Show results splash page
    showAssessmentResults();
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
    showAppScreen('homeScreen');
    showNotification('Welcome to One Hope Next Step!', 'success');
}

function skipAssessment() {
    assessmentState.isNewUser = false;
    showScreen('mainApp');
    showAppScreen('homeScreen');
    showNotification('Welcome to One Hope Next Step!', 'success');
}

// External Link Functions
function openExternalLink(type) {
    let url = '';
    let message = '';
    
    switch(type) {
        case 'small-group':
            url = 'https://onehopenola.churchcenter.com/groups';
            message = 'Opening Small Groups page...';
            break;
        case 'give':
            url = 'https://donate.overflow.co/onehopechurch';
            message = 'Opening Give page...';
            break;
        case 'watch-message':
            url = 'https://onehopechurch.com/media';
            message = 'Opening Messages page...';
            break;
        case 'next-step':
            url = 'https://onehopechurch.com/next-steps';
            message = 'Opening Next Steps page...';
            break;
        case 'connect':
            url = 'https://onehopechurch.com/connect';
            message = 'Opening Connect page...';
            break;
        case 'give-go':
            url = 'https://onehopechurch.com/give-go';
            message = 'Opening Give & Go resources...';
            break;
        case 'lead':
            url = 'https://onehopechurch.com/lead';
            message = 'Opening Leadership opportunities...';
            break;
        default:
            url = 'https://onehopechurch.com';
            message = 'Opening One Hope Church website...';
    }
    
    showNotification(message, 'info');
    setTimeout(() => {
        window.open(url, '_blank');
    }, 1000);
}

// Events Functions
let currentEvents = [];

async function fetchEvents() {
    try {
        console.log('📅 Fetching events from Planning Center...');
        
        // First check session
        console.log('🔍 Checking session...');
        const sessionResponse = await fetch(`${API_BASE}/api/session-check`);
        const sessionData = await sessionResponse.json();
        console.log('🔍 Session data:', sessionData);
        
        console.log('🔗 API URL:', `${API_BASE}/api/events`);
        const response = await fetch(`${API_BASE}/api/events`);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentEvents = data.events || [];
        console.log('✅ Events loaded:', currentEvents.length);
        
        displayEvents(currentEvents);
    } catch (error) {
        console.error('❌ Error fetching events:', error);
        showNotification('Unable to load events at this time', 'error');
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
                        <button class="${rsvpButtonClass}" onclick="rsvpEvent('${event.id}')" ${rsvpButtonDisabled}>
                            <i class="fas fa-calendar-plus"></i> ${rsvpButtonText}
                        </button>
                        <button class="btn-secondary" onclick="viewEventDetails('${event.id}')">
                            <i class="fas fa-info-circle"></i> More Info
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}



async function rsvpEvent(eventId) {
    try {
        console.log(`📝 RSVP for event ${eventId}...`);
        
        const response = await fetch(`${API_BASE}/api/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
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
                
                // Open registration page in new tab
                window.open(result.url, '_blank');
                
                // Update button state to show RSVP'd
                const button = document.querySelector(`button[onclick="rsvpEvent('${eventId}')"]`);
                if (button) {
                    button.innerHTML = '<i class="fas fa-check"></i> RSVP\'d';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-secondary');
                    button.disabled = true;
                }
            } else {
                // No redirect needed, just show success message
                showNotification(result.message || 'RSVP sent successfully!', 'success');
                
                // Update button state
                const button = document.querySelector(`button[onclick="rsvpEvent('${eventId}')"]`);
                if (button) {
                    button.innerHTML = '<i class="fas fa-check"></i> RSVP\'d';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-secondary');
                    button.disabled = true;
                }
            }
            
            // Refresh events to update counts
            await fetchEvents();
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
        window.open(event.details_url, '_blank');
    } else {
        // Fallback to Church Center events page
        const churchCenterUrl = 'https://onehopenola.churchcenter.com/registrations/events';
        console.log(`🔗 Opening Church Center events page: ${churchCenterUrl}`);
        showNotification('Opening Church Center events page...', 'info');
        window.open(churchCenterUrl, '_blank');
    }
}

// Initialize progress UI
updateProgressUI(); 