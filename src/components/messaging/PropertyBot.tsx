import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Modal,
  Portal,
  FAB,
} from 'react-native-paper';
import { Property } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/useTheme';

interface PropertyBotProps {
  property?: Property;
  lastMessage?: string;
  onSendBotResponse: (message: string) => Promise<void>;
  visible: boolean;
  onDismiss: () => void;
}

// Kenyan property FAQs and responses
const KENYAN_PROPERTY_FAQS = {
  // Security & Safety
  security: {
    keywords: ['security', 'safe', 'guard', 'watchman', 'alarm', 'gate', 'compound'],
    response: (property?: Property) => `🔒 Security Information for Kenyan Properties

• Most properties in Kenya have 24/7 security guards (askaris)
• Gated communities provide additional security
• CCTV cameras are common in premium properties
• Security deposits help cover potential damages
• Emergency contacts: Local police (999), property manager

For this property: Standard Kenyan security measures apply`,
  },

  // Utilities
  utilities: {
    keywords: ['electricity', 'water', 'kplc', 'nwc', 'utilities', 'bills', 'power', 'water bill'],
    response: (property?: Property) => `⚡ Utility Information for Kenya

• KPLC (Kenya Power & Lighting Company) handles electricity
• Nairobi Water Company (NWC) manages water supply
• Average electricity cost: KSh 8-15 per unit
• Water: KSh 100-300 per month (depending on usage)
• Internet: KSh 3,000-8,000 per month
• DSTV/Cable TV: KSh 2,000-5,000 per month

This property: ${property?.utilitiesIncluded ? "Utilities included in rent" : "Utilities billed separately"}`,
  },

  // Transport & Location
  transport: {
    keywords: ['transport', 'matatu', 'bus', 'taxi', 'uber', 'location', 'distance', 'commute'],
    response: (property?: Property) => `🚗 Transport & Location Guide

• Matatus are the main public transport (KSh 20-100 per trip)
• Uber/Bolt available in major towns
• Traffic can be heavy during rush hours (7-9 AM, 5-7 PM)
• Walking distance to key areas: Check with property owner
• Parking: ${property?.parkingAvailable ? "Available" : "Limited parking"}

Kenyan driving tip: Always carry your ID when driving!`,
  },

  // Rent & Deposits
  rent: {
    keywords: ['rent', 'deposit', 'payment', 'due date', 'late fee', 'advance'],
    response: (property?: Property) => `💰 Rent & Payment Information

• Rent due: 1st of each month (standard in Kenya)
• Late fees: Usually KSh 500-2,000 per day after 5th
• Security deposit: 1-2 months rent (refundable)
• Payment methods: M-Pesa, bank transfer, cash
• Receipts: Always get official receipts

For this property:
• Monthly rent: KSh ${property?.price.toLocaleString() || 'N/A'}
• Security deposit: KSh ${(property?.deposit || (property?.price || 0) * 2).toLocaleString()}`,
  },

  // Move-in Process
  movein: {
    keywords: ['move in', 'move-in', 'checklist', 'inventory', 'inspection', 'agreement'],
    response: () => `📋 Move-in Checklist for Kenyan Properties

• Tenancy agreement signing (both parties)
• Property inspection with inventory list
• Security deposit payment
• Utility account transfers (KPLC, water)
• Key handover and spare keys
• Emergency contact information
• Property rules and regulations
• Neighbour introductions

Important: Take photos of the property condition before moving in!`,
  },

  // Maintenance & Repairs
  maintenance: {
    keywords: ['repair', 'maintenance', 'fix', 'broken', 'leak', 'electrician', 'plumber', 'fundi'],
    response: () => `🔧 Maintenance & Repairs in Kenya

• Minor repairs: Usually tenant's responsibility
• Major repairs: Landlord/owner's responsibility
• Emergency contacts for common issues:
  - Plumbing: Local plumber (KSh 1,000-3,000)
  - Electrical: Registered electrician (KSh 2,000-5,000)
  - General: "Fundi" (handyman) services

Report issues promptly with photos. Response time: 24-48 hours for urgent matters.`,
  },

  // Legal & Regulations
  legal: {
    keywords: ['law', 'legal', 'rights', 'tenant rights', 'eviction', 'notice', 'contract'],
    response: () => `⚖️ Kenyan Tenant Rights & Laws

• Landlord-Tenant Act (Chapter 301) governs relationships
• Minimum notice period: 1 month for month-to-month tenancies
• Security deposit limits: Maximum 2 months rent
• Rent increases: Maximum 10% per year (with agreement)
• Eviction requires court order (no self-help eviction)

Always get everything in writing and keep records!

This property complies with Kenyan tenancy laws.`,
  },

  // Pets & Restrictions
  pets: {
    keywords: ['pet', 'dog', 'cat', 'animal', 'pet friendly'],
    response: (property?: Property) => `🐕 Pet Policy Information

This property ${property?.petFriendly ? "allows pets" : "does not allow pets"}

• Pet deposit: Usually KSh 5,000-20,000 (refundable)
• Breed restrictions: May apply for certain breeds
• Pet rules: Leash laws, waste cleanup, noise considerations
• Vaccination requirements: Rabies vaccination mandatory

Kenyan pet ownership tip: Register your pet with local authorities!`,
  },

  // Neighbourhood & Lifestyle
  neighbourhood: {
    keywords: ['neighbour', 'neighbourhood', 'area', 'community', 'lifestyle', 'amenities'],
    response: () => `🏘️ Neighbourhood Information

• Local amenities: Supermarkets, banks, hospitals within 2-5km
• Community: Residential area with local businesses
• Safety rating: Standard for the area
• Schools: Public and private schools available
• Healthcare: Local clinics and hospitals accessible

Perfect for: Families, young professionals, students`,
  },

  // Internet & Technology
  internet: {
    keywords: ['internet', 'wifi', 'broadband', 'fiber', '4g', '5g', 'streaming'],
    response: () => `📡 Internet & Connectivity in Kenya

• Major providers: Safaricom, Airtel, Telkom Kenya
• Fiber internet: Available in most urban areas (KSh 3,000-8,000/month)
• 4G/5G coverage: Good in Nairobi and major towns
• Speed: 10-100 Mbps typical for residential
• Data costs: KSh 50-200 per GB
• Streaming: Netflix, Showmax, DSTV widely available

This property: Standard broadband available`,
  },
};

export default function PropertyBot({
  property,
  lastMessage = '',
  onSendBotResponse,
  visible,
  onDismiss,
}: PropertyBotProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze last message and suggest responses
  useEffect(() => {
    if (lastMessage && visible) {
      analyzeMessage(lastMessage);
    }
  }, [lastMessage, visible]);

  const analyzeMessage = async (message: string) => {
    setIsAnalyzing(true);
    const messageLower = message.toLowerCase();
    const suggestions: string[] = [];

    // Check for FAQ keywords
    Object.entries(KENYAN_PROPERTY_FAQS).forEach(([key, faq]) => {
      const hasKeyword = faq.keywords.some(keyword =>
        messageLower.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        const response = typeof faq.response === 'function' ? faq.response(property) : faq.response;
        suggestions.push(response);
      }
    });

    // Add generic helpful responses if no specific matches
    if (suggestions.length === 0) {
      suggestions.push(
        "I'm here to help with any questions about Kenyan property rental! Ask me about security, utilities, transport, legal rights, or any other concerns.",
        "Common questions include: security deposits, utility costs, transport options, maintenance procedures, and tenant rights under Kenyan law."
      );
    }

    setSuggestedResponses(suggestions);
    setIsAnalyzing(false);
  };

  const sendBotResponse = async (response: string) => {
    try {
      await onSendBotResponse(`🤖 Property Assistant:\n\n${response}`);
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to send response');
    }
  };

  const getQuickResponses = () => [
    {
      title: 'Security Info',
      message: KENYAN_PROPERTY_FAQS.security.response(property),
      icon: 'shield',
    },
    {
      title: 'Payment Info',
      message: KENYAN_PROPERTY_FAQS.rent.response(property),
      icon: 'cash',
    },
    {
      title: 'Move-in Guide',
      message: KENYAN_PROPERTY_FAQS.movein.response(),
      icon: 'checklist',
    },
    {
      title: 'Legal Rights',
      message: KENYAN_PROPERTY_FAQS.legal.response(),
      icon: 'scale-balance',
    },
  ];

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card style={styles.card}>
          <Card.Title
            title="Property Assistant"
            subtitle="Kenyan rental expert"
            right={(props) => (
              <IconButton {...props} icon="close" onPress={onDismiss} />
            )}
          />

          <Card.Content>
            {/* Quick Response Buttons */}
            <View style={styles.quickResponses}>
              <Text style={styles.sectionTitle}>Quick Responses</Text>
              <View style={styles.quickButtons}>
                {getQuickResponses().map((response, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickButton}
                    onPress={() => sendBotResponse(response.message)}
                  >
                    <IconButton icon={response.icon} size={20} />
                    <Text style={styles.quickButtonText}>{response.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Analyzed Suggestions */}
            {isAnalyzing ? (
              <View style={styles.analyzing}>
                <Text>Analyzing your message...</Text>
              </View>
            ) : suggestedResponses.length > 0 ? (
              <View style={styles.suggestions}>
                <Text style={styles.sectionTitle}>Suggested Responses</Text>
                {suggestedResponses.map((response, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => sendBotResponse(response)}
                  >
                    <Text style={styles.suggestionText} numberOfLines={3}>
                      {response}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* FAQ Categories */}
            <View style={styles.faqCategories}>
              <Text style={styles.sectionTitle}>FAQ Categories</Text>
              <View style={styles.categoryChips}>
                {Object.keys(KENYAN_PROPERTY_FAQS).map((category) => (
                  <Chip
                    key={category}
                    style={styles.categoryChip}
                    onPress={() => {
                      const faq = KENYAN_PROPERTY_FAQS[category as keyof typeof KENYAN_PROPERTY_FAQS];
                      const response = typeof faq.response === 'function' ? faq.response(property) : faq.response;
                      sendBotResponse(response);
                    }}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Chip>
                ))}
              </View>
            </View>

            {/* Kenyan Context Note */}
            <View style={styles.kenyanNote}>
              <Text style={styles.kenyanTitle}>🇰🇪 Kenyan Property Expert</Text>
              <Text style={styles.kenyanText}>
                All responses are tailored for the Kenyan rental market and comply with local laws and customs.
              </Text>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  card: {
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  quickResponses: {
    marginBottom: 16,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    marginBottom: 8,
  },
  quickButtonText: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  analyzing: {
    alignItems: 'center',
    padding: 20,
  },
  suggestions: {
    marginBottom: 16,
  },
  suggestionItem: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  faqCategories: {
    marginBottom: 16,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  kenyanNote: {
    backgroundColor: theme.colors.primaryContainer,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  kenyanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onPrimaryContainer,
    marginBottom: 8,
  },
  kenyanText: {
    fontSize: 12,
    color: theme.colors.onPrimaryContainer,
    lineHeight: 18,
  },
});
