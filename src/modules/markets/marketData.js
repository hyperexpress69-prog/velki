const { setCache } = require("../../cache/redis");
const { createLogger } = require("../../utils/logger");

const errorLogger = createLogger("MARKET_ERROR", "jsonl");

const getCompetitionsList = async () => {
  try {
    const sportId = process.env.SPORT_ID || 4;
    const listUrl = process.env.COMPETITION_LIST_URL || "";
    if (!listUrl) return;
    const url = `${listUrl}/${sportId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}, url:${url}`);

    const list = await res.json();
    console.log(JSON.stringify(list));

    const results = await Promise.allSettled(
      list.map(async (c) => {
        const comp = {
          competitionId: c.competition.id,
          competitionName: c.competition.id,
          competitionRegion: c.competition.id,
          marketCount: c.competition.id,
        };
        // await setCache(`COMPETITION_LIST:${sportId}`, comp);

        return comp;
      })
    );
    console.log(results.map((e) => e.value));
  } catch (error) {
    errorLogger.error({
      at: Date.now(),
      message: error.message || "internal server error",
    });
  }
};

module.exports = {
  getCompetitionsList,
};
