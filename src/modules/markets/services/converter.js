const { getCache } = require("../../../cache/redis");

// const convertToTargetStructure = (marketInfo, marketData) => {
//     if (!marketInfo || !marketData || !marketData.data) return null;

//     const { event, competition, eventType, runners = [], marketId, marketName } = marketInfo;
//     const live = marketData.data;

//     console.log(
//         marketId,
//         "hasData:",
//         !!marketData?.data,
//         "runners:",
//         marketData?.data?.runners?.length
//     );

//     if (
//         !marketInfo ||
//         !marketData ||
//         typeof marketData !== "object" ||
//         !marketData.data ||
//         !Array.isArray(marketData.data.runners) ||
//         marketData.data.runners.length === 0
//     ) {
//         return null;
//     }

//     const toTimestamp = (d) => new Date(d).getTime();
//     const now = Date.now();

//     const selections = runners.map((runner) => {
//         const liveRunner = live.runners?.find(
//             (r) => r.selectionId === runner.selectionId
//         );

//         const selection = {
//             selectionId: runner.selectionId,
//             handicap: runner.handicap ?? 0,
//             runnerName: runner.runnerName,
//             sortPriority: runner.sortPriority
//         };

//         if (liveRunner?.status) {
//             selection.status = liveRunner.status === "ACTIVE" ? 1 : 0;
//         }

//         if (liveRunner?.ex?.availableToBack?.length) {
//             selection.availableToBack = liveRunner.ex.availableToBack;
//         }

//         if (liveRunner?.ex?.availableToLay?.length) {
//             selection.availableToLay = liveRunner.ex.availableToLay;
//         }

//         if (liveRunner?.ex?.tradedVolume?.length) {
//             selection.tradedVolume = liveRunner.ex.tradedVolume;
//         }

//         return selection;
//     });

//     const market = {
//         eventType: Number(eventType.id),
//         eventId: Number(event.id),
//         marketId,
//         marketType: marketName.toUpperCase().replace(/\s+/g, "_"),
//         marketName
//     };

//     if (live.status) {
//         market.status = live.status === "OPEN" ? 1 : 0;
//     }

//     if (typeof live.inplay === "boolean") {
//         market.inPlay = live.inplay ? 1 : 0;
//     }

//     if (typeof live.totalMatched === "number") {
//         market.totalMatched = live.totalMatched;
//     }

//     if (typeof live.numberOfRunners === "number") {
//         market.numberOfRunners = live.numberOfRunners;
//     }

//     if (typeof live.numberOfWinners === "number") {
//         market.numberOfWinners = live.numberOfWinners;
//     }

//     if (typeof live.numberOfActiveRunners === "number") {
//         market.numberOfActiveRunners = live.numberOfActiveRunners;
//     }

//     if (event.openDate) {
//         market.marketTime = event.openDate;
//         market.marketDateTime = toTimestamp(event.openDate);
//     }

//     if (live.version) {
//         market.version = live.version;
//     }

//     if (selections.length) {
//         market.selections = selections;
//     }

//     const response = {
//         id: Number(event.id),
//         eventId: Number(event.id),
//         eventType: Number(eventType.id),
//         competitionId: Number(competition.id),
//         competitionName: competition.name,
//         countryCode: event.countryCode,
//         name: event.name
//     };

//     if (event.timezone) {
//         response.timezone = event.timezone;
//     }

//     if (event.openDate) {
//         response.openDate = event.openDate;
//         response.openDateStr = new Date(event.openDate).toLocaleString("en-GB", {
//             day: "2-digit",
//             month: "short",
//             hour: "2-digit",
//             minute: "2-digit",
//             hour12: false
//         });
//         response.openDateTime = toTimestamp(event.openDate);
//         response.openDateDayOfWeek = new Date(event.openDate).toLocaleDateString(
//             "en-US",
//             { weekday: "short" }
//         );
//         response.secondsToStart = Math.floor(
//             (toTimestamp(event.openDate) - now) / 1000
//         );
//     }

//     if (typeof live.inplay === "boolean") {
//         response.inPlay = live.inplay ? 1 : 0;
//     }

//     response.market = market;

//     return response;
// };

const convertToTargetStructure = (eventType, marketInfo, marketData) => {
    const event = marketInfo?.event;
    const competition = marketInfo?.competition;
    const runnersInfo = marketInfo?.runners ?? [];
    const liveData = marketData?.data;

    if (!event || !competition || !liveData) return null;
    if (!Array.isArray(liveData.runners) || liveData.runners.length === 0) return null;

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
        if (liveRunner.ex?.tradedVolume?.length) sel.tradedVolume = liveRunner.ex.tradedVolume;

        return sel;
    }).filter(Boolean);

    if (!selections.length) return null;

    const market = {
        marketId: marketInfo.marketId,
        marketName: marketInfo.marketName,
        marketType: marketInfo.marketName.toUpperCase().replace(/\s+/g, "_"),
        selections
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

    const response = {
        eventType,
        eventId: Number(event.id),
        name: event.name,
        countryCode: event.countryCode,
        competitionId: Number(competition.id),
        competitionName: competition.name,
        market
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
    if (typeof liveData.inplay === "boolean") response.inPlay = liveData.inplay ? 1 : 0;

    return response;
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

const getMarketsBySport = async (sportId) => {
    const response = [];
    try {
        const eventIdsRaw = await getCache(`SPORT_EVENTS:${sportId}`);
        const eventIds = safeParseArray(eventIdsRaw);

        if (!eventIds.length) return [];


        await Promise.all(
            eventIds.map(async (eventId) => {
                const marketIdsRaw = await getCache(`EVENT_MARKETS:${eventId}`);
                const marketIds = safeParseArray(marketIdsRaw);
                console.log("marketIds", marketIds);
                if (!marketIds.length) return;

                await Promise.all(
                    marketIds.map(async (marketId) => {
                        const marketInfo = await getCache(`MARKET:${marketId}`);
                        const marketData = await getCache(`MARKET_ODDS:${marketId}`);
                        console.log(JSON.stringify({ marketData, marketInfo }));
                        if (!marketInfo || !marketData) return;

                        const converted = convertToTargetStructure(
                            sportId,
                            typeof marketInfo === "string" ? JSON.parse(marketInfo) : marketInfo,
                            typeof marketData === "string" ? JSON.parse(marketData) : marketData
                        );
                        console.log(JSON.stringify(converted));
                        if (converted) response.push(converted);
                    })
                );
            })
        );

    } catch (error) {
        console.error("getMarketsBySport error:", error);
    } finally {
        console.log({ response }, response.length);
        return response
    }
};


module.exports = { convertToTargetStructure, getMarketsBySport }