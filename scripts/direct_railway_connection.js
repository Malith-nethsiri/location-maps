#!/usr/bin/env node
/**
 * Direct Railway Database Connection
 * For when Railway CLI authentication isn't available
 */

require('dotenv').config();
const { Client } = require('pg');

// Your Railway database connection
const RAILWAY_DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

async function populateDatabaseDirectly() {
  if (!RAILWAY_DATABASE_URL) {
    console.error('❌ DATABASE_URL not found!');
    console.log('📝 Please set your Railway DATABASE_URL in .env file:');
    console.log('   DATABASE_URL=postgresql://postgres:password@host:port/railway');
    console.log('\n🔍 Get this from: Railway Project → PostgreSQL → Variables tab');
    process.exit(1);
  }

  console.log('🚂 Connecting directly to Railway PostgreSQL...');

  const client = new Client({
    connectionString: RAILWAY_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database');

    // Clear existing Sri Lankan cities
    console.log('🧹 Clearing existing Sri Lankan cities...');
    await client.query("DELETE FROM cities WHERE country = 'Sri Lanka'");

    console.log('📍 Inserting 45+ Sri Lankan cities...');

    // Essential Sri Lankan cities (same as populate_cities_direct.js)
    const cities = [
      { name: 'Colombo', lat: 6.9271, lng: 79.8612, population: 752993, tier: 'major', district: 'Colombo', province: 'Western' },
      { name: 'Dehiwala-Mount Lavinia', lat: 6.8344, lng: 79.8428, population: 245974, tier: 'major', district: 'Colombo', province: 'Western' },
      { name: 'Moratuwa', lat: 6.7727, lng: 79.8816, population: 185031, tier: 'major', district: 'Colombo', province: 'Western' },
      { name: 'Negombo', lat: 7.2067, lng: 79.8358, population: 142136, tier: 'large', district: 'Gampaha', province: 'Western' },
      { name: 'Kandy', lat: 7.2906, lng: 80.6337, population: 125351, tier: 'large', district: 'Kandy', province: 'Central' },
      { name: 'Kalmunai', lat: 7.4061, lng: 81.8220, population: 106783, tier: 'large', district: 'Ampara', province: 'Eastern' },
      { name: 'Galle', lat: 6.0535, lng: 80.2210, population: 99478, tier: 'large', district: 'Galle', province: 'Southern' },
      { name: 'Trincomalee', lat: 8.5874, lng: 81.2152, population: 99135, tier: 'large', district: 'Trincomalee', province: 'Eastern' },
      { name: 'Batticaloa', lat: 7.7102, lng: 81.6924, population: 95489, tier: 'large', district: 'Batticaloa', province: 'Eastern' },
      { name: 'Jaffna', lat: 9.6615, lng: 80.0255, population: 88138, tier: 'large', district: 'Jaffna', province: 'Northern' },
      { name: 'Katunayake', lat: 7.1644, lng: 79.8883, population: 84474, tier: 'large', district: 'Gampaha', province: 'Western' },
      { name: 'Kurunegala', lat: 7.4863, lng: 80.3647, population: 78611, tier: 'medium', district: 'Kurunegala', province: 'North Western' },
      { name: 'Matara', lat: 5.9485, lng: 80.5353, population: 76693, tier: 'medium', district: 'Matara', province: 'Southern' },
      { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037, population: 75000, tier: 'medium', district: 'Anuradhapura', province: 'North Central' },
      { name: 'Ratnapura', lat: 6.6828, lng: 80.3992, population: 52170, tier: 'medium', district: 'Ratnapura', province: 'Sabaragamuwa' },
      { name: 'Badulla', lat: 6.9887, lng: 81.0550, population: 50000, tier: 'medium', district: 'Badulla', province: 'Uva' },
      { name: 'Kalutara', lat: 6.5854, lng: 79.9607, population: 42984, tier: 'medium', district: 'Kalutara', province: 'Western' },
      { name: 'Panadura', lat: 6.7132, lng: 79.9026, population: 42000, tier: 'medium', district: 'Kalutara', province: 'Western' },
      { name: 'Vavuniya', lat: 8.7514, lng: 80.4971, population: 41162, tier: 'medium', district: 'Vavuniya', province: 'Northern' },
      { name: 'Matale', lat: 7.4675, lng: 80.6234, population: 40000, tier: 'medium', district: 'Matale', province: 'Central' },
      { name: 'Puttalam', lat: 8.0362, lng: 79.8280, population: 39387, tier: 'medium', district: 'Puttalam', province: 'North Western' },
      { name: 'Chilaw', lat: 7.5759, lng: 79.7953, population: 37000, tier: 'medium', district: 'Puttalam', province: 'North Western' },
      { name: 'Hambantota', lat: 6.1245, lng: 81.1185, population: 36000, tier: 'medium', district: 'Hambantota', province: 'Southern' },
      { name: 'Ampara', lat: 7.3018, lng: 81.6748, population: 35000, tier: 'medium', district: 'Ampara', province: 'Eastern' },
      { name: 'Embilipitiya', lat: 6.3431, lng: 80.8497, population: 33000, tier: 'medium', district: 'Ratnapura', province: 'Sabaragamuwa' },
      { name: 'Monaragala', lat: 6.8728, lng: 81.3510, population: 30000, tier: 'medium', district: 'Monaragala', province: 'Uva' },
      { name: 'Horana', lat: 6.7155, lng: 80.0624, population: 28000, tier: 'small', district: 'Kalutara', province: 'Western' },
      { name: 'Wattala', lat: 6.9889, lng: 79.8914, population: 27000, tier: 'small', district: 'Gampaha', province: 'Western' },
      { name: 'Kelaniya', lat: 6.9553, lng: 79.9219, population: 26000, tier: 'small', district: 'Gampaha', province: 'Western' },
      { name: 'Gampaha', lat: 7.0917, lng: 79.9999, population: 25000, tier: 'small', district: 'Gampaha', province: 'Western' },
      { name: 'Avissawella', lat: 6.9515, lng: 80.2096, population: 24000, tier: 'small', district: 'Colombo', province: 'Western' },
      { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891, population: 23000, tier: 'small', district: 'Nuwara Eliya', province: 'Central' },
      { name: 'Beruwala', lat: 6.4788, lng: 79.9826, population: 22000, tier: 'small', district: 'Kalutara', province: 'Western' },
      { name: 'Balangoda', lat: 6.6554, lng: 80.6798, population: 21000, tier: 'small', district: 'Ratnapura', province: 'Sabaragamuwa' },
      { name: 'Tangalle', lat: 6.0235, lng: 80.7939, population: 20000, tier: 'small', district: 'Hambantota', province: 'Southern' },
      { name: 'Kegalle', lat: 7.2513, lng: 80.3464, population: 19000, tier: 'small', district: 'Kegalle', province: 'Sabaragamuwa' },
      { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188, population: 18000, tier: 'small', district: 'Polonnaruwa', province: 'North Central' },
      { name: 'Tissamaharama', lat: 6.2745, lng: 81.2873, population: 17000, tier: 'small', district: 'Hambantota', province: 'Southern' },
      { name: 'Ambalangoda', lat: 6.2353, lng: 80.0534, population: 16000, tier: 'small', district: 'Galle', province: 'Southern' },
      { name: 'Mannar', lat: 8.9811, lng: 79.9044, population: 15000, tier: 'small', district: 'Mannar', province: 'Northern' },
      { name: 'Bandarawela', lat: 6.8263, lng: 80.9951, population: 14000, tier: 'small', district: 'Badulla', province: 'Uva' },
      { name: 'Dambulla', lat: 7.8731, lng: 80.6522, population: 13000, tier: 'small', district: 'Matale', province: 'Central' },
      { name: 'Sigiriya', lat: 7.9568, lng: 80.7598, population: 2000, tier: 'village', district: 'Matale', province: 'Central' },
      { name: 'Hikkaduwa', lat: 6.1410, lng: 80.1098, population: 11000, tier: 'small', district: 'Galle', province: 'Southern' },
      { name: 'Unawatuna', lat: 6.0108, lng: 80.2506, population: 3000, tier: 'village', district: 'Galle', province: 'Southern' },
      { name: 'Ella', lat: 6.8720, lng: 81.0462, population: 2000, tier: 'village', district: 'Badulla', province: 'Uva' }
    ];

    let insertedCount = 0;
    for (const city of cities) {
      try {
        const insertQuery = `
          INSERT INTO cities (
            name, country, state, latitude, longitude,
            population, population_tier, district, province,
            is_major_city, timezone, geom
          ) VALUES (
            $1, 'Sri Lanka', 'Sri Lanka', $2, $3,
            $4, $5, $6, $7,
            $8, 'Asia/Colombo', ST_SetSRID(ST_MakePoint($3, $2), 4326)
          )
        `;

        await client.query(insertQuery, [
          city.name,
          city.lat,
          city.lng,
          city.population,
          city.tier,
          city.district,
          city.province,
          city.tier === 'major'
        ]);

        insertedCount++;
        if (insertedCount % 10 === 0) {
          console.log(`✅ Inserted ${insertedCount} cities...`);
        }

      } catch (error) {
        console.warn(`⚠️ Failed to insert ${city.name}:`, error.message);
      }
    }

    console.log(`🎉 Successfully inserted ${insertedCount} cities`);

    // Verify insertion
    const result = await client.query("SELECT COUNT(*) as count FROM cities WHERE country = 'Sri Lanka'");
    const totalCities = result.rows[0].count;

    console.log(`📊 Total Sri Lankan cities in database: ${totalCities}`);
    console.log('✅ Database population completed successfully!');

  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  populateDatabaseDirectly()
    .then(() => {
      console.log('\n🎯 Database population completed! Refresh your Railway database view to see 45+ cities.');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateDatabaseDirectly };