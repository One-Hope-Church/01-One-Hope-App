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
        'nextStepsScreen': 2,
        'eventsScreen': 3,
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
        
        // Show spiritual assessment for new users
        assessmentState.isNewUser = true;
        showScreen('spiritualAssessmentScreen');
        initializeAssessment();
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
    if (markAllBtnBible) markAllBtnBible.disabled = completedCount < totalSections;
    
    // Update steps completed count in profile
    updateStepsCompletedCount();
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
    
    // Update UI
    updateProgressUI();
    
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
}

function updateStepsCompletedCount() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 2) {
        statNumbers[0].textContent = userProgress.streak;
        statNumbers[1].textContent = userProgress.completedSteps.length;
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

// Reading Section Data
const readingSections = {
    'devotional': {
        title: 'Devotional: God\'s Love for Us',
        content: `
            <div class="verse-reference-header">John 3:16</div>
            <h2>God's Love for Us</h2>
            <p>"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." - John 3:16</p>
            <p>Today's devotional focuses on the depth of God's love and how it transforms our lives when we truly understand it. As we read through today's passages, let's reflect on how God's love is demonstrated throughout Scripture and how it calls us to respond in faith and obedience.</p>
            <p>Consider how the Lord's covenant with Abram, Jesus' teachings about tradition, the psalmist's praise of creation, and the wisdom of Proverbs all point to God's loving character and His desire for our spiritual growth.</p>
            <p>Take a moment to reflect on how God's love has been evident in your life today, and how you can share that love with others.</p>
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
function openReadingSection(section) {
    currentReadingSection = section;
    
    // Update detail screen content
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('reading-detail-content');
    
    if (detailTitle && detailContent && readingSections[section]) {
        detailTitle.textContent = readingSections[section].title;
        detailContent.innerHTML = readingSections[section].content;
    }
    
    // Show detail screen
    showAppScreen('readingDetailScreen');
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
            url = 'https://onehopechurch.com/small-groups';
            message = 'Opening Small Groups page...';
            break;
        case 'give':
            url = 'https://onehopechurch.com/give';
            message = 'Opening Give page...';
            break;
        case 'watch-message':
            url = 'https://onehopechurch.com/messages';
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