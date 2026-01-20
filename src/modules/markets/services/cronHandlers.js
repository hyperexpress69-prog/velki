const { getCache, getCacheKeys, setCache } = require("../../../cache/redis");
const { getEnvVar } = require("../../../utils/loadEnv");
const { getApi } = require("../../../utils/apiCaller");

const getOddsHandler = async () => {
    try {
        const type = "in_play";
        const spEvtLstkey = `SPORT_EVENTS:${type}:*`;
        const resp = await getCacheKeys(spEvtLstkey);

        if (Array.isArray(resp) && resp.length) {
            await Promise.all(
                resp.map(async (e) => {
                    const parts = e.split(":");
                    let key = parts[2];
                    const value = await getCache(e);
                    // console.log(e, value);

                    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_EP"]);
                    if (!marketOddsPoint) return;
                    if (!Array.isArray(value) && value.length) return;

                    value.map(async e => {
                        const marketIds = await getCache(`EVENT_MARKETS:${e}`);
                        if (!Array.isArray(marketIds)) return;

                        marketIds.map(async m => {
                            let odds = await getApi([marketOddsPoint, e, m], "market");
                            if (!odds) return;
                            if (Array.isArray(odds) && odds.length == 0) {
                                return;
                            } else if (typeof odds === "object" && Object.keys(odds.data).length === 0) {
                                return
                            }

                            await setCache(`MARKET_ODDS:${m}`, odds);
                            winnerSId = odds?.data?.runners?.find(r => r.status == "WINNER")?.selectionId;
                            if (winnerSId) await setCache(`win:marketOdds:${e}:${m}`, winnerSId);
                        })
                    })
                }))
        }

    } catch (error) {
        console.error("error occured", error);
    }
}

module.exports = {
    getOddsHandler
}