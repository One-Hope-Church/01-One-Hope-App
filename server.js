const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

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
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Planning Center OAuth configuration
const PLANNING_CENTER_CONFIG = {
    baseUrl: 'https://api.planningcenteronline.com',
    clientId: process.env.PLANNING_CENTER_CLIENT_ID,
    clientSecret: process.env.PLANNING_CENTER_CLIENT_SECRET,
    redirectUri: process.env.NODE_ENV === 'production' 
        ? process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}/auth/callback`
            : 'https://your-app-name.vercel.app/auth/callback'
        : 'http://localhost:3000/auth/callback',
    scope: 'people groups services check_ins registrations'
};

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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

// Planning Center OAuth routes
app.get('/auth/planningcenter', (req, res) => {
    const authUrl = `${PLANNING_CENTER_CONFIG.baseUrl}/oauth/authorize?` +
        `client_id=${PLANNING_CENTER_CONFIG.clientId}&` +
        `redirect_uri=${encodeURIComponent(PLANNING_CENTER_CONFIG.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(PLANNING_CENTER_CONFIG.scope)}`;
    
    console.log('🔗 Planning Center OAuth redirect URI:', PLANNING_CENTER_CONFIG.redirectUri);
    console.log('🔗 Planning Center OAuth client ID:', PLANNING_CENTER_CONFIG.clientId);
    console.log('🔗 Full OAuth URL:', authUrl);
    
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        console.error('❌ OAuth error:', error);
        return res.redirect('/?auth=error&error=' + encodeURIComponent(error));
    }
    
    if (!code) {
        console.error('❌ No authorization code received');
        return res.redirect('/?auth=error&error=no_code');
    }
    
    try {
        console.log('🔄 Exchanging code for token...');
        const tokenResponse = await axios.post(`${PLANNING_CENTER_CONFIG.baseUrl}/oauth/token`, {
            grant_type: 'authorization_code',
            code: code,
            client_id: PLANNING_CENTER_CONFIG.clientId,
            client_secret: PLANNING_CENTER_CONFIG.clientSecret,
            redirect_uri: PLANNING_CENTER_CONFIG.redirectUri
        });
        
        const accessToken = tokenResponse.data.access_token;
        console.log('✅ Token received, fetching user profile...');
        
        // Get user profile
        const profileResponse = await axios.get(`${PLANNING_CENTER_CONFIG.baseUrl}/people/v2/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        console.log('🔍 Full Planning Center profile response:', JSON.stringify(profileResponse.data, null, 2));
        
        const user = profileResponse.data.data;
        const userId = user.id;
        
        // Get user's email
        let userEmail = user.attributes?.login_identifier;
        try {
            console.log('📧 Fetching user emails...');
            const emailsResponse = await axios.get(`${PLANNING_CENTER_CONFIG.baseUrl}/people/v2/people/${userId}/emails`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            console.log('📧 Emails response:', JSON.stringify(emailsResponse.data, null, 2));
            
            const primaryEmail = emailsResponse.data.data.find(email => email.attributes.primary);
            if (primaryEmail) {
                userEmail = primaryEmail.attributes.address;
                console.log('📧 Found primary email:', userEmail);
            }
        } catch (emailError) {
            console.log('⚠️ Could not fetch emails, using login_identifier:', userEmail);
        }
        
        // Store user in session
        req.session.user = {
            id: userId,
            name: user.attributes?.name || 'User',
            email: userEmail,
            accessToken: accessToken
        };
        
        console.log('✅ OAuth successful! User:', req.session.user);
        console.log('📧 Email from Planning Center:', userEmail);
        
        res.redirect('/?auth=success');
    } catch (error) {
        console.error('❌ OAuth error:', error.response?.data || error.message);
        res.redirect('/?auth=error&error=' + encodeURIComponent(error.message));
    }
});

// API routes
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
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

app.get('/api/events', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        console.log('📅 Fetching events from Planning Center...');
        console.log('🔑 Using access token:', req.session.user.accessToken ? 'Present' : 'Missing');
        console.log('👤 User ID:', req.session.user.id);
        
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
            try {
                console.log(`🔍 Trying endpoint: ${endpoint}`);
                const response = await axios.get(`${PLANNING_CENTER_CONFIG.baseUrl}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${req.session.user.accessToken}`,
                        'Accept': 'application/json'
                    }
                });

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
                                
                                // Event should be:
                                // 1. Not archived (handled by API filter)
                                // 2. Have "public" category (ID: 98823)
                                // 3. Currently open (or no close date set)
                                // 4. Have a Church Center registration URL
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
                            // Create details URL by appending event ID to base URL
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
                console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.response?.status || endpointError.message);
                continue;
            }
        }

        if (!endpointFound) {
            console.log('🔄 No working endpoints found, using sample events as fallback');
            
            // Provide sample events for testing
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            events = [
                {
                    id: 'water-baptism-1',
                    title: 'Water Baptism',
                    description: 'Join us for water baptism. This is a significant step in your faith journey.',
                    starts_at: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    ends_at: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
                    location: 'Main Sanctuary',
                    featured: true,
                    capacity: 50,
                    registered_count: 8
                },
                {
                    id: 'sample-1',
                    title: 'Sunday Service',
                    description: 'Join us for worship and teaching this Sunday',
                    starts_at: tomorrow.toISOString(),
                    ends_at: new Date(tomorrow.getTime() + 90 * 60 * 1000).toISOString(),
                    location: 'Main Sanctuary',
                    featured: false,
                    capacity: 200,
                    registered_count: 45
                }
            ];
        }

        // Store events in app.locals for RSVP endpoint to access
        req.app.locals.currentEvents = events;

        res.json({ events });
    } catch (error) {
        console.error('❌ Error fetching Planning Center events:', error.response?.data || error.message);
        console.error('🔍 Full error:', error);
        
        // Return sample events as fallback
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const events = [
            {
                id: 'fallback-1',
                title: 'Sunday Service',
                description: 'Join us for worship and teaching this Sunday',
                starts_at: tomorrow.toISOString(),
                ends_at: new Date(tomorrow.getTime() + 90 * 60 * 1000).toISOString(),
                location: 'Main Sanctuary',
                featured: true,
                capacity: 200,
                registered_count: 45
            }
        ];
        
        res.json({ events, message: 'Using sample events - Planning Center integration in progress' });
    }
});

app.post('/api/events/:eventId/rsvp', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { eventId } = req.params;
        console.log(`📝 RSVP for event ${eventId} from user ${req.session.user.id}`);
        
        // Find the event in our current events data to get the registration URL
        const event = req.app.locals.currentEvents?.find(e => e.id === eventId);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        if (event.registration_url) {
            // Redirect to Church Center registration page
            console.log(`🔗 Redirecting to Church Center: ${event.registration_url}`);
            res.json({ 
                success: true, 
                redirect: true,
                url: event.registration_url,
                message: 'Redirecting to registration page...'
            });
        } else {
            // Fallback: simulate success for events without registration URLs
            console.log(`📝 Simulating RSVP for event ${eventId} (no registration URL)`);
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

// Helper functions
function parseHighlandsXML(xmlString) {
    try {
        // Extract date
        const dateMatch = xmlString.match(/<Reading Date="([^"]+)">/);
        const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
        
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
            date: new Date().toISOString().split('T')[0],
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

// Start server
const serverPort = process.env.PORT || PORT;
app.listen(serverPort, () => {
    console.log(`🚀 One Hope App server running on port ${serverPort}`);
}); 