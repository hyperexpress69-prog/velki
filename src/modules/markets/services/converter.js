const { getCache, setCache } = require("../../../cache/redis");

const convertToMatchListStructure = async (eventType, marketInfo, marketData) => {
    const event = marketInfo?.event;
    const competition = marketInfo?.competition;
    const runnersInfo = marketInfo?.runners ?? [];
    const liveData = marketData?.data;

    const hasFancy = await getCache(`EVENT:${event.id}:FANCY`);
    const hasBookMaker = await getCache(`EVENT:${event.id}:BOOKMAKER`);

    if (!event || !competition || !liveData) return null;
    if (!Array.isArray(liveData.runners) || liveData.runners.length === 0) return null;

    if (marketInfo.marketName !== "Match Odds") return null
    const toTimestamp = (d) => new Date(d).getTime();

    const selections = runnersInfo.map(runner => {
        const liveRunner = liveData.runners.find(
            r => r.selectionId === runner.selectionId
        );

        if (!liveRunner) return null;

        const sel = {
            selectionId: runner.selectionId,
            runnerName: runner.runnerName,
            sortPriority: runner.sortPriority
        };

        if (runner.handicap !== undefined) sel.handicap = runner.handicap;
        if (liveRunner.status) sel.status = liveRunner.status === "ACTIVE" ? 1 : 0;
        if (liveRunner.ex?.availableToBack?.length) sel.availableToBack = liveRunner.ex.availableToBack;
        if (liveRunner.ex?.availableToLay?.length) sel.availableToLay = liveRunner.ex.availableToLay;
        if (liveRunner.ex?.tradedVolume?.length) sel.tradedVolume = [];
        // if (liveRunner.ex?.tradedVolume?.length) sel.tradedVolume = liveRunner.ex.tradedVolume;

        return sel;
    }).filter(Boolean);

    if (!selections.length) return null;

    // const market = {
    //     marketId: marketInfo.marketId,
    //     marketName: marketInfo.marketName,
    //     selections,

    // };

    const market = {
        marketId: marketInfo.marketId,
        marketName: marketInfo.marketName,
        selections,
        "eventType": Number(eventType),
        "eventId": event.id,
        "marketType": "",
        "bettingType": 1,
        "countryCode": null,
        "marketType": "MATCH_ODDS",
        "status": 1,
        "summaryStatus": 0,
        "isHighLight": 1,
        "inPlay": 1,
        "totalMatched": 3222997.13,
        "totalMatchedInUSD": 11666.06,
        "numberOfRunners": 2,
        "numberOfWinners": 1,
        "numberOfActiveRunners": 2,
        "marketTime": "2026-01-20 04:30",
        "marketTimeStr": "20 Jan, 04:30",
        "marketDateTime": 1768883400000,
        "openDateDayOfWeek": "Tue",
        "updateDate": "2026-01-20T15:07:15.010+0800",
        "version": 7099624057,
        "closeSite": null,
        "bookMode": "[\"6\"]",
        "disableBettingSite": "[\"6\", \"14\"]",
        "autoDisableBettingSite": null,
        "isLowLiquidity": true,
        "isStreamingOpenTime": 1,
        "streamingChannel": "0",
        "isStreamingBoxOff": false,
        "betLimitSetting": {
            "minBet": 100,
            "maxBet": 30000
        },
    };

    if (liveData.status) market.status = liveData.status === "OPEN" ? 1 : 0;
    if (typeof liveData.inplay === "boolean") market.inPlay = liveData.inplay ? 1 : 0;
    if (typeof liveData.totalMatched === "number") market.totalMatched = liveData.totalMatched;
    if (typeof liveData.numberOfRunners === "number") market.numberOfRunners = liveData.numberOfRunners;
    if (typeof liveData.numberOfActiveRunners === "number") market.numberOfActiveRunners = liveData.numberOfActiveRunners;
    if (typeof liveData.numberOfWinners === "number") market.numberOfWinners = liveData.numberOfWinners;
    if (liveData.version) market.version = liveData.version;

    if (event.openDate) {
        market.marketTime = event.openDate;
        market.marketTimeEpoch = toTimestamp(event.openDate);
    }
    if (Array.isArray(hasFancy) && hasFancy.length || Array.isArray(hasBookMaker) && hasBookMaker.length) {
        console.log({ event: event.id });
        console.log({ hasBookMaker: hasBookMaker.length, hasFancy: hasFancy.length });

    } const response = {
        eventType: Number(eventType),
        eventId: Number(event.id),
        name: event.name,
        countryCode: event.countryCode,
        competitionId: Number(competition.id),
        competitionName: competition.name,
        markets: [market],
        market,
        // dummy data
        isManualEvent: false,
        isManualEventClosed: false,
        status: 4,
        scores: null,
        streamingChannel: 19637118,
        lmtMatchId: null,
        scoresDetail: null,
        matchInfo: null,
        timeElapsed: 0,
        inPlayStatus: null,
        closeSite: null,
        competitionCloseSite: null,
        linkEventId: null,
        updateDate: 1768263702327,
        isElectronic: 0,
        timezone: "GMT",
        hasFancyBetMarkets: Array.isArray(hasFancy) && hasFancy.length ? true : false,
        hasInPlayFancyBetMarkets: Array.isArray(hasFancy) && hasFancy.length ? true : false,
        hasBookMakerMarkets: Array.isArray(hasBookMaker) && hasBookMaker.length ? true : false,
        hasInPlayBookMakerMarkets: Array.isArray(hasBookMaker) && hasBookMaker.length ? true : false,
        hasSportsBookMarkets: true,
        sportradarApiSiteEventId: "",
        hasOwSportsBookMarkets: true,
        hasGeniusSportsMarkets: true,
    };

    if (event.timezone) response.timezone = event.timezone;
    if (event.openDate) {

        const openTime = new Date(event.openDate).getTime();
        const now = Date.now();

        response.openDate = event.openDate;
        response.openDateEpoch = toTimestamp(event.openDate);
        response.openDateStr = new Date(event.openDate).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
        response.openDateDayOfWeek = new Date(response.openDate).getDay()
        response.secondsToStart = Math.max(0, Math.floor((openTime - now) / 1000));
    }
    if (typeof liveData.inplay === "boolean") response.isInPlay = liveData.inplay ? 1 : 0;

    response.status = 4;
    response.priority = Math.floor(Math.random() * 1000);
    response.id = response.eventId + response.priority;

    return response;
};

const convertToMatchOddsStructure = (eventType, marketInfo, marketData) => {
    if (!marketInfo || !marketData?.data) {
        // console.log({ marketInfo, marketData });
        console.log("return from line 1");
        return null
    };
    const { event, runners = [], marketId, marketName } = marketInfo;
    const live = marketData.data;

    if (!event || !live) {
        console.log("return from line 2");
        return null
    };
    const toTimestamp = (d) => new Date(d).getTime();
    const nowISO = new Date().toISOString();

    const selections = runners.map((runner) => {
        const liveRunner = Array.isArray(live.runners)
            ? live.runners.find(r => r.selectionId === runner.selectionId)
            : null;

        const selection = {
            selectionId: runner.selectionId,
            handicap: runner.handicap ?? 0,
            selectionKey: `${runner.selectionId}_${runner.handicap ?? 0}_00`,
            runnerName: runner.runnerName,
            originalRunnerName: runner.runnerName,
            sortPriority: runner.sortPriority,
            // defaults/static
            closeSite: null,
            suspendSite: null,
            bookMode: null,
            bookSuspend: null,
            isAutoSuspend: 0
        };

        if (liveRunner?.status) {
            selection.status = liveRunner.status === "ACTIVE" ? 1 : 0;
        }

        selection.updateDate = nowISO;
        selection.oddsUpdateDate = Date.now();

        if (liveRunner?.ex?.availableToBack?.length) {
            selection.availableToBack = liveRunner.ex.availableToBack;
        }

        if (liveRunner?.ex?.availableToLay?.length) {
            selection.availableToLay = liveRunner.ex.availableToLay;
        }

        if (liveRunner?.ex?.tradedVolume?.length) {
            selection.tradedVolume = liveRunner.ex.tradedVolume;
        } else {
            selection.tradedVolume = [];
        }

        return selection;
    });

    const market = {
        eventType: Number(eventType),
        eventId: Number(event.id),
        marketId,
        marketType: marketName.toUpperCase().replace(/\s+/g, "_"),
        bettingType: 1,
        countryCode: event.countryCode,
        marketName,
        // defaults/static
        summaryStatus: 0,
        isHighLight: 1,
        totalMatchedInUSD: null,
        closeSite: null,
        bookMode: null,
        disableBettingSite: null,
        autoDisableBettingSite: null,
        isLowLiquidity: false,
        isStreamingOpenTime: 0,
        streamingChannel: "0",
        isStreamingBoxOff: false,
        betLimitSetting: {
            minBet: 100,
            maxBet: 30000
        }
    };

    if (live.status) market.status = live.status === "OPEN" ? 1 : 0;
    if (typeof live.inplay === "boolean") market.inPlay = live.inplay ? 1 : 0;
    if (typeof live.totalMatched === "number") market.totalMatched = live.totalMatched;
    if (typeof live.numberOfRunners === "number") market.numberOfRunners = live.numberOfRunners;
    if (typeof live.numberOfWinners === "number") market.numberOfWinners = live.numberOfWinners;
    if (typeof live.numberOfActiveRunners === "number") {
        market.numberOfActiveRunners = live.numberOfActiveRunners;
    }

    if (event.openDate) {
        const ts = toTimestamp(event.openDate);
        market.marketTime = event.openDate;
        market.marketTimeStr = new Date(event.openDate).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
        market.marketDateTime = ts;
        market.openDateDayOfWeek = new Date(event.openDate).toLocaleDateString(
            "en-US",
            { weekday: "short" }
        );
    }

    if (live.version) market.version = live.version;

    market.updateDate = nowISO;

    if (selections.length) {
        market.selections = selections;
    }

    return market;
};

const safeParseArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
        try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const getMatchesList = async (sportId, type, flag) => {
    const eventMap = new Map();

    try {
        const eventIdsRaw = await getCache(`SPORT_EVENTS:${type}:${sportId}`);
        let eventIds = safeParseArray(eventIdsRaw);

        eventIds = [...new Set(eventIds)];
        if (!eventIds.length) return [];

        await Promise.all(
            eventIds.map(async (eventId) => {
                const marketIdsRaw = await getCache(`EVENT_MARKETS:${eventId}`);
                const marketIds = safeParseArray(marketIdsRaw);
                if (!marketIds.length) return;

                await Promise.all(
                    marketIds.map(async (marketId) => {
                        const marketInfoRaw = await getCache(`MARKET:${marketId}`);
                        const marketDataRaw = await getCache(`MARKET_ODDS:${marketId}`);
                        if (!marketInfoRaw || !marketDataRaw) return;

                        const isInvalid =
                            marketDataRaw == null ||
                            (typeof marketDataRaw === "object" &&
                                !Array.isArray(marketDataRaw) &&
                                Object.keys(marketDataRaw).length === 0);
                        if (isInvalid) return;

                        const marketInfo = typeof marketInfoRaw === "string" ? JSON.parse(marketInfoRaw) : marketInfoRaw;
                        const marketData = typeof marketDataRaw === "string" ? JSON.parse(marketDataRaw) : marketDataRaw;

                        const converted = await convertToMatchListStructure(sportId, marketInfo, marketData);

                        if (!converted) return;

                        // 🔑 GROUP BY EVENT
                        if (!eventMap.has(eventId)) {
                            eventMap.set(eventId, { ...converted, markets: [] });
                        }

                        eventMap.get(eventId).markets.push(converted.market);

                        if (flag === "cron") {
                            await setCache(`MATCH_LIST_RES:${eventId}:${marketId}`, converted);
                        }
                    })
                );
            })
        );

    } catch (error) {
        console.error("error:", error);
    }
    return [...eventMap.values()];
};


const getMarketsOdds = async (sportId = 4, eventIds, flag) => {
    const response = [];
    try {
        if (!Array.isArray(eventIds) || !eventIds.length) throw new Error("empty event ids array");

        await Promise.all(
            eventIds.map(async (eventId) => {
                const marketIdsRaw = await getCache(`EVENT_MARKETS:${eventId}`);
                const marketIds = safeParseArray(marketIdsRaw);

                if (!marketIds.length) return;

                await Promise.all(
                    marketIds.map(async (marketId) => {

                        const marketInfo = await getCache(`MARKET:${marketId}`);
                        const marketData = await getCache(`MARKET_ODDS:${marketId}`);
                        if (!marketInfo || !marketData || !/^match\s*odds$/i.test(marketInfo?.marketName)) return;

                        let converted = convertToMatchOddsStructure(
                            sportId,
                            typeof marketInfo === "string" ? JSON.parse(marketInfo) : marketInfo,
                            typeof marketData === "string" ? JSON.parse(marketData) : marketData
                        );
                        if (!converted) converted = await getCache(`MARKET_ODDS_RES:${eventId}:${marketId}`)
                        if (converted) {
                            response.push(converted);
                            if (flag == "cron") await setCache(`MARKET_ODDS_RES:${eventId}:${marketId}`, converted)
                        }
                    }));
            }));

    } catch (error) {
        console.error("error:", error);
    } finally {
        return response;
    }
}

module.exports = { convertToMatchListStructure, getMatchesList, getMarketsOdds }