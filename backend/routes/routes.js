const express = require('express')

const router = express.Router()

router.get ('/', (req, res) => {
    res.json({mssg: 'work?'})
})

module.exports = router