const { getMatchList, getMatchCount, getMatchOdds } = require('../controllers/matches');

const router = require('express').Router();

router
    .get("/get-match-list-count", getMatchCount)
    .get("/get-match-list", getMatchList)
    .get("/get-match-odds", getMatchOdds)

module.exports = { router };