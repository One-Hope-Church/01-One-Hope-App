# Bible Integration Setup Guide

This guide explains how to set up the One Hope Production Bible API integration in your One Hope App.

## Overview

The integration connects your app to the One Hope Production Bible API to fetch real daily readings, scripture content, and devotional materials.

## Files Added/Modified

### New Files Created:
- `api/bible.js` - API proxy for daily bible readings
- `api/bible/verse.js` - API proxy for scripture verse content
- `config/bible.js` - Configuration file for bible API settings
- `BIBLE_INTEGRATION_README.md` - This setup guide

### Modified Files:
- `script.js` - Added dynamic bible content loading
- `styles.css` - Added loading states and error handling styles

## Setup Instructions

### 1. Environment Configuration

You need to set up the following environment variables. Create a `.env` file in your project root:

```env
# Bible API Configuration
ONEHOPE_BIBLE_API_KEY=your_bible_api_key_here
ONEHOPE_BIBLE_VERSE_API_KEY=your_bible_verse_api_key_here
ONEHOPE_BIBLE_ID=your_bible_id_here

# Base URL for production API
BASE_URL=https://your-production-domain.com

# App Configuration
NODE_ENV=development
```

### 2. API Keys Required

You'll need to obtain these API keys from the One Hope Production system:

1. **ONEHOPE_BIBLE_API_KEY** - For fetching daily reading plans
2. **ONEHOPE_BIBLE_VERSE_API_KEY** - For fetching scripture content
3. **ONEHOPE_BIBLE_ID** - Bible version identifier (e.g., NIV, KJV)

### 3. Server Setup

If you're running this as a static site, you'll need to set up a server to handle the API proxy endpoints. You can use:

- **Next.js** - The API routes will work automatically
- **Express.js** - Set up routes for `/api/bible` and `/api/bible/verse`
- **Netlify Functions** - Deploy the API files as serverless functions
- **Vercel Functions** - Deploy the API files as serverless functions

### 4. Testing the Integration

I've created a comprehensive testing suite to help you verify the integration works correctly.

#### **Quick Start Testing:**

1. **Install test dependencies:**
   ```bash
   npm install
   ```

2. **Set up your API keys:**
   ```bash
   export ONEHOPE_BIBLE_API_KEY="your_bible_api_key_here"
   export ONEHOPE_BIBLE_VERSE_API_KEY="your_bible_verse_api_key_here"
   export ONEHOPE_BIBLE_ID="NIV"
   export BASE_URL="https://onehopechurch.com"
   ```

3. **Start the test server:**
   ```bash
   node test-server.js
   ```

4. **Open the test page:**
   - Navigate to `http://localhost:3000/test`
   - Use the interactive test suite to verify all components

#### **Testing Options:**

**Option A: Standalone Test Page**
- Open `test-bible-integration.html` in your browser
- Configure API keys in the interface
- Run individual tests for each component

**Option B: Local Test Server**
- Use the provided `test-server.js` for a complete testing environment
- Includes proxy endpoints and health checks
- Perfect for development and debugging

**Option C: Production App Testing**
- Start your main app server
- Navigate to the Bible screen
- Verify content loads and displays correctly

#### **What to Test:**

1. **API Connectivity** - Verify you can reach the production API
2. **Authentication** - Confirm your API keys work correctly
3. **Data Parsing** - Check that XML responses are converted to JSON
4. **Error Handling** - Test with invalid keys and network issues
5. **UI Integration** - Verify content displays in your app interface
6. **Caching** - Test that repeated requests use cached data
7. **Loading States** - Confirm spinners and progress indicators work

## Features Implemented

### ✅ Dynamic Content Loading
- Fetches real daily readings from the production API
- Loads actual scripture content for each section
- Displays real devotional content with author attribution

### ✅ Loading States
- Shows loading spinners while fetching content
- Displays progress indicators during API calls
- Graceful handling of loading states

### ✅ Error Handling
- Fallback content when API is unavailable
- Retry functionality for failed requests
- User-friendly error messages
- Caching of successful responses

### ✅ Caching System
- Caches daily readings to avoid repeated API calls
- Stores content for offline viewing
- Automatic cache invalidation for new days

### ✅ UI Enhancements
- Real date display from API
- Actual verse references
- Scripture content with proper formatting
- Bible version badges

## API Endpoints

### GET `/api/bible`
Fetches the daily reading plan for the current date.

**Response:**
```json
{
  "Reading": {
    "Date": ["2024-12-15"],
    "Devotional": [{
      "Author": ["Pastor Larry Stockstill"],
      "_": "Devotional content here..."
    }],
    "OldTestament": [{
      "Verses": ["Genesis 15:1-21"]
    }],
    "NewTestament": [{
      "Verses": ["Matthew 15:1-20"]
    }],
    "Psalm": [{
      "Verses": ["Psalm 19:1-14"]
    }],
    "Proverbs": [{
      "Verses": ["Proverbs 4:1-9"]
    }]
  }
}
```

### GET `/api/bible/verse?query=Genesis 15:1-21`
Fetches scripture content for a specific verse reference.

**Response:**
```json
{
  "data": {
    "passages": [{
      "reference": "Genesis 15:1-21",
      "content": "<p>Scripture content here...</p>"
    }]
  }
}
```

## Testing Guide

### **Step-by-Step Testing Process:**

#### **1. Pre-Testing Setup**
```bash
# Install dependencies
npm install

# Set environment variables
export ONEHOPE_BIBLE_API_KEY="your_actual_api_key"
export ONEHOPE_BIBLE_VERSE_API_KEY="your_actual_verse_key"
export ONEHOPE_BIBLE_ID="NIV"
export BASE_URL="https://onehopechurch.com"
```

#### **2. Run the Test Suite**
```bash
# Start test server
node test-server.js

# Open test page in browser
open http://localhost:3000/test
```

#### **3. Test Results Interpretation**

**✅ PASSED Tests:**
- API endpoints respond correctly
- Authentication works
- Data parsing succeeds
- Error handling functions properly

**❌ FAILED Tests:**
- Check API keys are correct
- Verify network connectivity
- Confirm production API is accessible
- Review error messages for specific issues

#### **4. Manual Testing Checklist**

- [ ] Bible screen loads without errors
- [ ] Daily reading content appears
- [ ] Verse references are accurate
- [ ] Loading spinners display correctly
- [ ] Error messages are user-friendly
- [ ] Cached content loads offline
- [ ] All reading sections are accessible
- [ ] Scripture content displays properly

### **Debug Mode**

Enable detailed logging by adding this to your browser console:
```javascript
localStorage.setItem('debug', 'true');
console.log('Debug mode enabled');
```

## Troubleshooting

### Common Issues:

1. **API Keys Not Working**
   - Verify your API keys are correct
   - Check that the keys have proper permissions
   - Ensure the production API is accessible

2. **Content Not Loading**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Test API calls directly with tools like Postman

3. **CORS Issues**
   - Ensure your server is properly configured
   - Check that API proxy is working correctly
   - Verify domain permissions

4. **Loading States Not Showing**
   - Check that CSS is properly loaded
   - Verify JavaScript is executing without errors
   - Test on different browsers

### Debug Mode

To enable debug logging, add this to your browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Security Considerations

- Never expose API keys in client-side code
- Use environment variables for all sensitive data
- Implement proper CORS policies
- Consider rate limiting for API calls
- Validate all API responses

## Performance Optimization

- Implement proper caching strategies
- Use lazy loading for content
- Optimize API response sizes
- Consider implementing service workers for offline support

## Future Enhancements

- Offline reading support
- Reading progress synchronization
- Multiple Bible version support
- Audio scripture playback
- Social sharing features
- Reading notes and highlights

## Support

If you encounter issues with the integration:

1. Check the browser console for error messages
2. Verify your API keys and configuration
3. Test the API endpoints directly
4. Review the troubleshooting section above
5. Contact the development team for assistance

---

**Note:** This integration requires the One Hope Production Bible API to be running and accessible. Make sure you have proper access and permissions before implementing this feature. 