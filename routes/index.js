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
//TODO use bucket policies instead of key/secret
var client = new Upload('flashdrinks', {
  //'aws.region': 'us-east-1',
  'aws.path': 'images/',
  'aws.acl': 'public-read',

  versions: [{
    original: true
  },{
    suffix: '-large',
    quality: 80,
    maxHeight: 1040,
    maxWidth: 1040,
  },{
    suffix: '-medium',
    maxHeight: 780,
    maxWidth: 780
  },{
    suffix: '-small',
    maxHeight: 320,
    maxWidth: 320
  }]
});

router.post('/s3-upload', multipartMiddleware, function(req, res, next){
  client.upload(req.files.fileUpload.path, {}, function(err, images, meta) {
    if (err) {
      console.error(err);
    } else {
      for (var i = 0; i < images.length; i++) {
        console.log('Thumbnail with width %i, height %i, at %s', images[i].width, images[i].height, images[i].url);
      }
    }
  });
})


module.exports = router;
