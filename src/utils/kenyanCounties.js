// Kenyan Counties Data - All 47 Counties with Property Market Data
export const KENYAN_COUNTIES = {
  // NAIROBI REGION
  nairobi: {
    name: 'Nairobi',
    capital: 'Nairobi City',
    code: '047',
    region: 'Nairobi',
    areas: [
      'Westlands', 'Kiliman', 'Parklands', 'River Road', 'CBD',
      'Karen', 'Langata', 'Runda', 'Mombasa Road', 'Thika Road',
      'Lavington', 'Hurligham', 'Kilimani', 'Koinange Street', 'Tom Mboya Street',
      'Majengo', 'Pipeline', 'Umoja', 'Eastlands', 'Westlands',
      'Yaya Centre', 'The Junction', 'Sarit Centre', 'Village Market',
      'Koinange Street', 'Tom Mboya Street', 'Luthuli Avenue'
    ],
    pricing: {
      bedsitter: [12000, 25000],      // Ksh 12,000 - 25,000
      oneBedroom: [20000, 45000],     // Ksh 20,000 - 45,000
      twoBedroom: [35000, 80000],     // Ksh 35,000 - 80,000
      threeBedroom: [60000, 150000],  // Ksh 60,000 - 150,000
      fourBedroom: [100000, 300000],  // Ksh 100,000 - 300,000
      maisonette: [40000, 120000],    // Ksh 40,000 - 120,000
      apartment: [25000, 100000]      // Ksh 25,000 - 100,000
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa',
    localTerms: {
      expensive: 'expensive',
      cheap: 'cheap',
      good: 'good',
      location: 'area',
      deposit: 'deposit'
    }
  },

  // COAST REGION
  mombasa: {
    name: 'Mombasa',
    capital: 'Mombasa',
    code: '001',
    region: 'Coast',
    areas: [
      'Nyali', 'Kilindini', 'Koinange Street', 'Digo Road', 'Majengo',
      'Bamburi', 'Mombasa CBD', 'Port Reitz', 'Mikindani', 'Tudor',
      'Mombasa Island', 'Old Town', 'Fort Jesus', 'Shimanzi', 'Kizingo'
    ],
    pricing: {
      bedsitter: [8000, 18000],       // Ksh 8,000 - 18,000
      oneBedroom: [12000, 30000],     // Ksh 12,000 - 30,000
      twoBedroom: [20000, 55000],     // Ksh 20,000 - 55,000
      threeBedroom: [35000, 90000],   // Ksh 35,000 - 90,000
      fourBedroom: [60000, 150000],   // Ksh 60,000 - 150,000
      maisonette: [25000, 70000],     // Ksh 25,000 - 70,000
      apartment: [18000, 60000]       // Ksh 18,000 - 60,000
    },
    paymentMethods: ['mpesa', 'airtel', 'bank', 'cash'],
    popularPayment: 'mpesa',
    localTerms: {
      expensive: 'expensive',
      cheap: 'cheap',
      good: 'good',
      location: 'area',
      deposit: 'deposit'
    }
  },

  kwale: {
    name: 'Kwale',
    capital: 'Kwale',
    code: '002',
    region: 'Coast',
    areas: ['Diani Beach', 'Ukunda', 'Kinondo', 'Ramisi', 'Msambweni'],
    pricing: {
      bedsitter: [5000, 12000],
      oneBedroom: [8000, 20000],
      twoBedroom: [12000, 35000],
      threeBedroom: [20000, 50000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kilifi: {
    name: 'Kilifi',
    capital: 'Kilifi',
    code: '003',
    region: 'Coast',
    areas: ['Malindi', 'Watamu', 'Kilifi', 'Mtwapa', 'Vipingo'],
    pricing: {
      bedsitter: [6000, 14000],
      oneBedroom: [10000, 25000],
      twoBedroom: [15000, 40000],
      threeBedroom: [25000, 60000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  tana_river: {
    name: 'Tana River',
    capital: 'Hola',
    code: '004',
    region: 'Coast',
    areas: ['Hola', 'Garsen', 'Bura', 'Madogo'],
    pricing: {
      bedsitter: [3000, 8000],
      oneBedroom: [5000, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  lamu: {
    name: 'Lamu',
    capital: 'Lamu',
    code: '005',
    region: 'Coast',
    areas: ['Lamu Town', 'Shela', 'Matondoni', 'Kiunga'],
    pricing: {
      bedsitter: [4000, 10000],
      oneBedroom: [7000, 15000],
      twoBedroom: [10000, 22000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  taita_taveta: {
    name: 'Taita-Taveta',
    capital: 'Voi',
    code: '006',
    region: 'Coast',
    areas: ['Voi', 'Taveta', 'Wundanyi', 'Mwatate'],
    pricing: {
      bedsitter: [4000, 9000],
      oneBedroom: [6000, 14000],
      twoBedroom: [9000, 20000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  // NORTH EASTERN REGION
  garissa: {
    name: 'Garissa',
    capital: 'Garissa',
    code: '007',
    region: 'North Eastern',
    areas: ['Garissa Town', 'Dadaab', 'Modogashe', 'Ijara'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 9000],
      twoBedroom: [6000, 13000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  wajir: {
    name: 'Wajir',
    capital: 'Wajir',
    code: '008',
    region: 'North Eastern',
    areas: ['Wajir Town', 'Eldas', 'Bute', 'Tarbaj'],
    pricing: {
      bedsitter: [2500, 5500],
      oneBedroom: [3500, 8000],
      twoBedroom: [5500, 11000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  mandera: {
    name: 'Mandera',
    capital: 'Mandera',
    code: '009',
    region: 'North Eastern',
    areas: ['Mandera Town', 'Elwak', 'Takaba', 'Lafey'],
    pricing: {
      bedsitter: [2000, 5000],
      oneBedroom: [3000, 7000],
      twoBedroom: [5000, 10000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  // EASTERN REGION
  marsabit: {
    name: 'Marsabit',
    capital: 'Marsabit',
    code: '010',
    region: 'Eastern',
    areas: ['Marsabit Town', 'Moyale', 'Sololo', 'Laisamis'],
    pricing: {
      bedsitter: [2000, 4500],
      oneBedroom: [3000, 6500],
      twoBedroom: [4500, 9000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  isiolo: {
    name: 'Isiolo',
    capital: 'Isiolo',
    code: '011',
    region: 'Eastern',
    areas: ['Isiolo Town', 'Merti', 'Garbatulla', 'Oldonyiro'],
    pricing: {
      bedsitter: [2500, 5500],
      oneBedroom: [4000, 8000],
      twoBedroom: [6000, 12000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  meru: {
    name: 'Meru',
    capital: 'Meru',
    code: '012',
    region: 'Eastern',
    areas: ['Meru Town', 'Nkubu', 'Maua', 'Imenti', 'Buuri'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  tharaka_nithi: {
    name: 'Tharaka-Nithi',
    capital: 'Chuka',
    code: '013',
    region: 'Eastern',
    areas: ['Chuka', 'Maragwa', 'Muthambi', 'Kigogo'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 9000],
      twoBedroom: [6000, 13000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  embu: {
    name: 'Embu',
    capital: 'Embu',
    code: '014',
    region: 'Eastern',
    areas: ['Embu Town', 'Runyenjes', 'Manyatta', 'Mbeere'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kitui: {
    name: 'Kitui',
    capital: 'Kitui',
    code: '015',
    region: 'Eastern',
    areas: ['Kitui Town', 'Mwingi', 'Makueni', 'Mutomo'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 9000],
      twoBedroom: [6000, 14000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  machakos: {
    name: 'Machakos',
    capital: 'Machakos',
    code: '016',
    region: 'Eastern',
    areas: ['Machakos Town', 'Athi River', 'Kangundo', 'Tala'],
    pricing: {
      bedsitter: [4000, 10000],
      oneBedroom: [6000, 15000],
      twoBedroom: [9000, 22000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  makueni: {
    name: 'Makueni',
    capital: 'Wote',
    code: '017',
    region: 'Eastern',
    areas: ['Wote', 'Makueni', 'Kibwezi', 'Makindu'],
    pricing: {
      bedsitter: [2500, 6500],
      oneBedroom: [4000, 9500],
      twoBedroom: [6500, 14000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  // CENTRAL REGION
  nyandarua: {
    name: 'Nyandarua',
    capital: 'Ol Kalou',
    code: '018',
    region: 'Central',
    areas: ['Ol Kalou', 'Nyahururu', 'Naro Moru', 'Engineer'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  nyeri: {
    name: 'Nyeri',
    capital: 'Nyeri',
    code: '019',
    region: 'Central',
    areas: ['Nyeri Town', 'Othaya', 'Chaka', 'Karatina'],
    pricing: {
      bedsitter: [4000, 9000],
      oneBedroom: [6000, 13000],
      twoBedroom: [9000, 20000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kirinyaga: {
    name: 'Kirinyaga',
    capital: 'Kerugoya',
    code: '020',
    region: 'Central',
    areas: ['Kerugoya', 'Kutus', 'Sagana', 'Kianyaga'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  muranga: {
    name: 'Murang\'a',
    capital: 'Murang\'a',
    code: '021',
    region: 'Central',
    areas: ['Muranga Town', 'Kenol', 'Kandara', 'Makuyu'],
    pricing: {
      bedsitter: [3500, 8500],
      oneBedroom: [5500, 12500],
      twoBedroom: [8500, 19000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kiambu: {
    name: 'Kiambu',
    capital: 'Kiambu',
    code: '022',
    region: 'Central',
    areas: ['Kiambu Town', 'Thika', 'Limuru', 'Ruiru', 'Gatundu'],
    pricing: {
      bedsitter: [5000, 12000],
      oneBedroom: [8000, 18000],
      twoBedroom: [12000, 28000],
      threeBedroom: [20000, 50000]
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa'
  },

  // RIFT VALLEY REGION
  turkana: {
    name: 'Turkana',
    capital: 'Lodwar',
    code: '023',
    region: 'Rift Valley',
    areas: ['Lodwar', 'Kakuma', 'Lokitaung', 'Kalokol'],
    pricing: {
      bedsitter: [2000, 4500],
      oneBedroom: [3000, 6500],
      twoBedroom: [4500, 9500]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  west_pokot: {
    name: 'West Pokot',
    capital: 'Kapenguria',
    code: '024',
    region: 'Rift Valley',
    areas: ['Kapenguria', 'Sigor', 'Ortum', 'Chepareria'],
    pricing: {
      bedsitter: [2000, 4500],
      oneBedroom: [3000, 6500],
      twoBedroom: [4500, 9000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  samburu: {
    name: 'Samburu',
    capital: 'Maralal',
    code: '025',
    region: 'Rift Valley',
    areas: ['Maralal', 'Baragoi', 'Wamba', 'Archers Post'],
    pricing: {
      bedsitter: [2000, 4500],
      oneBedroom: [3000, 6500],
      twoBedroom: [4500, 8500]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  trans_nzoia: {
    name: 'Trans Nzoia',
    capital: 'Kitale',
    code: '026',
    region: 'Rift Valley',
    areas: ['Kitale', 'Kiminini', 'Saboti', 'Endebess'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  uasin_gishu: {
    name: 'Uasin Gishu',
    capital: 'Eldoret',
    code: '027',
    region: 'Rift Valley',
    areas: ['Eldoret', 'Moiben', 'Soy', 'Turbo'],
    pricing: {
      bedsitter: [4000, 9000],
      oneBedroom: [6000, 13000],
      twoBedroom: [9000, 20000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  elgeyo_marakwet: {
    name: 'Elgeyo-Marakwet',
    capital: 'Iten',
    code: '028',
    region: 'Rift Valley',
    areas: ['Iten', 'Tambach', 'Kapsowar', 'Marakwet'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 8500],
      twoBedroom: [6000, 12000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  nandi: {
    name: 'Nandi',
    capital: 'Kapsabet',
    code: '029',
    region: 'Rift Valley',
    areas: ['Kapsabet', 'Mosoriot', 'Nandi Hills', 'Tinderet'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  baringo: {
    name: 'Baringo',
    capital: 'Kabarnet',
    code: '030',
    region: 'Rift Valley',
    areas: ['Kabarnet', 'Eldama Ravine', 'Marigat', 'Mogotio'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 8500],
      twoBedroom: [6000, 12000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  laikipia: {
    name: 'Laikipia',
    capital: 'Rumuruti',
    code: '031',
    region: 'Rift Valley',
    areas: ['Nanyuki', 'Naro Moru', 'Rumuruti', 'Dol Dol'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  nakuru: {
    name: 'Nakuru',
    capital: 'Nakuru',
    code: '032',
    region: 'Rift Valley',
    areas: ['Nakuru Town', 'Naivasha', 'Gilgil', 'Narok'],
    pricing: {
      bedsitter: [5000, 11000],
      oneBedroom: [7500, 16000],
      twoBedroom: [11000, 25000],
      threeBedroom: [18000, 40000]
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa'
  },

  narok: {
    name: 'Narok',
    capital: 'Narok',
    code: '033',
    region: 'Rift Valley',
    areas: ['Narok Town', 'Kilgoris', 'Ololulung\'a', 'Suswa'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kajiado: {
    name: 'Kajiado',
    capital: 'Kajiado',
    code: '034',
    region: 'Rift Valley',
    areas: ['Kajiado Town', 'Kitengela', 'Ongata Rongai', 'Isinya'],
    pricing: {
      bedsitter: [6000, 13000],
      oneBedroom: [9000, 20000],
      twoBedroom: [13000, 35000],
      threeBedroom: [22000, 55000]
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa'
  },

  kericho: {
    name: 'Kericho',
    capital: 'Kericho',
    code: '035',
    region: 'Rift Valley',
    areas: ['Kericho Town', 'Litein', 'Kipkelion', 'Buret'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  bomet: {
    name: 'Bomet',
    capital: 'Bomet',
    code: '036',
    region: 'Rift Valley',
    areas: ['Bomet Town', 'Sotik', 'Chepalungu', 'Konoin'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kakamega: {
    name: 'Kakamega',
    capital: 'Kakamega',
    code: '037',
    region: 'Western',
    areas: ['Kakamega Town', 'Mumias', 'Lugari', 'Butere'],
    pricing: {
      bedsitter: [3500, 8000],
      oneBedroom: [5500, 12000],
      twoBedroom: [8000, 18000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  vihiga: {
    name: 'Vihiga',
    capital: 'Vihiga',
    code: '038',
    region: 'Western',
    areas: ['Vihiga Town', 'Hamisi', 'Luanda', 'Sabatia'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  bungoma: {
    name: 'Bungoma',
    capital: 'Bungoma',
    code: '039',
    region: 'Western',
    areas: ['Bungoma Town', 'Webuye', 'Malakisi', 'Kimilili'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  busia: {
    name: 'Busia',
    capital: 'Busia',
    code: '040',
    region: 'Western',
    areas: ['Busia Town', 'Malaba', 'Port Victoria', 'Nambale'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  siaya: {
    name: 'Siaya',
    capital: 'Siaya',
    code: '041',
    region: 'Nyanza',
    areas: ['Siaya Town', 'Bondo', 'Ugunja', 'Ukwala'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kisumu: {
    name: 'Kisumu',
    capital: 'Kisumu',
    code: '042',
    region: 'Nyanza',
    areas: ['Kisumu CBD', 'Milimani', 'Tom Mboya', 'Kondele', 'Ahero'],
    pricing: {
      bedsitter: [4000, 10000],
      oneBedroom: [6000, 15000],
      twoBedroom: [10000, 25000],
      threeBedroom: [15000, 35000]
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa'
  },

  homa_bay: {
    name: 'Homa Bay',
    capital: 'Homa Bay',
    code: '043',
    region: 'Nyanza',
    areas: ['Homa Bay Town', 'Mbita', 'Ndhiwa', 'Suba'],
    pricing: {
      bedsitter: [2500, 6000],
      oneBedroom: [4000, 9000],
      twoBedroom: [6000, 14000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  migori: {
    name: 'Migori',
    capital: 'Migori',
    code: '044',
    region: 'Nyanza',
    areas: ['Migori Town', 'Awendo', 'Rongo', 'Uriri'],
    pricing: {
      bedsitter: [2500, 6500],
      oneBedroom: [4000, 9500],
      twoBedroom: [6500, 14000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  kisii: {
    name: 'Kisii',
    capital: 'Kisii',
    code: '045',
    region: 'Nyanza',
    areas: ['Kisii Town', 'Ogembo', 'Keumbu', 'Nyamache'],
    pricing: {
      bedsitter: [3000, 7000],
      oneBedroom: [4500, 10000],
      twoBedroom: [7000, 15000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  nyamira: {
    name: 'Nyamira',
    capital: 'Nyamira',
    code: '046',
    region: 'Nyanza',
    areas: ['Nyamira Town', 'Borabu', 'Manga', 'Masaba'],
    pricing: {
      bedsitter: [2500, 6500],
      oneBedroom: [4000, 9500],
      twoBedroom: [6500, 14000]
    },
    paymentMethods: ['mpesa', 'cash'],
    popularPayment: 'mpesa'
  },

  // Template for remaining counties (can be expanded)
  nairobi_city: { // Nairobi City County
    name: 'Nairobi City',
    capital: 'Nairobi',
    code: '047',
    region: 'Nairobi',
    areas: ['CBD', 'Westlands', 'Karen', 'Kiliman', 'Parklands'],
    pricing: {
      bedsitter: [12000, 25000],
      oneBedroom: [20000, 45000],
      twoBedroom: [35000, 80000],
      threeBedroom: [60000, 150000],
      fourBedroom: [100000, 300000]
    },
    paymentMethods: ['mpesa', 'swypt', 'bank', 'cash'],
    popularPayment: 'mpesa'
  }
};

// Helper functions
export const getCountyByName = (countyName) => {
  const normalizedName = countyName.toLowerCase().replace(/\s+/g, '_');
  return KENYAN_COUNTIES[normalizedName] || KENYAN_COUNTIES.nairobi;
};

export const getCountiesByRegion = (region) => {
  return Object.values(KENYAN_COUNTIES).filter(county => county.region === region);
};

export const getAllCountyNames = () => {
  return Object.values(KENYAN_COUNTIES).map(county => county.name);
};

export const getPricingForPropertyType = (countyName, propertyType) => {
  const county = getCountyByName(countyName);
  return county.pricing[propertyType] || [0, 0];
};

export const formatKenyanPrice = (price) => {
  return `Ksh ${price.toLocaleString()}`;
};

export const formatKenyanPriceRange = (min, max) => {
  return `Ksh ${min.toLocaleString()} - ${max.toLocaleString()}`;
};
