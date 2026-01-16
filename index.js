const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const { createLogger } = require("./src/utils/logger");
const { initializeRedis } = require("./src/cache/redis");
const { getMarketInfo } = require("./src/modules/markets/services/marketData");
const { matchRouter, fancyRouter } = require("./src/routes/index");
const { getSportsFancyData } = require("./src/modules/fancy/services/fancyData");

const port = process.env.PORT || 3000;
const app = express();
const logger = createLogger("SERVER");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

(async () => {
  try {
    await Promise.all([
      initializeRedis(),
      getMarketInfo(),
      getSportsFancyData()
    ]);
  } catch (error) {
    console.error("error occured during starting server", error);
    process.exit(1);
  }
})();

app.use("/v2/spb/match", matchRouter)
app.use("/v2/spb/fancy", fancyRouter)


app.listen(port, () => logger.info(`server running on port: ${port}`));
