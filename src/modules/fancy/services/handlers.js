const { getCacheKeys, setCache, getCache } = require("../../../cache/redis");
const { postApi, getApi } = require("../../../utils/apiCaller");
const { chunkArray } = require("../../../utils/helpers");
const { getEnvVar } = require("../../../utils/loadEnv");

const fs = require('fs/promises');

const getMarketBookListData = async () => {
    try {
        // console.log("getMarketBookListData called", Date.now());

        const [LIST_MARKET_BOOK_EP] = getEnvVar(["LIST_MARKET_BOOK_EP"]);

        const keys = await getCacheKeys("MARKET:*:EVENT");
        const marketIds = keys.map(k => k.split(":")[1]);
        const chunks = chunkArray(marketIds, 20);

        const books = (
            await Promise.all(
                chunks.map(async (chunk) => {
                    const resp = await postApi([LIST_MARKET_BOOK_EP], { marketIds: chunk }, "market");
                    return resp?.data || [];
                })
            )
        ).flat();

        // await fs.writeFile("books.json", JSON.stringify(books), "utf-8"); 
        await Promise.all(
            books.map(async b => {
                if (b?.marketId) {
                    await setCache(`MARKET:${b.marketId}:BOOK`, b)
                }
                else console.log("book data not found for", b);
            }
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
        // console.log("getFancyBookMakerOdds called", Date.now());

        const [fancyBookEP] = getEnvVar(["FANCY_BOOKMAKER_ODDS_EP"]);

        const eventKeys = await getCacheKeys("EVENT:*:META");
        const eventIds = eventKeys.map(k => k.split(":")[1]);
        const allFancy = [];
        const allBook = [];
        const responses = await Promise.all(
            eventIds.map(async (eventId) => {
                const resp = await getApi([fancyBookEP, eventId], "fancy");
                // if (resp?.bookmaker?.length || resp?.fancy?.length) console.log(JSON.stringify(resp), "_______________");
                return { eventId, resp };
            })
        );

        await Promise.all(
            responses.map(async ({ eventId, resp }) => {
                if (!resp) return;

                if (resp.fancy?.length) {
                    allFancy.push(eventId)
                    await setCache(`EVENT:${eventId}:FANCY`, resp.fancy);
                }

                if (resp.bookmaker?.length) {
                    allBook.push(eventId)
                    await setCache(`EVENT:${eventId}:BOOKMAKER`, resp.bookmaker);
                }
            })
        );
        console.log("allFancy", allFancy, "allBook", allBook);
    } catch (error) {
        console.error("error occured in getFancyBookMakerOdds:", error);
    } finally {
        return;
    }
};

const getPremiumFancyData = async () => {
    try {
        const [premUrl] = getEnvVar(["FANCY_PREMIUM_URL"]);

        const eventKeys = await getCacheKeys("EVENT:*:META");
        const eventIds = eventKeys.map(k => k.split(":")[1]);
        const allPremData = [];

    } catch (error) {
        console.error("error occured", error);
    }
    finally {
        return;
    }
}


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