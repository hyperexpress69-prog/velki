const { default: nodeCron } = require("node-cron");
const { getOddsHandler } = require("../modules/markets/services/cronHandlers");

async function runJobs() {
    nodeCron.schedule("*/2 * * * * *", getOddsHandler)
}

module.exports = { runJobs }