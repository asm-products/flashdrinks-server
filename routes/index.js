var express = require('express');
var router = express.Router();
var nconf = require("nconf");
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var AWS = require('s3-uploader/node_modules/aws-sdk');
var _ = require('lodash');

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

router.post('/push/register', function(req, res, next){
  if (!req.body.token) return next({status: 400, message: "Please provide a token."});
  if (!req.body.platform) return next({status: 400, message: "Please provide a platform."});
  var arn = _.includes(['GCM'/*,'APNS'*/], req.body.platform) ?
    nconf.get("aws:sns:arn")+":"+(nconf.get("aws:sns:"+req.body.platform)) : false;
  if (!arn) return next({status: 400, message: "Please provide a valid platform."});
  sns.createPlatformEndpoint({PlatformApplicationArn:arn, Token:req.body.token}, function(err, EndPointResult) {
    if (err) return next({status: 400, message: err.toString()});
    return res.json(200, EndPointResult);
  });
});

router.post('/push/subscribe', function(req, res, next){
    if (!req.body.topic) return next({status: 400, message: "Please provide a topic."})
    var params = {
      TopicArn: nconf.get('aws:sns:arn')+':'+req.body.topic
    }

    var subscribe = function(data){
      console.log(req.body);
      var params = {
        Protocol: 'application', /* required */
        TopicArn: data.TopicArn, /* required */
        Endpoint: req.body.EndpointArn //req.body.token //FIXME is this secure?
      };
      sns.subscribe(params, function(err, data) {
        if (err) return next(err);
        console.log(data);
        return res.json(200, {status: "ok"});
      });
    };
    sns.getTopicAttributes(params, function(err, data){
      if (err) {

       // Create & subscribe
       if (err.code == 'NotFound') {
         var params = {
           Name: req.body.topic /* required */
         };
         sns.createTopic(params, function(err, data) {
           if (err) return next(err);
           return subscribe(data);
         });

       // No there was actually a real error
       } else {
         return next(err);
       }

      // Topic exits, subscribe
      } else {
        return subscribe(data.Attributes);
      }
      res.json(200, {status:"ok"});
  })

});

router.post('/push/delete-topic', function(req, res, next){
  if (!req.body.topic) return next({status: 400, message: "Please provide a topic."})
  var params = {
    TopicArn: nconf.get('aws:sns:arn')+':'+req.body.topic
  };
  sns.deleteTopic(params, function(err, data) {
    if (err) return next(err);
    else return res.json(200, {status: 'ok'});
  });
});

router.post('/push/publish', function(req, res, next){
  var params = {
    Message: 'New activity on '+req.body.topic, /* required */
    //MessageAttributes: {
    //  someKey: {
    //    DataType: 'STRING_VALUE', /* required */
    //    BinaryValue: new Buffer('...') || 'STRING_VALUE',
    //    StringValue: 'STRING_VALUE'
    //  },
    //  /* anotherKey: ... */
    //},
    //MessageStructure: 'STRING_VALUE',
    Subject: 'Flashdrinks Activity',
    TargetArn: 'TopicArn',
    TopicArn: nconf.get('aws:sns:arn')+':'+req.body.topic
  };
  sns.publish(params, function(err, data) {
    if (err) return next(err);
    else return res.json(200, {status: ok});
  });
})

module.exports = router;
