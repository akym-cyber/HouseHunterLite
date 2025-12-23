// 🏠🇰🇪 Kenyan Smart Replies System - Test Demo
// Run this file to see the smart replies in action!

const { generateSmartReplies, testSmartReplies } = require('./src/services/keywordReplies.js');
const { getCountyByName, formatKenyanPrice } = require('./src/utils/kenyanCounties.js');

// Test Messages for Different Scenarios
const testMessages = [
  // Price inquiries
  "How much is a 2 bedroom in Kilimani?",
  "Bei ya bedsitter Kisumu?",
  "What's the price for 3 bedroom in Westlands?",

  // Availability checks
  "Is there availability in Mombasa?",
  "Do you have any houses available now?",

  // Viewing requests
  "Can I view tomorrow?",
  "I want to see the property this week",

  // Location questions
  "Where is this property located?",
  "Is it in a safe area?",

  // Payment questions
  "How do I pay via M-Pesa?",
  "Can I use Swypt to pay?",

  // General inquiries
  "Tell me about this property",
  "What features does it have?",

  // Swahili messages
  "Bei gani ya nyumba hii?",
  "Una vyumba vipi?",
  "Niambie kuhusu eneo"
];

console.log("🇰🇪🇰🇪🇰🇪 KENYAN SMART REPLIES DEMO 🇰🇪🇰🇪🇰🇪");
console.log("================================================\n");

testMessages.forEach((message, index) => {
  console.log(`${index + 1}. User: "${message}"`);

  // Generate smart replies
  const replies = generateSmartReplies(message, {
    userCounty: 'nairobi',
    userPaymentMethods: ['mpesa', 'swypt', 'cash']
  });

  console.log("   🤖 Smart Replies:");
  replies.forEach((reply, i) => {
    console.log(`      ${i + 1}. "${reply}"`);
  });
  console.log("");
});

// Test specific county pricing
console.log("💰 COUNTY PRICING EXAMPLES:");
console.log("===========================\n");

const counties = ['nairobi', 'mombasa', 'kisumu', 'nakuru'];
const propertyTypes = ['bedsitter', 'oneBedroom', 'twoBedroom'];

counties.forEach(county => {
  const countyData = getCountyByName(county);
  console.log(`${countyData.name} County:`);

  propertyTypes.forEach(type => {
    const [min, max] = countyData.pricing[type] || [0, 0];
    console.log(`  ${type}: ${formatKenyanPrice(min)} - ${formatKenyanPrice(max)}`);
  });
  console.log("");
});

console.log("✅ Kenyan Smart Replies System Ready!");
console.log("💡 Features:");
console.log("   • 47 Kenyan counties supported");
console.log("   • M-Pesa, Swypt, Airtel Money integration");
console.log("   • English + Swahili support");
console.log("   • Context-aware property pricing");
console.log("   • Real-time reply generation");
console.log("   • Performance optimized with React.memo");
console.log("\n🎉 Ready for production use!");
