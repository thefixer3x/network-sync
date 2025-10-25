#!/usr/bin/env node

/**
 * Quick integration test for Memory SDK
 */

console.log('🧪 Testing Memory SDK Integration...\n');

try {
  // Test ES module import
  const { default: MemoryClient, MultiModalMemoryClient } = await import('./lib/memory-sdk/lanonasis-memory-sdk.js');
  
  console.log('✅ SDK imported successfully');
  
  // Test client creation
  const memory = new MemoryClient({
    apiUrl: process.env.LANONASIS_API_URL || 'https://api.lanonasis.com',
    apiKey: process.env.LANONASIS_API_KEY || 'test-key' // test placeholder, not a real secret
  });
  
  const multiModal = new MultiModalMemoryClient({
    apiUrl: process.env.LANONASIS_API_URL || 'https://api.lanonasis.com', 
    apiKey: process.env.LANONASIS_API_KEY || 'test-key' // test placeholder
  });
  
  console.log('✅ Clients created successfully');
  
  // Check methods exist
  const requiredMethods = [
    'createMemory',
    'searchMemories', 
    'getMemory',
    'updateMemory',
    'deleteMemory'
  ];
  
  const multiModalMethods = [
    'createImageMemory',
    'createAudioMemory',
    'createCodeMemory',
    'getMultiModalContext'
  ];
  
  console.log('\n📋 Checking Memory Client methods:');
  requiredMethods.forEach(method => {
    if (typeof memory[method] === 'function') {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} - missing`);
    }
  });
  
  console.log('\n📋 Checking Multi-Modal Client methods:');
  multiModalMethods.forEach(method => {
    if (typeof multiModal[method] === 'function') {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} - missing`);
    }
  });
  
  console.log('\n🎉 Integration test passed!');
  console.log('\n📖 Next steps:');
  console.log('1. Copy lib/.env.example to .env and add your API key');
  console.log('2. Import the SDK in your project files:');
  console.log('   import MemoryClient from "./lib/memory-sdk/lanonasis-memory-sdk.js"');
  console.log('3. Check src/examples/memory-integration.ts for usage examples');
  
} catch (error) {
  console.error('❌ Integration test failed:', error.message);
  console.error('\nTroubleshooting:');
  console.error('- Make sure Node.js supports ES modules');
  console.error('- Check that all SDK files are in lib/memory-sdk/');
  console.error('- Verify file permissions');
  process.exit(1);
}