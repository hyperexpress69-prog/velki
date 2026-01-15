const { getMatchList, getMatchCount } = require('../controllers/matches');

const router = require('express').Router();

router
    .get("/get-match-list-count", getMatchCount)
    .get("/get-match-list", getMatchList)

module.exports = { router };