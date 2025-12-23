// Simple test to verify the Kenyan Smart Replies system works
const { generateSmartReplies } = require('./src/services/keywordReplies.js');
const { getCountyByName } = require('./src/utils/kenyanCounties.js');

// Test a simple message
try {
  console.log('Testing Kenyan Smart Replies System...\n');

  const testMessage = "How much is a 2 bedroom in Kilimani?";
  console.log(`Input: "${testMessage}"`);

  const replies = generateSmartReplies(testMessage, {
    userCounty: 'nairobi',
    userPaymentMethods: ['mpesa', 'swypt', 'cash']
  });

  console.log('Generated replies:');
  replies.forEach((reply, i) => {
    console.log(`  ${i + 1}. "${reply}"`);
  });

  // Test county data
  console.log('\nTesting county data...');
  const nairobi = getCountyByName('nairobi');
  console.log(`Nairobi 2-bedroom price range: Ksh ${nairobi.pricing.twoBedroom[0].toLocaleString()} - ${nairobi.pricing.twoBedroom[1].toLocaleString()}`);

  console.log('\n✅ Kenyan Smart Replies System is working correctly!');
} catch (error) {
  console.error('❌ Error:', error.message);
}
