const { getCache, getCacheKeys } = require("../../../cache/redis");

function convertFancyToTargetDS({
    fancy,
    eventId,
    eventType
}) {
    return fancy.map(f => ({
        eventType,
        eventId,
        marketId: Number(f.SelectionId),
        marketType: f.gtype === "session" ? 1 : 0,
        status: 2,
        summaryStatus: 0,
        sort: f.sr_no,
        eventName: "", // MUST be passed externally if needed
        marketName: f.RunnerName,
        runsNo: f.LayPrice1,
        runsYes: f.BackPrice1,
        oddsNo: f.LayPrice1,
        oddsYes: f.BackPrice1,
        oddsVersion: undefined,
        resultRuns: -1,
        updateDate: undefined,
        oddsSettingUpdateDate: undefined,
        min: f.min,
        max: f.max,
        rebateRatio: 0,
        delayBetting: 0,
        remarkFirstRow: f.rem || "",
        remarkSecondRow: f.rem || ""
    }));
}


const convertBookMakerToTargetDS = async (eventId) => {
    const target = { markets: {}, selections: {} };
    console.log(target);
    const now = Date.now();

    const marketIdsSet = await getCache(`EVENT:${eventId}:MARKETS`);
    if (!marketIdsSet || !marketIdsSet.length) return target;

    console.log("marketIdsSet", marketIdsSet);

    for (const marketId of marketIdsSet) {
        const [marketMeta, marketBook] = await Promise.all([
            getCache(`MARKET:${marketId}:META`),
            getCache(`MARKET:${marketId}:BOOK`)
        ]);

        if (!marketMeta) continue;

        console.log(marketMeta);
        console.log(marketBook);

        const eventMeta = await getCache(`EVENT:${eventId}:META`);
        if (!eventMeta) continue;
        console.log(eventMeta);

        const fancy = await getCache(`EVENT:${eventId}:FANCY`);
        const bookmaker = await getCache(`EVENT:${eventId}:BOOKMAKER`);
        console.log(fancy);
        console.log(bookmaker);

        target.markets[marketId] = {
            marketId: marketId,
            marketType: fancy.gtype === "session" ? 1 : 0,
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
        console.log(target[marketId]);

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
    console.log(JSON.stringify(target));
    return target;
};

module.exports = { convertFancyToTargetDS, convertBookMakerToTargetDS }