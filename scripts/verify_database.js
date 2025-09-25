#!/usr/bin/env node
/**
 * Verify Database Population
 * Check if Railway database has been properly populated with Sri Lankan cities
 */

require('dotenv').config();
const { query, initializeDatabase } = require('../backend/config/database');

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying Railway database population...');
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : '❌ Missing');

    // Initialize database connection
    await initializeDatabase();

    // Check total cities
    const totalResult = await query('SELECT COUNT(*) as count FROM cities');
    const totalCities = parseInt(totalResult.rows[0].count);
    console.log(`📊 Total cities in database: ${totalCities}`);

    // Check Sri Lankan cities specifically
    const sriLankanResult = await query("SELECT COUNT(*) as count FROM cities WHERE country = 'Sri Lanka'");
    const sriLankanCities = parseInt(sriLankanResult.rows[0].count);
    console.log(`🇱🇰 Sri Lankan cities: ${sriLankanCities}`);

    // Show some sample Sri Lankan cities
    console.log('\n📍 Sample Sri Lankan cities in database:');
    const sampleResult = await query(`
      SELECT name, latitude, longitude, population, population_tier, district, province
      FROM cities
      WHERE country = 'Sri Lanka'
      ORDER BY population DESC NULLS LAST
      LIMIT 10
    `);

    if (sampleResult.rows.length > 0) {
      console.table(sampleResult.rows.map(city => ({
        Name: city.name,
        District: city.district || 'N/A',
        Province: city.province || 'N/A',
        Population: city.population ? city.population.toLocaleString() : 'N/A',
        Tier: city.population_tier || 'N/A'
      })));
    }

    // Test nearest city function
    console.log('\n🧪 Testing nearest city function...');
    try {
      // Test with coordinates near Colombo
      const nearestTest = await query(
        'SELECT * FROM find_nearest_city($1, $2, $3)',
        [6.9271, 79.8612, 100] // Colombo coordinates
      );

      if (nearestTest.rows.length > 0) {
        const nearest = nearestTest.rows[0];
        console.log(`✅ Nearest city to Colombo: ${nearest.city_name} (${nearest.distance_km}km away)`);
      } else {
        console.log('❌ find_nearest_city function returned no results');
      }
    } catch (error) {
      console.log('❌ find_nearest_city function error:', error.message);
    }

    // Test nearby cities function
    console.log('\n🔄 Testing nearby cities function...');
    try {
      const nearbyTest = await query(
        'SELECT * FROM find_nearby_cities($1, $2, $3, $4)',
        [7.0, 80.0, 50, 5] // Central Sri Lanka coordinates
      );

      console.log(`✅ Found ${nearbyTest.rows.length} cities within 50km of test coordinates`);
      if (nearbyTest.rows.length > 0) {
        nearbyTest.rows.forEach((city, index) => {
          console.log(`   ${index + 1}. ${city.city_name} - ${city.distance_km}km away`);
        });
      }
    } catch (error) {
      console.log('❌ find_nearby_cities function error:', error.message);
    }

    // Assessment
    console.log('\n📋 Assessment:');
    if (sriLankanCities >= 40) {
      console.log('✅ EXCELLENT: Database well-populated with comprehensive city coverage');
      console.log('🎯 Your location app should now show multiple nearby cities and routing options');
    } else if (sriLankanCities >= 20) {
      console.log('⚠️ GOOD: Reasonable city coverage, but could be enhanced');
      console.log('💡 Consider running populate_cities_direct.js for better coverage');
    } else if (sriLankanCities >= 10) {
      console.log('⚠️ LIMITED: Basic coverage, app will work but with fewer options');
      console.log('📝 Recommend running populate_cities_direct.js for full coverage');
    } else {
      console.log('❌ INSUFFICIENT: Very limited city data');
      console.log('🚨 REQUIRED: Run populate_cities_direct.js immediately');
      console.log('📍 Command: node scripts/populate_cities_direct.js');
    }

    console.log('\n🏁 Database verification complete!');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check DATABASE_URL is set correctly');
    console.log('2. Ensure Railway database is running');
    console.log('3. Verify network connectivity to Railway');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  verifyDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyDatabase };