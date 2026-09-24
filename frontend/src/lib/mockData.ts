import {
  PublicSummary,
  PublicAiUpdate,
  PublicCamp,
  Announcement,
  PublicForecast,
  AuthorityDashboard,
  AuthorityAiBrief,
  ZoneFeature,
  EvacuationGroup,
  RescueResource,
  ResourceStock,
  Approval,
  AgentEvent,
  LiveBoardData,
  LoopStage,
  AiCampCandidate,
  MyLocationRiskResponse,
  AgentHealth
} from "./types";

export const mockSummary: PublicSummary = {
  overall_risk: "High",
  updated_at: new Date().toISOString(),
  people_sheltered: 6250,
  camps_open: 6,
  camps_total: 6,
  alerts: [
    {
      id: "alt_velachery",
      level: "Critical",
      title: "Velachery: Rain 24.5cm, Flood Depth 68cm (1.5h to peak)",
      zone_id: "velachery"
    },
    {
      id: "alt_mudichur",
      level: "Critical",
      title: "Mudichur & Varadharajapuram: Rain 28.0cm, Flood Depth 75cm (1.0h to peak)",
      zone_id: "mudichur"
    },
    {
      id: "alt_saidapet",
      level: "High",
      title: "Saidapet: Adyar River at 4.65m (Alert Mark: 4.80m). Rain 20cm.",
      zone_id: "saidapet"
    }
  ],
  river: {
    level_m: 4.65,
    alert_level_m: 4.80,
    trend: "rising (+0.12 m/hr)"
  }
};

export const mockAiUpdate: PublicAiUpdate = {
  headline: "Chennai Flood Watch: Multi-Agency AI Coordination Active",
  summary:
    "Adyar River level at Saidapet Bridge is at 4.65m (Alert threshold: 4.80m). Continuous discharge from Chembarambakkam reservoir. Velachery (68cm inundation) and Mudichur (75cm inundation) residents are advised to take designated elevated corridors to relief centers.",
  what_changed: [
    "Doppler radar records 24.5 cm rainfall accumulation across South Chennai basin",
    "NDRF Boat Squad Alpha and Coast Guard Gemini craft stationed in Velachery and Saidapet",
    "Guru Nanak College and Anna University CEG have extensive open shelter and meal supplies ready"
  ],
  what_to_do: [
    "Move valuables and medical prescriptions to higher floor levels immediately",
    "Avoid subways and low-lying ground roads; use elevated expressways (GST Road / Inner Ring Road)",
    "Locate your nearest relief shelter with live rations on the interactive map",
    "In emergency, dial Greater Chennai Corporation Disaster Helpline 1913 or 112"
  ],
  nearest_camps: [
    {
      camp_id: "camp_guru_nanak",
      name: "Guru Nanak College Relief Hub, Velachery",
      available: 680,
      status: "open",
      meals_available: 3200,
      water_liters_available: 9500,
      urgent_needs: ["Baby Food Formula", "100 Warm Blankets", "Drinking Water Cans"],
      distance_km: 1.2
    },
    {
      camp_id: "camp_anna_univ",
      name: "Anna University CEG Emergency Complex, Guindy",
      available: 1550,
      status: "open",
      meals_available: 5800,
      water_liters_available: 16500,
      urgent_needs: ["Dry Ration Packets", "Sanitary Napkins", "Mosquito Nets"],
      distance_km: 3.4
    },
    {
      camp_id: "camp_tambaram_hall",
      name: "Tambaram Community Relief Center, GST Road",
      available: 350,
      status: "near_capacity",
      meals_available: 2100,
      water_liters_available: 7200,
      urgent_needs: ["Emergency Lights", "Milk Packets", "First Aid Splints"],
      distance_km: 4.8
    },
    {
      camp_id: "camp_nehru_stadium",
      name: "Jawaharlal Nehru Indoor Stadium Shelter, Periamet",
      available: 3650,
      status: "open",
      meals_available: 9000,
      water_liters_available: 24000,
      urgent_needs: ["Mats and Bedding", "Volunteer Registrations"],
      distance_km: 8.5
    }
  ],
  generated_at: new Date().toISOString(),
  data_freshness_minutes: 1,
  source: "template",
  disclaimer:
    "AI-generated from real-time GCC telemetry and hydrological radar feeds. Follow official alerts."
};

export const mockCamps: PublicCamp[] = [
  {
    camp_id: "camp_guru_nanak",
    name: "Guru Nanak College Relief Hub, Velachery",
    lat: 12.9890,
    lng: 80.2220,
    capacity: 1800,
    available: 680,
    current_occupancy: 1120,
    status: "open",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: true },
    contact: "Dr. R. Manivannan (+91 44 2245 1700)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 160.0,
    urgent_needs: ["Baby Food Formula", "100 Warm Blankets", "Drinking Water Cans"],
    meals_available: 3200,
    water_liters_available: 9500,
    blankets_available: 720,
    medical_kits_available: 110
  },
  {
    camp_id: "camp_anna_univ",
    name: "Anna University CEG Emergency Complex, Guindy",
    lat: 13.0130,
    lng: 80.2360,
    capacity: 3000,
    available: 1550,
    current_occupancy: 1450,
    status: "open",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: true },
    contact: "Prof. S. Soundararajan (+91 44 2235 7004)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 220.0,
    urgent_needs: ["Dry Ration Packets", "Sanitary Napkins", "Mosquito Nets"],
    meals_available: 5800,
    water_liters_available: 16500,
    blankets_available: 1400,
    medical_kits_available: 240
  },
  {
    camp_id: "camp_tambaram_hall",
    name: "Tambaram Community Relief Center, GST Road",
    lat: 12.9260,
    lng: 80.1270,
    capacity: 2000,
    available: 350,
    current_occupancy: 1650,
    status: "near_capacity",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: true },
    contact: "Thiru K. Balaji (+91 44 2226 5025)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 180.0,
    urgent_needs: ["Emergency Lights", "Milk Packets", "First Aid Splints"],
    meals_available: 2100,
    water_liters_available: 7200,
    blankets_available: 450,
    medical_kits_available: 60
  },
  {
    camp_id: "camp_nehru_stadium",
    name: "Jawaharlal Nehru Indoor Stadium Shelter, Periamet",
    lat: 13.0845,
    lng: 80.2740,
    capacity: 4500,
    available: 3650,
    current_occupancy: 850,
    status: "open",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: true },
    contact: "Major D. Selvam (+91 44 2538 4161)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 300.0,
    urgent_needs: ["Mats and Bedding", "Volunteer Registrations"],
    meals_available: 9000,
    water_liters_available: 24000,
    blankets_available: 2800,
    medical_kits_available: 350
  },
  {
    camp_id: "camp_saidapet_school",
    name: "Saidapet Model Govt Higher Secondary School",
    lat: 13.0240,
    lng: 80.2200,
    capacity: 1400,
    available: 220,
    current_occupancy: 1180,
    status: "near_capacity",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: false },
    contact: "Mrs. Revathi Raman (+91 44 2435 8890)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 150.0,
    urgent_needs: ["Drinking Water Refills", "Pediatric Antibiotics"],
    meals_available: 1800,
    water_liters_available: 5400,
    blankets_available: 520,
    medical_kits_available: 45
  },
  {
    camp_id: "camp_omr_hall",
    name: "OMR Multi-purpose Relief Complex, Sholinganallur",
    lat: 12.9050,
    lng: 80.2310,
    capacity: 1600,
    available: 1150,
    current_occupancy: 450,
    status: "open",
    facilities: { water: true, medical: true, toilets: true, power: true, food: true, baby_care: true },
    contact: "Mr. Vigneshwaran K (+91 44 2450 3311)",
    updated_at: new Date().toISOString(),
    updated_by_role: "authority",
    geofence_radius_m: 150.0,
    urgent_needs: ["Dry Biscuits", "Power Banks"],
    meals_available: 3500,
    water_liters_available: 8500,
    blankets_available: 900,
    medical_kits_available: 95
  }
];

export const mockAnnouncements: Announcement[] = [
  {
    id: "ann_chn_01",
    title: "Red Alert: Adyar & Chembarambakkam Reservoir Discharge at 12,000 cusecs",
    body: "Greater Chennai Corporation and Disaster Management Authority issue an emergency evacuation advisory for low-lying areas of Velachery, Mudichur, and Saidapet. Guru Nanak College, Anna University CEG, and Tambaram Relief Centers are fully equipped with meals, potable water, and medical aid. Avoid all underpasses and subways.",
    language: "en",
    level: "Evacuate",
    published_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    published_by: "Greater Chennai Corporation (GCC) Disaster Mgmt",
    target_zone: "Velachery & Mudichur",
    predicted_rain_cm: 24.5,
    predicted_flood_cm: 68.0,
    ai_suggested: false,
    confirmed_by_authority: true
  },
  {
    id: "ann_chn_02",
    title: "AI Recommendation: Safe Evacuation Corridor via GST Road Elevated Flyover",
    body: "AI Flood Prediction Engine detects 75cm flood depth on Mudichur Road. Citizens are advised to take the Tambaram West Flyover towards GST Road corridor. Inflatable boat squads Alpha and Bravo are actively ferrying families.",
    language: "en",
    level: "Warning",
    published_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    published_by: "AI Emergency Operations Hub (Verified by Authority)",
    target_zone: "Mudichur & Varadharajapuram",
    predicted_rain_cm: 28.0,
    predicted_flood_cm: 75.0,
    ai_suggested: true,
    confirmed_by_authority: true
  }
];

export const mockForecast: PublicForecast = {
  river_series: [
    { t: "06:00", level_m: 4.15, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "08:00", level_m: 4.30, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "10:00", level_m: 4.45, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "12:00", level_m: 4.58, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "14:00", level_m: 4.65, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "16:00 (Pred)", level_m: 4.75, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "18:00 (Pred)", level_m: 4.82, river_name: "Adyar River (Saidapet Bridge)" },
    { t: "20:00 (Pred)", level_m: 4.79, river_name: "Adyar River (Saidapet Bridge)" }
  ],
  rain_series: [
    { t: "06:00", mm: 25.0, cm: 2.5 },
    { t: "08:00", mm: 42.0, cm: 4.2 },
    { t: "10:00", mm: 65.0, cm: 6.5 },
    { t: "12:00", mm: 78.0, cm: 7.8 },
    { t: "14:00", mm: 85.0, cm: 8.5 },
    { t: "16:00 (Pred)", mm: 60.0, cm: 6.0 },
    { t: "18:00 (Pred)", mm: 35.0, cm: 3.5 },
    { t: "20:00 (Pred)", mm: 18.0, cm: 1.8 }
  ],
  zone_forecast: [
    {
      zone_id: "velachery",
      name: "Velachery & Pallikaranai Marsh",
      risk_level: "Critical",
      probability: 0.86,
      predicted_rain_cm: 24.5,
      predicted_flood_depth_cm: 68.0,
      time_to_flood_hours: 1.5,
      flooded_roads: ["Velachery Main Road", "Taramani Link Road", "Vijayanagar Junction"],
      safe_corridors: ["Inner Ring Road towards Guindy Flyover", "GST Road elevated corridor"],
      p_3h: 0.88,
      p_6h: 0.92,
      p_12h: 0.78,
      confidence: 0.94
    },
    {
      zone_id: "mudichur",
      name: "Mudichur & Varadharajapuram",
      risk_level: "Critical",
      probability: 0.91,
      predicted_rain_cm: 28.0,
      predicted_flood_depth_cm: 75.0,
      time_to_flood_hours: 1.0,
      flooded_roads: ["Mudichur Road", "Varadharajapuram Main Street", "Rayappa Nagar"],
      safe_corridors: ["Chennai Bypass Elevated Exit", "Tambaram West Flyover towards GST Road"],
      p_3h: 0.92,
      p_6h: 0.95,
      p_12h: 0.82,
      confidence: 0.95
    },
    {
      zone_id: "saidapet",
      name: "Saidapet & Jafferkhanpet (Adyar Basin)",
      risk_level: "High",
      probability: 0.74,
      predicted_rain_cm: 20.0,
      predicted_flood_depth_cm: 52.0,
      time_to_flood_hours: 2.5,
      flooded_roads: ["Maraimalai Adigalar Bridge Low Ramp", "Saidapet Bazaar Road", "Jones Road Subway"],
      safe_corridors: ["Anna Salai Main Elevated Highway", "Guindy Industrial Estate Road"],
      p_3h: 0.76,
      p_6h: 0.82,
      p_12h: 0.65,
      confidence: 0.91
    },
    {
      zone_id: "perumbakkam",
      name: "Perumbakkam & Medavakkam",
      risk_level: "High",
      probability: 0.65,
      predicted_rain_cm: 18.0,
      predicted_flood_depth_cm: 42.0,
      time_to_flood_hours: 3.5,
      flooded_roads: ["Medavakkam Mambakkam Road", "Perumbakkam Global Hospital Road"],
      safe_corridors: ["Medavakkam Flyover via Velachery-Tambaram Highway"],
      p_3h: 0.68,
      p_6h: 0.74,
      p_12h: 0.58,
      confidence: 0.89
    },
    {
      zone_id: "kolathur",
      name: "Kolathur & Villivakkam (Otteri Nullah)",
      risk_level: "Medium",
      probability: 0.48,
      predicted_rain_cm: 15.0,
      predicted_flood_depth_cm: 28.0,
      time_to_flood_hours: 5.0,
      flooded_roads: ["GKM Colony 12th Street", "Villivakkam Railway Subway"],
      safe_corridors: ["Inner Ring Road (100ft Road North)", "Madhavaram High Road"],
      p_3h: 0.52,
      p_6h: 0.56,
      p_12h: 0.40,
      confidence: 0.88
    },
    {
      zone_id: "sholinganallur",
      name: "Sholinganallur & OMR IT Corridor",
      risk_level: "Medium",
      probability: 0.38,
      predicted_rain_cm: 12.5,
      predicted_flood_depth_cm: 20.0,
      time_to_flood_hours: 6.5,
      flooded_roads: ["ELCOT Avenue Ditch", "Semmancheri Service Lanes"],
      safe_corridors: ["Old Mahabalipuram Road (OMR 6-lane)", "ECR Link Road"],
      p_3h: 0.40,
      p_6h: 0.44,
      p_12h: 0.32,
      confidence: 0.86
    },
    {
      zone_id: "tnagar",
      name: "T. Nagar & West Mambalam",
      risk_level: "Low",
      probability: 0.22,
      predicted_rain_cm: 9.0,
      predicted_flood_depth_cm: 12.0,
      time_to_flood_hours: 9.0,
      flooded_roads: ["Bazullah Road Subway", "Madeley Subway"],
      safe_corridors: ["Usman Road Flyover", "Gopathi Narayanaswami Road"],
      p_3h: 0.24,
      p_6h: 0.28,
      p_12h: 0.18,
      confidence: 0.90
    }
  ],
  overall_predicted_rain_cm: 22.5,
  overall_predicted_flood_cm: 55.0,
  limitations:
    "Hydrological prediction model for Greater Chennai. Continuously calibrated against Chembarambakkam reservoir outflow and CMWSSB radar."
};

export const mockAuthorityDashboard: AuthorityDashboard = {
  affected_population: 185000,
  flooded_km2: 48.5,
  active_units: 6,
  camps_open: 6,
  camps_total: 6,
  people_sheltered: 6250,
  unserved: 3650,
  replans: 14,
  over_capacity_events: 2
};

export const mockAuthorityAiBrief: AuthorityAiBrief = {
  headline: "Greater Chennai Corporation Emergency Response Assessment",
  summary:
    "Hydrological models predict peak flood inundation across Adyar basin within 1.5 to 3.0 hours. High-clearance tactical vehicles and boat teams dispatched.",
  risks: [
    "Velachery flood risk at 86% (68cm depth) with 1,250 residents awaiting pickup",
    "Adyar River gauge at 4.65m (+0.12m/hr rate of rise towards 4.80m threshold)",
    "Chembarambakkam surplus discharge creating backwater accumulation in Mudichur basin"
  ],
  priorities: [
    { zone_id: "mudichur", reason: "Category: Critical (Rain: 28.0cm, Flood: 75.0cm, 950 persons needing transport)" },
    { zone_id: "velachery", reason: "Category: Critical (Rain: 24.5cm, Flood: 68.0cm, 1,250 persons needing transport)" },
    { zone_id: "saidapet", reason: "Category: High (Rain: 20.0cm, Flood: 52.0cm, 800 persons needing transport)" }
  ],
  recommended_actions: [
    {
      approval_id: "app_demo_01",
      type: "camp_redirect",
      text: "Guru Nanak College projected 1360/1800. Divert incoming Medavakkam group of 200 to Anna University Complex (1550 free capacity).",
      reason: "Prevents overcrowding and balances relief camp life-support rations.",
      confidence: 0.94
    },
    {
      approval_id: "app_demo_02",
      type: "dispatch",
      text: "Deploy SDRF Deep-Water Rescue Boat 02 to Mudichur Rayappa Nagar for 160 stranded elders.",
      reason: "Rising water level threatens single-story dwellings.",
      confidence: 0.96
    }
  ],
  shortages: [
    "Tambaram Community Center: Needs additional blankets and emergency lighting kits",
    "Saidapet Model School: Water refill delivery queued within 45 mins"
  ],
  generated_at: new Date().toISOString(),
  source: "template"
};

export const mockZoneGeoJson: { type: "FeatureCollection"; features: ZoneFeature[] } = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.198, 12.965],
            [80.238, 12.965],
            [80.242, 13.002],
            [80.195, 12.998],
            [80.198, 12.965]
          ]
        ]
      },
      properties: {
        zone_id: "velachery",
        name: "Velachery & Pallikaranai Marsh",
        risk_category: "Critical",
        probability: 0.86,
        predicted_rain_cm: 24.5,
        predicted_flood_depth_cm: 68.0,
        time_to_flood_hours: 1.5,
        flooded_pct: 52.0,
        flooded_roads: ["Velachery Main Road (100ft)", "Taramani Link Road", "Vijayanagar Junction"],
        safe_corridors: ["Inner Ring Road towards Guindy Flyover", "GST Road elevated corridor"],
        advice: "CRITICAL: Pallikaranai marsh runoff overflow. Move immediately to Guru Nanak College shelter."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.050, 12.895],
            [80.092, 12.895],
            [80.095, 12.932],
            [80.048, 12.928],
            [80.050, 12.895]
          ]
        ]
      },
      properties: {
        zone_id: "mudichur",
        name: "Mudichur & Varadharajapuram",
        risk_category: "Critical",
        probability: 0.91,
        predicted_rain_cm: 28.0,
        predicted_flood_depth_cm: 75.0,
        time_to_flood_hours: 1.0,
        flooded_pct: 60.0,
        flooded_roads: ["Mudichur Road", "Varadharajapuram Main Street", "Rayappa Nagar"],
        safe_corridors: ["Chennai Bypass Elevated Exit", "Tambaram West Flyover towards GST Road"],
        advice: "URGENT: Adyar river backwater breach. NDRF inflatable boats deployed. Evacuate to Tambaram Relief Hub."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.205, 13.005],
            [80.245, 13.005],
            [80.248, 13.035],
            [80.202, 13.032],
            [80.205, 13.005]
          ]
        ]
      },
      properties: {
        zone_id: "saidapet",
        name: "Saidapet & Jafferkhanpet (Adyar Basin)",
        risk_category: "High",
        probability: 0.74,
        predicted_rain_cm: 20.0,
        predicted_flood_depth_cm: 52.0,
        time_to_flood_hours: 2.5,
        flooded_pct: 38.0,
        flooded_roads: ["Maraimalai Adigalar Bridge Low Ramp", "Saidapet Bazaar Road", "Jones Road Subway"],
        safe_corridors: ["Anna Salai Main Elevated Highway", "Guindy Industrial Estate Road"],
        advice: "Adyar river gauge at 4.65m. Avoid low subways and move to Anna University Hub."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.170, 12.880],
            [80.212, 12.880],
            [80.215, 12.915],
            [80.168, 12.912],
            [80.170, 12.880]
          ]
        ]
      },
      properties: {
        zone_id: "perumbakkam",
        name: "Perumbakkam & Medavakkam",
        risk_category: "High",
        probability: 0.65,
        predicted_rain_cm: 18.0,
        predicted_flood_depth_cm: 42.0,
        time_to_flood_hours: 3.5,
        flooded_pct: 28.0,
        flooded_roads: ["Medavakkam Mambakkam Road", "Perumbakkam Global Hospital Road"],
        safe_corridors: ["Medavakkam Flyover via Velachery-Tambaram Highway"],
        advice: "Water accumulation in low-lying residential layouts. Relocate to OMR Relief Complex."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.190, 13.100],
            [80.232, 13.100],
            [80.235, 13.135],
            [80.188, 13.132],
            [80.190, 13.100]
          ]
        ]
      },
      properties: {
        zone_id: "kolathur",
        name: "Kolathur & Villivakkam (Otteri Nullah)",
        risk_category: "Medium",
        probability: 0.48,
        predicted_rain_cm: 15.0,
        predicted_flood_depth_cm: 28.0,
        time_to_flood_hours: 5.0,
        flooded_pct: 18.0,
        flooded_roads: ["GKM Colony 12th Street", "Villivakkam Railway Subway"],
        safe_corridors: ["Inner Ring Road (100ft Road North)", "Madhavaram High Road"],
        advice: "Pumping stations operating at full load. Maintain caution near storm water canals."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.210, 12.880],
            [80.250, 12.880],
            [80.252, 12.920],
            [80.208, 12.918],
            [80.210, 12.880]
          ]
        ]
      },
      properties: {
        zone_id: "sholinganallur",
        name: "Sholinganallur & OMR IT Corridor",
        risk_category: "Medium",
        probability: 0.38,
        predicted_rain_cm: 12.5,
        predicted_flood_depth_cm: 20.0,
        time_to_flood_hours: 6.5,
        flooded_pct: 12.0,
        flooded_roads: ["ELCOT Avenue Ditch", "Semmancheri Service Lanes"],
        safe_corridors: ["Old Mahabalipuram Road (OMR 6-lane)", "ECR Link Road"],
        advice: "OMR main expressway is elevated and safe. Micro-waterlogging in service lanes."
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.215, 13.025],
            [80.255, 13.025],
            [80.258, 13.058],
            [80.212, 13.055],
            [80.215, 13.025]
          ]
        ]
      },
      properties: {
        zone_id: "tnagar",
        name: "T. Nagar & West Mambalam",
        risk_category: "Low",
        probability: 0.22,
        predicted_rain_cm: 9.0,
        predicted_flood_depth_cm: 12.0,
        time_to_flood_hours: 9.0,
        flooded_pct: 6.0,
        flooded_roads: ["Bazullah Road Subway", "Madeley Subway"],
        safe_corridors: ["Usman Road Flyover", "Gopathi Narayanaswami Road"],
        advice: "Commercial hubs open. Stormwater drainage functional. Avoid underground subways."
      }
    }
  ]
};

export const mockEvacuationGroups: EvacuationGroup[] = [
  {
    group_id: "grp_velachery_01",
    name: "NDRF Boat Squad Alpha",
    source_zone: "velachery",
    group_type: "boat",
    boats_count: 3,
    personnel_count: 8,
    air_drop_kits: 0,
    vehicles_count: 0,
    population: 120,
    destination_camp: "camp_guru_nanak",
    status: "moving",
    eta: "12 mins",
    current_location: "Velachery 100ft Road Inundation Point",
    created_at: new Date().toISOString()
  },
  {
    group_id: "grp_mudichur_02",
    name: "SDRF River Evacuation Unit Bravo",
    source_zone: "mudichur",
    group_type: "boat",
    boats_count: 4,
    personnel_count: 12,
    air_drop_kits: 0,
    vehicles_count: 1,
    population: 160,
    destination_camp: "camp_tambaram_hall",
    status: "moving",
    eta: "18 mins",
    current_location: "Varadharajapuram Main Street",
    created_at: new Date().toISOString()
  },
  {
    group_id: "grp_saidapet_03",
    name: "Saidapet Coast Guard Rescue Boat",
    source_zone: "saidapet",
    group_type: "boat",
    boats_count: 2,
    personnel_count: 6,
    air_drop_kits: 0,
    vehicles_count: 0,
    population: 90,
    destination_camp: "camp_saidapet_school",
    status: "moving",
    eta: "8 mins",
    current_location: "Maraimalai Adigalar Bridge Footway",
    created_at: new Date().toISOString()
  },
  {
    group_id: "grp_perumbakkam_04",
    name: "Army High-Clearance Vehicle Fleet",
    source_zone: "perumbakkam",
    group_type: "high_truck",
    boats_count: 0,
    personnel_count: 10,
    air_drop_kits: 0,
    vehicles_count: 3,
    population: 70,
    destination_camp: "camp_omr_hall",
    status: "waiting",
    eta: "25 mins",
    current_location: "Global Hospital Junction",
    created_at: new Date().toISOString()
  },
  {
    group_id: "grp_air_drop_05",
    name: "IAF Aerial Supply Drop Package 05",
    source_zone: "mudichur",
    group_type: "air_supply",
    boats_count: 0,
    personnel_count: 4,
    air_drop_kits: 250,
    vehicles_count: 1,
    population: 0,
    destination_camp: "camp_tambaram_hall",
    status: "moving",
    eta: "15 mins",
    current_location: "Air Force Station Tambaram Airspace",
    created_at: new Date().toISOString()
  }
];

export const mockRescueUnits: RescueResource[] = [
  {
    resource_id: "unit_ndrf_01",
    name: "NDRF 4th Battalion Inflatable Boat 01",
    type: "NDRF Inflatable Boat",
    capacity: 120,
    personnel: 10,
    lat: 12.9815,
    lng: 80.2180,
    status: "in_transit",
    assigned_zone: "velachery",
    eta: "10 mins"
  },
  {
    resource_id: "unit_sdrf_02",
    name: "SDRF Motorized Deep-Water Boat 02",
    type: "SDRF Motorized Boat",
    capacity: 150,
    personnel: 12,
    lat: 12.9120,
    lng: 80.0710,
    status: "busy",
    assigned_zone: "mudichur",
    eta: "12 mins"
  },
  {
    resource_id: "unit_cg_03",
    name: "Indian Coast Guard Gemini Craft 03",
    type: "Coast Guard Gemini Boat",
    capacity: 100,
    personnel: 8,
    lat: 13.0200,
    lng: 80.2230,
    status: "busy",
    assigned_zone: "saidapet",
    eta: "5 mins"
  },
  {
    resource_id: "unit_army_04",
    name: "Indian Army BAUT & High-Clearance Truck 04",
    type: "Army High-Clearance Truck",
    capacity: 200,
    personnel: 16,
    lat: 12.8980,
    lng: 80.1910,
    status: "available",
    assigned_zone: "perumbakkam",
    eta: "15 mins"
  },
  {
    resource_id: "unit_iaf_05",
    name: "IAF Drone & Helicopter Food Drop Unit 05",
    type: "Air Force Air Drop Unit",
    capacity: 300,
    personnel: 6,
    lat: 12.9900,
    lng: 80.1700,
    status: "available",
    assigned_zone: undefined,
    eta: "20 mins"
  },
  {
    resource_id: "unit_gcc_06",
    name: "Greater Chennai Corp Tactical Rescue Team 06",
    type: "Ground Rescue Men Team",
    capacity: 80,
    personnel: 20,
    lat: 13.0418,
    lng: 80.2341,
    status: "available",
    assigned_zone: "tnagar",
    eta: "10 mins"
  }
];

export const mockResourceStocks: ResourceStock[] = [
  {
    camp_id: "camp_guru_nanak",
    camp_name: "Guru Nanak College Relief Hub, Velachery",
    occupancy: 1120,
    stock: { food: 3200, water: 9500, medicine: 110, beds: 720, fuel: 400 },
    hours_of_cover: { food: 34.2, water: 42.4, medicine: 58.0, min: 34.2 },
    shortages: [],
    last_updated: new Date().toISOString()
  },
  {
    camp_id: "camp_anna_univ",
    camp_name: "Anna University CEG Emergency Complex, Guindy",
    occupancy: 1450,
    stock: { food: 5800, water: 16500, medicine: 240, beds: 1400, fuel: 650 },
    hours_of_cover: { food: 48.0, water: 54.6, medicine: 72.0, min: 48.0 },
    shortages: [],
    last_updated: new Date().toISOString()
  },
  {
    camp_id: "camp_tambaram_hall",
    camp_name: "Tambaram Community Relief Center, GST Road",
    occupancy: 1650,
    stock: { food: 2100, water: 7200, medicine: 60, beds: 450, fuel: 200 },
    hours_of_cover: { food: 15.2, water: 21.0, medicine: 18.0, min: 15.2 },
    shortages: ["Food reserve under 16 hours", "Urgent request for 200 additional beddings"],
    last_updated: new Date().toISOString()
  }
];

export const mockApprovals: Approval[] = [
  {
    id: "app_demo_01",
    type: "camp_redirect",
    payload: {
      from_camp: "camp_guru_nanak",
      to_camp: "camp_anna_univ",
      divert_group: "grp_perumbakkam_04",
      people: 200
    },
    reason:
      "Guru Nanak College is projected at 1,360/1,800. Diverting incoming Medavakkam group of 200 to Anna University CEG (1,550 free spots) prevents overcrowding.",
    confidence: 0.94,
    status: "pending",
    created_at: new Date().toISOString()
  },
  {
    id: "app_demo_02",
    type: "dispatch",
    payload: {
      unit_id: "unit_sdrf_02",
      zone_id: "mudichur",
      priority: "urgent"
    },
    reason:
      "Mudichur Varadharajapuram water level rising +14cm/hr. Dispatch SDRF Deep-Water Boat 02 to extract 160 stranded residents.",
    confidence: 0.96,
    status: "pending",
    created_at: new Date().toISOString()
  }
];

export const mockAgentEvents: AgentEvent[] = [
  {
    event_id: "evt_001",
    timestamp: new Date().toISOString(),
    agent_name: "Flood Prediction Agent",
    action: "INUNDATION_ESTIMATION_UPDATE",
    input_summary: "Doppler radar + Adyar telemetry: Saidapet gauge 4.65m (+0.12m/hr)",
    output_summary: "Velachery: 68cm flood depth. Mudichur: 75cm flood depth. Critical risk confirmed.",
    status: "success",
    related_zone: "velachery"
  },
  {
    event_id: "evt_002",
    timestamp: new Date(Date.now() - 1000 * 45).toISOString(),
    agent_name: "Camp Management Agent",
    action: "AUTO_GEOFENCE_CHECKIN",
    input_summary: "Simulated geofence entry: 35 persons checked into Guru Nanak College",
    output_summary: "Occupancy: 1,120/1,800. Meals deducted automatically.",
    status: "success",
    related_resource: "camp_guru_nanak"
  },
  {
    event_id: "evt_003",
    timestamp: new Date(Date.now() - 1000 * 90).toISOString(),
    agent_name: "Coordinator Agent",
    action: "EXECUTE_CLOSED_LOOP_STAGE",
    input_summary: "Cycle #14 triggered by Adyar river telemetry",
    output_summary: "Generated 2 automated proposals: Camp Divert + Boat Dispatch",
    status: "success"
  }
];

export const mockLiveBoardData: LiveBoardData = {
  zones: [
    { zone_id: "mudichur", name: "Mudichur & Varadharajapuram", needing_evac: 950 },
    { zone_id: "velachery", name: "Velachery & Pallikaranai Marsh", needing_evac: 1250 },
    { zone_id: "saidapet", name: "Saidapet (Adyar Basin)", needing_evac: 800 },
    { zone_id: "perumbakkam", name: "Perumbakkam & Medavakkam", needing_evac: 420 },
    { zone_id: "kolathur", name: "Kolathur & Villivakkam", needing_evac: 280 },
    { zone_id: "sholinganallur", name: "Sholinganallur / OMR", needing_evac: 150 },
    { zone_id: "tnagar", name: "T. Nagar / Mambalam", needing_evac: 80 }
  ],
  groups: [
    {
      group_id: "grp_velachery_01",
      source_zone: "velachery",
      size: 120,
      status: "moving",
      destination_camp: "camp_guru_nanak",
      eta: "12 mins"
    },
    {
      group_id: "grp_mudichur_02",
      source_zone: "mudichur",
      size: 160,
      status: "moving",
      destination_camp: "camp_tambaram_hall",
      eta: "18 mins"
    },
    {
      group_id: "grp_saidapet_03",
      source_zone: "saidapet",
      size: 90,
      status: "moving",
      destination_camp: "camp_saidapet_school",
      eta: "8 mins"
    }
  ],
  camps: [
    {
      camp_id: "camp_guru_nanak",
      name: "Guru Nanak College Relief Hub, Velachery",
      capacity: 1800,
      occupancy: 1120,
      inbound: 240,
      free: 440,
      status: "open",
      projected_pct: 75.5,
      hours_of_cover: 34.2
    },
    {
      camp_id: "camp_anna_univ",
      name: "Anna University CEG Emergency Complex, Guindy",
      capacity: 3000,
      occupancy: 1450,
      inbound: 320,
      free: 1230,
      status: "open",
      projected_pct: 59.0,
      hours_of_cover: 48.0
    },
    {
      camp_id: "camp_tambaram_hall",
      name: "Tambaram Community Relief Center, GST Road",
      capacity: 2000,
      occupancy: 1650,
      inbound: 280,
      free: 70,
      status: "near_capacity",
      projected_pct: 96.5,
      hours_of_cover: 15.2
    },
    {
      camp_id: "camp_nehru_stadium",
      name: "Jawaharlal Nehru Indoor Stadium Shelter, Periamet",
      capacity: 4500,
      occupancy: 850,
      inbound: 150,
      free: 3500,
      status: "open",
      projected_pct: 22.2,
      hours_of_cover: 72.0
    },
    {
      camp_id: "camp_saidapet_school",
      name: "Saidapet Model Govt Higher Secondary School",
      capacity: 1400,
      occupancy: 1180,
      inbound: 180,
      free: 40,
      status: "near_capacity",
      projected_pct: 97.1,
      hours_of_cover: 22.5
    },
    {
      camp_id: "camp_omr_hall",
      name: "OMR Multi-purpose Relief Complex, Sholinganallur",
      capacity: 1600,
      occupancy: 450,
      inbound: 80,
      free: 1070,
      status: "open",
      projected_pct: 33.1,
      hours_of_cover: 56.0
    }
  ],
  arrivals: [
    {
      time: "14:45",
      size: 45,
      source_zone: "Velachery Main Rd",
      transport: "NDRF Boat Squad Alpha",
      camp: "Guru Nanak College",
      status: "arrived"
    },
    {
      time: "14:32",
      size: 60,
      source_zone: "Rayappa Nagar",
      transport: "SDRF Motorized Boat Bravo",
      camp: "Tambaram Community Center",
      status: "arrived"
    },
    {
      time: "14:15",
      size: 30,
      source_zone: "Jones Road Subway",
      transport: "Coast Guard Gemini",
      camp: "Saidapet Model School",
      status: "arrived"
    }
  ],
  warnings: [
    "Tambaram Community Center projected at 1,930/2,000 (96.5%). 1-Click Divert to Anna University is recommended.",
    "Saidapet Model School nearing capacity at 97.1%. Hot meals restock en route."
  ]
};

export const mockLoopStage: LoopStage = {
  stage: "ACT",
  message: "Executing automated resource balancing and dispatching boat units to Adyar basin",
  cycle_id: "cycle_chn_014",
  timestamp: new Date().toISOString(),
  recent_events: [
    { agent: "River Gauge Agent", action: "POLL", summary: "Adyar Saidapet Bridge gauge: 4.65m (+0.12m/hr)", time: "14:50:10" },
    { agent: "Flood Prediction Agent", action: "PREDICT", summary: "Inundation map updated: 68cm in Velachery, 75cm in Mudichur", time: "14:50:15" },
    { agent: "Camp Management Agent", action: "OPTIMIZE", summary: "Calculated hours of cover: Tambaram 15.2h, Guru Nanak 34.2h", time: "14:50:20" },
    { agent: "Coordinator Agent", action: "ACT", summary: "Debounced re-planning cycle #14 completed successfully", time: "14:50:25" }
  ]
};

export const mockAiCampCandidates: AiCampCandidate[] = [
  {
    candidate_id: "cand_dg_vaishnav",
    name: "D.G. Vaishnav College Auditorium, Arumbakkam",
    area: "Arumbakkam / Poonamallee High Road",
    lat: 13.0732,
    lng: 80.2155,
    suggested_capacity: 2200,
    building_type: "College Campus & Auditorium",
    proximity_to_flood: "1.8 km from Cooum canal overflow (Elevated)",
    elevation_m: 7.5,
    suitability_score: 0.94,
    recommended_reason: "High elevation ground, large dining halls, generator backup, excellent road access from Koyambedu."
  },
  {
    candidate_id: "cand_loyola",
    name: "Loyola College Bertram Hall, Nungambakkam",
    area: "Nungambakkam / Sterling Road",
    lat: 13.0626,
    lng: 80.2337,
    suggested_capacity: 2800,
    building_type: "Institutional Campus",
    proximity_to_flood: "Safe non-inundated zone",
    elevation_m: 8.0,
    suitability_score: 0.96,
    recommended_reason: "Centrally located in high ground, commercial kitchens, multi-tier staging capacity."
  },
  {
    candidate_id: "cand_san_thome",
    name: "San Thome Higher Secondary School Hall, Mylapore",
    area: "Mylapore / San Thome High Road",
    lat: 13.0335,
    lng: 80.2785,
    suggested_capacity: 1500,
    building_type: "Higher Secondary School",
    proximity_to_flood: "Near coast / Adyar estuary (elevated)",
    elevation_m: 6.8,
    suitability_score: 0.89,
    recommended_reason: "Can accommodate South Chennai coastal evacuees with direct access to Kamarajar Salai."
  },
  {
    candidate_id: "cand_srm_ramapuram",
    name: "SRM Ramapuram Indoor Sports Auditorium",
    area: "Ramapuram / Porur Road",
    lat: 13.0320,
    lng: 80.1780,
    suggested_capacity: 2000,
    building_type: "Indoor Stadium",
    proximity_to_flood: "1.2 km from Porur lake surplus channel",
    elevation_m: 6.0,
    suitability_score: 0.91,
    recommended_reason: "Equipped with solar back-up power, massive indoor space, and dedicated RO filtration plant."
  }
];

export const mockDefaultLocationRisk: MyLocationRiskResponse = {
  user_lat: 12.9815,
  user_lng: 80.2180,
  matched_zone_id: "velachery",
  matched_zone_name: "Velachery & Pallikaranai Marsh",
  risk_level: "Critical",
  probability_pct: 86.0,
  predicted_rain_cm: 24.5,
  predicted_flood_depth_cm: 68.0,
  time_to_flood_hours: 1.5,
  time_to_flood_display: "⚠️ Flood Inundation Peak Expected in 1.5 hrs",
  flooded_roads_nearby: [
    "Velachery Main Road (100ft)",
    "Taramani Link Road",
    "Vijayanagar Junction",
    "Murugu Nagar"
  ],
  safe_corridors: [
    "Inner Ring Road towards Guindy Flyover",
    "GST Road elevated highway corridor"
  ],
  nearest_camp: {
    camp_id: "camp_guru_nanak",
    name: "Guru Nanak College Relief Hub, Velachery",
    available: 680,
    capacity: 1800,
    status: "open",
    meals_available: 3200,
    water_liters_available: 9500,
    urgent_needs: ["Baby Food Formula", "100 Warm Blankets", "Drinking Water Cans"],
    distance_km: 1.2,
    contact: "Dr. R. Manivannan (+91 44 2245 1700)",
    lat: 12.9890,
    lng: 80.2220
  },
  advice:
    "CRITICAL: Pallikaranai marsh runoff overflow. Move immediately to Guru Nanak College shelter via Inner Ring Road."
};

export const mockAgentHealth: AgentHealth[] = [
  { agent_id: "agent_satellite", name: "Satellite Agent", status: "active", runs: 24, last_message: "Processed Sentinel-1 SAR water extent raster" },
  { agent_id: "agent_river", name: "River Gauge Agent", status: "active", runs: 48, last_message: "Saidapet Bridge gauge reading 4.65m" },
  { agent_id: "agent_weather", name: "Weather Agent", status: "active", runs: 36, last_message: "IMD Doppler radar 24.5cm 24h precipitation" },
  { agent_id: "agent_fusion", name: "Data Fusion Agent", status: "active", runs: 42, last_message: "Spatial gazetteer overlay synchronized across 7 zones" },
  { agent_id: "agent_prediction", name: "Flood Prediction Agent", status: "active", runs: 28, last_message: "Inundation model converged (94% confidence)" },
  { agent_id: "agent_rescue", name: "Rescue Coordination Agent", status: "active", runs: 18, last_message: "Assigned 2 SDRF motorized boat units to Mudichur" },
  { agent_id: "agent_route", name: "Route Optimization Agent", status: "active", runs: 32, last_message: "Computed elevated corridor routes via GST Road" },
  { agent_id: "agent_camp", name: "Relief Camp Agent", status: "active", runs: 50, last_message: "6 shelter complexes reporting live headcounts" },
  { agent_id: "agent_resource", name: "Resource Agent", status: "active", runs: 22, last_message: "Stock cover verified > 24 hours in all key hubs" },
  { agent_id: "agent_coordinator", name: "Coordinator Agent", status: "active", runs: 64, last_message: "Closed-loop multi-agent cycle running smoothly" }
];

