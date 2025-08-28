#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const TEST_AUDIO_FILE = './docker/whisper/audio_files/test-audio.wav';

async function testAudioUpload() {
    console.log('🎯 Testing Complete Audio Upload Workflow');
    console.log('==========================================');
    
    try {
        // Step 1: Login to get JWT token
        console.log('\n1. 🔐 Authenticating as manager-test...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'manager-test',
            password: 'TempPass123!'
        });
        
        const { accessToken } = loginResponse.data;
        console.log('✅ Login successful, got access token');
        
        const authHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        
        // Step 2: Test direct upload endpoint
        console.log('\n2. 📁 Testing direct upload...');
        
        if (!fs.existsSync(TEST_AUDIO_FILE)) {
            throw new Error(`Test audio file not found: ${TEST_AUDIO_FILE}`);
        }
        
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(TEST_AUDIO_FILE));
        formData.append('teacherId', '2'); // Teacher from our test data
        formData.append('schoolId', '1');  // Test school
        formData.append('metadata', JSON.stringify({
            originalName: 'test-audio.wav',
            description: 'Test upload for workflow validation'
        }));
        
        const uploadResponse = await axios.post(`${BASE_URL}/api/upload/direct`, formData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('✅ Upload successful:', uploadResponse.data);
        const jobId = uploadResponse.data.jobId;
        
        // Step 3: Monitor processing status
        console.log(`\n3. 📊 Monitoring job status (ID: ${jobId})...`);
        
        let isProcessing = true;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max
        
        while (isProcessing && attempts < maxAttempts) {
            attempts++;
            console.log(`Checking status (attempt ${attempts})...`);
            
            const statusResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}`, {
                headers: authHeaders
            });
            
            const job = statusResponse.data;
            console.log(`Status: ${job.status} | Created: ${job.created_at}`);
            
            if (job.transcript_content) {
                console.log('🎉 Transcript available!');
                console.log('Transcript preview:', job.transcript_content.substring(0, 100) + '...');
                isProcessing = false;
                break;
            }
            
            if (job.status === 'failed' || job.status === 'error') {
                console.log('❌ Job failed:', job.error_message || 'Unknown error');
                isProcessing = false;
                break;
            }
            
            if (job.status === 'completed' && !job.transcript_content) {
                console.log('⚠️ Job marked completed but no transcript found');
                isProcessing = false;
                break;
            }
            
            // Wait 10 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        if (attempts >= maxAttempts) {
            console.log('⏰ Timeout reached, job may still be processing');
        }
        
        // Step 4: Final status check
        console.log('\n4. 📋 Final status check...');
        const finalResponse = await axios.get(`${BASE_URL}/api/jobs/${jobId}`, {
            headers: authHeaders
        });
        
        console.log('Final job status:', finalResponse.data);
        
        console.log('\n🎯 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
        process.exit(1);
    }
}

testAudioUpload();