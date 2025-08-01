# One Hope Next Step App – MVP Structure

## Overview
A mobile app to help users grow spiritually by tracking Bible reading, completing spiritual steps, and progressing through a gamified journey. MVP excludes church database integrations and focuses on individual growth.

---

## Pages

### 1. SplashScreen
- Displays One Hope logo
- Tagline: "Grow Your Faith, One Step at a Time"
- Auto-navigation after short delay:
  - If user is logged in → navigate to Home
  - If not logged in → navigate to Login

---

### 2. Login
- Email input
- Password input
- Forgot Password link
- “Don’t have an account? Sign up” button
- Success → navigate to Home

---

### 3. SignUp
- Full Name
- Email
- Password
- Optional: Referral Code
- “Create Account” button
- Success → navigate to Home

---

### 4. Home
- Welcome message: “Welcome back, {FirstName}”
- Today’s Bible Reading summary
  - Title + “Mark as Complete” button
- Current Next Step (e.g., “Your next step: Get Baptized”)
  - “Learn More” button
- XP Progress bar
- Bible streak indicator 🔥
- Navigation to Bible, Journey, Profile

---

### 5. Bible
- One Year Bible reading plan
- Daily reading content
- “Mark as Read” button
- Show reading streak
- Simple progress log or tracker

---

### 6. NextSteps
- Visual list of spiritual steps:
  - Faith in Jesus
  - Baptism
  - Join a Group
  - Start Serving
- Each step includes:
  - Title
  - Short description
  - Optional: Video or quote
  - “Mark as Completed” button
- Visually indicate completed steps

---

### 7. Profile
- User name and email
- XP Level
- Badge count (if implemented)
- “Sign Out” button

---

## Navigation (Bottom Tab Bar)
- Home
- Bible
- NextSteps
- Profile

---

## Optional (Not in MVP but easy to add later)
- Badges & XP leveling system
- Friends list and invite feature
- Push notifications for daily reading
- Admin dashboard or onboarding tour

---

## Notes
- All user data stored in Firebase (Auth, Firestore)
- No external integrations required
- Keep UI similar to Duolingo: bright, clean, touch-friendly
