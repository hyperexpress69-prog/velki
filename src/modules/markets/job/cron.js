const { default: nodeCron } = require("node-cron");
const { getOddsHandler } = require("../services/cronHandlers");

async function getOdds() {
    nodeCron.schedule("*/2 * * * * *", getOddsHandler)
}

module.exports = { getOdds }