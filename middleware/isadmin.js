const checkAdmin = (req, res, next) => {

    if(!req.user.isadmin) {
        return res.status(403).json("you are not admin")
    }
    next()
}
module.exports = checkAdmin