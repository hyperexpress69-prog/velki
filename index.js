const express = require("express");
const dotenv = require("dotenv");
const nodeCron = require('node-cron');
const cors = require('cors');
dotenv.config();

const { createLogger } = require("./src/utils/logger");
const { initializeRedis } = require("./src/cache/redis");
const { getMarketInfo } = require("./src/modules/markets/services/marketData");
const { getSportsFancyData } = require("./src/modules/fancy/services/fancyData");
const { matchRouter, fancyRouter } = require("./src/routes/index");
const { getOdds } = require("./src/modules/markets/job/cron");

const port = process.env.PORT || 3000;
const app = express();
const logger = createLogger("SERVER");

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

app.use("/v2/spb/match", matchRouter);
app.use("/v2/spb/fancy", fancyRouter);

const main = async () => {
  logger.info("Initializing system services...");
  try {
    const results = await Promise.allSettled([
      initializeRedis(),
      getMarketInfo(),
      // getSportsFancyData(),
      getOdds()
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Service ${index} failed: ${result.reason}`);
      } else {
        logger.info(`Service ${index} initialized successfully`);
      }
    });

  } catch (error) {
    logger.error("Critical error during main initialization sequence", error);
  }
};

app.listen(port, async () => {
  logger.info(`Server successfully running on port: ${port}`);
  await main();
});

nodeCron.schedule("*/10 * * * *", async () => {
  logger.info("Running scheduled cron update...");
  await main();
});
