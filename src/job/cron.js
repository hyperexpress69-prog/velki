const { default: nodeCron } = require("node-cron");
const { getOddsHandler } = require("../modules/markets/services/handlers");
const {
    getMarketBookListData,
    getFancyBookMakerOdds,
    getPremiumFancyData,
} = require("../modules/fancy/services/handlers");

// must always be 2 here
async function runJobs() {
    let twoSecHandlers = [
        getOddsHandler,
        getMarketBookListData,
        getFancyBookMakerOdds,
        getPremiumFancyData
    ];
    twoSecHandlers.forEach((handler) =>
        nodeCron.schedule("*/29 * * * * *", handler),
    );
}

module.exports = { runJobs };
