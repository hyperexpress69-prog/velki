const { default: nodeCron } = require("node-cron");
const { getOddsHandler } = require("../modules/markets/services/handlers");
const {
    getMarketBookListData,
    getFancyBookMakerOdds,
} = require("../modules/fancy/services/handlers");

// must always be 2 here
async function runJobs() {
    let twoSecHandlers = [
        getOddsHandler,
        getMarketBookListData,
        getFancyBookMakerOdds,
    ];
    twoSecHandlers.forEach((handler) =>
        nodeCron.schedule("*/2 * * * * *", handler),
    );
}

module.exports = { runJobs };
