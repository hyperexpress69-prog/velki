const { setCache, getCache } = require("../../../cache/redis");
const { getEnvVar } = require("../../../utils/loadEnv");
const { createLogger } = require("../../../utils/logger");
const { getApi } = require("../utils/callApi");

const errorLogger = createLogger("MARKET_ERROR", "jsonl");


/* concurrent execution */
const getMarketInfo = async () => {
  try {
    console.log("getMarketInfo started", Date.now());
    const [
      sportId,
      compPoint,
      eventPoint,
      marketListPoint
    ] = getEnvVar([
      "SPORT_ID",
      "COMPETITION_LIST_END_POINT",
      "EVENTS_LIST_END_POINT",
      "MARKET_LIST_END_POINT"
    ]);

    const competitions = await getApi([compPoint, sportId]);
    if (!Array.isArray(competitions) || !competitions.length) return;

    const sportEventIds = [];

    // Process all competitions concurrently
    await Promise.all(competitions.map(async (c) => {
      let events;
      try {
        events = await getApi([eventPoint, sportId, c.competition.id]);
      } catch {
        return; // Equivalent to 'continue' in a loop
      }

      if (!Array.isArray(events)) return;

      // Process all events in this competition concurrently
      await Promise.all(events.map(async (e) => {
        const event = e.event;
        const eventType = e.eventType;

        let markets;
        try {
          markets = await getApi([marketListPoint, event.id]);
        } catch {
          return;
        }

        if (!Array.isArray(markets) || !markets.length) return;

        const eventMarketIds = [];
        const marketCacheOps = [];

        for (const m of markets) {
          eventMarketIds.push(m.marketId);

          marketCacheOps.push(
            setCache(`MARKET:${m.marketId}`, {
              ...m,
              event,
              competition: {
                id: c.competition.id,
                name: c.competition.name,
                region: c.competitionRegion,
                marketCount: c.marketCount
              },
              eventType
            })
          );
        }

        await Promise.all([
          ...marketCacheOps,
          setCache(`EVENT_MARKETS:${event.id}`, eventMarketIds)
        ]);

        sportEventIds.push(event.id);
      }));
    }));

    console.log("sportEventIds_______________>", sportEventIds);
    if (sportEventIds.length) {
      await setCache(`SPORT_EVENTS:${sportId}`, sportEventIds);
    }

    await getMarketOdds(sportId);
    console.log("getMarketInfo completed", Date.now());
  } catch (error) {
    errorLogger.error({ at: Date.now(), message: error.message });
  }
};

const getMarketOdds = async (sportId) => {
  try {
    const allOdds = []
    console.log("getMarketOdds started", Date.now());
    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_END_POINT"]);

    const eventIds = await getCache(`SPORT_EVENTS:${sportId}`);
    if (!Array.isArray(eventIds)) return;

    await Promise.all(eventIds.map(async (eventId) => {
      const marketIds = await getCache(`EVENT_MARKETS:${eventId}`);
      if (!Array.isArray(marketIds)) return;

      await Promise.all(marketIds.map(async (marketId) => {
        const marketInfo = await getCache(`MARKET:${marketId}`);
        if (!marketInfo) return;

        try {
          const odds = await getApi([marketOddsPoint, eventId, marketId]);
          if (!odds) return;
          allOdds.push(odds);
          await setCache(`MARKET_ODDS:${marketId}`, odds);
        } catch (error) {
          console.error("error occured to fetch marketOdds of:", marketId);
        }
      }));
    }));
    console.log("getMarketOdds completed", Date.now());
  } catch (error) {
    console.error("getMarketOdds error", error);
  }
};


/* sequential execution 
const getMarketInfo = async () => {
  try {
    console.log("getMarketInfo started", Date.now());
    const [
      sportId,
      compPoint,
      eventPoint,
      marketListPoint
    ] = getEnvVar([
      "SPORT_ID",
      "COMPETITION_LIST_END_POINT",
      "EVENTS_LIST_END_POINT",
      "MARKET_LIST_END_POINT"
    ]);

    const competitions = await getApi([compPoint, sportId]);
    if (!Array.isArray(competitions) || !competitions.length) return;

    const sportEventIds = [];

    for (const c of competitions) {
      let events;

      try {
        events = await getApi([eventPoint, sportId, c.competition.id]);
      } catch {
        continue;
      }

      if (!Array.isArray(events)) continue;

      for (const e of events) {
        const event = e.event;
        const eventType = e.eventType;

        let markets;
        try {
          markets = await getApi([marketListPoint, event.id]);
        } catch {
          continue;
        }

        if (!Array.isArray(markets) || !markets.length) continue;

        const eventMarketIds = [];
        const marketCacheOps = [];

        for (const m of markets) {
          eventMarketIds.push(m.marketId);

          marketCacheOps.push(
            setCache(`MARKET:${m.marketId}`, {
              ...m,
              event,
              competition: {
                id: c.competition.id,
                name: c.competition.name,
                region: c.competitionRegion,
                marketCount: c.marketCount
              },
              eventType
            })
          );
        }

        await Promise.all([
          ...marketCacheOps,
          setCache(`EVENT_MARKETS:${event.id}`, eventMarketIds)
        ]);

        sportEventIds.push(event.id);
      }
    }

    console.log("sportEventIds_______________>", sportEventIds);
    if (sportEventIds.length) {
      await setCache(`SPORT_EVENTS:${sportId}`, sportEventIds);
    }

    await getMarketOdds(sportId);
    console.log("getMarketInfo completed", Date.now());
  } catch (error) {
    errorLogger.error({ at: Date.now(), message: error.message });
  }
};

const getMarketOdds = async (sportId) => {
  try {
    console.log("getMarketOdds started", Date.now());
    const [marketOddsPoint] = getEnvVar(["MARKET_ODDS_END_POINT"]);

    const eventIds = await getCache(`SPORT_EVENTS:${sportId}`);
    if (!Array.isArray(eventIds)) return;

    for (const eventId of eventIds) {
      const marketIds = await getCache(`EVENT_MARKETS:${eventId}`);
      if (!Array.isArray(marketIds)) continue;

      for (const marketId of marketIds) {
        const marketInfo = await getCache(`MARKET:${marketId}`);
        if (!marketInfo) return;

        const odds = await getApi([marketOddsPoint, eventId, marketId]);

        await setCache(`MARKET_ODDS:${marketId}`, odds);
      }
    }
    console.log("getMarketOdds completed", Date.now());
  } catch (error) {
    console.error("getMarketOdds error", error);
  } finally {
    return
  }
};

*/


// old code
// const getComptMatches = async () => {
//   try {
//     const [sportId, compPoint, eventPoint] = getEnvVar(["SPORT_ID", "COMPETITION_LIST_END_POINT", "EVENTS_LIST_END_POINT"]);
//     const competitionList = await getApi([compPoint, sportId]);

//     const results = await Promise.allSettled(
//       competitionList.map(async (c) => {
// const comp = {
//           competitionId: c.competition.id,
//           competitionName: c.competition.name,
//           competitionRegion: c.competitionRegion,
//           marketCount: c.marketCount,
//         };

//         const eventList = await getApi([
//           eventPoint,
//           sportId,
//           comp.competitionId,
//         ]);
//         let updatedEventList = eventList.map((e) => {
//           const now = new Date();
//           const eventDate = new Date(e.event.openDate);

//           const cat = eventDate > now ? "upcoming" : eventDate.toDateString() === now.toDateString() ? "live" : "ended";

//           return { ...comp, ...e, cat, };
//         });
//         return updatedEventList;
//       })
//     );

//     const eventsList = getFilteredData(results);
//     const cmpEvtkey = `COMPETITION_EVENT_LIST:${sportId}`;
//     await setCache(cmpEvtkey, eventsList);

//     const compEvntIds = {}

//     eventsList.forEach(e => {
//       if (!Array.isArray(compEvntIds[e.competitionId])) compEvntIds[e.competitionId] = []
//       compEvntIds[e.competitionId].push(e.event.id);
//     })

//     const cmpEvtIdKey = `COMPETITION_EVENT_IDS:${sportId}`
//     await setCache(cmpEvtIdKey, compEvntIds);

//     // console.log(JSON.stringify(await getCache(cmpEvtkey)))
//     await getMarketsOdds(sportId);
//   } catch (error) {
//     errorLogger.error({ at: Date.now(), message: error.message || "internal server error", });
//     console.error(error);
//   } finally {
//     return;
//   }
// };
// // one by one
// const getMarketsOdds = async (sportId) => {
//   try {

//     const [marketListPoint, marketOddsPoint] = getEnvVar(["MARKET_LIST_END_POINT", "MARKET_ODDS_END_POINT"]);
//     const cmpEvtkey = `COMPETITION_EVENT_LIST:${sportId}`;
//     const eventsList = await getCache(cmpEvtkey);

//     const results = await Promise.allSettled(
//       eventsList.map(async (e) => {
//         return await getApi([marketListPoint, e.event.id]);
//       })
//     );

//     const marketsList = getFilteredData(results);
//     console.log(JSON.stringify(marketsList));
//     if (!Array.isArray(marketsList) || !marketsList.length)
//       return console.error("market list is empty__>", marketsList);

//     await Promise.allSettled(marketsList.map(async m => {
//       const marketsListKey = `MARKETS_LIST:${sportId}:${m.marketId}`
//       await setCache(marketsListKey, marketsList)
//     }))

//     const oddsRes = await Promise.allSettled(
//       marketsList.map(async (m) => {
//         const oddsData = await getApi([marketOddsPoint, m.event.id, m.marketId]);
//         await setCache(m.marketId, oddsData);
//         return;
//       })
//     );
//     const filteredOdds = getFilteredData(oddsRes);

//     const mids = filteredOdds.filter(e => e?.data && e.data.status == "OPEN").map(e => e.data.marketId);
//     const opnMidsKey = `OPEN_MARKETS:${sportId}`;
//     await setCache(opnMidsKey, mids);

//   } catch (error) {
//     errorLogger.error({ at: Date.now(), message: error.message || "internal server error", });
//     console.error(error);
//   } finally {
//     return;
//   }
// };
// // in bulk
// const getMarketsOddsInBulk = async () => {
//   try {
//     const [sportId, bulkPoint] = getEnvVar(["SPORT_ID", "BULK_MARKET_ODDS"]);
//     const opnMidsKey = `OPEN_MARKETS:${sportId}`;
//     const mids = await getCache(opnMidsKey);

//     if (!Array.isArray(mids)) return console.error("mids list is empty__>", mids);

//     const midChunks = chunkArray(mids, 8);
//     const results = await Promise.allSettled(midChunks.map(async chunk => await postApi([bulkPoint], { marketIds: chunk })))
//     const marketsOdds = getFilteredData(results);

//     console.log(JSON.stringify(marketsOdds));


//   } catch (error) {
//     errorLogger.error({ at: Date.now(), message: error.message || "internal server error", });
//     console.error(error);
//   } finally {
//     return;
//   }
// }
// const getMarketsResultInBulk = async () => {
//   try {
//     const [sportId, resultPoint] = getEnvVar(["SPORT_ID", "MARKET_RESULT_END_POINT"]);
//     const opnMidsKey = `OPEN_MARKETS:${sportId}`;
//     const mids = await getCache(opnMidsKey);

//     if (!Array.isArray(mids)) return console.error("mids list is empty__>", mids);

//     const midChunks = chunkArray(mids, 8);
//     const results = await Promise.allSettled(midChunks.map(async chunk => await postApi([resultPoint], { marketIds: chunk })))
//     const marketsResult = getFilteredData(results);

//     console.log(JSON.stringify(marketsResult));

//   } catch (error) {
//     errorLogger.error({ at: Date.now(), message: error.message || "internal server error", });
//     console.error(error);
//   } finally {
//     return;
//   }
// }

module.exports = {
  getMarketInfo,
  getMarketOdds,
};
