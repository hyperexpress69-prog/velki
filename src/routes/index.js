const matchRouter = require("../modules/markets/routes/match")
const fancyRouter = require("../modules/fancy/routes/fancy");
module.exports = {
    matchRouter: matchRouter.router,
    fancyRouter: fancyRouter.router
}