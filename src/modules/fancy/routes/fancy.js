const { getBookMakerData, getFancyMarketData } = require('../controllers/fancy');

const router = require('express').Router();

router
    .get("/get-bookmaker-market", getBookMakerData)
    .get("/get-fancy-market", getFancyMarketData)

module.exports = { router };