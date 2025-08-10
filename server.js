const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
// Force-load .env from project root and override any stale shell exports in dev
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

// Import Supabase database operations
const { db } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'onehope.sid'
}));

// Planning Center Personal Access Token configuration (no OAuth)
const PLANNING_CENTER_API_TOKEN = process.env.PLANNING_CENTER_API_TOKEN;
const PLANNING_CENTER_APP_SECRET = process.env.PLANNING_CENTER_APP_SECRET;
const PLANNING_CENTER_BASE_URL = 'https://api.planningcenteronline.com';

// Debug token values (first few characters only)
console.log('🔧 Token Debug (first 10 chars):');
console.log('🔧 App ID (PAT):', PLANNING_CENTER_API_TOKEN ? PLANNING_CENTER_API_TOKEN.substring(0, 10) + '...' : 'Missing');
console.log('🔧 Secret (PAT):', PLANNING_CENTER_APP_SECRET ? PLANNING_CENTER_APP_SECRET.substring(0, 10) + '...' : 'Missing');

// Build auth header options for Planning Center API calls
function buildPlanningCenterAuthHeaderOptions() {
    const options = [];

    // Primary: Personal Token via HTTP Basic Auth (app_id:secret)
    if (PLANNING_CENTER_API_TOKEN && PLANNING_CENTER_APP_SECRET) {
        const auth = Buffer.from(`${PLANNING_CENTER_API_TOKEN}:${PLANNING_CENTER_APP_SECRET}`).toString('base64');
        const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };
        console.log('🔧 Generated Primary PAT headers (Basic Auth):', { Authorization: `Basic ${auth.substring(0, 10)}...`, Accept: 'application/json' });
        options.push(headers);
    }

    // Always include an Accept header if somehow no auth is configured (will likely fail fast)
    if (options.length === 0) {
        console.log('⚠️ No auth headers generated!');
        options.push({ Accept: 'application/json' });
    }

    console.log(`🔧 Total auth options generated: ${options.length}`);
    console.log('🔧 Final auth options:', JSON.stringify(options, null, 2));
    return options;
}

// Debug Planning Center configuration (Personal Access Token only)
console.log('🔧 Planning Center Configuration Debug:');
console.log('🔧 App ID (PAT):', process.env.PLANNING_CENTER_API_TOKEN ? 'Present' : 'Missing');
console.log('🔧 Secret (PAT):', process.env.PLANNING_CENTER_APP_SECRET ? 'Present' : 'Missing');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🔧 Vercel URL:', process.env.VERCEL_URL);

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve dedicated login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Debug route for CSS
app.get('/styles.css', (req, res) => {
    console.log('🎨 CSS file requested!');
    res.sendFile(__dirname + '/public/styles.css');
});

// Debug route for JS
app.get('/script.js', (req, res) => {
    console.log('📜 JS file requested!');
    res.sendFile(__dirname + '/public/script.js');
});

// Debug route for images
app.get('/images/:filename', (req, res) => {
    console.log('🖼️ Image requested:', req.params.filename);
    res.sendFile(__dirname + '/public/images/' + req.params.filename);
});

// Debug route for session check
app.get('/api/session-check', (req, res) => {
    
    // Check if user exists in session
    if (req.session.user) {
        res.json({
            sessionId: req.sessionID,
            hasUser: true,
            user: {
                id: req.session.user.id,
                name: req.session.user.name,
                email: req.session.user.email
            }
        });
        return;
    }
    
    // Check if user exists in app.locals backup
    const userSessions = req.app.locals.userSessions || {};
    const backupUser = userSessions[req.sessionID];
    
    if (backupUser) {
        res.json({
            sessionId: req.sessionID,
            hasUser: true,
            user: {
                id: backupUser.id,
                name: backupUser.name,
                email: backupUser.email
            }
        });
        return;
    }
    res.json({
        sessionId: req.sessionID,
        hasUser: false,
        user: null
    });
});

// API routes
app.get('/api/user', (req, res) => {
    console.log('🔍 /api/user called');
    console.log('🔍 Session ID:', req.sessionID);
    console.log('🔍 Session user:', req.session.user ? 'Present' : 'Missing');
    console.log('🔍 Full session:', req.session);
    if (req.session.user) {
        console.log('🔍 User avatar_url:', req.session.user.avatar_url);
    }
    
    // Check if user exists in session
    if (req.session.user) {
        console.log('✅ User found in session, returning user data');
        res.json({ user: req.session.user });
        return;
    }
    
    // Check if user exists in app.locals backup
    const userSessions = req.app.locals.userSessions || {};
    const backupUser = userSessions[req.sessionID];
    
    if (backupUser) {
        console.log('✅ User found in app.locals backup, returning user data');
        // Restore session from backup
        req.session.user = backupUser;
        res.json({ user: backupUser });
        return;
    }
    
    console.log('❌ No user found in session or backup, returning 401');
    res.status(401).json({ error: 'Not authenticated' });
});

app.get('/api/signout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error destroying session:', err);
            res.status(500).json({ error: 'Failed to sign out' });
        } else {
            res.json({ success: true, message: 'Signed out successfully' });
        }
    });
});

// Return current user's profile (from Supabase) based on session or bearer token
app.get('/api/user/profile', async (req, res) => {
    try {
        // Get user from session or token
        let appUser = req.session.user;
        if (!appUser) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    appUser = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        // Resolve Supabase user row (planning_center_id first, then Supabase ID)
        let supabaseUser = null;
        try {
            if (appUser.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(appUser.planning_center_id);
            }
            if (!supabaseUser && (appUser.supabase_id || appUser.id)) {
                supabaseUser = await db.getUserById(appUser.supabase_id || appUser.id);
            }
        } catch {}

        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If name/avatar missing but we have Planning Center ID, enrich from Planning Center API
        try {
            if ((!supabaseUser.name || !supabaseUser.avatar_url) && supabaseUser.planning_center_id) {
                const authHeaderOptions = buildPlanningCenterAuthHeaderOptions();
                for (const headers of authHeaderOptions) {
                    try {
                        const pcResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/people/v2/people/${supabaseUser.planning_center_id}`, { headers });
                        const person = pcResp.data?.data;
                        if (person) {
                            const updated = await db.upsertUserWithAuthId(supabaseUser.id, {
                                id: supabaseUser.planning_center_id,
                                email: person.attributes?.email || person.attributes?.login_identifier || supabaseUser.planning_center_email,
                                name: person.attributes?.name || supabaseUser.name,
                                phone: person.attributes?.phone_number || null,
                                avatar_url: person.attributes?.demographic_avatar_url || supabaseUser.avatar_url
                            });
                            supabaseUser = updated || supabaseUser;
                        }
                        break;
                    } catch { continue; }
                }
            }
        } catch {}

        res.json({
            success: true,
            data: {
                id: supabaseUser.id,
                planning_center_id: supabaseUser.planning_center_id || null,
                name: supabaseUser.name || null,
                email: supabaseUser.planning_center_email || null,
                avatar_url: supabaseUser.avatar_url || null
            }
        });
    } catch (error) {
        console.error('❌ /api/user/profile error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Public config endpoint for frontend to initialize Supabase client
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
    });
});

// Dev-only: environment presence check (no secrets). Disabled in production
app.get('/api/debug/env', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).end();
    }
    const mask = (v) => (v ? `${String(v).length} chars` : null);
    res.json({
        NODE_ENV: process.env.NODE_ENV || null,
        SUPABASE_URL_present: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_ROLE_KEY_length: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
        SUPABASE_ANON_KEY_present: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_ANON_KEY_length: mask(process.env.SUPABASE_ANON_KEY)
    });
});

app.get('/api/events', async (req, res) => {
    try {
        const authHeaderOptions = buildPlanningCenterAuthHeaderOptions();
        if (!authHeaderOptions || authHeaderOptions.length === 0) {
            console.error('❌ No Planning Center authentication configured');
            return res.status(500).json({ error: 'Planning Center authentication not configured on server' });
        }
        
        // Try different possible Planning Center endpoints
        const possibleEndpoints = [
            '/registrations/v2/signups?include=next_signup_time,categories&filter=unarchived&per_page=25',
            '/registrations/v2/signups?include=next_signup_time,campuses,categories&filter=unarchived&per_page=25',
            '/registrations/v2/signups?include=next_signup_time,signup_location&filter=unarchived&per_page=25',
            '/registrations/v2/signups?include=next_signup_time&filter=unarchived&per_page=25',
            '/registrations/v2/signups?include=next_signup_time&filter=unarchived',
            '/registrations/v2/signups?include=next_signup_time',
            '/registrations/v2/signups?filter=unarchived',
            '/registrations/v2/signups',
            '/registrations/v2/events',
            '/registrations/v2/event_times',
            '/registrations/v2/event_times?include=event',
            '/people/v2/events',
            '/people/v2/event_times'
        ];

        let events = [];
        let endpointFound = false;

        for (const endpoint of possibleEndpoints) {
            let lastError = null;
            for (const headers of authHeaderOptions) {
                try {
                    console.log(`🔍 Trying endpoint: ${endpoint}`);
                    console.log(`🔍 Full headers being sent:`, JSON.stringify(headers, null, 2));
                    const response = await axios.get(`${PLANNING_CENTER_BASE_URL}${endpoint}`, { headers });

                    console.log(`✅ Endpoint ${endpoint} worked! Status:`, response.status);
                    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
                    
                    // Parse the response based on the endpoint structure
                    if (response.data.data && response.data.data.length > 0) {
                        console.log('📄 Raw response structure:', JSON.stringify(response.data, null, 2));
                        console.log('🔍 Available fields for first event:', JSON.stringify(response.data.data[0]?.attributes, null, 2));
                        
                        if (endpoint.includes('/signups')) {
                            // Handle signups endpoint
                            events = response.data.data
                                .filter(signup => {
                                    // Filter for events that are visible on Church Center
                                    const now = new Date();
                                    const closeAt = signup.attributes?.close_at ? new Date(signup.attributes.close_at) : null;
                                    const hasChurchCenterUrl = signup.attributes?.new_registration_url?.includes('churchcenter.com');
                                    
                                    // Check if event has "public" category (ID: 98823)
                                    const hasPublicCategory = signup.relationships?.categories?.data?.some(cat => cat.id === '98823');
                                    
                                    // Event should be visible, open, and public
                                    const isVisible = hasPublicCategory && (!closeAt || closeAt > now) && hasChurchCenterUrl;
                                    
                                    console.log(`📅 Event "${signup.attributes?.name}": archived=${signup.attributes?.archived}, hasPublicCategory=${hasPublicCategory}, hasChurchCenterUrl=${hasChurchCenterUrl}, closeAt=${closeAt}, isVisible=${isVisible}`);
                                    
                                    return isVisible;
                                })
                                .map(signup => {
                                    const nextSignupTime = signup.relationships?.next_signup_time?.data;
                                    const included = response.data.included || [];
                                    const signupTime = included.find(item => 
                                        item.type === 'SignupTime' && item.id === nextSignupTime?.id
                                    );
                                    
                                    // Clean up HTML from description
                                    const cleanDescription = signup.attributes?.description 
                                        ? signup.attributes.description.replace(/<[^>]*>/g, '').trim()
                                        : '';
                                    
                                    // Create details URL by appending event ID to base URL
                                    const registrationUrl = signup.attributes?.new_registration_url || null;
                                    const detailsUrl = `https://onehopenola.churchcenter.com/registrations/events/${signup.id}`;
                                    
                                    return {
                                        id: signup.id,
                                        title: signup.attributes?.name || 'Event',
                                        description: cleanDescription,
                                        starts_at: signupTime?.attributes?.starts_at || signup.attributes?.starts_at,
                                        ends_at: signupTime?.attributes?.ends_at || signup.attributes?.ends_at,
                                        location: signupTime?.attributes?.location || signup.attributes?.location || '',
                                        featured: signup.attributes?.featured || false,
                                        registration_url: registrationUrl,
                                        details_url: detailsUrl,
                                        capacity: signupTime?.attributes?.capacity || signup.attributes?.capacity,
                                        registered_count: signupTime?.attributes?.registered_count || signup.attributes?.registered_count || 0
                                    };
                                });
                        } else {
                            // Handle events endpoint (fallback)
                            events = response.data.data.map(event => {
                                const registrationUrl = event.attributes?.registration_url || null;
                                const detailsUrl = `https://onehopenola.churchcenter.com/registrations/events/${event.id}`;
                                
                                return {
                                    id: event.id,
                                    title: event.attributes?.name || event.attributes?.title || 'Event',
                                    description: event.attributes?.description || '',
                                    starts_at: event.attributes?.starts_at || event.attributes?.start_time,
                                    ends_at: event.attributes?.ends_at || event.attributes?.end_time,
                                    location: event.attributes?.location || '',
                                    featured: event.attributes?.featured || false,
                                    registration_url: registrationUrl,
                                    details_url: detailsUrl,
                                    capacity: event.attributes?.capacity,
                                    registered_count: event.attributes?.registered_count || 0
                                };
                            });
                        }
                        
                        endpointFound = true;
                        break;
                    }
                } catch (endpointError) {
                    lastError = endpointError;
                    console.log(`❌ Endpoint ${endpoint} failed with ${headers.Authorization ? headers.Authorization.split(' ')[0] : 'no-auth'}:`, endpointError.response?.status || endpointError.message);
                    continue;
                }
            }
            if (endpointFound) break;
            if (lastError) {
                console.log(`❌ All auth strategies failed for endpoint ${endpoint}`);
            }
        }

        if (!endpointFound) {
            console.log('🔄 No working endpoints found');
            events = [];
        }

        // Store events in app.locals for RSVP endpoint to access
        req.app.locals.currentEvents = events;

        res.json({ events });
    } catch (error) {
        console.error('❌ Error fetching Planning Center events:', error.response?.data || error.message);
        console.error('🔍 Full error:', error);
        
        res.json({ events: [], message: 'No events available' });
    }
});

app.post('/api/events/:eventId/rsvp', async (req, res) => {
    // Check if user exists in session
    if (req.session.user) {
        // User found in session
    } else {
        // Check if user exists in app.locals backup
        const userSessions = req.app.locals.userSessions || {};
        const backupUser = userSessions[req.sessionID];
        
        if (backupUser) {
            req.session.user = backupUser;
        } else {
            // Try to get user from Authorization header (token-based)
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    const userData = JSON.parse(Buffer.from(token, 'base64').toString());
                    req.session.user = userData;
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }
    }

    try {
        const { eventId } = req.params;
        
        // Find the event in our current events data to get the registration URL
        const event = req.app.locals.currentEvents?.find(e => e.id === eventId);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        if (event.registration_url) {
            // Redirect to Church Center registration page
            res.json({ 
                success: true, 
                redirect: true,
                url: event.registration_url,
                message: 'Redirecting to registration page...'
            });
        } else {
            // Fallback: simulate success for events without registration URLs
            res.json({ 
                success: true, 
                message: 'RSVP sent successfully!',
                note: 'Event registration handled internally'
            });
        }
    } catch (error) {
        console.error('❌ Error creating RSVP:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to RSVP for event' });
    }
});



// Supabase-first auth flow: link a Supabase user to Planning Center by email
// 1) Client signs up/logs in via Supabase; sends supabase_user_id and email here
// 2) Server looks up Planning Center person by email
// 3) If found, returns Planning Center profile preview; client confirms linking via /api/auth/pc/link
app.post('/api/auth/pc/check', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const emailLower = String(email).trim().toLowerCase();
        
        // Use personal access token approach (same as events API)
        const authHeaderOptions = buildPlanningCenterAuthHeaderOptions();
        if (!authHeaderOptions || authHeaderOptions.length === 0) {
            return res.status(500).json({ error: 'No Planning Center personal access token configured' });
        }
        const headers = authHeaderOptions[0]; // Use the first auth option

        const matches = [];
        let lastError = null;

                // Search for emails first, then get person details
        // This is more efficient and matches the Planning Center API structure
        const emailSearchEndpoint = `people/v2/emails?where[address]=${encodeURIComponent(emailLower)}`;
        
        try {
            console.log(`🔍 Searching Planning Center emails for: ${emailLower}`);
            const emailsResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/${emailSearchEndpoint}`, { headers });
            const emails = Array.isArray(emailsResp.data?.data) ? emailsResp.data.data : [];
            
            if (emails.length === 0) {
                return res.status(404).json({ error: 'No Planning Center accounts found for that email' });
            }
            
            // Take the first email match
            const emailMatch = emails[0];
            const personId = emailMatch?.relationships?.person?.data?.id;
            
            if (!personId) {
                return res.status(404).json({ error: 'Invalid email relationship data' });
            }
            
            // Get the person details using the person ID from the email relationship
            console.log(`👤 Fetching person details for ID: ${personId}`);
            const personResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/people/v2/people/${personId}`, { headers });
            const person = personResp.data?.data;
            
            if (!person) {
                return res.status(404).json({ error: 'Person not found' });
            }
            
            // Create the match object
            const match = {
                planning_center_id: personId,
                name: person.attributes?.name || null,
                email: emailMatch.attributes?.address || emailLower,
                email_is_primary: !!emailMatch.attributes?.primary,
                phone: person.attributes?.phone_number || null,
                avatar_url: person.attributes?.demographic_avatar_url || null
            };
            
            console.log(`✅ Found Planning Center profile: ${match.name} (${match.email}) - Primary: ${match.email_is_primary}`);
            return res.json({ success: true, matches: [match] });
            
        } catch (e) {
            console.log(`⚠️ Planning Center search failed:`, e.response?.status, e.message);
            if (e.response?.data) {
                console.log(`📄 Response data:`, JSON.stringify(e.response.data, null, 2));
            }
            
            if (e.response?.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a few minutes.' });
            }
            
            if (e.response?.status === 404) {
                return res.status(404).json({ error: 'No Planning Center accounts found for that email' });
            }
            
            throw e; // Re-throw other errors
        }
    } catch (error) {
        console.error('❌ /api/auth/pc/check error:', error.response?.data || error.message);
        if (error.response?.status === 429) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a few minutes.' });
        }
        res.status(500).json({ error: 'Failed to check Planning Center person' });
    }
});

// Link Supabase user to Planning Center after client confirmation
app.post('/api/auth/pc/link', async (req, res) => {
    try {
        const { supabase_user_id, profile } = req.body || {};
        console.log('🔗 /api/auth/pc/link payload:', {
            supabase_user_id,
            profile_received: !!profile,
            pc_keys: profile ? Object.keys(profile) : [],
            profile_data: profile || 'NO_PROFILE'
        });

        // Accept either planning_center_id or id in the posted profile
        const planningCenterId = profile?.planning_center_id || profile?.id || null;

        if (!supabase_user_id) {
            console.log('❌ Missing supabase_user_id');
            return res.status(400).json({ error: 'supabase_user_id is required' });
        }
        if (!planningCenterId) {
            console.log('❌ Missing planning_center_id, profile:', profile);
            return res.status(400).json({ error: 'profile.planning_center_id (or profile.id) is required' });
        }

        console.log('✅ Linking user', supabase_user_id, 'to PC profile', planningCenterId);
        const supabaseUser = await db.upsertUserWithAuthId(supabase_user_id, {
            id: planningCenterId,
            email: profile?.email || null,
            name: profile?.name || null,
            phone: profile?.phone || null,
            avatar_url: profile?.avatar_url || null
        });

        console.log('✅ Successfully linked user:', supabaseUser.id);
        return res.json({ success: true, user: supabaseUser });
    } catch (error) {
        console.error('❌ /api/auth/pc/link error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to link Planning Center profile to user' });
    }
});

// Refresh Planning Center data for a linked user on login
app.post('/api/auth/pc/refresh', async (req, res) => {
    try {
        const { supabase_user_id, planning_center_id } = req.body || {};
        if (!supabase_user_id || !planning_center_id) {
            return res.status(400).json({ error: 'supabase_user_id and planning_center_id are required' });
        }

        const authHeaderOptions = buildPlanningCenterAuthHeaderOptions();
        let lastError = null;
        let headersUsed = null;
        for (const headers of authHeaderOptions) {
            try {
                // Verify person exists and pull profile
                const personResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/people/v2/people/${planning_center_id}`, { headers });
                const person = personResp.data?.data;
                const updatedProfile = {
                    id: planning_center_id,
                    email: person?.attributes?.email || person?.attributes?.login_identifier || null,
                    name: person?.attributes?.name || null,
                    phone: person?.attributes?.phone_number || null,
                    avatar_url: person?.attributes?.demographic_avatar_url || null
                };
                await db.upsertUserWithAuthId(supabase_user_id, updatedProfile);
                headersUsed = headers;
                break;
            } catch (e) {
                lastError = e;
                continue;
            }
        }

        if (!headersUsed) {
            const status = lastError?.response?.status || 500;
            return res.status(status).json({ error: 'Failed to refresh Planning Center profile' });
        }

        // Fetch groups memberships
        let memberships = [];
        try {
            // Endpoint: groups memberships for a person
            const groupsResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/groups/v2/people/${planning_center_id}/group_memberships?include=group`, { headers: headersUsed });
            const included = groupsResp.data?.included || [];
            const groupMap = new Map();
            included.forEach(item => { if (item.type === 'Group') groupMap.set(item.id, item); });

            memberships = (groupsResp.data?.data || []).map(m => {
                const groupRelId = m.relationships?.group?.data?.id;
                const group = groupMap.get(groupRelId);
                return {
                    pc_group_id: groupRelId || m.id,
                    pc_group_name: group?.attributes?.name || null,
                    role: m.attributes?.role || null
                };
            });
        } catch (e) {
            console.log('⚠️ Could not fetch group memberships:', e.response?.status || e.message);
        }

        await db.replaceGroupMemberships(supabase_user_id, memberships);

        // Fetch registrations
        let registrations = [];
        try {
            // Endpoint: signups filtered by person
            const regsResp = await axios.get(`${PLANNING_CENTER_BASE_URL}/registrations/v2/signups?where[person_id]=${planning_center_id}&include=event,event_time`, { headers: headersUsed });
            const included = regsResp.data?.included || [];
            const eventMap = new Map();
            const timeMap = new Map();
            included.forEach(item => {
                if (item.type === 'Event') eventMap.set(item.id, item);
                if (item.type === 'EventTime') timeMap.set(item.id, item);
            });

            registrations = (regsResp.data?.data || []).map(r => {
                const eventId = r.relationships?.event?.data?.id;
                const timeId = r.relationships?.event_time?.data?.id;
                const event = eventMap.get(eventId);
                const time = timeMap.get(timeId);
                return {
                    pc_event_id: eventId || r.id,
                    pc_event_name: event?.attributes?.name || null,
                    pc_event_time_id: timeId || null,
                    status: r.attributes?.status || null,
                    starts_at: time?.attributes?.starts_at || null,
                    ends_at: time?.attributes?.ends_at || null,
                    registration_url: event ? `https://onehopenola.churchcenter.com/registrations/events/${event.id}` : null
                };
            });
        } catch (e) {
            console.log('⚠️ Could not fetch event registrations:', e.response?.status || e.message);
        }

        await db.replaceEventRegistrations(supabase_user_id, registrations);

        await db.updateUserLastLogin(supabase_user_id);

        return res.json({ success: true, membershipsCount: memberships.length, registrationsCount: registrations.length });
    } catch (error) {
        console.error('❌ /api/auth/pc/refresh error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh Planning Center data' });
    }
});

// Initialize minimal user profile in our database after Supabase signup/signin
app.post('/api/auth/profile/init', async (req, res) => {
    try {
        const { supabase_user_id, email, name } = req.body || {};
        if (!supabase_user_id || !email) {
            return res.status(400).json({ error: 'supabase_user_id and email are required' });
        }

        // Derive a friendly display name from email if none provided
        let derivedName = name;
        if (!derivedName) {
            try {
                const local = String(email).split('@')[0] || '';
                derivedName = local
                    .replace(/[._-]+/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
            } catch { derivedName = null; }
        }

        const user = await db.upsertUserWithAuthId(supabase_user_id, {
            id: null,
            email: email,
            name: derivedName || null,
            phone: null,
            avatar_url: null
        });
        res.json({ success: true, user });
    } catch (error) {
        console.error('❌ /api/auth/profile/init error:', error);
        res.status(500).json({ error: 'Failed to initialize user profile' });
    }
});
app.get('/api/bible/daily', async (req, res) => {
        try {
        
        const response = await axios.get(`${process.env.ONEHOPE_BIBLE_API}reading-plans`, {
            headers: {
                'Authorization': `Bearer ${process.env.ONEHOPE_BIBLE_API_KEY}`,
                'Accept': 'application/xml'
            }
        });

        // Parse XML response
        const xmlString = response.data;
        const dailyReading = parseHighlandsXML(xmlString);

        res.json(dailyReading);
    } catch (error) {
        console.error('❌ Bible API error:', error.response?.status, error.response?.statusText);
        res.status(500).json({ error: 'Failed to fetch daily reading' });
    }
});

app.get('/api/bible/verse/:passageId', async (req, res) => {
    try {
        const { passageId } = req.params;
        // Convert the verse reference to proper passage ID format
        const convertedPassageId = convertVerseToPassageId(passageId);
        
        if (!convertedPassageId) {
            return res.status(400).json({ error: 'Invalid verse reference format' });
        }
        
        const response = await axios.get(`https://api.scripture.api.bible/v1/bibles/${process.env.ONEHOPE_BIBLE_ID}/passages/${convertedPassageId}`, {
            headers: {
                'api-key': process.env.ONEHOPE_BIBLE_VERSE_API_KEY,
                'Accept': 'application/json'
            }
        });

        const passage = response.data.data;
        res.json({
            data: {
                content: passage.content,
                reference: passage.reference
            }
        });
    } catch (error) {
        console.error('❌ Error fetching verse:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch verse' });
    }
});

// Simple streak tracking endpoints
app.get('/api/user/streak', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        // Get user's Supabase row (by planning_center_id if linked, otherwise by Supabase auth id)
        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's streak data
        const streakData = await db.getUserStreak(supabaseUser.id);
        
        res.json({ success: true, data: streakData });
    } catch (error) {
        console.error('❌ Error fetching user streak:', error);
        res.status(500).json({ error: 'Failed to fetch user streak' });
    }
});

app.post('/api/user/streak/complete', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user's streak (mark today as completed)
        const updatedStreak = await db.updateUserStreak(supabaseUser.id, true);
        
        res.json({ success: true, data: updatedStreak });
    } catch (error) {
        console.error('❌ Error updating user streak:', error);
        res.status(500).json({ error: 'Failed to update user streak' });
    }
});

// Daily reading status endpoints
app.get('/api/bible/status/:date', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const { date } = req.params;

        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get daily reading status
        const readingStatus = await db.getDailyReadingStatus(supabaseUser.id, date);
        
        res.json({ success: true, data: readingStatus });
    } catch (error) {
        console.error('❌ Error fetching daily reading status:', error);
        res.status(500).json({ error: 'Failed to fetch daily reading status' });
    }
});

app.post('/api/bible/status', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const { date, sections_completed } = req.body;

        if (!date || !sections_completed) {
            return res.status(400).json({ error: 'Missing required fields: date, sections_completed' });
        }

        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update daily reading status
        const updatedStatus = await db.updateDailyReadingStatus(supabaseUser.id, date, sections_completed);
        
        res.json({ success: true, data: updatedStatus });
    } catch (error) {
        console.error('❌ Error updating daily reading status:', error);
        res.status(500).json({ error: 'Failed to update daily reading status' });
    }
});

// Helper functions
function getChicagoDate() {
    const now = new Date();
    // Chicago is UTC-6 (CST) or UTC-5 (CDT)
    const chicagoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    return chicagoTime.toISOString().split('T')[0];
}

function parseHighlandsXML(xmlString) {
    try {
        // Extract date
        const dateMatch = xmlString.match(/<Reading Date="([^"]+)">/);
        const date = dateMatch ? dateMatch[1] : getChicagoDate();
        
        // Extract devotional
        const devotionalMatch = xmlString.match(/<Devotional[^>]*>([\s\S]*?)<\/Devotional>/);
        const devotional = devotionalMatch ? decodeHtmlEntities(devotionalMatch[1].trim()) : '';
        
        // Extract Old Testament
        const oldTestamentMatch = xmlString.match(/<OldTestament[^>]*Verses="([^"]+)"/);
        const oldTestament = oldTestamentMatch ? oldTestamentMatch[1] : '';
        
        // Extract New Testament
        const newTestamentMatch = xmlString.match(/<NewTestament[^>]*Verses="([^"]+)"/);
        const newTestament = newTestamentMatch ? newTestamentMatch[1] : '';
        
        // Extract Psalms - try both singular and plural
        let psalmsMatch = xmlString.match(/<Psalms[^>]*Verses="([^"]+)"/);
        if (!psalmsMatch) {
            psalmsMatch = xmlString.match(/<Psalm[^>]*Verses="([^"]+)"/);
        }
        const psalms = psalmsMatch ? psalmsMatch[1] : '';

        
        // Extract Proverbs
        const proverbsMatch = xmlString.match(/<Proverbs[^>]*Verses="([^"]+)"/);
        const proverbs = proverbsMatch ? proverbsMatch[1] : '';
        
        return {
            date,
            devotional,
            oldTestament,
            newTestament,
            psalms,
            proverbs
        };
    } catch (error) {
        console.error('❌ Error parsing Highlands XML:', error);
        return {
            date: getChicagoDate(),
            devotional: '',
            oldTestament: '',
            newTestament: '',
            psalms: '',
            proverbs: ''
        };
    }
}

function decodeHtmlEntities(text) {
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&apos;': "'",
        '&nbsp;': ' ',
        '<br>': '\n',
        '<br/>': '\n',
        '<br />': '\n'
    };
    
    return text.replace(/&[^;]+;|<br\s*\/?>/gi, match => entities[match] || match);
}

function convertVerseToPassageId(verse) {
    if (!verse) return '';
    
    // Comprehensive book mapping
    const bookMap = {
        'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
        'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
        '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR',
        'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalm': 'PSA', 'Psalms': 'PSA',
        'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA',
        'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
        'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC',
        'Nahum': 'NAH', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC',
        'Malachi': 'MAL', 'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
        'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', 'Galatians': 'GAL',
        'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH',
        '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', 'Titus': 'TIT',
        'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
        '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV'
    };
    
    // Match patterns like "Genesis 1:1", "Psalm 23:1-6", "1 Corinthians 2:6-3:4"
    const patterns = [
        // Cross-chapter ranges: "Ezra 3:1-4:23"
        /^(\w+(?:\s+\w+)?)\s+(\d+):(\d+)-(\d+):(\d+)$/,
        // Same-chapter ranges: "Psalm 23:1-6"
        /^(\w+(?:\s+\w+)?)\s+(\d+):(\d+)-(\d+)$/,
        // Single verses: "Genesis 1:1"
        /^(\w+(?:\s+\w+)?)\s+(\d+):(\d+)$/
    ];
    
    for (const pattern of patterns) {
        const match = verse.match(pattern);
        if (match) {
            const bookName = match[1];
            const bookCode = bookMap[bookName];
            
            if (!bookCode) {
                return '';
            }
            
            if (match.length === 6) {
                // Cross-chapter range: "Ezra 3:1-4:23" -> "EZR.3.1-EZR.4.23"
                return `${bookCode}.${match[2]}.${match[3]}-${bookCode}.${match[4]}.${match[5]}`;
            } else if (match.length === 5) {
                // Same-chapter range: "Psalm 23:1-6" -> "PSA.23.1-PSA.23.6"
                return `${bookCode}.${match[2]}.${match[3]}-${bookCode}.${match[2]}.${match[4]}`;
            } else if (match.length === 4) {
                // Single verse: "Genesis 1:1" -> "GEN.1.1"
                return `${bookCode}.${match[2]}.${match[3]}`;
            }
        }
    }
    
    return '';
}

// User Steps API Endpoints
app.get('/api/user/steps', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user steps
        const userSteps = await db.getUserSteps(supabaseUser.id);
        
        res.json({ success: true, data: userSteps });
    } catch (error) {
        console.error('❌ Error fetching user steps:', error);
        res.status(500).json({ error: 'Failed to fetch user steps' });
    }
});

app.post('/api/user/steps/assessment', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const { assessmentAnswers } = req.body;

        if (!assessmentAnswers) {
            return res.status(400).json({ error: 'Missing assessment answers' });
        }

        let supabaseUser = null;
        try {
            if (user.planning_center_id) {
                supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id);
            }
            if (!supabaseUser && (user.supabase_id || user.id)) {
                supabaseUser = await db.getUserById(user.supabase_id || user.id);
            }
        } catch {}
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Map assessment answers to completed steps
        const completedSteps = mapAssessmentToSteps(assessmentAnswers);
        console.log('🔍 Assessment steps mapped:', completedSteps);
        
        // Bulk upsert user steps
        const stepsData = completedSteps.map(step => ({
            stepId: step.stepId,
            completed: step.completed,
            notes: step.notes
        }));
        console.log('🔍 Steps data for bulk upsert:', stepsData);

        await db.bulkUpsertUserSteps(supabaseUser.id, stepsData);
        
        res.json({ success: true, data: completedSteps });
    } catch (error) {
        console.error('❌ Error processing assessment:', error);
        res.status(500).json({ error: 'Failed to process assessment' });
    }
});

app.post('/api/user/steps/complete', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        const { stepId, notes } = req.body;

        if (!stepId) {
            return res.status(400).json({ error: 'Missing step ID' });
        }

        // Get user's Supabase ID
        const supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id || user.id);
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Mark step as completed
        const updatedStep = await db.upsertUserStep(supabaseUser.id, stepId, true, notes);
        
        res.json({ success: true, data: updatedStep });
    } catch (error) {
        console.error('❌ Error completing step:', error);
        res.status(500).json({ error: 'Failed to complete step' });
    }
});

// Clear user steps for testing
app.delete('/api/user/steps/clear', async (req, res) => {
    try {
        // Get user from session or token
        let user = req.session.user;
        if (!user) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7);
                    user = JSON.parse(Buffer.from(token, 'base64').toString());
                } catch (error) {
                    return res.status(401).json({ error: 'Not authenticated' });
                }
            } else {
                return res.status(401).json({ error: 'Not authenticated' });
            }
        }

        // Get user's Supabase ID
        const supabaseUser = await db.getUserByPlanningCenterId(user.planning_center_id || user.id);
        if (!supabaseUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Clear all user steps
        await db.clearUserSteps(supabaseUser.id);
        
        res.json({ success: true, message: 'User steps cleared' });
    } catch (error) {
        console.error('❌ Error clearing user steps:', error);
        res.status(500).json({ error: 'Failed to clear user steps' });
    }
});

// Helper function to map assessment answers to completed steps
function mapAssessmentToSteps(answers) {
    console.log('🔍 mapAssessmentToSteps called with answers:', answers);
    
    const allSteps = [
        { stepId: 'assessment', title: 'Take Next Steps Assessment' },
        { stepId: 'faith', title: 'Make Jesus Lord' },
        { stepId: 'baptism', title: 'Get Baptized' },
        { stepId: 'attendance', title: 'Attend Regularly' },
        { stepId: 'bible-prayer', title: 'Daily Bible & Prayer' },
        { stepId: 'giving', title: 'Give Consistently' },
        { stepId: 'small-group', title: 'Join a Small Group' },
        { stepId: 'serve-team', title: 'Serve on Team' },
        { stepId: 'invite-pray', title: 'Invite & Pray' },
        { stepId: 'share-story', title: 'Share Your Story' },
        { stepId: 'leadership', title: 'Lead Others' },
        { stepId: 'mission-living', title: 'Live on Mission' }
    ];

    const completedSteps = [];

    // Create all steps and mark them based on assessment answers
    allSteps.forEach(step => {
        let completed = false;
        let notes = null;
        
        // Mark assessment step as completed when assessment is submitted
        if (step.stepId === 'assessment') {
            completed = true;
            notes = 'Assessment completed on ' + new Date().toLocaleDateString();
            console.log('✅ Marking assessment step as completed');
        }
        
        // Mark faith step if user has made Jesus Lord
        if (step.stepId === 'faith' && answers.salvation_status === 'yes') {
            completed = true;
            notes = `Salvation date: ${answers.salvation_date || 'Date not specified'}`;
            console.log('✅ Marking faith step as completed - Jesus is Lord');
        }
        
        // Mark baptism step if user has been baptized
        if (step.stepId === 'baptism' && answers.baptism_status === 'yes') {
            completed = true;
            notes = 'User has been baptized';
            console.log('✅ Marking baptism step as completed');
        }
        
        // Mark attendance step if user attends regularly (4+ times per month)
        if (step.stepId === 'attendance' && parseInt(answers.sunday_attendance) >= 4) {
            completed = true;
            notes = `Attends ${answers.sunday_attendance} times per month`;
            console.log('✅ Marking attendance step as completed');
        }
        
        // Mark bible-prayer step if user practices daily Bible reading and prayer (4+ times per week)
        if (step.stepId === 'bible-prayer' && parseInt(answers.bible_prayer) >= 4) {
            completed = true;
            notes = `Practices Bible reading and prayer ${answers.bible_prayer} times per week`;
            console.log('✅ Marking bible-prayer step as completed');
        }
        
        // Mark giving step if user gives consistently (4+ times per month)
        if (step.stepId === 'giving' && parseInt(answers.giving_status) >= 4) {
            completed = true;
            notes = `Gives ${answers.giving_status} times per month`;
            console.log('✅ Marking giving step as completed');
        }
        
        // Mark small-group step if user is in a small group
        if (step.stepId === 'small-group' && answers.small_group === 'yes') {
            completed = true;
            notes = 'User is in a small group';
            console.log('✅ Marking small-group step as completed');
        }
        
        // Mark serve-team step if user serves on a team
        if (step.stepId === 'serve-team' && answers.serve_team === 'yes') {
            completed = true;
            notes = 'User serves on a team';
            console.log('✅ Marking serve-team step as completed');
        }
        
        // Mark invite-pray step if user invites and prays regularly (4+ times per month)
        if (step.stepId === 'invite-pray' && parseInt(answers.invite_pray) >= 4) {
            completed = true;
            notes = `Invites and prays ${answers.invite_pray} times per month`;
            console.log('✅ Marking invite-pray step as completed');
        }
        
        // Mark share-story step if user shares their story
        if (step.stepId === 'share-story' && answers.share_story === 'yes') {
            completed = true;
            notes = 'User shares their faith story';
            console.log('✅ Marking share-story step as completed');
        }
        
        // Mark leadership step if user leads others
        if (step.stepId === 'leadership' && answers.leadership === 'yes') {
            completed = true;
            notes = 'User leads others';
            console.log('✅ Marking leadership step as completed');
        }
        
        // Mark mission-living step if user lives on mission (4+ times per week)
        if (step.stepId === 'mission-living' && parseInt(answers.mission_living) >= 4) {
            completed = true;
            notes = `Lives on mission ${answers.mission_living} times per week`;
            console.log('✅ Marking mission-living step as completed');
        }
        
        completedSteps.push({
            stepId: step.stepId,
            title: step.title,
            completed: completed,
            notes: notes
        });
    });

    console.log('🔍 Returning completed steps:', completedSteps);
    return completedSteps;
}

// Start server
const serverPort = process.env.PORT || PORT;
app.listen(serverPort, () => {
    console.log(`🚀 One Hope App server running on port ${serverPort}`);
}); 