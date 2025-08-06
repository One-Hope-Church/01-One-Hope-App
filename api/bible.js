// API proxy for bible readings
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { ref } = req.query;
        
        // Forward request to production API
        const response = await fetch(`${process.env.BASE_URL}/api/bible?ref=${ref || process.env.BASE_URL}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.ONEHOPE_BIBLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.text();
        
        // Parse XML response and convert to JSON
        const xmlData = await parseXMLToJSON(data);
        
        res.status(200).json(xmlData);
    } catch (error) {
        console.error('Bible API error:', error);
        res.status(500).json({ error: 'Failed to fetch bible reading' });
    }
}

// XML to JSON parser (simplified version)
async function parseXMLToJSON(xmlString) {
    // This is a simplified parser - you might want to use a proper XML parser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Convert XML to JSON structure
    const reading = {
        Date: [xmlDoc.querySelector('Date')?.textContent || new Date().toISOString()],
        Devotional: [{
            Author: [xmlDoc.querySelector('Devotional Author')?.textContent || 'Pastor Larry Stockstill'],
            _: xmlDoc.querySelector('Devotional')?.textContent || 'Daily devotional content'
        }],
        OldTestament: [{
            Verses: [xmlDoc.querySelector('OldTestament')?.textContent || 'Genesis 1:1']
        }],
        NewTestament: [{
            Verses: [xmlDoc.querySelector('NewTestament')?.textContent || 'Matthew 1:1']
        }],
        Psalm: [{
            Verses: [xmlDoc.querySelector('Psalm')?.textContent || 'Psalm 1:1']
        }],
        Proverbs: [{
            Verses: [xmlDoc.querySelector('Proverbs')?.textContent || 'Proverbs 1:1']
        }]
    };
    
    return { Reading: reading };
} 