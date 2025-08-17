#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test data for different hook events
const testEvents = {
    UserPromptSubmit: {
        session_id: 'test-session-123',
        hook_event_name: 'UserPromptSubmit',
        user_prompt: 'test message',
        timestamp: new Date().toISOString()
    },
    
    Notification: {
        session_id: 'test-session-123',
        hook_event_name: 'Notification',
        message: 'Test notification message',
        timestamp: new Date().toISOString()
    },
    
    Stop: {
        session_id: 'test-session-123',
        hook_event_name: 'Stop',
        reason: 'user_requested',
        timestamp: new Date().toISOString()
    }
};

// Function to test a specific hook event
function testHookEvent(eventName, eventData) {
    return new Promise((resolve, reject) => {
        console.log(`\n=== Testing ${eventName} Hook ===`);
        console.log('Input data:', JSON.stringify(eventData, null, 2));
        
        const hookScript = join(__dirname, 'claude-deck.js');
        const child = spawn('node', [hookScript], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            console.log('Hook output:', stdout.trim());
            if (stderr) {
                console.log('Hook errors:', stderr.trim());
            }
            console.log('Exit code:', code);
            
            resolve({
                eventName,
                exitCode: code,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
        
        child.on('error', (error) => {
            console.error('Failed to start hook:', error);
            reject(error);
        });
        
        // Send the test data as JSON to stdin
        child.stdin.write(JSON.stringify(eventData));
        child.stdin.end();
    });
}

// Function to test all events
async function runAllTests() {
    console.log('ClaudeDeck Hook Test Suite');
    console.log('==========================');
    
    const results = [];
    
    for (const [eventName, eventData] of Object.entries(testEvents)) {
        try {
            const result = await testHookEvent(eventName, eventData);
            results.push(result);
            
            // Wait a bit between tests
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`Failed to test ${eventName}:`, error);
            results.push({
                eventName,
                error: error.message
            });
        }
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    results.forEach(result => {
        if (result.error) {
            console.log(`❌ ${result.eventName}: ERROR - ${result.error}`);
        } else {
            const status = result.exitCode === 0 ? '✅' : '❌';
            console.log(`${status} ${result.eventName}: Exit Code ${result.exitCode}`);
        }
    });
}

// Function to test a single event (can be called with command line arg)
async function testSingleEvent(eventName) {
    if (!testEvents[eventName]) {
        console.error(`Unknown event: ${eventName}`);
        console.log('Available events:', Object.keys(testEvents).join(', '));
        process.exit(1);
    }
    
    try {
        await testHookEvent(eventName, testEvents[eventName]);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Main execution
const eventArg = process.argv[2];

if (eventArg) {
    // Test specific event
    testSingleEvent(eventArg);
} else {
    // Test all events
    runAllTests();
}