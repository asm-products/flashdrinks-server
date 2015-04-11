var express = require('express');
var router = express.Router();
var nconf = require("nconf");
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var AWS = require('s3-uploader/node_modules/aws-sdk');

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
});

// ------ SNS ------
// See http://t.yc.sg/post/102663623041/amazon-sns-with-ionic-framework-part-1-android & http://stackoverflow.com/questions/21609121/anyone-using-node-js-with-amazon-sns-and-apple-push-notifications
AWS.config.update({accessKeyId: nconf.get('aws:accessKeyId'), secretAccessKey: nconf.get('aws:secretAccessKey')});
AWS.config.update({region: nconf.get('aws:region')});
var sns = new AWS.SNS();
router.post('/subscribe-push', function(req, res, next){
  if (!req.body.token) return res.json(400, {"status": "error", "message": "Please provide a token."});
  if (!req.body.platform) return res.json(400, {"status": "error", "message": "Please provide a platform."});
  var token = req.body.token,
    platform = req.body.platform,
    arn = (platform=='GCM' /*|| APNS*/) ? nconf.get("aws:sns:"+platform) : false;
  if (!arn) return res.json(400, {"status": "error", "message": "Please provide a valid platform."});
  sns.createPlatformEndpoint({PlatformApplicationArn:platformApplicationArn, Token:token}, function(err, EndPointResult) {
    if (err) return res.json(400, {status: "error", "message": err.toString()});
    return res.json(200, {status: "ok"});
    //var client_arn = EndPointResult["EndpointArn"];
    //sns.publish({TargetArn: client_arn, Message: 'Test', Subject: 'Stuff'}, function(err,data){
    //  if (err) {
    //    console.log("Error sending a message "+err);
    //  } else {
    //    console.log("Sent message: "+data.MessageId);
    //  }
    //});
  });
})

module.exports = router;
