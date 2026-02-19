const axios = require("axios");
const cheerio = require("cheerio");
const { createObjectCsvWriter } = require("csv-writer");
const cron = require("node-cron");
const fs = require("fs");

const URL = "https://rasinova.starez.cz/";
const FILE = "sauna_occupancy.csv";

const csvWriter = createObjectCsvWriter({
  path: FILE,
  header: [
    { id: "timestamp", title: "timestamp" },
    { id: "current", title: "current" },
    { id: "capacity", title: "capacity" }
  ],
  append: fs.existsSync(FILE)
});

async function getWellnessOccupancy() {
  const response = await axios.get(URL);
  const $ = cheerio.load(response.data);

  let result = null;

  $(".box").each((_, el) => {
    const label = $(el).find("p").text().trim().toUpperCase();
    if (label.includes("WELLNESS")) {
      const text = $(el).find("h5").text().trim(); // e.g. "7/38"
      const [current, capacity] = text.split("/").map(Number);
      result = { current, capacity };
    }
  });

  if (!result) throw new Error("Wellness data not found");

  return result;
}

async function logOccupancy() {
  try {
    const { current, capacity } = await getWellnessOccupancy();
    const timestamp = new Date().toISOString();

    console.log(`${timestamp} → ${current}/${capacity}`);

    await csvWriter.writeRecords([{ timestamp, current, capacity }]);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Run once immediately
logOccupancy();

// Then run every 10 minutes
cron.schedule("*/10 * * * *", logOccupancy);
