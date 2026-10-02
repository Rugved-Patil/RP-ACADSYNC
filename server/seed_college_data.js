// seed_college_data.js — Wrapper around seed.js for backwards compatibility
const { seed } = require("./seed");

function seedCollegeData() {
  return seed();
}

if (require.main === module) {
  seedCollegeData();
}

module.exports = { seedCollegeData };
