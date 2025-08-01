// App State Management
let currentUser = null;
let userProgress = {
    level: 3,
    xp: 650,
    streak: 7,
    completedSteps: ['faith'],
    bibleReadings: [],
    currentStep: 'baptism'
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Auto-navigate from splash screen after 3 seconds
    setTimeout(() => {
        if (currentUser) {
            showScreen('mainApp');
        } else {
            showScreen('loginScreen');
        }
    }, 3000);

    // Setup form handlers
    setupFormHandlers();
    
    // Setup navigation
    setupNavigation();
});

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
    
    // Show target app screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Update navigation
    updateNavigation(screenId);
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
        'eventsScreen': 2,
        'nextStepsScreen': 3,
        'profileScreen': 4
    };
    
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[activeScreenId] !== undefined) {
        navItems[navMap[activeScreenId]].classList.add('active');
    }
}

// Form Handlers
function setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Simple validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Simulate login process
    showNotification('Signing in...', 'info');
    
    setTimeout(() => {
        // Mock successful login
        currentUser = {
            name: 'John Doe',
            email: email,
            firstName: 'John'
        };
        
        // Update UI with user info
        updateUserInfo();
        
        showNotification('Welcome back!', 'success');
        showScreen('mainApp');
    }, 1500);
}

function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const referralCode = document.getElementById('referralCode').value;
    
    // Simple validation
    if (!name || !email || !password) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate signup process
    showNotification('Creating your account...', 'info');
    
    setTimeout(() => {
        // Mock successful signup
        currentUser = {
            name: name,
            email: email,
            firstName: name.split(' ')[0]
        };
        
        // Update UI with user info
        updateUserInfo();
        
        showNotification('Account created successfully!', 'success');
        showScreen('mainApp');
    }, 1500);
}

function updateUserInfo() {
    if (!currentUser) return;
    
    // Update welcome message
    const welcomeElement = document.querySelector('#homeScreen .header h1');
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome back, ${currentUser.firstName}`;
    }
    
    // Update profile info
    const profileName = document.querySelector('#profileScreen .profile-card h3');
    const profileEmail = document.querySelector('#profileScreen .profile-card p');
    
    if (profileName) profileName.textContent = currentUser.name;
    if (profileEmail) profileEmail.textContent = currentUser.email;
}

// Bible Reading Functions
let dailyReadings = {
    devotional: false,
    oldTestament: false,
    newTestament: false,
    psalms: false,
    proverbs: false
};

function markReadingComplete(section) {
    if (dailyReadings[section]) {
        showNotification('Already completed!', 'info');
        return;
    }
    
    // Mark section as complete
    dailyReadings[section] = true;
    
    // Update button
    const button = document.getElementById(`${section}-btn`);
    if (button) {
        button.innerHTML = '<i class="fas fa-check"></i> Completed';
        button.classList.add('completed');
        button.disabled = true;
    }
    
    // Update section styling
    const sectionElement = button.closest('.reading-section');
    if (sectionElement) {
        sectionElement.classList.add('completed');
    }
    
    // Update completion progress
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
    
    // Update progress bar
    const progressFill = document.getElementById('daily-completion-fill');
    const completionText = document.getElementById('completion-text');
    const markAllBtn = document.getElementById('mark-all-btn');
    
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (completionText) completionText.textContent = `${completedCount} of ${totalSections} sections completed`;
    
    // Enable mark all button if all sections are complete
    if (markAllBtn) {
        markAllBtn.disabled = completedCount < totalSections;
    }
}

function markAllComplete() {
    const today = new Date().toDateString();
    
    // Check if already completed today
    if (userProgress.bibleReadings.includes(today)) {
        showNotification('Already completed today!', 'info');
        return;
    }
    
    // Add to completed readings
    userProgress.bibleReadings.push(today);
    userProgress.streak += 1;
    userProgress.xp += 100; // More XP for completing all sections
    
    // Update UI
    updateProgressUI();
    
    // Show success message
    showNotification('Excellent! Daily reading complete! +100 XP', 'success');
    
    // Update mark all button
    const markAllBtn = document.getElementById('mark-all-btn');
    if (markAllBtn) {
        markAllBtn.innerHTML = '<i class="fas fa-check-double"></i> All Complete!';
        markAllBtn.disabled = true;
        markAllBtn.classList.remove('btn-primary');
        markAllBtn.classList.add('btn-secondary');
    }
}

// Legacy function for backward compatibility
function markBibleComplete() {
    markAllComplete();
}

function updateProgressUI() {
    // Update XP bar
    const xpFill = document.querySelector('.xp-fill');
    const xpText = document.querySelector('.xp-bar span');
    
    if (xpFill && xpText) {
        const percentage = (userProgress.xp % 1000) / 10;
        xpFill.style.width = `${percentage}%`;
        xpText.textContent = `Level ${userProgress.level} - ${userProgress.xp} XP`;
    }
    
    // Update streak
    const streakElements = document.querySelectorAll('.streak span, .streak-badge span');
    streakElements.forEach(element => {
        element.textContent = `${userProgress.streak} day Bible streak`;
    });
    
    // Update profile stats
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = userProgress.level;
        statNumbers[1].textContent = userProgress.xp;
        statNumbers[2].textContent = userProgress.streak;
        statNumbers[3].textContent = userProgress.completedSteps.length;
    }
}

// Next Steps Functions
function completeStep(stepId) {
    if (userProgress.completedSteps.includes(stepId)) {
        showNotification('Step already completed!', 'info');
        return;
    }
    
    // Add to completed steps
    userProgress.completedSteps.push(stepId);
    userProgress.xp += 100;
    
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
    
    showNotification('Step completed! +100 XP', 'success');
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
    if (confirm('Are you sure you want to sign out?')) {
        currentUser = null;
        userProgress = {
            level: 3,
            xp: 650,
            streak: 7,
            completedSteps: ['faith'],
            bibleReadings: [],
            currentStep: 'baptism'
        };
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();
        
        showNotification('Signed out successfully', 'info');
        showScreen('loginScreen');
    }
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
    
    const screens = ['homeScreen', 'bibleScreen', 'eventsScreen', 'nextStepsScreen', 'profileScreen'];
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

// Events Functions
function filterEvents(filter) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // In a real app, this would filter the events
    // For now, just show a notification
    showNotification(`Showing ${filter} events`, 'info');
}

function rsvpEvent(eventId) {
    // In a real app, this would send RSVP to server
    showNotification('RSVP sent successfully!', 'success');
    
    // Update button state
    const button = event.target;
    button.innerHTML = '<i class="fas fa-check"></i> RSVP\'d';
    button.classList.remove('btn-primary');
    button.classList.add('btn-secondary');
    button.disabled = true;
}

function addToCalendar(eventId) {
    // In a real app, this would add to device calendar
    showNotification('Added to calendar!', 'success');
}

// Initialize progress UI
updateProgressUI(); 