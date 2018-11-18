/*
 * Helpers for various tasks
 *
 */

// Dependencies
var config = require('./config');
var crypto = require('crypto');
var https = require('https');
var querystring = require('querystring');

// Container for all the helpers
var helpers = {};

// Mail validation
const mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = function(str){
    try {
        const obj = JSON.parse(str);
        return obj;
      } 
      catch (e) {
        if (e instanceof SyntaxError && str) {
          console.log(`JSON SyntaxError ${e.message} >> (${str})`);
        } 
        return  {};
      }
};

// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength){
  strLength = helpers.validateNumber(strLength) && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    var str = '';
    for(i = 1; i <= strLength; i++) {
        // Get a random charactert from the possibleCharacters string
        var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        // Append this character to the string
        str+=randomCharacter;
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
};

// Validate String
helpers.validateString = (value, min=1, max=0) => typeof(value) == 'string' && value.trim().length >= min && (max === 0 || value.trim().length <= max)

// Validate Number
helpers.validateNumber = (value, regex=/\d+/) => typeof(value) == 'number' && regex.test(value);

// Validate Boolean
helpers.validateBoolean = (value, defaultValue) => typeof(value) == 'boolean' && value == defaultValue;

// Validate Emails
helpers.validateEmail = (value) => helpers.validateString(value, 5) && mailRegex.test(value);

// Validate foreign keys
helpers.validateForeignKey = (value, max=20) => helpers.validateString(value, max, max);


helpers.httpsRequest = async (options, data)  => {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);

        let response = '';
        res.setEncoding('utf-8');
        res.on('data', (resData) => {
            //process.stdout.write(d);
            // console.log(resData)
          response = resData;
        });
        res.on('end', () => {
            response = helpers.parseJsonToObject(response);
            resolve(response);
        });
      });
      req.on('error', (error) => {
        reject(helpers.formatResponse.error(error.message));
      });
      req.write(data);
      req.end();
    });
};

// Send mail using MailGun
helpers.sendMail = async (sendTo, subject, message,callback) => {

  //validate parameters
  message  = helpers.validateString(message) ? message: false;
  subject  = helpers.validateString(subject) ? subject: false;
  // nowadays the email will be send to only one recipient. 
  // If want to send to more in the future change this to an object
  sendTo  =  helpers.validateString(sendTo) ? sendTo: false;

  if (!(message && subject && sendTo)){
    callback(400);
  }

  //configure the payload for the request
  const payload = {
    from: `Assign2 <${config.mailgun.from}>`,
    to: sendTo,
    subject: subject,
    text: message
  };

  const data = querystring.stringify(payload);

  // Configure the request details
  const options = {
    protocol: config.mailgun.protocol,
    hostname: config.mailgun.hostUrl,
    method: 'POST',
    path: config.mailgun.path,
    auth: `api:${config.mailgun.secretKey}`,
    retry: 1,
    port: config.mailgun.port,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
    }
  }; 

  const response = await helpers.httpsRequest(options, data);
  callback(false,{"success":response});

};;

// Send charges using Stripe
helpers.sendCharges = async (orderId, amount=0,callback) => {
    amount = helpers.validateNumber(amount) ? amount: 0;
  
    //configure the payload for the request
    const payload = {
       amount: amount * 100,
       currency: 'usd', 
       description: `charges for this orderId ${orderId}`,
       source: 'tok_visa'
    };

    const data = querystring.stringify(payload);

    // Configure the request details
    const options = {
        protocol: 'https:',
        hostname: config.stripe.hostUrl,
        method: 'POST',
        port: 443,
        path: config.stripe.chargePath,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': `Bearer ${config.stripe.secretKey}`
        }
    }; 

    const response = await helpers.httpsRequest(options, data);
    callback(false,{"success":response});

  };
// Export the module
module.exports = helpers;
