// Kenyan Property Chat Keyword Detection Patterns
export const PROPERTY_TYPE_PATTERNS = {
  bedsitter: /\b(bedsitter|single|studio|mq|one\s+room|single\s+room)\b/i,
  oneBedroom: /\b(one\s+bedroom|1br|1\s+bedroom|bedroom)\b/i,
  twoBedroom: /\b(two\s+bedroom|2br|2\s+bedroom|double)\b/i,
  threeBedroom: /\b(three\s+bedroom|3br|3\s+bedroom|master)\b/i,
  fourBedroom: /\b(four\s+bedroom|4br|4\s+bedroom|ensuite)\b/i,
  maisonette: /\b(maisonette|maiso|duplex|two\s+story)\b/i,
  apartment: /\b(apartment|flat|block)\b/i,
  standalone: /\b(standalone|bungalow|house|nyumba)\b/i,
};

export const INTENT_PATTERNS = {
  price: /\b(price|cost|amount|bei|gharama|kiasi|how\s+much)\b/i,
  availability: /\b(available|vacant|empty|free|open|iko|patikana)\b/i,
  location: /\b(where|location|area|place|mahali)\b/i,
  viewing: /\b(viewing|visit|see|angalia|tembelea|ona)\b/i,
  deposit: /\b(deposit|nyarua|akiba|dhamana)\b/i,
  rent: /\b(rent|kodi|ukodisha|malipo\s+ya\s+mwezi)\b/i,
  features: /\b(features|bathroom|kitchen|parking|garden|balcony)\b/i,
  contact: /\b(contact|call|phone|number|simu)\b/i,
  payment: /\b(pay|payment|mpesa|airtel|swypt|cash|bank)\b/i,
  negotiation: /\b(negotiable|negotiate|discount|reduce|punguza|kubali)\b/i,
};

export const AREA_PATTERNS = {
  // Nairobi areas
  westlands: /\b(westlands|westy)\b/i,
  kilimani: /\b(kilimani|kili)\b/i,
  koinange: /\b(koinange|koinange\s+street)\b/i,
  riverRoad: /\b(river\s+road|river\s+rd)\b/i,
  cbd: /\b(cbd|town|central|business\s+district)\b/i,
  lavington: /\b(lavington|lavy)\b/i,
  kilimani: /\b(kilimani|kili)\b/i,
  parklands: /\b(parklands|parkie)\b/i,
  karen: /\b(karen)\b/i,
  langata: /\b(langata)\b/i,

  // Mombasa areas
  nyali: /\b(nyali)\b/i,
  kilindini: /\b(kilindini)\b/i,
  bamburi: /\b(bamburi)\b/i,
  mombasaCbd: /\b(mombasa\s+cbd|mombasa\s+town)\b/i,

  // Kisumu areas
  milimani: /\b(milimani)\b/i,
  kondele: /\b(kondele)\b/i,
  kisumuCbd: /\b(kisumu\s+cbd|town)\b/i,
};

export const PAYMENT_PATTERNS = {
  mpesa: /\b(mpesa|lipa\s+na\s+mpesa|m\s+pessa)\b/i,
  swypt: /\b(swypt|swipt)\b/i,
  airtel: /\b(airtel|airtel\s+money)\b/i,
  cash: /\b(cash|fedha|pesa)\b/i,
  bank: /\b(bank|transfer|bank\s+transfer)\b/i,
  cheque: /\b(cheque|check)\b/i,
};

export const COUNTY_PATTERNS = {
  nairobi: /\b(nairobi|nairobbery|nai)\b/i,
  mombasa: /\b(mombasa|mombas|mombasa\s+island)\b/i,
  kisumu: /\b(kisumu|kisumu\s+city)\b/i,
  nakuru: /\b(nakuru)\b/i,
  eldoret: /\b(eldoret)\b/i,
  thika: /\b(thika)\b/i,
  kisii: /\b(kisii)\b/i,
  meru: /\b(meru)\b/i,
  machakos: /\b(machakos)\b/i,
  kitui: /\b(kitui)\b/i,
};

export const TIME_PATTERNS = {
  now: /\b(now|immediately|today|asap|haraka)\b/i,
  thisWeek: /\b(this\s+week|next\s+few\s+days)\b/i,
  nextWeek: /\b(next\s+week)\b/i,
  thisMonth: /\b(this\s+month)\b/i,
  flexible: /\b(flexible|anytime|whenever)\b/i,
};

export const BUDGET_PATTERNS = {
  low: /\b(cheap|low\s+budget|under\s+\d+|chini\s+ya)\b/i,
  medium: /\b(medium|average|around\s+\d+)\b/i,
  high: /\b(expensive|high\s+end|luxury|above\s+\d+)\b/i,
};

// Swahili/Sheng terms
export const SWAHILI_PATTERNS = {
  greetings: /\b(sasa|habari|karibu|asante|tafadhali)\b/i,
  questions: /\b(bei\s+gani|iko\s+wapi|una\s+nini)\b/i,
  agreements: /\b(sawa|ndio|poa|mzuri)\b/i,
  negations: /\b(hapana|kwa\s+sasa)\b/i,
};

// Helper functions for pattern matching
export const detectIntent = (message) => {
  const intents = [];

  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(message)) {
      intents.push(intent);
    }
  }

  return intents;
};

export const detectPropertyType = (message) => {
  for (const [type, pattern] of Object.entries(PROPERTY_TYPE_PATTERNS)) {
    if (pattern.test(message)) {
      return type;
    }
  }
  return null;
};

export const detectArea = (message) => {
  for (const [area, pattern] of Object.entries(AREA_PATTERNS)) {
    if (pattern.test(message)) {
      return area;
    }
  }
  return null;
};

export const detectCounty = (message) => {
  for (const [county, pattern] of Object.entries(COUNTY_PATTERNS)) {
    if (pattern.test(message)) {
      return county;
    }
  }
  return null;
};

export const detectPaymentMethod = (message) => {
  for (const [method, pattern] of Object.entries(PAYMENT_PATTERNS)) {
    if (pattern.test(message)) {
      return method;
    }
  }
  return null;
};

export const detectBudgetRange = (message) => {
  const priceMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
  if (priceMatch) {
    const prices = priceMatch.map(p => parseInt(p.replace(/,/g, '')));
    const maxPrice = Math.max(...prices);

    if (maxPrice < 15000) return 'low';
    if (maxPrice < 50000) return 'medium';
    return 'high';
  }

  for (const [range, pattern] of Object.entries(BUDGET_PATTERNS)) {
    if (pattern.test(message)) {
      return range;
    }
  }

  return 'medium'; // default
};

export const extractPriceFromMessage = (message) => {
  const priceMatch = message.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
  if (priceMatch) {
    return priceMatch.map(p => parseInt(p.replace(/,/g, '')));
  }
  return [];
};

export const isSwahiliMessage = (message) => {
  let swahiliWords = 0;
  const words = message.toLowerCase().split(/\s+/);

  for (const word of words) {
    if (SWAHILI_PATTERNS.greetings.test(word) ||
        SWAHILI_PATTERNS.questions.test(word) ||
        SWAHILI_PATTERNS.agreements.test(word) ||
        SWAHILI_PATTERNS.negations.test(word)) {
      swahiliWords++;
    }
  }

  return swahiliWords > words.length * 0.3; // 30% Swahili words threshold
};

export const detectUrgency = (message) => {
  for (const [time, pattern] of Object.entries(TIME_PATTERNS)) {
    if (pattern.test(message)) {
      return time;
    }
  }
  return 'flexible';
};
