// Bible API Configuration
export const BIBLE_CONFIG = {
    // API Keys - These should be set in environment variables
    API_KEY: process.env.ONEHOPE_BIBLE_API_KEY || 'your_bible_api_key_here',
    VERSE_API_KEY: process.env.ONEHOPE_BIBLE_VERSE_API_KEY || 'your_bible_verse_api_key_here',
    BIBLE_ID: process.env.ONEHOPE_BIBLE_ID || 'your_bible_id_here',
    
    // Base URL for production API
    BASE_URL: process.env.BASE_URL || 'https://your-production-domain.com',
    
    // API Endpoints
    ENDPOINTS: {
        DAILY_READING: '/api/bible',
        VERSE_SEARCH: '/api/bible/verse'
    },
    
    // Bible Plan Sections
    SECTIONS: {
        DEVOTIONAL: 'devotional',
        OLD_TESTAMENT: 'old-testament',
        NEW_TESTAMENT: 'new-testament',
        PSALMS: 'psalms',
        PROVERBS: 'proverbs'
    },
    
    // Default content for fallback
    DEFAULT_CONTENT: {
        devotional: {
            title: 'Daily Devotional',
            content: 'Today\'s devotional will be available shortly. Please check back later.'
        },
        'old-testament': {
            title: 'Old Testament Reading',
            content: 'Today\'s Old Testament reading will be available shortly.'
        },
        'new-testament': {
            title: 'New Testament Reading',
            content: 'Today\'s New Testament reading will be available shortly.'
        },
        psalms: {
            title: 'Psalm Reading',
            content: 'Today\'s Psalm reading will be available shortly.'
        },
        proverbs: {
            title: 'Proverbs Reading',
            content: 'Today\'s Proverbs reading will be available shortly.'
        }
    }
}; 