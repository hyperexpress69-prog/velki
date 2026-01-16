const { getCache, smembersCache } = require("../../../cache/redis");

const convertFancyToTargetDS = async (eventId) => {
    const result = [];

    const eventInfo = await getCache(`EVENT:${eventId}:INFO`);
    console.log(eventId, eventInfo);
    // if (!eventInfo) return result;

    const marketIds = await smembersCache(`EVENT:${eventId}:MARKETS`);
    console.log(marketIds);
    if (!marketIds?.length) return result;

    for (const marketId of marketIds) {

        const [
            catalogue,
            book,
            settings
        ] = await Promise.all([
            getCache(`MARKET:${marketId}:CATALOGUE`),
            getCache(`MARKET:${marketId}:BOOK`),
            getCache(`MARKET:${marketId}:SETTINGS`)
        ]);
        console.log({ catalogue, book, settings });
        if (!catalogue || !book) continue;

        const yesRunner = book.runners?.find(r => r.side === "YES");
        const noRunner = book.runners?.find(r => r.side === "NO");

        const res = {
            eventType: eventInfo?.eventTypeId,
            eventId: Number(eventId),
            marketId: Number(marketId),
            marketType: catalogue.marketType,
            status: book.status,
            summaryStatus: 0,
            sort: catalogue.sortPriority || 0,

            eventName: eventInfo?.eventName,
            marketName: catalogue.marketName,

            runsNo: noRunner?.runs ?? 0,
            runsYes: yesRunner?.runs ?? 0,

            oddsNo: noRunner?.odds ?? 0,
            oddsYes: yesRunner?.odds ?? 0,

            oddsVersion: book.version || 0,
            resultRuns: -1,

            updateDate: book.updateTime || Date.now(),
            oddsSettingUpdateDate: settings?.updatedAt || 0,

            min: settings?.min || 0,
            max: settings?.max || 0,
            rebateRatio: settings?.rebateRatio || 0,
            delayBetting: settings?.delayBetting || 0,

            remarkFirstRow: "",
            remarkSecondRow: ""
        }

        result.push(res);
        console.log("res_____", res);
    }
    console.log(result);
    return result;
};


const convertBookMakerToTargetDS = async (eventId) => {
    const target = { markets: {}, selections: {} };
    // console.log(target);
    const now = Date.now();

    const marketIdsSet = await smembersCache(`EVENT:${eventId}:MARKETS`);
    // console.log("marketIdsSet", marketIdsSet);
    if (!marketIdsSet || !marketIdsSet.length) return target;


    for (const marketId of marketIdsSet) {
        const [marketMeta, marketBook] = await Promise.all([
            getCache(`MARKET:${marketId}:META`),
            getCache(`MARKET:${marketId}:BOOK`)
        ]);

        if (!marketMeta) continue;

        // console.log(marketMeta);
        // console.log(marketBook);

        const eventMeta = await getCache(`EVENT:${eventId}:META`);
        if (!eventMeta) continue;
        // console.log(eventMeta);

        const fancy = await getCache(`EVENT:${eventId}:FANCY`);
        const bookmaker = await getCache(`EVENT:${eventId}:BOOKMAKER`);
        // console.log("fancy", fancy);
        // console.log("bookmaker", bookmaker);

        target.markets[marketId] = {
            marketId: marketId,
            marketType: fancy?.gtype === "session" ? 1 : 0,
            marketName: marketMeta.marketName || "Unknown",
            status: marketBook?.status === "OPEN" ? 1 : 2,
            summaryStatus: 0,
            sort: marketMeta.sortPriority || 1,
            updateDate: now,
            oddsSettingUpdateDate: now,
            min: bookmaker?.[0]?.min ? Number(bookmaker[0].min) : 0,
            max: bookmaker?.[0]?.max ? Number(bookmaker[0].max) : 0,
            rebateRatio: 0,
            delayBetting: marketBook?.betDelay || 0,
            eventType: eventMeta.eventType?.id || 0,
            eventId: eventId,
            eventName: eventMeta.event?.name || "Unknown",
            highlightMarketId: marketId
        };
        // console.log(target[marketId]);

        const runners = marketMeta.runners || [];
        for (const runner of runners) {
            const selKey = `${marketId}:${runner.selectionId}`;
            const bookRunner = marketBook?.runners?.find(r => r.selectionId === runner.selectionId);

            const backOdds = bookRunner?.ex?.availableToBack?.map(o => o.price.toFixed(6)) || ["", "", ""];
            const layOdds = bookRunner?.ex?.availableToLay?.map(o => o.price.toFixed(6)) || ["", "", ""];

            target.selections[selKey] = {
                marketId: marketId,
                selectionId: runner.selectionId,
                status: bookRunner?.status === "ACTIVE" ? 1 : 2,
                runnerName: runner.runnerName,
                sort: runner.sortPriority || 0,
                backOddsInfo: JSON.stringify(backOdds),
                layOddsInfo: JSON.stringify(layOdds),
                updateDate: now,
                eventId: eventId
            };
        }
    }
    // console.log(JSON.stringify(target));
    return target;
};

module.exports = { convertFancyToTargetDS, convertBookMakerToTargetDS }