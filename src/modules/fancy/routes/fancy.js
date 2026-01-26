const { getBookMakerData, getFancyMarketData, getPremiumFancyData } = require('../controllers/fancy');

const router = require('express').Router();

router
    .get("/get-bookmaker-market", getBookMakerData)
    .get("/get-fancy-market", getFancyMarketData)
    .get("/get-premium-market", getPremiumFancyData)

module.exports = { router };