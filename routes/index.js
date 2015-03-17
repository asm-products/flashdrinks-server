var express = require('express');
var router = express.Router();
var nconf = require("nconf");

router.get('/', function(req, res, next) {
  res.send(200);
});

// Request API access: http://www.yelp.com/developers/getting_started/api_access
var yelp = require("yelp").createClient({
  consumer_key: nconf.get('yelp:consumer_key'),
  consumer_secret: nconf.get('yelp:consumer_secret'),
  token: nconf.get('yelp:token'),
  token_secret: nconf.get('yelp:token_secret')
});
router.get('/yelp-search', function(req, res, next){
  yelp.search(req.query, function(error, data) {
    if (error) return next(error);
    res.json(data);
  });
})

module.exports = router;
