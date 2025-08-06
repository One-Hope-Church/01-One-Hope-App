// API proxy for bible verses
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // Forward request to production API
        const response = await fetch(`/api/bible/verse/${process.env.ONEHOPE_BIBLE_ID}/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'api-key': process.env.ONEHOPE_BIBLE_VERSE_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Bible verse API error:', error);
        res.status(500).json({ error: 'Failed to fetch bible verse' });
    }
} 