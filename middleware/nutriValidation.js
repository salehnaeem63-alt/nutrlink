const nutriValidation = (req, res, next) => {

    if(req.user && req.user.role === 'nutritionist')
        next()

    else {
        res.status(403)
        throw new Error('Access denied. Nutritionists only.')
    }
}

module.exports = nutriValidation