const cusValidation = (req, res, next) => {

    if(req.user && req.user.role === 'customer')
        next()

    else {
        res.status(403)
        throw new Error('Access denied. Customers only.')
    }
}

module.exports = cusValidation