import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/food_redistribution';

console.log('🌱 Starting Seed Data Generation for Milestone 1...');
console.log(`Connecting to: ${DATABASE_URL}`);

const pool = new Pool({ connectionString: DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🔄 Cleaning existing seed data (TRUNCATE CASCADE)...');
    await client.query(`
      TRUNCATE TABLE 
        LOGS, 
        FEEDBACK, 
        WASTE_AUDIT_RECORDS, 
        ROUTINES, 
        DELIVERIES, 
        CLAIMS, 
        FOOD_BATCHES, 
        TRANSPORT, 
        FOOD_BANKS, 
        FOOD, 
        FOOD_DONATORS, 
        USERS 
      RESTART IDENTITY CASCADE;
    `);

    // --------------------------------------------------------------------------
    // 1. SEED USERS (Password: 'password123' for all accounts)
    // --------------------------------------------------------------------------
    console.log('👤 Seeding Users & Auth Accounts...');
    const passwordHash = bcrypt.hashSync('password123', 10);

    const users = [
      {
        name: 'System Admin',
        email: 'admin@foodrescue.org',
        role: 'ADMIN',
        phone: '+91 98765 00001',
        org: 'Food Redistribution HQ',
        ref: null,
      },
      {
        name: 'Metro Mart Manager',
        email: 'donor.metro@freshmart.com',
        role: 'DONOR',
        phone: '+91 98765 00002',
        org: 'Metro Fresh Supermarket',
        ref: 1,
      },
      {
        name: 'Artisan Head Baker',
        email: 'donor.artisan@bakery.com',
        role: 'DONOR',
        phone: '+91 98765 00003',
        org: 'Artisan Bakes & Confectionery',
        ref: 2,
      },
      {
        name: 'Royal Orchid Banquet Chef',
        email: 'donor.royal@orchid.com',
        role: 'DONOR',
        phone: '+91 98765 00004',
        org: 'Royal Orchid Banquets',
        ref: 3,
      },
      {
        name: 'Central Bank Coordinator',
        email: 'foodbank.central@feedingall.org',
        role: 'FOOD_BANK',
        phone: '+91 98765 00005',
        org: 'Central City Food Bank',
        ref: 1,
      },
      {
        name: 'Hope Shelter Director',
        email: 'shelter.hope@community.org',
        role: 'FOOD_BANK',
        phone: '+91 98765 00006',
        org: 'Hope Community Shelter',
        ref: 2,
      },
      {
        name: 'Rajesh Kumar (Driver)',
        email: 'driver.rajesh@logistics.org',
        role: 'DRIVER',
        phone: '+91 98765 12340',
        org: 'Rescue Logistics',
        ref: 1,
      },
      {
        name: 'Anita Sharma (Driver)',
        email: 'driver.anita@logistics.org',
        role: 'DRIVER',
        phone: '+91 98765 12341',
        org: 'Rescue Logistics',
        ref: 2,
      },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO USERS (name, email, password_hash, role, phone, organization_name, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.name, u.email, passwordHash, u.role, u.phone, u.org, u.ref]
      );
    }

    // --------------------------------------------------------------------------
    // 2. SEED FOOD DONATORS
    // --------------------------------------------------------------------------
    console.log('🏬 Seeding Food Donators...');
    const donators = [
      {
        name: 'Metro Fresh Supermarket',
        org: 'Metro Retail Pvt Ltd',
        type: 'SUPERMARKET',
        phone: '+91 80 2555 1001',
        email: 'contact@freshmart.com',
        addr: '12 Mahatma Gandhi Road, Bangalore Central',
        city: 'Bangalore',
        lat: 12.9716,
        lng: 77.5946,
      },
      {
        name: 'Artisan Bakes & Confectionery',
        org: 'Artisan Foods LLP',
        type: 'BAKERY',
        phone: '+91 80 2555 1002',
        email: 'orders@artisanbakes.com',
        addr: '84 100 Feet Road, Indiranagar',
        city: 'Bangalore',
        lat: 12.9784,
        lng: 77.6408,
      },
      {
        name: 'Royal Orchid Banquets & Events',
        org: 'Royal Orchid Hospitality',
        type: 'HOTEL',
        phone: '+91 80 2555 1003',
        email: 'events@royalorchid.com',
        addr: '1 Old Airport Road, Domlur',
        city: 'Bangalore',
        lat: 12.96,
        lng: 77.65,
      },
      {
        name: 'Spice Garden Heritage Restaurant',
        org: 'Spice Heritage Foods',
        type: 'RESTAURANT',
        phone: '+91 80 2555 1004',
        email: 'manager@spicegarden.com',
        addr: '23 5th Block, Koramangala',
        city: 'Bangalore',
        lat: 12.9352,
        lng: 77.6245,
      },
      {
        name: 'Green Valley Agro Distributor',
        org: 'Green Valley Produce Co',
        type: 'OTHER',
        phone: '+91 80 2555 1005',
        email: 'supply@greenvalleyagro.in',
        addr: '45 ITPL Main Road, Whitefield',
        city: 'Bangalore',
        lat: 12.9698,
        lng: 77.75,
      },
    ];

    for (const d of donators) {
      await client.query(
        `INSERT INTO FOOD_DONATORS (name, organization_name, donator_type, phone, email, address, city, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [d.name, d.org, d.type, d.phone, d.email, d.addr, d.city, d.lat, d.lng]
      );
    }

    // --------------------------------------------------------------------------
    // 3. SEED FOOD CATALOG ITEMS (INDIAN-CENTRIC)
    // --------------------------------------------------------------------------
    console.log('🍛 Seeding Indian-Centric Food Catalog...');
    const foods = [
      {
        name: 'Fresh Whole Wheat Phulka / Chapati Packs (10-Pack)',
        cat: 'BAKERY',
        desc: 'Soft handmade whole wheat flatbreads, zero preservatives. Ideal for shelter dinner distribution.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: true,
      },
      {
        name: 'Iyengar Bakery Masala Bread & Veg Puffs',
        cat: 'BAKERY',
        desc: 'Traditional Bangalore spiced onion-coriander bread loaves and potato vegetable curry puffs.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: true,
      },
      {
        name: 'Tandoori Roti & Naan Catering Trays',
        cat: 'BAKERY',
        desc: 'Clay-oven baked whole wheat rotis and leavened naans from wedding reception banquet overflow.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: true,
      },
      {
        name: 'Fresh Malai Paneer Blocks (1kg)',
        cat: 'DAIRY',
        desc: 'Vacuum-sealed fresh cottage cheese blocks packed with vegetarian milk protein and calcium.',
        unit: 'kg',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Nandini Pasteurized Toned Milk Pouches',
        cat: 'DAIRY',
        desc: 'Fresh pasteurized cow milk sachets (1 Litre each) from Karnataka Milk Federation. Cold chain required.',
        unit: 'litres',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Fresh Set Dahi / Curd Tubs (500g)',
        cat: 'DAIRY',
        desc: 'Probiotic-rich thick pasteurized fermented yogurt tubs. Essential for midday meals.',
        unit: 'packets',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Organic Palak (Spinach) & Methi Greens',
        cat: 'PRODUCE',
        desc: 'Freshly harvested leafy greens rich in iron, vitamin A, and dietary fiber from peri-urban farms.',
        unit: 'kg',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Country Tomatoes & Red Onions (Bulk Sacks)',
        cat: 'PRODUCE',
        desc: 'Essential cooking produce in 20kg crates from local APMC mandi. Firm and ripe.',
        unit: 'kg',
        storage: 'AMBIENT',
        perishable: true,
      },
      {
        name: 'Fresh Ginger-Garlic Cooking Paste Tubs',
        cat: 'PRODUCE',
        desc: 'Pure ground ginger and garlic aromatics for high-volume community soup kitchen preparations.',
        unit: 'kg',
        storage: 'REFRIGERATED',
        perishable: false,
      },
      {
        name: 'Hyderabadi Vegetable Dum Biryani Trays',
        cat: 'PREPARED_MEALS',
        desc: 'Aromatic long-grain basmati rice cooked with seasonal vegetables, mint, and saffron spices.',
        unit: 'servings',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Homestyle Tadka Dal & Jeera Rice',
        cat: 'PREPARED_MEALS',
        desc: 'Nutritious yellow moong-toor lentil stew tempered with cumin, ghee, and steamed basmati rice.',
        unit: 'servings',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'South Indian Sambar & Steamed Idlis',
        cat: 'PREPARED_MEALS',
        desc: 'Steamed fluffy fermented rice-lentil idlis served with hot drumstick and vegetable tamarind stew.',
        unit: 'servings',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Paneer Butter Masala Catering Trays',
        cat: 'PREPARED_MEALS',
        desc: 'Rich cashew-tomato gravy with soft paneer cubes prepared for banquet dinner event.',
        unit: 'servings',
        storage: 'REFRIGERATED',
        perishable: true,
      },
      {
        name: 'Sona Masoori Raw Rice (25kg Sacks)',
        cat: 'CANNED_GOODS',
        desc: 'Premium Karnataka medium-grain polished white rice. High yield and long shelf-life staple for hunger relief.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: false,
      },
      {
        name: 'Unpolished Toor Dal & Chana Dal (10kg Bags)',
        cat: 'CANNED_GOODS',
        desc: 'High-protein staple yellow lentils and split chickpeas for high-volume shelter nutrition.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: false,
      },
      {
        name: 'Roasted Peanut & Jaggery Chikki Bars',
        cat: 'PACKAGED_SNACKS',
        desc: 'Traditional high-energy roasted groundnut and unrefined jaggery brittle bars. Compact emergency nutrition.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: false,
      },
      {
        name: 'Millet Ragi Sweet Biscuit Packs',
        cat: 'PACKAGED_SNACKS',
        desc: 'Finger millet baked biscuits with natural jaggery. Rich in calcium and iron for youth shelters.',
        unit: 'packets',
        storage: 'AMBIENT',
        perishable: false,
      },
    ];

    for (const f of foods) {
      await client.query(
        `INSERT INTO FOOD (food_name, category, description, unit, storage_requirement, is_perishable)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [f.name, f.cat, f.desc, f.unit, f.storage, f.perishable]
      );
    }

    // --------------------------------------------------------------------------
    // 4. SEED FOOD BANKS
    // --------------------------------------------------------------------------
    console.log('🏢 Seeding Food Banks & Shelters...');
    const foodBanks = [
      {
        name: 'Central City Food Bank',
        reg: 'NGO-KA-2018-00441',
        contact: 'Sunil Rao',
        phone: '+91 80 2222 3301',
        email: 'central@feedingall.org',
        addr: '5 Rajajinagar Industrial Area',
        city: 'Bangalore',
        lat: 12.975,
        lng: 77.585,
        cap: 2500,
      },
      {
        name: 'Hope Community Shelter & Soup Kitchen',
        reg: 'NGO-KA-2020-00892',
        contact: 'Sister Theresa',
        phone: '+91 80 2222 3302',
        email: 'director@hopeshelter.org',
        addr: '77 Hosur Main Road, Adugodi',
        city: 'Bangalore',
        lat: 12.93,
        lng: 77.61,
        cap: 1200,
      },
      {
        name: 'Sunrise Youth & Family Mission',
        reg: 'NGO-KA-2021-01205',
        contact: 'Deepak Varma',
        phone: '+91 80 2222 3303',
        email: 'contact@sunrisemission.org',
        addr: '14 Ramamurthy Nagar Main Road',
        city: 'Bangalore',
        lat: 12.99,
        lng: 77.67,
        cap: 800,
      },
      {
        name: 'Mother Teresa Relief Outreach',
        reg: 'NGO-KA-2017-00129',
        contact: 'Father Anthony',
        phone: '+91 80 2222 3304',
        email: 'relief@motherteresaoutreach.in',
        addr: '92 Mysore Road, Chamrajpet',
        city: 'Bangalore',
        lat: 12.92,
        lng: 77.55,
        cap: 3000,
      },
    ];

    for (const fb of foodBanks) {
      await client.query(
        `INSERT INTO FOOD_BANKS (name, registration_no, contact_person, phone, email, address, city, latitude, longitude, storage_capacity_kg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [fb.name, fb.reg, fb.contact, fb.phone, fb.email, fb.addr, fb.city, fb.lat, fb.lng, fb.cap]
      );
    }

    // --------------------------------------------------------------------------
    // 5. SEED TRANSPORT FLEET
    // --------------------------------------------------------------------------
    console.log('🚚 Seeding Transport Vehicles...');
    const vehicles = [
      {
        num: 'KA-01-AB-1234',
        type: 'REFRIGERATED_VAN',
        driver: 'Rajesh Kumar',
        phone: '+91 98765 12340',
        cap: 800,
        status: 'AVAILABLE',
      },
      {
        num: 'KA-03-CD-5678',
        type: 'VAN',
        driver: 'Anita Sharma',
        phone: '+91 98765 12341',
        cap: 500,
        status: 'AVAILABLE',
      },
      {
        num: 'KA-05-EF-9012',
        type: 'PICKUP_TRUCK',
        driver: 'Vikram Singh',
        phone: '+91 98765 12342',
        cap: 1000,
        status: 'IN_TRANSIT',
      },
      {
        num: 'KA-04-GH-3456',
        type: 'REFRIGERATED_VAN',
        driver: 'Priya Nair',
        phone: '+91 98765 12343',
        cap: 750,
        status: 'AVAILABLE',
      },
    ];

    for (const v of vehicles) {
      await client.query(
        `INSERT INTO TRANSPORT (vehicle_number, vehicle_type, driver_name, driver_phone, capacity_kg, availability_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [v.num, v.type, v.driver, v.phone, v.cap, v.status]
      );
    }

    // --------------------------------------------------------------------------
    // 6. SEED TRANSPORT ROUTINES
    // --------------------------------------------------------------------------
    console.log('🗺️ Seeding Transport Routines...');
    const routines = [
      {
        tId: 1,
        day: 'MONDAY',
        time: '08:30:00',
        freq: 'WEEKLY',
        src: 'Metro Fresh Mart, MG Road',
        dest: 'Central City Food Bank, Rajajinagar',
      },
      {
        tId: 2,
        day: 'WEDNESDAY',
        time: '14:00:00',
        freq: 'WEEKLY',
        src: 'Artisan Bakes, Indiranagar',
        dest: 'Hope Community Shelter, Adugodi',
      },
      {
        tId: 4,
        day: 'DAILY',
        time: '21:30:00',
        freq: 'DAILY',
        src: 'Royal Orchid Banquets, Domlur',
        dest: 'Mother Teresa Relief Outreach, Mysore Rd',
      },
    ];

    for (const r of routines) {
      await client.query(
        `INSERT INTO ROUTINES (transport_id, scheduled_day, scheduled_time, frequency, source_location, destination_location)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [r.tId, r.day, r.time, r.freq, r.src, r.dest]
      );
    }

    // --------------------------------------------------------------------------
    // 7. SEED FOOD BATCHES WITH REAL AI VECTOR EMBEDDINGS
    // --------------------------------------------------------------------------
    console.log('🧠 Generating AI Vector Embeddings via @xenova/transformers...');
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Date helper offsets from today
    const now = new Date();
    const addDays = (d) => {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    };

    const batches = [
      // Expired batches (for testing waste audits and triggers)
      {
        foodId: 2,
        donorId: 2,
        qty: 30,
        avail: 0,
        donDate: addDays(-6),
        mfgDate: addDays(-7),
        expDate: addDays(-2),
        cond: 'Ambient room temp bakery shelf',
        status: 'EXPIRED',
        semanticDesc: 'Iyengar bakery masala bread loaves and potato puffs spiced savory snacks',
      },
      {
        foodId: 5,
        donorId: 1,
        qty: 50,
        avail: 0,
        donDate: addDays(-5),
        mfgDate: addDays(-6),
        expDate: addDays(-1),
        cond: 'Refrigerated cold room 4C',
        status: 'EXPIRED',
        semanticDesc: 'Nandini pasteurized toned milk pouches Karnataka dairy cow milk packets',
      },

      // Expiring very soon <= 48 hours (Urgent Distress Food!)
      {
        foodId: 1,
        donorId: 2,
        qty: 80,
        avail: 80,
        donDate: addDays(-1),
        mfgDate: addDays(-1),
        expDate: addDays(1),
        cond: 'Cool dry pantry',
        status: 'AVAILABLE',
        semanticDesc: 'Freshly made handmade whole wheat phulka chapati flatbread rotis for lunch and dinner',
      },
      {
        foodId: 10,
        donorId: 3,
        qty: 100,
        avail: 100,
        donDate: addDays(0),
        mfgDate: addDays(0),
        expDate: addDays(1),
        cond: 'Chilled insulated food trays 3C',
        status: 'AVAILABLE',
        semanticDesc: 'Hot cooked aromatic vegetable dum biryani with long grain basmati rice and spices',
      },
      {
        foodId: 12,
        donorId: 4,
        qty: 60,
        avail: 60,
        donDate: addDays(0),
        mfgDate: addDays(0),
        expDate: addDays(1),
        cond: 'Thermal insulated catering containers',
        status: 'AVAILABLE',
        semanticDesc: 'Steamed soft rice idlis with hot vegetable sambar drumsticks and lentils for breakfast',
      },
      {
        foodId: 4,
        donorId: 1,
        qty: 40,
        avail: 40,
        donDate: addDays(-1),
        mfgDate: addDays(-2),
        expDate: addDays(2),
        cond: 'Refrigerated dairy chiller 3C',
        status: 'AVAILABLE',
        semanticDesc: 'Fresh malai paneer cottage cheese blocks rich vegetarian protein and calcium',
      },
      {
        foodId: 11,
        donorId: 4,
        qty: 50,
        avail: 50,
        donDate: addDays(0),
        mfgDate: addDays(0),
        expDate: addDays(2),
        cond: 'Chilled catering containers',
        status: 'AVAILABLE',
        semanticDesc: 'Nutritious yellow toor moong dal with cumin jeera rice comfort warm dinner meal',
      },
      {
        foodId: 7,
        donorId: 5,
        qty: 45,
        avail: 45,
        donDate: addDays(-1),
        mfgDate: addDays(-1),
        expDate: addDays(2),
        cond: 'Misted produce cooler 5C',
        status: 'AVAILABLE',
        semanticDesc: 'Fresh organic palak spinach and methi fenugreek green leaves rich in iron and vitamins',
      },
      {
        foodId: 13,
        donorId: 3,
        qty: 50,
        avail: 50,
        donDate: addDays(0),
        mfgDate: addDays(0),
        expDate: addDays(2),
        cond: 'Chilled insulated food containers 3C',
        status: 'AVAILABLE',
        semanticDesc: 'Rich creamy paneer butter masala cottage cheese curry gravy for shelter meals',
      },

      // Fresh Batches (4 to 180 days remaining)
      {
        foodId: 3,
        donorId: 3,
        qty: 70,
        avail: 70,
        donDate: addDays(0),
        mfgDate: addDays(0),
        expDate: addDays(4),
        cond: 'Ambient ventilated bins',
        status: 'AVAILABLE',
        semanticDesc: 'Tandoori naan and clay oven baked whole wheat rotis',
      },
      {
        foodId: 6,
        donorId: 1,
        qty: 60,
        avail: 60,
        donDate: addDays(-1),
        mfgDate: addDays(-2),
        expDate: addDays(7),
        cond: 'Chilled dairy display 4C',
        status: 'AVAILABLE',
        semanticDesc: 'Fresh probiotic curd dahi yogurt tubs cooling midday meal dairy',
      },
      {
        foodId: 8,
        donorId: 5,
        qty: 150,
        avail: 150,
        donDate: addDays(-1),
        mfgDate: addDays(-2),
        expDate: addDays(10),
        cond: 'Well ventilated crates',
        status: 'AVAILABLE',
        semanticDesc: 'Fresh country tomatoes and red onions cooking vegetables staple produce',
      },
      {
        foodId: 9,
        donorId: 5,
        qty: 30,
        avail: 30,
        donDate: addDays(-2),
        mfgDate: addDays(-5),
        expDate: addDays(30),
        cond: 'Refrigerated pantry 4C',
        status: 'AVAILABLE',
        semanticDesc: 'Fresh ginger garlic cooking paste aromatics for high volume community meals',
      },
      {
        foodId: 14,
        donorId: 1,
        qty: 25,
        avail: 25,
        donDate: addDays(-3),
        mfgDate: addDays(-30),
        expDate: addDays(180),
        cond: 'Dry pallet storage',
        status: 'AVAILABLE',
        semanticDesc: 'Sona Masoori polished raw white rice bulk grain dry ration for hunger relief',
      },
      {
        foodId: 15,
        donorId: 1,
        qty: 30,
        avail: 30,
        donDate: addDays(-3),
        mfgDate: addDays(-30),
        expDate: addDays(180),
        cond: 'Dry moisture-free pantry',
        status: 'AVAILABLE',
        semanticDesc: 'Unpolished toor dal and split chana dal dry yellow lentils protein rich grains',
      },
      {
        foodId: 16,
        donorId: 1,
        qty: 120,
        avail: 120,
        donDate: addDays(0),
        mfgDate: addDays(-10),
        expDate: addDays(60),
        cond: 'Dry ambient display',
        status: 'AVAILABLE',
        semanticDesc: 'Peanut and jaggery chikki brittle bars high energy healthy traditional sweet snack',
      },
      {
        foodId: 17,
        donorId: 2,
        qty: 100,
        avail: 100,
        donDate: addDays(0),
        mfgDate: addDays(-5),
        expDate: addDays(45),
        cond: 'Dry ambient bakery shelf',
        status: 'AVAILABLE',
        semanticDesc: 'Millet ragi biscuits finger millet iron calcium snacks for youth and children',
      },
    ];

    console.log(`📦 Inserting ${batches.length} Food Batches with dense vector embeddings...`);
    const batchInserts = [];

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      // Generate genuine 384-dim semantic vector
      const output = await extractor(b.semanticDesc, {
        pooling: 'mean',
        normalize: true,
      });
      const vectorArray = Array.from(output.data);
      const vectorSql = `[${vectorArray.join(',')}]`;

      const res = await client.query(
        `INSERT INTO FOOD_BATCHES 
          (food_id, donator_id, quantity, available_quantity, donation_date, manufacturing_date, expiry_date, storage_condition, status, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING batch_id;`,
        [
          b.foodId,
          b.donorId,
          b.qty,
          b.avail,
          b.donDate,
          b.mfgDate,
          b.expDate,
          b.cond,
          b.status,
          vectorSql,
        ]
      );
      batchInserts.push({ ...b, batch_id: res.rows[0].batch_id, vectorSql });
    }

    // --------------------------------------------------------------------------
    // 8. SEED CLAIMS, DELIVERIES, FEEDBACK & WASTE RECORDS
    // --------------------------------------------------------------------------
    console.log('📋 Seeding Claims, Deliveries, Feedback & Waste Audits...');

    // Claim 1: Delivered claim
    const c1 = await client.query(
      `INSERT INTO CLAIMS (batch_id, food_bank_id, claim_date, quantity_claimed, status, approved_date, pickup_required)
       VALUES (1, 1, CURRENT_DATE - INTERVAL '5 days', 30, 'DELIVERED', CURRENT_DATE - INTERVAL '5 days', TRUE)
       RETURNING claim_id;`
    );
    const claim1Id = c1.rows[0].claim_id;

    await client.query(
      `INSERT INTO DELIVERIES (claim_id, transport_id, pickup_date, pickup_time, delivery_date, delivery_time, pickup_location, delivery_location, status)
       VALUES ($1, 1, CURRENT_DATE - INTERVAL '5 days', '09:00:00', CURRENT_DATE - INTERVAL '5 days', '10:30:00', 'Artisan Bakes, Indiranagar', 'Central City Food Bank, Rajajinagar', 'DELIVERED')`,
      [claim1Id]
    );

    await client.query(
      `INSERT INTO FEEDBACK (claim_id, rating, comments, feedback_date, response, status)
       VALUES ($1, 5, 'Pastries were in great condition and appreciated by the morning shelter recipients!', CURRENT_DATE - INTERVAL '4 days', 'Thank you for your service!', 'RESOLVED')`,
      [claim1Id]
    );

    // Claim 2: Pending claim on fresh sourdough batch (batch 3)
    await client.query(
      `INSERT INTO CLAIMS (batch_id, food_bank_id, claim_date, quantity_claimed, status, pickup_required)
       VALUES (3, 2, CURRENT_DATE, 20, 'PENDING', FALSE)`
    );

    // Waste Audit Records for Expired Batches (Batches 1 & 2)
    await client.query(
      `INSERT INTO WASTE_AUDIT_RECORDS (batch_id, quantity_wasted, waste_date, reason, disposal_method, remarks)
       VALUES (1, 30, CURRENT_DATE - INTERVAL '1 day', 'Past shelf-life before secondary collection', 'COMPOST', 'Diverted to organic agricultural composting unit'),
              (2, 40, CURRENT_DATE, 'Milk curdled due to cold-chain breakdown in display cooler', 'BIOFUEL', 'Sent to municipal biogas digestor')`
    );

    // Initial audit logs
    await client.query(
      `INSERT INTO LOGS (action, description, entity_type, entity_reference, old_status, new_status)
       VALUES 
        ('SYSTEM_INITIALIZE', 'Initial seed data and pgvector embeddings generated', 'SYSTEM', 0, NULL, 'ACTIVE'),
        ('BATCH_EXPIRED', 'Batch #1 marked as expired and sent to waste audit', 'FOOD_BATCHES', 1, 'AVAILABLE', 'EXPIRED'),
        ('BATCH_EXPIRED', 'Batch #2 marked as expired due to cold chain defect', 'FOOD_BATCHES', 2, 'AVAILABLE', 'EXPIRED'),
        ('CLAIM_FULFILLED', 'Claim #1 successfully delivered to Central Food Bank', 'CLAIMS', 1, 'IN_TRANSIT', 'DELIVERED')`
    );

    console.log('✅ All relational tables and pgvector embeddings seeded successfully!');

    // --------------------------------------------------------------------------
    // 9. DUMP TO database/seed.sql FOR PORTABILITY & DOCKER INITIALIZATION
    // --------------------------------------------------------------------------
    console.log('📄 Exporting portable SQL dump to database/seed.sql...');
    const seedSqlContent = `-- ==============================================================================
-- FOOD REDISTRIBUTION & EXPIRATION TRACKING
-- DBMS Level 3 Experiential Learning Project
-- Milestone 1 Seed Data (PostgreSQL 16 + pgvector)
-- ==============================================================================

TRUNCATE TABLE 
  LOGS, FEEDBACK, WASTE_AUDIT_RECORDS, ROUTINES, DELIVERIES, 
  CLAIMS, FOOD_BATCHES, TRANSPORT, FOOD_BANKS, FOOD, FOOD_DONATORS, USERS 
RESTART IDENTITY CASCADE;

-- 1. USERS (Default test password for all accounts: 'password123')
INSERT INTO USERS (user_id, name, email, password_hash, role, phone, organization_name, reference_id) VALUES
  (1, 'System Admin', 'admin@foodrescue.org', '${passwordHash}', 'ADMIN', '+91 98765 00001', 'Food Redistribution HQ', NULL),
  (2, 'Metro Mart Manager', 'donor.metro@freshmart.com', '${passwordHash}', 'DONOR', '+91 98765 00002', 'Metro Fresh Supermarket', 1),
  (3, 'Artisan Head Baker', 'donor.artisan@bakery.com', '${passwordHash}', 'DONOR', '+91 98765 00003', 'Artisan Bakes & Confectionery', 2),
  (4, 'Royal Orchid Banquet Chef', 'donor.royal@orchid.com', '${passwordHash}', 'DONOR', '+91 98765 00004', 'Royal Orchid Banquets', 3),
  (5, 'Central Bank Coordinator', 'foodbank.central@feedingall.org', '${passwordHash}', 'FOOD_BANK', '+91 98765 00005', 'Central City Food Bank', 1),
  (6, 'Hope Shelter Director', 'shelter.hope@community.org', '${passwordHash}', 'FOOD_BANK', '+91 98765 00006', 'Hope Community Shelter', 2),
  (7, 'Rajesh Kumar (Driver)', 'driver.rajesh@logistics.org', '${passwordHash}', 'DRIVER', '+91 98765 12340', 'Rescue Logistics', 1),
  (8, 'Anita Sharma (Driver)', 'driver.anita@logistics.org', '${passwordHash}', 'DRIVER', '+91 98765 12341', 'Rescue Logistics', 2);

-- 2. FOOD_DONATORS
INSERT INTO FOOD_DONATORS (donator_id, name, organization_name, donator_type, phone, email, address, city, latitude, longitude) VALUES
  (1, 'Metro Fresh Supermarket', 'Metro Retail Pvt Ltd', 'SUPERMARKET', '+91 80 2555 1001', 'contact@freshmart.com', '12 Mahatma Gandhi Road, Bangalore Central', 'Bangalore', 12.9716, 77.5946),
  (2, 'Artisan Bakes & Confectionery', 'Artisan Foods LLP', 'BAKERY', '+91 80 2555 1002', 'orders@artisanbakes.com', '84 100 Feet Road, Indiranagar', 'Bangalore', 12.9784, 77.6408),
  (3, 'Royal Orchid Banquets & Events', 'Royal Orchid Hospitality', 'HOTEL', '+91 80 2555 1003', 'events@royalorchid.com', '1 Old Airport Road, Domlur', 'Bangalore', 12.9600, 77.6500),
  (4, 'Spice Garden Heritage Restaurant', 'Spice Heritage Foods', 'RESTAURANT', '+91 80 2555 1004', 'manager@spicegarden.com', '23 5th Block, Koramangala', 'Bangalore', 12.9352, 77.6245),
  (5, 'Green Valley Agro Distributor', 'Green Valley Produce Co', 'OTHER', '+91 80 2555 1005', 'supply@greenvalleyagro.in', '45 ITPL Main Road, Whitefield', 'Bangalore', 12.9698, 77.7500);

-- 3. FOOD CATALOG
INSERT INTO FOOD (food_id, food_name, category, description, unit, storage_requirement, is_perishable) VALUES
  (1, 'Fresh Whole Wheat Phulka / Chapati Packs (10-Pack)', 'BAKERY', 'Soft handmade whole wheat flatbreads, zero preservatives.', 'packets', 'AMBIENT', TRUE),
  (2, 'Iyengar Bakery Masala Bread & Veg Puffs', 'BAKERY', 'Traditional Bangalore spiced onion-coriander bread loaves and potato puffs.', 'packets', 'AMBIENT', TRUE),
  (3, 'Tandoori Roti & Naan Catering Trays', 'BAKERY', 'Clay-oven baked whole wheat rotis and leavened naans from wedding banquet.', 'packets', 'AMBIENT', TRUE),
  (4, 'Fresh Malai Paneer Blocks (1kg)', 'DAIRY', 'Vacuum-sealed fresh cottage cheese blocks packed with vegetarian milk protein.', 'kg', 'REFRIGERATED', TRUE),
  (5, 'Nandini Pasteurized Toned Milk Pouches', 'DAIRY', 'Fresh pasteurized cow milk sachets (1 Litre each) from Karnataka Milk Federation.', 'litres', 'REFRIGERATED', TRUE),
  (6, 'Fresh Set Dahi / Curd Tubs (500g)', 'DAIRY', 'Probiotic-rich thick pasteurized fermented yogurt tubs.', 'packets', 'REFRIGERATED', TRUE),
  (7, 'Organic Palak (Spinach) & Methi Greens', 'PRODUCE', 'Freshly harvested leafy greens rich in iron, vitamin A, and dietary fiber.', 'kg', 'REFRIGERATED', TRUE),
  (8, 'Country Tomatoes & Red Onions (Bulk Sacks)', 'PRODUCE', 'Essential cooking produce in 20kg crates from APMC mandi.', 'kg', 'AMBIENT', TRUE),
  (9, 'Fresh Ginger-Garlic Cooking Paste Tubs', 'PRODUCE', 'Pure ground ginger and garlic aromatics for high-volume community soup kitchens.', 'kg', 'REFRIGERATED', FALSE),
  (10, 'Hyderabadi Vegetable Dum Biryani Trays', 'PREPARED_MEALS', 'Aromatic long-grain basmati rice cooked with seasonal vegetables and saffron.', 'servings', 'REFRIGERATED', TRUE),
  (11, 'Homestyle Tadka Dal & Jeera Rice', 'PREPARED_MEALS', 'Nutritious yellow moong-toor lentil stew with cumin basmati rice.', 'servings', 'REFRIGERATED', TRUE),
  (12, 'South Indian Sambar & Steamed Idlis', 'PREPARED_MEALS', 'Steamed fluffy fermented rice-lentil idlis served with vegetable tamarind stew.', 'servings', 'REFRIGERATED', TRUE),
  (13, 'Paneer Butter Masala Catering Trays', 'PREPARED_MEALS', 'Rich cashew-tomato gravy with soft paneer cubes prepared for banquet dinner.', 'servings', 'REFRIGERATED', TRUE),
  (14, 'Sona Masoori Raw Rice (25kg Sacks)', 'CANNED_GOODS', 'Premium Karnataka medium-grain polished white rice staple grain.', 'packets', 'AMBIENT', FALSE),
  (15, 'Unpolished Toor Dal & Chana Dal (10kg Bags)', 'CANNED_GOODS', 'High-protein staple yellow lentils and split chickpeas.', 'packets', 'AMBIENT', FALSE),
  (16, 'Roasted Peanut & Jaggery Chikki Bars', 'PACKAGED_SNACKS', 'Traditional high-energy roasted groundnut and unrefined jaggery brittle bars.', 'packets', 'AMBIENT', FALSE),
  (17, 'Millet Ragi Sweet Biscuit Packs', 'PACKAGED_SNACKS', 'Finger millet baked biscuits with natural jaggery for children shelters.', 'packets', 'AMBIENT', FALSE);

-- 4. FOOD_BANKS
INSERT INTO FOOD_BANKS (food_bank_id, name, registration_no, contact_person, phone, email, address, city, latitude, longitude, storage_capacity_kg) VALUES
  (1, 'Central City Food Bank', 'NGO-KA-2018-00441', 'Sunil Rao', '+91 80 2222 3301', 'central@feedingall.org', '5 Rajajinagar Industrial Area', 'Bangalore', 12.9750, 77.5850, 2500),
  (2, 'Hope Community Shelter & Soup Kitchen', 'NGO-KA-2020-00892', 'Sister Theresa', '+91 80 2222 3302', 'director@hopeshelter.org', '77 Hosur Main Road, Adugodi', 'Bangalore', 12.9300, 77.6100, 1200),
  (3, 'Sunrise Youth & Family Mission', 'NGO-KA-2021-01205', 'Deepak Varma', '+91 80 2222 3303', 'contact@sunrisemission.org', '14 Ramamurthy Nagar Main Road', 'Bangalore', 12.9900, 77.6700, 800),
  (4, 'Mother Teresa Relief Outreach', 'NGO-KA-2017-00129', 'Father Anthony', '+91 80 2222 3304', 'relief@motherteresaoutreach.in', '92 Mysore Road, Chamrajpet', 'Bangalore', 12.9200, 77.5500, 3000);

-- 5. TRANSPORT
INSERT INTO TRANSPORT (transport_id, vehicle_number, vehicle_type, driver_name, driver_phone, capacity_kg, availability_status) VALUES
  (1, 'KA-01-AB-1234', 'REFRIGERATED_VAN', 'Rajesh Kumar', '+91 98765 12340', 800, 'AVAILABLE'),
  (2, 'KA-03-CD-5678', 'VAN', 'Anita Sharma', '+91 98765 12341', 500, 'AVAILABLE'),
  (3, 'KA-05-EF-9012', 'PICKUP_TRUCK', 'Vikram Singh', '+91 98765 12342', 1000, 'IN_TRANSIT'),
  (4, 'KA-04-GH-3456', 'REFRIGERATED_VAN', 'Priya Nair', '+91 98765 12343', 750, 'AVAILABLE');

-- 6. ROUTINES
INSERT INTO ROUTINES (transport_id, scheduled_day, scheduled_time, frequency, source_location, destination_location) VALUES
  (1, 'MONDAY', '08:30:00', 'WEEKLY', 'Metro Fresh Mart, MG Road', 'Central City Food Bank, Rajajinagar'),
  (2, 'WEDNESDAY', '14:00:00', 'WEEKLY', 'Artisan Bakes, Indiranagar', 'Hope Community Shelter, Adugodi'),
  (4, 'DAILY', '21:30:00', 'DAILY', 'Royal Orchid Banquets, Domlur', 'Mother Teresa Relief Outreach, Mysore Rd');

-- 7. FOOD_BATCHES (includes 384-dimensional dense vectors)
${batchInserts
  .map(
    (b) => `INSERT INTO FOOD_BATCHES (batch_id, food_id, donator_id, quantity, available_quantity, donation_date, manufacturing_date, expiry_date, storage_condition, status, embedding)
VALUES (${b.batch_id}, ${b.foodId}, ${b.donorId}, ${b.qty}, ${b.avail}, '${b.donDate}', '${b.mfgDate}', '${b.expDate}', '${b.cond}', '${b.status}', '${b.vectorSql}');`
  )
  .join('\n')}

-- 8. CLAIMS & DELIVERIES
INSERT INTO CLAIMS (claim_id, batch_id, food_bank_id, claim_date, quantity_claimed, status, approved_date, pickup_required) VALUES
  (1, 1, 1, CURRENT_DATE - INTERVAL '5 days', 30, 'DELIVERED', CURRENT_DATE - INTERVAL '5 days', TRUE),
  (2, 3, 2, CURRENT_DATE, 20, 'PENDING', NULL, FALSE);

INSERT INTO DELIVERIES (delivery_id, claim_id, transport_id, pickup_date, pickup_time, delivery_date, delivery_time, pickup_location, delivery_location, status) VALUES
  (1, 1, 1, CURRENT_DATE - INTERVAL '5 days', '09:00:00', CURRENT_DATE - INTERVAL '5 days', '10:30:00', 'Artisan Bakes, Indiranagar', 'Central City Food Bank, Rajajinagar', 'DELIVERED');

INSERT INTO FEEDBACK (feedback_id, claim_id, rating, comments, feedback_date, response, status) VALUES
  (1, 1, 5, 'Pastries were in great condition and appreciated by the morning shelter recipients!', CURRENT_DATE - INTERVAL '4 days', 'Thank you for your service!', 'RESOLVED');

INSERT INTO WASTE_AUDIT_RECORDS (waste_id, batch_id, quantity_wasted, waste_date, reason, disposal_method, remarks) VALUES
  (1, 1, 30, CURRENT_DATE - INTERVAL '1 day', 'Past shelf-life before secondary collection', 'COMPOST', 'Diverted to organic agricultural composting unit'),
  (2, 2, 40, CURRENT_DATE, 'Milk curdled due to cold-chain breakdown in display cooler', 'BIOFUEL', 'Sent to municipal biogas digestor');

INSERT INTO LOGS (action, description, entity_type, entity_reference, old_status, new_status) VALUES
  ('SYSTEM_INITIALIZE', 'Initial seed data and pgvector embeddings generated', 'SYSTEM', 0, NULL, 'ACTIVE'),
  ('BATCH_EXPIRED', 'Batch #1 marked as expired and sent to waste audit', 'FOOD_BATCHES', 1, 'AVAILABLE', 'EXPIRED'),
  ('BATCH_EXPIRED', 'Batch #2 marked as expired due to cold chain defect', 'FOOD_BATCHES', 2, 'AVAILABLE', 'EXPIRED'),
  ('CLAIM_FULFILLED', 'Claim #1 successfully delivered to Central Food Bank', 'CLAIMS', 1, 'IN_TRANSIT', 'DELIVERED');

-- Reset sequences to prevent key collisions
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM USERS));
SELECT setval('food_donators_donator_id_seq', (SELECT MAX(donator_id) FROM FOOD_DONATORS));
SELECT setval('food_food_id_seq', (SELECT MAX(food_id) FROM FOOD));
SELECT setval('food_banks_food_bank_id_seq', (SELECT MAX(food_bank_id) FROM FOOD_BANKS));
SELECT setval('transport_transport_id_seq', (SELECT MAX(transport_id) FROM TRANSPORT));
SELECT setval('routines_routine_id_seq', (SELECT MAX(routine_id) FROM ROUTINES));
SELECT setval('food_batches_batch_id_seq', (SELECT MAX(batch_id) FROM FOOD_BATCHES));
SELECT setval('claims_claim_id_seq', (SELECT MAX(claim_id) FROM CLAIMS));
SELECT setval('deliveries_delivery_id_seq', (SELECT MAX(delivery_id) FROM DELIVERIES));
SELECT setval('feedback_feedback_id_seq', (SELECT MAX(feedback_id) FROM FEEDBACK));
SELECT setval('waste_audit_records_waste_id_seq', (SELECT MAX(waste_id) FROM WASTE_AUDIT_RECORDS));
SELECT setval('logs_log_id_seq', (SELECT MAX(log_id) FROM LOGS));
`;

    const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
    fs.writeFileSync(seedPath, seedSqlContent, 'utf-8');
    console.log(`💾 Saved SQL seed dump to: ${seedPath}`);

    // Quick verification query: test semantic similarity search right now!
    console.log('\n🔎 Testing Semantic Similarity Search against seeded batches...');
    const testQuery = 'High protein emergency breakfast for youth';
    const testOutput = await extractor(testQuery, { pooling: 'mean', normalize: true });
    const queryVector = `[${Array.from(testOutput.data).join(',')}]`;

    const searchRes = await client.query(
      `SELECT 
        fb.batch_id,
        f.food_name,
        f.category,
        fb.available_quantity,
        fb.expiry_date,
        ROUND(((1 - (fb.embedding <=> $1)) * 100)::numeric, 1) as match_percentage
       FROM FOOD_BATCHES fb
       JOIN FOOD f ON fb.food_id = f.food_id
       WHERE fb.status = 'AVAILABLE'
       ORDER BY fb.embedding <=> $1
       LIMIT 3;`,
      [queryVector]
    );

    console.log(`\nQuery: "${testQuery}"`);
    console.table(searchRes.rows);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));

