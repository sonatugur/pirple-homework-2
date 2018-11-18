/*
 * Create and export configuration variables
 *
 */

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort' : 3000,
  'httpsPort': 3001,
  'envName' : 'staging',
  'hashingSecret' : 'thisIsASecret',
  stripe : {
    hostUrl : 'api.stripe.com',
    chargePath : '/v1/charges',
    secretKey : 'sk_test_BUHSMvPgRluLhqMpJbXHm37s',
    publicKey : 'pk_test_Thw9z2yQxJEQPSGuO1TGpVIX'
  },
  mailgun: {
    protocol: 'http:',
    port: 443,
    from: 'sonatugr@gmail.com',
    hostUrl: 'api.mailgun.net',
    path: '/v3/sandbox481bb66dd68f4f9d8f2de765ad645b8e.mailgun.org/messages',
    secretKey: 'YOUR_MAILGUN_API_KEY',
  }
};

// Production environment
environments.production = {
  'httpPort' : 5000,
  'httpsPort': 5001,
  'envName' : 'production',
  'hashingSecret' : 'thisIsAlsoASecret',
  stripe : {
    hostUrl : 'api.stripe.com',
    chargePath : '/v1/charges',
    secretKey : 'sk_test_BUHSMvPgRluLhqMpJbXHm37s',
    publicKey : 'pk_test_Thw9z2yQxJEQPSGuO1TGpVIX'
  },
  mailgun: {
    protocol: 'http:',
    port: 443,
    from: 'sonatugr@gmail.com',
    hostUrl: 'api.mailgun.net',
    path: '/v3/sandbox481bb66dd68f4f9d8f2de765ad645b8e.mailgun.org/messages',
    secretKey: '0589725b386a00e6c500f84ec77c5c5c-9525e19d-1c4f7c1b',
  }
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
