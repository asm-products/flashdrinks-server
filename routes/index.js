var express = require('express');
var router = express.Router();
var nconf = require("nconf");
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

router.get('/', function(req, res, next) {
  res.send(200);
});

//----- Yelp -------

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
});

// ------ S3 ------
var Upload = require('s3-uploader');
var client = new Upload('flashdrinks', {
  aws: {
    accessKeyId: nconf.get('aws:accessKeyId'),
    secretAccessKey: nconf.get('aws:secretAccessKey'),
    region: 'us-west-1',
    path: 'images/',
    acl: 'public-read'
  },

  versions: [
  //{
  //  suffix: '-medium',
  //  maxHeight: 320,
  //  maxWidth: 320
  //},
  {
    suffix: '-small',
    maxHeight: 80,
    maxWidth: 80
  }
  ]
});

router.post('/s3-upload', multipartMiddleware, function(req, res, next){
  client.upload(req.files.file.path, {}, function(err, images, meta) {
    if (err) return next(err);
    res.json(images);
  });
})


module.exports = router;
