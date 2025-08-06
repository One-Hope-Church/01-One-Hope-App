const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Environment variables (you can set these or use a .env file)
const BIBLE_API_KEY = process.env.ONEHOPE_BIBLE_API_KEY || 'your_bible_api_key_here';
const VERSE_API_KEY = process.env.ONEHOPE_BIBLE_VERSE_API_KEY || 'your_verse_api_key_here';
const BIBLE_ID = process.env.ONEHOPE_BIBLE_ID || 'NIV';
const BASE_URL = process.env.BASE_URL || 'https://onehopechurch.com';

// Bible API proxy endpoint
app.get('/api/bible', async (req, res) => {
    try {
        const { ref } = req.query;
        
        console.log('📖 Fetching daily bible reading...');
        
        const response = await fetch(`${BASE_URL}/api/bible?ref=${ref || BASE_URL}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BIBLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ Bible API error: ${response.status}`);
            return res.status(response.status).json({ 
                error: 'Failed to fetch bible reading',
                status: response.status 
            });
        }

        const data = await response.text();
        console.log('✅ Daily bible reading fetched successfully');
        
        // Parse XML and convert to JSON (simplified)
        const jsonData = parseXMLToJSON(data);
        res.json(jsonData);
        
    } catch (error) {
        console.error('❌ Bible API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bible reading',
            message: error.message 
        });
    }
});

// Bible verse API proxy endpoint
app.get('/api/bible/verse', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        console.log(`📖 Fetching bible verse: ${query}`);
        
        const response = await fetch(`${BASE_URL}/api/bible/verse/${BIBLE_ID}/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'api-key': VERSE_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`❌ Verse API error: ${response.status}`);
            return res.status(response.status).json({ 
                error: 'Failed to fetch bible verse',
                status: response.status 
            });
        }

        const data = await response.json();
        console.log('✅ Bible verse fetched successfully');
        res.json(data);
        
    } catch (error) {
        console.error('❌ Verse API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bible verse',
            message: error.message 
        });
    }
});

// Simple XML to JSON parser
function parseXMLToJSON(xmlString) {
    // This is a simplified parser - in production you'd want a proper XML parser
    const reading = {
        Date: [new Date().toISOString()],
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
    
    return { Reading: reading };
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        config: {
            baseUrl: BASE_URL,
            bibleId: BIBLE_ID,
            hasBibleKey: !!BIBLE_API_KEY,
            hasVerseKey: !!VERSE_API_KEY
        }
    });
});

// Serve the test page
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-bible-integration.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log(`📋 Test page available at http://localhost:${PORT}/test`);
    console.log(`💚 Health check at http://localhost:${PORT}/health`);
    console.log('');
    console.log('📝 Configuration:');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   Bible ID: ${BIBLE_ID}`);
    console.log(`   Bible API Key: ${BIBLE_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Verse API Key: ${VERSE_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log('');
    console.log('💡 To set API keys, use environment variables:');
    console.log('   ONEHOPE_BIBLE_API_KEY=your_key_here');
    console.log('   ONEHOPE_BIBLE_VERSE_API_KEY=your_key_here');
    console.log('   ONEHOPE_BIBLE_ID=NIV');
    console.log('   BASE_URL=https://onehopechurch.com');
});

module.exports = app; 