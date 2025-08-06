#!/usr/bin/env node

/**
 * Quick Bible Integration Test Script
 * 
 * This script tests the bible integration without requiring a full server setup.
 * Run it directly with: node test-quick.js
 */

const https = require('https');
const http = require('http');

// Configuration - Update these with your actual values
const CONFIG = {
    baseUrl: process.env.BASE_URL || 'https://onehopechurch.com',
    bibleApiKey: process.env.ONEHOPE_BIBLE_API_KEY || 'your_bible_api_key_here',
    verseApiKey: process.env.ONEHOPE_BIBLE_VERSE_API_KEY || 'your_verse_api_key_here',
    bibleId: process.env.ONEHOPE_BIBLE_ID || 'NIV'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// Make HTTP request
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Test daily bible reading API
async function testDailyReading() {
    logInfo('Testing Daily Bible Reading API...');
    
    try {
        const url = `${CONFIG.baseUrl}/api/bible?ref=${CONFIG.baseUrl}`;
        const response = await makeRequest(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.bibleApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            logSuccess('Daily Bible Reading API: PASSED');
            log(`Response length: ${response.data.length} characters`, 'cyan');
            return true;
        } else {
            logError(`Daily Bible Reading API: FAILED (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        logError(`Daily Bible Reading API: FAILED - ${error.message}`);
        return false;
    }
}

// Test bible verse API
async function testBibleVerse() {
    logInfo('Testing Bible Verse API...');
    
    try {
        const testVerse = 'Genesis 1:1';
        const url = `${CONFIG.baseUrl}/api/bible/verse/${CONFIG.bibleId}/search?query=${encodeURIComponent(testVerse)}`;
        const response = await makeRequest(url, {
            headers: {
                'api-key': CONFIG.verseApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            logSuccess('Bible Verse API: PASSED');
            try {
                const data = JSON.parse(response.data);
                log(`Verse found: ${data.data?.passages?.[0]?.reference || 'Unknown'}`, 'cyan');
            } catch (e) {
                logWarning('Response is not valid JSON');
            }
            return true;
        } else {
            logError(`Bible Verse API: FAILED (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        logError(`Bible Verse API: FAILED - ${error.message}`);
        return false;
    }
}

// Test configuration
function testConfiguration() {
    logInfo('Testing Configuration...');
    
    const issues = [];
    
    if (!CONFIG.bibleApiKey || CONFIG.bibleApiKey === 'your_bible_api_key_here') {
        issues.push('Bible API key not configured');
    }
    
    if (!CONFIG.verseApiKey || CONFIG.verseApiKey === 'your_verse_api_key_here') {
        issues.push('Verse API key not configured');
    }
    
    if (!CONFIG.baseUrl) {
        issues.push('Base URL not configured');
    }
    
    if (issues.length === 0) {
        logSuccess('Configuration: PASSED');
        return true;
    } else {
        logError(`Configuration: FAILED - ${issues.join(', ')}`);
        return false;
    }
}

// Test network connectivity
async function testConnectivity() {
    logInfo('Testing Network Connectivity...');
    
    try {
        const url = `${CONFIG.baseUrl}/health`;
        const response = await makeRequest(url);
        
        if (response.status === 200) {
            logSuccess('Network Connectivity: PASSED');
            return true;
        } else {
            logWarning(`Network Connectivity: WARNING (Status: ${response.status})`);
            return true; // Still consider it a pass if we get any response
        }
    } catch (error) {
        logError(`Network Connectivity: FAILED - ${error.message}`);
        return false;
    }
}

// Main test function
async function runTests() {
    log('🧪 Bible Integration Quick Test', 'bright');
    log('================================', 'bright');
    log('');
    
    const results = {
        config: testConfiguration(),
        connectivity: await testConnectivity(),
        dailyReading: await testDailyReading(),
        bibleVerse: await testBibleVerse()
    };
    
    log('');
    log('📊 Test Results Summary', 'bright');
    log('========================', 'bright');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    for (const [test, result] of Object.entries(results)) {
        const status = result ? 'PASSED' : 'FAILED';
        const color = result ? 'green' : 'red';
        log(`${result ? '✅' : '❌'} ${test.replace(/([A-Z])/g, ' $1').trim()}: ${status}`, color);
    }
    
    log('');
    log(`Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
        logSuccess('🎉 All tests passed! Your bible integration is ready to use.');
    } else {
        logWarning('⚠️  Some tests failed. Please check the configuration and try again.');
        log('');
        logInfo('Next steps:');
        log('1. Verify your API keys are correct', 'cyan');
        log('2. Check your network connectivity', 'cyan');
        log('3. Ensure the production API is accessible', 'cyan');
        log('4. Run the full test suite: node test-server.js', 'cyan');
    }
    
    log('');
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(error => {
        logError(`Test execution failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { runTests, testDailyReading, testBibleVerse, testConfiguration, testConnectivity }; 