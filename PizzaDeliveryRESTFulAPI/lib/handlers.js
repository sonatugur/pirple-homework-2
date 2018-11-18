/*
 * Request Handlers
 *
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
var fs = require('fs');
var path = require('path');

// Define all the handlers
var handlers = {};

// Ping
handlers.ping = function(data,callback){
  setTimeout(function(){
    callback(200);
  },5000);

};

// Not-Found
handlers.notFound = function(data,callback){
    callback(404);
};

// Users
handlers.users = function(data,callback){
    var acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
      handlers._users[data.method](data,callback);
    } else {
      callback(405);
    }
};

// Container for all the users methods
handlers._users  = {};

// Users - post
// Required data: firstName, lastName, email ,address, password, streetAddress
// Optional data: none
handlers._users.post = function(data,callback){
  // Check that all required fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 8 ? data.payload.password.trim() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 8 ? data.payload.address.trim() : false;
  var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 8 ? data.payload.streetAddress.trim() : false;

  if(firstName && lastName && email && password && address && streetAddress){
    // Make sure the user doesnt already exist
    _data.read('users',email,function(err,data){
      if(err){
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if(hashedPassword){
          var userObject = {
            'firstName' : firstName,
            'lastName' : lastName,
            'email' : email,
            'hashedPassword' : hashedPassword,
            'address' : address,
            'streetAddress' : streetAddress
          };
          
          // Create tokenId
          var tokenId = helpers.createRandomString(20);

          // Create tokenObject
          var tokenObject = {
            'hashedPassword' : hashedPassword,
            'id' : tokenId,
            'email' : email
          }

          // Create a token for the user
          _data.create('tokens',tokenId,tokenObject,(err) => {
            if (!err) {
                // Store the user
                _data.create('users',email,userObject,function(err){
                    if(!err){

                      //create user cart
                      var cartObject = {
                        "items" : {}
                      }
                      _data.create('carts',tokenId,cartObject,(err) => {
                        if (!err) {
                          callback(200,userObject);                          
                        } else {
                          callback(500,{'Error' : 'Could not create the user cart'});
                        }
                      });
                    } else {
                    callback(500,{'Error' : 'Could not create the new user'});
                    }
                });
            } else {
                callback(500,{'Error' : 'Could not create the user\'s token.'});
            }
          });

        } else {
        callback(400,{'Error' : 'Hashing error'});
        }
      }
    });

  } else {
    callback(400,{'Error' : 'Missing required fields'});
  }

};

// Required data: email
// Optional data: none
handlers._users.get = function(data,callback){
  // Check that email is valid
  var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 5 ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,data){
          if(!err && data){
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200,data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."})
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Required data: email
// Optional data: firstName, lastName, password, email, address (at least one must be specified)
handlers._users.put = function(data,callback){
  // Check for required field
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;

  // Check for optional fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 8 ? data.payload.password.trim() : false;
  var address = typeof(data.payload.address) == 'string' && data.payload.address.trim().length > 8 ? data.payload.address.trim() : false;
  var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 8 ? data.payload.streetAddress.trim() : false;

  // Error if email is invalid
  if(email){
    // Error if nothing is sent to update
    if(firstName || lastName || password || address || streetAddress){

      // Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the email
      handlers._tokens.verifyToken(token,email,function(tokenIsValid){
        if(tokenIsValid){

          // Lookup the user
          _data.read('users',email,function(err,userData){
            if(!err && userData){
              // Update the fields if necessary
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              if(address){
                userData.address = address;
              }
              if(streetAddress){
                userData.streetAddress = streetAddress;
              }
              // Store the new updates
              _data.update('users',email,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
        } else {
          callback(403,{"Error" : "Missing required token in header, or token is invalid."});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }

};

// Required data: email
handlers._users.delete = function(data,callback){
  // Check that email is valid
  var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 5 ? data.queryStringObject.email.trim() : false;
  if(email){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the email
    handlers._tokens.verifyToken(token,email,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',email,function(err,userData){
          if(!err && userData){
            // Delete the user's data
            _data.delete('users',email,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Login handler
handlers.logIn = function(data,callback) {
    var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 8 ? data.payload.password.trim() : false;
    if (email && password) {
    
        _data.read('users',email,function(err,userData){
            if (!err) {
                // Get token from headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                var hashedPassword = helpers.hash(password);

                //check if token is available
                _data.read('tokens',token,(err,tokenData) => {
                    // if token is present then it will be verified
                    if (!err) {
                        handlers._tokens.verifyToken(token,email,function(isValid){
                            if(isValid) {
                                handlers._tokens.verifyTokenPassword(token,hashedPassword,function(isValid){
                                    if (isValid) {
                                        callback(200,{'message':'logged in'});
                                    } else {
                                        callback(403);
                                    }
                                })
                            } else {
                                callback(403,{'error' : 'could not login, unauthorized user'});
                            }
                        });
                    } else {
                        // if not present then it will be created
                        // because when the user logged out her token will be banished
                        // verify email and password
                        var isValid = handlers._users.verifyPassword(email,hashedPassword,(isValid) => {
                            if (isValid) {
                                // create a new tokenId
                                var newTokenId = helpers.createRandomString(20);
                                var tokenObject = {
                                    'hashedPassword': hashedPassword,
                                    'id' : newTokenId,
                                    'email' : email
                                }
                                _data.create('tokens',newTokenId,tokenObject,(err) => {
                                    if (!err) {
                                        callback(200,{'message':'logged in'});
                                    } else {
                                        callback(400, {'error':'token could not be created'});
                                    }
                                })
                            } else {
                                callback(400,{'error': 'password is not valid'});
                            }
                        });
                    }
                })
            } else {
                callback(400,{'error': 'could not find user'})
            }
        })
    } else {
        callback(400,{'error': 'Missing required fields'})
    }
};

handlers.logOut = function(data,callback) {
    var tokenId = data.headers.token;
    if (tokenId) {
        _data.delete('tokens',tokenId,(err)=> {
            if(!err) {
                callback(200,{'message':'properly logged out, token is deleted'});
            } else {
                callback(400,{'error':'could not properly logged out, token is still there'});
            }
        })
    } else {
        callback(400,{'error':'could not properly logged out, token is still there'});
    }
    
}

// Container for all the tokens methods
handlers._tokens  = {};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,email,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Check that the token is for the given user and has not expired
        if(tokenData.email == email){
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
};
handlers._tokens.verifyTokenPassword = function(id,hashedPassword,callback){
    // Lookup the token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
          // Check that the token is for the given user and has not expired
          if(tokenData.hashedPassword == hashedPassword){
            callback(true);
          } else {
            callback(false);
          }
        } else {
          callback(false);
        }
      });
}

handlers._users.verifyPassword = function(email,hashedPassword,callback) {
    _data.read('users',email,(err,userData) => {
        if (!err && userData && userData.hashedPassword == hashedPassword ) {
            callback(true);
        } else {
            callback(false);
        }
    })
}


handlers.menuItems = function(data,callback) {
    var email = typeof(data.queryStringObject.email) == 'string' && data.queryStringObject.email.trim().length > 5 ? data.queryStringObject.email.trim() : false;
    var method = data.method == 'get' ? data.method : false;
    var tokenId = data.headers.token;
    handlers._tokens.verifyToken(tokenId,email,function(isValid){
        if (isValid) {
            if (method) {
                var baseDir = path.join(__dirname,'/../.data/menuItems/');
                fs.readdir(baseDir, function(err,data){
                    if(!err && data && data.length > 0){
                        var trimmedMenuItems = [];
                        data.forEach(function(item){
                            trimmedMenuItems.push(item.replace('.json',''));
                        });
                        callback(200,trimmedMenuItems);
                    } else {
                        callback(400);
                    }
                });
            }
        } else {
            callback(403,{'error': 'unauthorized data'});
        }
    })
}

handlers.addToCart = function(data,callback) {
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
  var method = data.method == 'put' ? data.method : false;
  var tokenId = data.headers.token;
  handlers._tokens.verifyToken(tokenId,email,function(isValid){
      if (isValid) {
          if (method) {
              var toBeAdded = {
                "name" : "pizza-mozeralla",
                "price" : "$10"
              }
              _data.update('carts',tokenId,toBeAdded,(err)=> {
                if (!err) {
                  callback(200,{"message" :"added to the cart"});
                } else {
                  callback(400);
                }
              })
          } else {
            callback(403,{'error':'not valid method'});
          }
      } else {
          callback(403,{'error': 'unauthorized data'});
      }
  })
}

handlers.createOrder = function(data,callback) {
  var email = typeof(data.payload.email) == 'string' && data.payload.email.trim().length > 5 ? data.payload.email.trim() : false;
  var method = data.method == 'post' ? data.method : false;
  var tokenId = data.headers.token;
  handlers._tokens.verifyToken(tokenId,email,function(isValid){
      if (isValid) {
          if (method) {
              _data.read('carts',tokenId,(err,data) => {
                if (!err && data) {
                  var amount = data.price == '$10' ? 10 : 0;
                  helpers.sendCharges(tokenId,amount,(err,res) => {
                    if (!err) {
                      var subject = true;
                      var p2 = helpers.sendMail(email,subject,'email notification',(err,res) => {
                        if (!err) {
                          callback(200);
                        } else {
                          callback(400);
                        }
                      });
                    } else {
                      callback(400);
                    }
                  });
                 } else {
                  callback(403);
                }
              })
          } else {
            callback(403,{'error':'not valid method'});
          }
      } else {
          callback(403,{'error': 'unauthorized data'});
      }
  })
}


module.exports = handlers;