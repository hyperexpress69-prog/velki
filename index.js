const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const { createLogger } = require("./src/utils/logger");
const { initializeRedis } = require("./src/cache/redis");
const { getCompetitionsList } = require("./src/modules/markets/marketData");

const port = process.env.PORT || 3000;
const app = express();
const logger = createLogger("SERVER");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

(async () => {
  await Promise.all([
    // initializeRedis(),
    getCompetitionsList(),
  ]);
})();

app.listen(port, () => logger.info(`server running on port: ${port}`));
