const { getCacheKeys, setCache, getCache } = require("../../../cache/redis");
const { postApi, getApi } = require("../../../utils/apiCaller");
const { chunkArray } = require("../../../utils/helpers");
const { getEnvVar } = require("../../../utils/loadEnv");

const getMarketBookListData = async () => {
    try {
        console.log("getMarketBookListData called", Date.now());

        const [LIST_MARKET_BOOK_EP] = getEnvVar(["LIST_MARKET_BOOK_EP"]);

        const keys = await getCacheKeys("MARKET:*:EVENT");
        const marketIds = keys.map(k => k.split(":")[1]);

        const chunks = chunkArray(marketIds, 20);

        const books = (await Promise.all(
            chunks.map(chunk =>
                postApi([LIST_MARKET_BOOK_EP], { marketIds: chunk }, "market")
                    .then(r => r?.data || [])
            )
        )).flat();

        //  await fs.writeFile("books.json", JSON.stringify(books), "utf-8");


        await Promise.all(
            books.map(b =>
                b?.marketId
                    ? setCache(`MARKET:${b.marketId}:BOOK`, b)
                    : null
            )
        );


    } catch (error) {
        console.error("error occured in getMarketBookListData:", error);
    } finally {
        return
    }
};

const getFancyBookMakerOdds = async () => {
    try {
        console.log("getFancyBookMakerOdds called", Date.now());
        const [fancyBookEP] = getEnvVar(["FANCY_BOOKMAKER_ODDS_EP"]);

        const eventKeys = await getCacheKeys("EVENT:*:META");
        const eventIds = eventKeys.map(k => k.split(":")[1]);

        const responses = await Promise.all(
            eventIds.map(e =>
                getApi([fancyBookEP, e], "fancy").then(resp => ({ eventId: e, resp }))
            )
        );

        //  await fs.writeFile("fancy.json", JSON.stringify(responses), "utf-8");

        await Promise.all(
            responses.map(({ eventId, resp }) => {
                if (!resp) return null;
                return Promise.all([
                    resp.fancy ? setCache(`EVENT:${eventId}:FANCY`, resp.fancy) : null,
                    resp.bookmaker ? setCache(`EVENT:${eventId}:BOOKMAKER`, resp.bookmaker) : null
                ]);
            })
        );

    } catch (error) {
        console.error("error occured in getFancyBookMakerOdds:", error);
    } finally {
        return
    }
};

const getDataByMarketId = async (marketId) => {
    const eventId = await getCache(`MARKET:${marketId}:EVENT`);
    if (!eventId) return null;

    const [event, market, book, fancy, bookmaker] = await Promise.all([
        getCache(`EVENT:${eventId}:META`),
        getCache(`MARKET:${marketId}:META`),
        getCache(`MARKET:${marketId}:BOOK`),
        getCache(`EVENT:${eventId}:FANCY`),
        getCache(`EVENT:${eventId}:BOOKMAKER`)
    ]);

    return { event, market, book, fancy, bookmaker };
};

const getDataByEventId = async (eventId) => {
    const marketIds = await getCache(`EVENT:${eventId}:MARKETS`) || [];

    const [event, fancy, bookmaker, markets] = await Promise.all([
        getCache(`EVENT:${eventId}:META`),
        getCache(`EVENT:${eventId}:FANCY`),
        getCache(`EVENT:${eventId}:BOOKMAKER`),

        Promise.all(
            marketIds.map(async mId => ({
                marketId: mId,
                meta: await getCache(`MARKET:${mId}:META`),
                book: await getCache(`MARKET:${mId}:BOOK`)
            }))
        )
    ]);

    return { event, markets, fancy, bookmaker };
};

module.exports = {
    getDataByEventId,
    getDataByMarketId,
    getMarketBookListData,
    getFancyBookMakerOdds
}