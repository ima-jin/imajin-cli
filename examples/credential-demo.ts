/**
 * Credential Management System Demo
 * 
 * This example demonstrates how to use the imajin-cli credential management system
 * to securely store and retrieve API keys and OAuth tokens.
 */

import { CredentialManager } from '../src/core/credentials/CredentialManager.js';
import type { CredentialData } from '../src/core/credentials/interfaces.js';
import { Logger } from '../src/logging/Logger.js';

async function demonstrateCredentialManagement() {
    console.log('🔐 Imajin CLI Credential Management Demo\n');

    // Initialize credential manager with logger
    const logger = new Logger('info', true);
    const credentialManager = new CredentialManager(logger);

    // Show current provider information
    const providerInfo = credentialManager.getProviderInfo();
    console.log(`📦 Active Provider: ${providerInfo.name}`);
    console.log(`   Type: ${providerInfo.type}`);
    console.log(`   Secure: ${providerInfo.isSecure ? 'Yes' : 'No'}`);
    console.log(`   Native: ${providerInfo.isNative ? 'Yes' : 'No'}\n`);

    // Example 1: Store API Key credentials
    console.log('📝 Example 1: Storing API Key credentials');
    const stripeCredentials: CredentialData = {
        apiKey: 'sk_test_51234567890abcdef',
        metadata: {
            environment: 'test',
            description: 'Stripe test API key'
        }
    };

    try {
        await credentialManager.store('stripe', stripeCredentials);
        console.log('✅ Stripe credentials stored successfully\n');
    } catch (error) {
        console.error('❌ Failed to store Stripe credentials:', error);
    }

    // Example 2: Store OAuth credentials
    console.log('📝 Example 2: Storing OAuth credentials');
    const githubCredentials: CredentialData = {
        accessToken: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
        refreshToken: 'ghr_1234567890abcdefghijklmnopqrstuvwxyz',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        scopes: ['repo', 'user:email'],
        metadata: {
            username: 'example-user',
            description: 'GitHub OAuth token'
        }
    };

    try {
        await credentialManager.store('github', githubCredentials);
        console.log('✅ GitHub credentials stored successfully\n');
    } catch (error) {
        console.error('❌ Failed to store GitHub credentials:', error);
    }

    // Example 3: List stored credentials
    console.log('📋 Example 3: Listing stored credentials');
    try {
        const services = await credentialManager.list();
        console.log(`Found ${services.length} configured services:`);
        for (const service of services) {
            const isValid = await credentialManager.test(service);
            const status = isValid ? '✅ Valid' : '❌ Invalid';
            console.log(`   ${service}: ${status}`);
        }
        console.log();
    } catch (error) {
        console.error('❌ Failed to list credentials:', error);
    }

    // Example 4: Retrieve and use credentials
    console.log('🔍 Example 4: Retrieving credentials');
    try {
        const retrievedStripe = await credentialManager.retrieve('stripe');
        if (retrievedStripe) {
            console.log('✅ Retrieved Stripe credentials');
            console.log(`   API Key: ${retrievedStripe.apiKey?.slice(0, 12)}...`);
            console.log(`   Environment: ${retrievedStripe.metadata?.environment}`);
        }

        const retrievedGitHub = await credentialManager.retrieve('github');
        if (retrievedGitHub) {
            console.log('✅ Retrieved GitHub credentials');
            console.log(`   Access Token: ${retrievedGitHub.accessToken?.slice(0, 12)}...`);
            console.log(`   Scopes: ${retrievedGitHub.scopes?.join(', ')}`);
            console.log(`   Expires: ${retrievedGitHub.expiresAt}`);
        }
        console.log();
    } catch (error) {
        console.error('❌ Failed to retrieve credentials:', error);
    }

    // Example 5: Test credential validity
    console.log('🧪 Example 5: Testing credential validity');
    try {
        const stripeValid = await credentialManager.test('stripe');
        const githubValid = await credentialManager.test('github');

        console.log(`Stripe credentials: ${stripeValid ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`GitHub credentials: ${githubValid ? '✅ Valid' : '❌ Invalid'}`);
        console.log();
    } catch (error) {
        console.error('❌ Failed to test credentials:', error);
    }

    // Example 6: Provider management
    console.log('🔧 Example 6: Provider management');
    try {
        const providers = credentialManager.getAvailableProviders();
        console.log('Available providers:');
        for (const provider of providers) {
            const status = provider.isActive ? '● Active' : '○ Available';
            console.log(`   ${status} ${provider.name} (${provider.type})`);
            console.log(`     ${provider.description}`);
        }
        console.log();
    } catch (error) {
        console.error('❌ Failed to get provider information:', error);
    }

    // Example 7: Clean up (optional)
    console.log('🧹 Example 7: Cleaning up demo credentials');
    try {
        await credentialManager.delete('stripe');
        await credentialManager.delete('github');
        console.log('✅ Demo credentials cleaned up\n');
    } catch (error) {
        console.error('❌ Failed to clean up credentials:', error);
    }

    console.log('🎉 Credential management demo completed!');
    console.log('\nTo use in your CLI:');
    console.log('  imajin auth setup stripe --api-key sk_test_...');
    console.log('  imajin auth setup github --access-token ghp_...');
    console.log('  imajin auth list');
    console.log('  imajin auth test stripe');
    console.log('  imajin auth provider --list');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateCredentialManagement().catch(console.error);
}

export { demonstrateCredentialManagement };
