import { BusOperator, IntercityRoute, IntercityReport } from '../types';

export const BUS_OPERATORS: BusOperator[] = [
  {
    id: 'op-cag',
    name: 'CAG Travellers Coaches',
    alias: 'CAG',
    tier: 'semi_luxury',
    headquarters: 'Harare',
    phone: '+263 772 400 500',
    amenities: ['Reclining Cushioned Seats', 'USB Charging Ports', 'Onboard Music & Entertainment', 'Heavy Undercarriage Luggage', 'Speed Governors Fitted'],
    rating: 4.7,
    reviewsCount: 382,
    luggagePolicy: 'Up to 25kg free personal luggage in undercarriage hold. Excess bulk freight charged at $0.50-$1.00/kg.',
    bookingInfo: 'Harare Roadport Ticket Office Bay 4, Mbare Musika Bays, or walk-in boarding.',
    description: 'Renowned as one of Zimbabwe\'s most consistent and disciplined express coach operators on the Harare–Bulawayo, Harare–Chirundu, and Gokwe corridors.',
    popularRoutes: ['Harare ⇄ Bulawayo', 'Harare ⇄ Karoi / Chirundu', 'Harare ⇄ Gokwe', 'Bulawayo ⇄ Victoria Falls']
  },
  {
    id: 'op-city-link',
    name: 'City Link Coaches',
    alias: 'City Link',
    tier: 'luxury',
    headquarters: 'Harare',
    phone: '+263 776 000 888',
    amenities: ['Air Conditioning', 'Complimentary Drink & Snack Pack', 'Onboard Restroom / Lavatory', 'Free High-Speed Wi-Fi', 'USB Charging Ports', 'Individual Reading Lights'],
    rating: 4.8,
    reviewsCount: 420,
    luggagePolicy: '20kg checked baggage in undercarriage + 1 small handbag. Strict no-hazardous-goods policy.',
    bookingInfo: 'Rainbow Towers Hotel Pick-up & Harare Roadport. Online pre-booking recommended, walk-ins accepted if seats open.',
    description: 'Premier luxury scheduled coach service in Zimbabwe offering non-stop highway travel with onboard hostesses, refreshments, and air-conditioned luxury.',
    popularRoutes: ['Harare ⇄ Bulawayo Luxury Non-Stop', 'Harare ⇄ Victoria Falls Express', 'Bulawayo ⇄ Victoria Falls']
  },
  {
    id: 'op-inter-africa',
    name: 'Inter Africa Bus Services',
    alias: 'Inter Africa',
    tier: 'standard',
    headquarters: 'Harare',
    phone: '+263 773 111 222',
    amenities: ['High Passenger Capacity', 'Spacious Overhead Racks & Huge Luggage Hold', 'Direct Route Drops to Rural Business Centres', 'Affordable Fares'],
    rating: 4.3,
    reviewsCount: 610,
    luggagePolicy: 'Most generous luggage allowance in Zimbabwe. Handles farm produce, bulky parcels, and hardware in luggage bay.',
    bookingInfo: 'Mbare Musika Long Distance Bays (Gates 1-3), Bulawayo Renkini, Mutare Sakubva, Kudzanayi Gweru.',
    description: 'The backbone of nationwide intercity and inter-district transport in Zimbabwe with buses reaching every town, highway corridor, and growth point daily.',
    popularRoutes: ['Harare ⇄ Bulawayo', 'Harare ⇄ Mutare', 'Harare ⇄ Masvingo ⇄ Beitbridge', 'Bulawayo ⇄ Gwanda ⇄ Beitbridge', 'Harare ⇄ Nyamapanda']
  },
  {
    id: 'op-eagle-liner',
    name: 'Eagle Liner',
    alias: 'Eagle Liner',
    tier: 'semi_luxury',
    headquarters: 'Bulawayo',
    phone: '+263 712 300 400',
    amenities: ['Semi-Luxury Reclining Seats', 'Air Circulation / Ventilation', 'Heavy Undercarriage Compartments', 'Cross-Border Connectivity', 'Dual Drivers on Long Routes'],
    rating: 4.5,
    reviewsCount: 295,
    luggagePolicy: '25kg free luggage. Additional bags tagged at terminal desk.',
    bookingInfo: 'Harare Roadport Terminal, Bulawayo Renkini & Haig Park offices.',
    description: 'Long-standing intercity and cross-border carrier with reliable departures between Harare, Bulawayo, Beitbridge, and South Africa.',
    popularRoutes: ['Harare ⇄ Bulawayo', 'Harare ⇄ Masvingo ⇄ Beitbridge', 'Bulawayo ⇄ Gwanda ⇄ Beitbridge']
  },
  {
    id: 'op-rimbi',
    name: 'Rimbi Tours',
    alias: 'Rimbi',
    tier: 'semi_luxury',
    headquarters: 'Harare',
    phone: '+263 774 555 666',
    amenities: ['Modern Scania & Marcopolo Coaches', 'Padded High-Back Seats', 'USB Phone Charging', 'Fast Transit Times', 'Music & Entertainment'],
    rating: 4.4,
    reviewsCount: 240,
    luggagePolicy: '25kg standard luggage included with ticket.',
    bookingInfo: 'Fourth Street Rank, Harare Roadport & Mutare Sakubva / Meikles pick-up.',
    description: 'Specialist express coach connecting Harare with the Eastern Highlands (Mutare) as well as the northern Mashonaland corridors.',
    popularRoutes: ['Harare ⇄ Mutare Express', 'Harare ⇄ Chinhoyi ⇄ Karoi', 'Harare ⇄ Nyamapanda']
  },
  {
    id: 'op-bravo',
    name: 'Bravo Tours',
    alias: 'Bravo',
    tier: 'luxury',
    headquarters: 'Bulawayo',
    phone: '+263 772 888 999',
    amenities: ['Luxury Climate Control (A/C)', 'Onboard Toilet / Washroom', 'Reclining Ergonomic Seats', 'Refreshment Pack Provided', 'Overhead Reading Lights'],
    rating: 4.7,
    reviewsCount: 310,
    luggagePolicy: '20kg undercarriage baggage allowance. Secure tagged luggage system.',
    bookingInfo: 'Harare Roadport Bay 1 & Bulawayo City Centre Office (Fife Street).',
    description: 'Executive luxury intercity travel operating pristine coaches along the primary A5 and A8 national tourist highways.',
    popularRoutes: ['Harare ⇄ Bulawayo Luxury', 'Bulawayo ⇄ Victoria Falls Express', 'Harare ⇄ Victoria Falls']
  },
  {
    id: 'op-zebra-kiss',
    name: 'Zebra Kiss (Pioneer Coach)',
    alias: 'Zebra Kiss',
    tier: 'semi_luxury',
    headquarters: 'Harare',
    phone: '+263 775 222 333',
    amenities: ['Modern Fleet Coaches', 'USB Charging Sockets', 'Air Ventilation', 'Undercarriage Luggage Lockers', 'Professional Drivers'],
    rating: 4.5,
    reviewsCount: 345,
    luggagePolicy: 'Up to 25kg free. Bulk bags charged minimal handling fee.',
    bookingInfo: 'Harare Roadport Terminal, Mbare Musika Long Distance, Mutare Sakubva.',
    description: 'Recognized for distinctive zebra-striped coach livery and brisk, disciplined service connecting Harare with Mutare, Masvingo, and Karoi.',
    popularRoutes: ['Harare ⇄ Mutare', 'Harare ⇄ Bulawayo', 'Harare ⇄ Masvingo', 'Harare ⇄ Karoi']
  },
  {
    id: 'op-stallion-cruise',
    name: 'Stallion Cruise',
    alias: 'Stallion',
    tier: 'luxury',
    headquarters: 'Harare',
    phone: '+263 779 123 456',
    amenities: ['Full Air Conditioning', 'Onboard Wi-Fi', 'Lavatory Onboard', 'Cold Bottled Water & Snack', 'Extra Legroom'],
    rating: 4.8,
    reviewsCount: 275,
    luggagePolicy: '25kg free checked bag + 1 cabin carry-on.',
    bookingInfo: 'Harare Roadport Terminal & Bulawayo City Hall.',
    description: 'Ultra-comfortable long-distance luxury service operating modern intercity coaches between the capital, the City of Kings, and Victoria Falls.',
    popularRoutes: ['Harare ⇄ Bulawayo Executive', 'Bulawayo ⇄ Victoria Falls', 'Harare ⇄ Victoria Falls Direct']
  },
  {
    id: 'op-extracity',
    name: 'Extracity Luxury Coaches',
    alias: 'Extracity',
    tier: 'semi_luxury',
    headquarters: 'Harare',
    phone: '+263 772 777 888',
    amenities: ['Spacious Reclining Seats', 'Luggage Compartments', 'Audio Entertainment', 'Regular Stops at Highway Food Courts'],
    rating: 4.4,
    reviewsCount: 220,
    luggagePolicy: '25kg free in luggage boot.',
    bookingInfo: 'Harare Roadport, Mbare Musika Gate 2, Bulawayo Renkini.',
    description: 'Dependable long-distance workhorse with daily early-morning and midday departures connecting major cities.',
    popularRoutes: ['Harare ⇄ Bulawayo', 'Harare ⇄ Victoria Falls', 'Harare ⇄ Gweru']
  },
  {
    id: 'op-smart-express',
    name: 'Smart Express',
    alias: 'Smart',
    tier: 'standard',
    headquarters: 'Mutare',
    phone: '+263 773 999 111',
    amenities: ['High Frequency Departures', 'Generous Cargo Hold', 'Competitive Fares'],
    rating: 4.2,
    reviewsCount: 180,
    luggagePolicy: 'Standard passenger luggage and commercial parcels accepted.',
    bookingInfo: 'Mutare Sakubva Bus Terminus, Harare Fourth Street / Mbare.',
    description: 'Fast, high-turnaround intercity carrier operating across eastern and southern routes linking Manicaland and Masvingo.',
    popularRoutes: ['Harare ⇄ Mutare', 'Mutare ⇄ Masvingo (via Birchenough)', 'Harare ⇄ Beitbridge']
  }
];

export const INTERCITY_ROUTES: IntercityRoute[] = [
  {
    id: 'ic-hre-byo',
    name: 'Harare ⇄ Bulawayo Express',
    originCity: 'Harare',
    destinationCity: 'Bulawayo',
    distanceKm: 439,
    estimatedDurationHours: 5.5,
    highwayCode: 'A5 Highway (Robert Mugabe Way)',
    keyStops: ['Norton', 'Chegutu', 'Kadoma', 'Kwekwe', 'Gweru', 'Shangani'],
    departureHubs: [
      { city: 'Harare', terminal: 'Roadport Terminal (Luxury) / Mbare Musika Long Distance / Showgrounds' },
      { city: 'Bulawayo', terminal: 'Bulawayo Renkini Terminal / City Hall Luxury Coach Stop' }
    ],
    operators: [
      {
        operatorId: 'op-city-link',
        operatorName: 'City Link Coaches',
        tier: 'luxury',
        fareUSD: 30,
        fareZiG: 420,
        typicalDepartures: ['07:00 AM (Morning Non-Stop)', '14:00 PM (Afternoon Express)'],
        departureHub: 'Rainbow Towers Hotel / Roadport Bay 1',
        amenities: ['A/C', 'Wi-Fi', 'Snack Pack', 'Toilet Onboard', 'Hostess'],
        reliabilityScore: 98
      },
      {
        operatorId: 'op-stallion-cruise',
        operatorName: 'Stallion Cruise',
        tier: 'luxury',
        fareUSD: 30,
        fareZiG: 420,
        typicalDepartures: ['07:30 AM', '13:30 PM'],
        departureHub: 'Harare Roadport Terminal Bay 2',
        amenities: ['A/C', 'Restroom', 'Water & Snack', 'Reclining Seats'],
        reliabilityScore: 97
      },
      {
        operatorId: 'op-bravo',
        operatorName: 'Bravo Tours',
        tier: 'luxury',
        fareUSD: 28,
        fareZiG: 390,
        typicalDepartures: ['06:45 AM', '14:15 PM'],
        departureHub: 'Harare Roadport Terminal Bay 3',
        amenities: ['A/C', 'Washroom', 'Refreshments'],
        reliabilityScore: 96
      },
      {
        operatorId: 'op-cag',
        operatorName: 'CAG Travellers Coaches',
        tier: 'semi_luxury',
        fareUSD: 20,
        fareZiG: 280,
        typicalDepartures: ['06:00 AM', '08:30 AM', '11:00 AM', '13:00 PM', '15:30 PM'],
        departureHub: 'Harare Roadport & Mbare Musika Gate 1',
        amenities: ['Reclining Seats', 'USB Ports', 'Luggage Hold'],
        reliabilityScore: 95
      },
      {
        operatorId: 'op-eagle-liner',
        operatorName: 'Eagle Liner',
        tier: 'semi_luxury',
        fareUSD: 20,
        fareZiG: 280,
        typicalDepartures: ['06:30 AM', '10:00 AM', '14:30 PM'],
        departureHub: 'Harare Roadport & Showgrounds',
        amenities: ['Reclining Seats', 'Ventilation', 'Large Boot'],
        reliabilityScore: 93
      },
      {
        operatorId: 'op-extracity',
        operatorName: 'Extracity Luxury Coaches',
        tier: 'semi_luxury',
        fareUSD: 18,
        fareZiG: 250,
        typicalDepartures: ['06:00 AM', '09:00 AM', '13:00 PM'],
        departureHub: 'Mbare Musika & Roadport',
        amenities: ['Reclining Seats', 'Luggage Compartment'],
        reliabilityScore: 91
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 15,
        fareZiG: 210,
        typicalDepartures: ['05:30 AM', '07:00 AM', '09:30 AM', '12:00 PM', '14:30 PM', '16:00 PM'],
        departureHub: 'Mbare Musika Long Distance Bays (Gates 1-3)',
        amenities: ['High Capacity', 'Huge Luggage Hold', 'Budget Friendly'],
        reliabilityScore: 90
      }
    ],
    averageFareUSD: 23,
    fareRange: { min: 15, max: 30 }
  },
  {
    id: 'ic-hre-mut',
    name: 'Harare ⇄ Mutare Scenic Highway',
    originCity: 'Harare',
    destinationCity: 'Mutare',
    distanceKm: 263,
    estimatedDurationHours: 3.5,
    highwayCode: 'A3 Highway',
    keyStops: ['Marondera', 'Macheke', 'Headlands', 'Rusape', 'Nyazura'],
    departureHubs: [
      { city: 'Harare', terminal: 'Harare Roadport Terminal / Fourth Street Rank / Mbare Musika' },
      { city: 'Mutare', terminal: 'Sakubva Bus Terminus / Mudzviti Rank / Meikles Rank' }
    ],
    operators: [
      {
        operatorId: 'op-rimbi',
        operatorName: 'Rimbi Tours',
        tier: 'semi_luxury',
        fareUSD: 12,
        fareZiG: 168,
        typicalDepartures: ['06:30 AM', '08:30 AM', '11:00 AM', '14:00 PM', '16:30 PM'],
        departureHub: 'Fourth Street Rank & Roadport',
        amenities: ['Padded Seats', 'USB Ports', 'Music', 'Luggage Hold'],
        reliabilityScore: 96
      },
      {
        operatorId: 'op-zebra-kiss',
        operatorName: 'Zebra Kiss',
        tier: 'semi_luxury',
        fareUSD: 12,
        fareZiG: 168,
        typicalDepartures: ['07:00 AM', '10:00 AM', '13:30 PM', '16:00 PM'],
        departureHub: 'Harare Roadport & Fourth Street',
        amenities: ['A/C', 'USB Charging', 'Fast Transit'],
        reliabilityScore: 95
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 10,
        fareZiG: 140,
        typicalDepartures: ['06:00 AM', '08:00 AM', '10:30 AM', '13:00 PM', '15:00 PM', '17:00 PM'],
        departureHub: 'Mbare Musika Gate 4 & Fourth Street',
        amenities: ['Generous Luggage', 'Direct Rural Drops'],
        reliabilityScore: 92
      },
      {
        operatorId: 'op-smart-express',
        operatorName: 'Smart Express',
        tier: 'standard',
        fareUSD: 10,
        fareZiG: 140,
        typicalDepartures: ['06:15 AM', '09:00 AM', '12:30 PM', '15:30 PM'],
        departureHub: 'Mbare Musika & Fourth Street',
        amenities: ['Standard Express', 'Luggage Bay'],
        reliabilityScore: 90
      }
    ],
    averageFareUSD: 11,
    fareRange: { min: 10, max: 12 }
  },
  {
    id: 'ic-hre-mas-bb',
    name: 'Harare ⇄ Masvingo ⇄ Beitbridge',
    originCity: 'Harare',
    destinationCity: 'Beitbridge',
    distanceKm: 580,
    estimatedDurationHours: 7.5,
    highwayCode: 'A4 Highway (Harare–Beitbridge)',
    keyStops: ['Beatrice', 'Chivhu', 'Mvuma', 'Masvingo', 'Ngundu', 'Rutenga', 'Mwenezi'],
    departureHubs: [
      { city: 'Harare', terminal: 'Harare Roadport Terminal / Mbare Musika Long Distance / Boka' },
      { city: 'Beitbridge', terminal: 'Dulivhadzimu Bus Terminus / Border Gate Post' }
    ],
    operators: [
      {
        operatorId: 'op-eagle-liner',
        operatorName: 'Eagle Liner',
        tier: 'semi_luxury',
        fareUSD: 25,
        fareZiG: 350,
        typicalDepartures: ['06:00 AM', '18:30 PM (Overnight Express)'],
        departureHub: 'Harare Roadport Bay 5',
        amenities: ['Reclining Seats', 'Air Circulation', 'Luggage Compartment'],
        reliabilityScore: 94
      },
      {
        operatorId: 'op-cag',
        operatorName: 'CAG Travellers Coaches',
        tier: 'semi_luxury',
        fareUSD: 25,
        fareZiG: 350,
        typicalDepartures: ['06:30 AM', '19:00 PM (Overnight)'],
        departureHub: 'Harare Roadport & Mbare Musika',
        amenities: ['Reclining Seats', 'USB Ports', 'Luggage Hold'],
        reliabilityScore: 95
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 18,
        fareZiG: 250,
        typicalDepartures: ['05:30 AM', '08:00 AM', '11:00 AM', '17:00 PM (Overnight)'],
        departureHub: 'Mbare Musika Gate 2 & Boka Auction',
        amenities: ['Budget Friendly', 'High Capacity', 'Cross-Country Drops'],
        reliabilityScore: 91
      },
      {
        operatorId: 'op-zebra-kiss',
        operatorName: 'Zebra Kiss',
        tier: 'semi_luxury',
        fareUSD: 22,
        fareZiG: 310,
        typicalDepartures: ['07:00 AM', '18:00 PM'],
        departureHub: 'Harare Roadport Terminal',
        amenities: ['Padded Seats', 'Air Ventilation', 'Luggage Hold'],
        reliabilityScore: 92
      }
    ],
    averageFareUSD: 22.5,
    fareRange: { min: 18, max: 25 }
  },
  {
    id: 'ic-byo-vic',
    name: 'Bulawayo ⇄ Victoria Falls Express',
    originCity: 'Bulawayo',
    destinationCity: 'Victoria Falls',
    distanceKm: 435,
    estimatedDurationHours: 5.5,
    highwayCode: 'A8 Highway (Victoria Falls Road)',
    keyStops: ['Insuza', 'Lupane', 'Halfway Hotel', 'Gwayi River', 'Dete', 'Hwange'],
    departureHubs: [
      { city: 'Bulawayo', terminal: 'Renkini Bus Terminus / City Hall Luxury Stop' },
      { city: 'Victoria Falls', terminal: 'Chinotimba Bus Terminus / Victoria Falls Town Centre' }
    ],
    operators: [
      {
        operatorId: 'op-city-link',
        operatorName: 'City Link Coaches',
        tier: 'luxury',
        fareUSD: 25,
        fareZiG: 350,
        typicalDepartures: ['08:00 AM', '14:30 PM'],
        departureHub: 'Bulawayo Rainbow Hotel / City Hall',
        amenities: ['Air Conditioning', 'Free Wi-Fi', 'Snack Pack', 'Restroom Onboard'],
        reliabilityScore: 98
      },
      {
        operatorId: 'op-stallion-cruise',
        operatorName: 'Stallion Cruise',
        tier: 'luxury',
        fareUSD: 25,
        fareZiG: 350,
        typicalDepartures: ['07:45 AM', '13:00 PM'],
        departureHub: 'Bulawayo City Hall',
        amenities: ['A/C', 'Restroom', 'Reclining Seats'],
        reliabilityScore: 97
      },
      {
        operatorId: 'op-bravo',
        operatorName: 'Bravo Tours',
        tier: 'luxury',
        fareUSD: 24,
        fareZiG: 335,
        typicalDepartures: ['08:30 AM', '14:00 PM'],
        departureHub: 'Bulawayo City Centre Office',
        amenities: ['A/C', 'Restroom', 'Water Provided'],
        reliabilityScore: 96
      },
      {
        operatorId: 'op-extracity',
        operatorName: 'Extracity Luxury Coaches',
        tier: 'semi_luxury',
        fareUSD: 18,
        fareZiG: 250,
        typicalDepartures: ['06:30 AM', '11:00 AM'],
        departureHub: 'Renkini Bus Terminus',
        amenities: ['Reclining Seats', 'Luggage Compartment'],
        reliabilityScore: 92
      }
    ],
    averageFareUSD: 23,
    fareRange: { min: 18, max: 25 }
  },
  {
    id: 'ic-byo-gwanda-bb',
    name: 'Bulawayo ⇄ Gwanda ⇄ Beitbridge',
    originCity: 'Bulawayo',
    destinationCity: 'Beitbridge',
    distanceKm: 320,
    estimatedDurationHours: 4.2,
    highwayCode: 'A6 Highway',
    keyStops: ['Esigodini', 'Mbalabala', 'Gwanda', 'Colleen Bawn', 'West Nicholson', 'Mazunga'],
    departureHubs: [
      { city: 'Bulawayo', terminal: 'Bulawayo Renkini Terminal / Haig Park' },
      { city: 'Beitbridge', terminal: 'Dulivhadzimu Bus Terminus' }
    ],
    operators: [
      {
        operatorId: 'op-eagle-liner',
        operatorName: 'Eagle Liner',
        tier: 'semi_luxury',
        fareUSD: 18,
        fareZiG: 250,
        typicalDepartures: ['07:00 AM', '13:00 PM', '19:00 PM'],
        departureHub: 'Bulawayo Renkini / Haig Park',
        amenities: ['Semi-Luxury Seats', 'Luggage Boot'],
        reliabilityScore: 94
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 12,
        fareZiG: 168,
        typicalDepartures: ['06:00 AM', '08:30 AM', '11:00 AM', '14:00 PM', '16:30 PM'],
        departureHub: 'Bulawayo Renkini Terminal',
        amenities: ['Budget Friendly', 'High Capacity', 'Drops at Colleen Bawn & West Nicholson'],
        reliabilityScore: 91
      }
    ],
    averageFareUSD: 15,
    fareRange: { min: 12, max: 18 }
  },
  {
    id: 'ic-hre-kariba',
    name: 'Harare ⇄ Chinhoyi ⇄ Karoi ⇄ Chirundu/Kariba',
    originCity: 'Harare',
    destinationCity: 'Kariba / Chirundu',
    distanceKm: 365,
    estimatedDurationHours: 5.0,
    highwayCode: 'A1 Highway (Northern Corridor)',
    keyStops: ['Banket', 'Chinhoyi', 'Karoi', 'Magunje Junc', 'Makuti'],
    departureHubs: [
      { city: 'Harare', terminal: 'Mbare Musika Long Distance / Roadport Terminal' },
      { city: 'Chirundu / Kariba', terminal: 'Chirundu Border Rank / Kariba Nyamhunga Bus Rank' }
    ],
    operators: [
      {
        operatorId: 'op-cag',
        operatorName: 'CAG Travellers Coaches',
        tier: 'semi_luxury',
        fareUSD: 15,
        fareZiG: 210,
        typicalDepartures: ['06:30 AM', '09:00 AM', '13:00 PM'],
        departureHub: 'Harare Roadport & Mbare Musika',
        amenities: ['Reclining Seats', 'USB Ports', 'Reliable Driver'],
        reliabilityScore: 97
      },
      {
        operatorId: 'op-rimbi',
        operatorName: 'Rimbi Tours',
        tier: 'semi_luxury',
        fareUSD: 15,
        fareZiG: 210,
        typicalDepartures: ['07:00 AM', '12:00 PM'],
        departureHub: 'Harare Roadport',
        amenities: ['Padded Seats', 'Entertainment', 'Fast Transit'],
        reliabilityScore: 94
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 12,
        fareZiG: 168,
        typicalDepartures: ['06:00 AM', '08:00 AM', '11:30 AM', '14:30 PM'],
        departureHub: 'Mbare Musika Gate 3',
        amenities: ['High Capacity', 'Huge Freight Hold'],
        reliabilityScore: 92
      }
    ],
    averageFareUSD: 14,
    fareRange: { min: 12, max: 15 }
  },
  {
    id: 'ic-byo-masvingo',
    name: 'Bulawayo ⇄ Zvishavane ⇄ Masvingo',
    originCity: 'Bulawayo',
    destinationCity: 'Masvingo',
    distanceKm: 280,
    estimatedDurationHours: 3.8,
    highwayCode: 'A9 Highway',
    keyStops: ['Mbalabala', 'Filabusi Junc', 'Zvishavane', 'Mashava'],
    departureHubs: [
      { city: 'Bulawayo', terminal: 'Bulawayo Renkini Terminal' },
      { city: 'Masvingo', terminal: 'Mucheke Bus Terminus' }
    ],
    operators: [
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 10,
        fareZiG: 140,
        typicalDepartures: ['06:30 AM', '09:00 AM', '12:30 PM', '15:00 PM'],
        departureHub: 'Bulawayo Renkini Terminal',
        amenities: ['Direct Rural Stops', 'Generous Baggage'],
        reliabilityScore: 91
      },
      {
        operatorId: 'op-extracity',
        operatorName: 'Extracity Luxury Coaches',
        tier: 'semi_luxury',
        fareUSD: 12,
        fareZiG: 168,
        typicalDepartures: ['07:30 AM', '13:30 PM'],
        departureHub: 'Bulawayo Renkini Terminal',
        amenities: ['Reclining Seats', 'Reliable Highway Service'],
        reliabilityScore: 93
      }
    ],
    averageFareUSD: 11,
    fareRange: { min: 10, max: 12 }
  },
  {
    id: 'ic-mutare-masvingo',
    name: 'Mutare ⇄ Birchenough ⇄ Masvingo',
    originCity: 'Mutare',
    destinationCity: 'Masvingo',
    distanceKm: 295,
    estimatedDurationHours: 4.0,
    highwayCode: 'A9 Highway',
    keyStops: ['Marange Junc', 'Wengezi', 'Birchenough Bridge', 'Nyika Growth Point', 'Bikita'],
    departureHubs: [
      { city: 'Mutare', terminal: 'Sakubva Bus Terminus / Mudzviti Rank' },
      { city: 'Masvingo', terminal: 'Mucheke Bus Terminus' }
    ],
    operators: [
      {
        operatorId: 'op-smart-express',
        operatorName: 'Smart Express',
        tier: 'standard',
        fareUSD: 10,
        fareZiG: 140,
        typicalDepartures: ['06:00 AM', '09:30 AM', '13:00 PM'],
        departureHub: 'Sakubva Bus Terminus',
        amenities: ['Direct Route', 'Luggage Space'],
        reliabilityScore: 91
      },
      {
        operatorId: 'op-inter-africa',
        operatorName: 'Inter Africa Bus Services',
        tier: 'standard',
        fareUSD: 10,
        fareZiG: 140,
        typicalDepartures: ['06:30 AM', '11:00 AM', '14:30 PM'],
        departureHub: 'Sakubva Bus Terminus',
        amenities: ['Generous Luggage Hold', 'Drops at Birchenough & Nyika'],
        reliabilityScore: 90
      }
    ],
    averageFareUSD: 10,
    fareRange: { min: 10, max: 10 }
  }
];

export const SEED_INTERCITY_REPORTS: IntercityReport[] = [
  {
    id: 'rep-ic-1',
    routeId: 'ic-hre-byo',
    operatorId: 'op-cag',
    operatorName: 'CAG Travellers Coaches',
    farePaidUSD: 20,
    farePaidZiG: 280,
    departureTime: '08:30 AM',
    departureTerminal: 'Harare Roadport Terminal Bay 4',
    seatAvailability: 'filling_fast',
    busConditionRating: 5,
    roadStatusNote: 'Departed on time at 08:35. Norton tollgate queue took 4 minutes. Highway smooth to Kadoma.',
    reportedAt: Date.now() - 1000 * 60 * 45, // 45m ago
    reporterDeviceId: 'zw-commuter-781',
    upvotes: 24,
    downvotes: 1
  },
  {
    id: 'rep-ic-2',
    routeId: 'ic-hre-byo',
    operatorId: 'op-city-link',
    operatorName: 'City Link Coaches',
    farePaidUSD: 30,
    farePaidZiG: 420,
    departureTime: '07:00 AM',
    departureTerminal: 'Rainbow Towers Hotel Pick-up',
    seatAvailability: 'full',
    busConditionRating: 5,
    roadStatusNote: 'A/C cold, complimentary juice and meat pie served. Arrived in Bulawayo 12:20 PM sharp.',
    reportedAt: Date.now() - 1000 * 60 * 180, // 3h ago
    reporterDeviceId: 'zw-commuter-402',
    upvotes: 38,
    downvotes: 0
  },
  {
    id: 'rep-ic-3',
    routeId: 'ic-hre-byo',
    operatorId: 'op-inter-africa',
    operatorName: 'Inter Africa Bus Services',
    farePaidUSD: 15,
    farePaidZiG: 210,
    departureTime: '09:30 AM',
    departureTerminal: 'Mbare Musika Gate 1',
    seatAvailability: 'plenty',
    busConditionRating: 4,
    roadStatusNote: 'Cheap and took all my luggage with zero extra fees. Full load left Mbare at 09:45.',
    reportedAt: Date.now() - 1000 * 60 * 120, // 2h ago
    reporterDeviceId: 'zw-commuter-119',
    upvotes: 19,
    downvotes: 2
  },
  {
    id: 'rep-ic-4',
    routeId: 'ic-hre-mut',
    operatorId: 'op-rimbi',
    operatorName: 'Rimbi Tours',
    farePaidUSD: 12,
    farePaidZiG: 168,
    departureTime: '08:30 AM',
    departureTerminal: 'Fourth Street Rank Harare',
    seatAvailability: 'filling_fast',
    busConditionRating: 5,
    roadStatusNote: 'Fast Scania bus. Passed Marondera 09:35, arrived Rusape 10:45. Very clean seats.',
    reportedAt: Date.now() - 1000 * 60 * 90, // 1.5h ago
    reporterDeviceId: 'zw-commuter-883',
    upvotes: 31,
    downvotes: 1
  },
  {
    id: 'rep-ic-5',
    routeId: 'ic-byo-vic',
    operatorId: 'op-city-link',
    operatorName: 'City Link Coaches',
    farePaidUSD: 25,
    farePaidZiG: 350,
    departureTime: '08:00 AM',
    departureTerminal: 'Bulawayo City Hall Luxury Stop',
    seatAvailability: 'filling_fast',
    busConditionRating: 5,
    roadStatusNote: 'A8 highway has spot resurfacing near Halfway, but bus was smooth with working Wi-Fi.',
    reportedAt: Date.now() - 1000 * 60 * 240, // 4h ago
    reporterDeviceId: 'zw-commuter-554',
    upvotes: 42,
    downvotes: 1
  },
  {
    id: 'rep-ic-6',
    routeId: 'ic-hre-mas-bb',
    operatorId: 'op-cag',
    operatorName: 'CAG Travellers Coaches',
    farePaidUSD: 25,
    farePaidZiG: 350,
    departureTime: '06:30 AM',
    departureTerminal: 'Harare Roadport Bay 4',
    seatAvailability: 'full',
    busConditionRating: 5,
    roadStatusNote: 'Newly dualized sections after Beatrice are great. Smooth trip to Masvingo in 3.5 hrs.',
    reportedAt: Date.now() - 1000 * 60 * 300, // 5h ago
    reporterDeviceId: 'zw-commuter-331',
    upvotes: 27,
    downvotes: 0
  }
];
