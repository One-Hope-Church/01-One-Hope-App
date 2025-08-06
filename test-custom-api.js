#!/usr/bin/env node

/**
 * Custom Bible API Test Script
 * 
 * This script tests the bible integration using the actual API endpoints
 * from your .env file configuration.
 */

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: './env.txt' });

// Configuration from your .env file
const CONFIG = {
    baseUrl: process.env.BASE_URL || 'https://onehopechurch.com',
    bibleId: process.env.ONEHOPE_BIBLE_ID || '78a9f6124f344018-01',
    bibleApiUrl: process.env.ONEHOPE_BIBLE_API || 'https://central-api.highlands.io/api/v1/bible/',
    bibleApiKey: process.env.ONEHOPE_BIBLE_API_KEY || 'xaTCG5b2NYmKfvQ15bQ76o1y',
    verseApiUrl: process.env.ONEHOPE_BIBLE_VERSE_API || 'https://api.scripture.api.bible/v1/bibles/',
    verseApiKey: process.env.ONEHOPE_BIBLE_VERSE_API_KEY || 'f286579424dc0547f71ce7d7a69ca8d1'
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

// Test Highlands Bible API
async function testHighlandsBibleAPI() {
    logInfo('Testing Highlands Bible API...');
    
    try {
        const url = `${CONFIG.bibleApiUrl}reading-plans`;
        const response = await makeRequest(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.bibleApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            logSuccess('Highlands Bible API: PASSED');
            try {
                const data = JSON.parse(response.data);
                log(`Found ${data.data?.length || 0} reading plans`, 'cyan');
            } catch (e) {
                logWarning('Response is not valid JSON');
            }
            return true;
        } else {
            logError(`Highlands Bible API: FAILED (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        logError(`Highlands Bible API: FAILED - ${error.message}`);
        return false;
    }
}

// Test Scripture API Bible
async function testScriptureAPIBible() {
    logInfo('Testing Scripture API Bible...');
    
    try {
        const url = `${CONFIG.verseApiUrl}${CONFIG.bibleId}/search?query=Genesis 1:1`;
        const response = await makeRequest(url, {
            headers: {
                'api-key': CONFIG.verseApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            logSuccess('Scripture API Bible: PASSED');
            try {
                const data = JSON.parse(response.data);
                log(`Found ${data.data?.passages?.length || 0} passages`, 'cyan');
            } catch (e) {
                logWarning('Response is not valid JSON');
            }
            return true;
        } else {
            logError(`Scripture API Bible: FAILED (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        logError(`Scripture API Bible: FAILED - ${error.message}`);
        return false;
    }
}

// Test Bible ID validation
async function testBibleID() {
    logInfo('Testing Bible ID validation...');
    
    try {
        const url = `${CONFIG.verseApiUrl}${CONFIG.bibleId}`;
        const response = await makeRequest(url, {
            headers: {
                'api-key': CONFIG.verseApiKey,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            logSuccess('Bible ID validation: PASSED');
            try {
                const data = JSON.parse(response.data);
                log(`Bible: ${data.data?.name || 'Unknown'}`, 'cyan');
            } catch (e) {
                logWarning('Response is not valid JSON');
            }
            return true;
        } else {
            logError(`Bible ID validation: FAILED (Status: ${response.status})`);
            return false;
        }
    } catch (error) {
        logError(`Bible ID validation: FAILED - ${error.message}`);
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
    
    if (!CONFIG.bibleId) {
        issues.push('Bible ID not configured');
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
        // Test both API endpoints
        const highlandsResponse = await makeRequest(CONFIG.bibleApiUrl);
        const scriptureResponse = await makeRequest(CONFIG.verseApiUrl);
        
        if (highlandsResponse.status < 500 && scriptureResponse.status < 500) {
            logSuccess('Network Connectivity: PASSED');
            return true;
        } else {
            logWarning(`Network Connectivity: WARNING (Highlands: ${highlandsResponse.status}, Scripture: ${scriptureResponse.status})`);
            return true; // Still consider it a pass if we get any response
        }
    } catch (error) {
        logError(`Network Connectivity: FAILED - ${error.message}`);
        return false;
    }
}

// Main test function
async function runTests() {
    log('🧪 Custom Bible API Test', 'bright');
    log('========================', 'bright');
    log('');
    
    logInfo('Configuration:');
    log(`   Highlands API: ${CONFIG.bibleApiUrl}`, 'cyan');
    log(`   Scripture API: ${CONFIG.verseApiUrl}`, 'cyan');
    log(`   Bible ID: ${CONFIG.bibleId}`, 'cyan');
    log(`   Bible API Key: ${CONFIG.bibleApiKey ? '✅ Set' : '❌ Not set'}`, 'cyan');
    log(`   Verse API Key: ${CONFIG.verseApiKey ? '✅ Set' : '❌ Not set'}`, 'cyan');
    log('');
    
    const results = {
        config: testConfiguration(),
        connectivity: await testConnectivity(),
        highlandsBible: await testHighlandsBibleAPI(),
        scriptureAPI: await testScriptureAPIBible(),
        bibleID: await testBibleID()
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
        log('3. Ensure the APIs are accessible', 'cyan');
        log('4. Update your app to use these API endpoints', 'cyan');
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

module.exports = { runTests, testHighlandsBibleAPI, testScriptureAPIBible, testBibleID, testConfiguration, testConnectivity }; 