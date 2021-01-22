var PUSH_CONFIG = {};


//Ios [APN]
PUSH_CONFIG.IOS_PRODUCTION_MODE  = false;
PUSH_CONFIG.IOS_AUTHKEY_FILE = "AuthKey_2WV75JYP7K.p8"; // When we download the key from the Apple Developer Keys page, it will have a name like AuthKey_A1BC23DE45.p8
PUSH_CONFIG.IOS_AUTHKEY_FILEPATH = "F:/Brainium/eazzy-eats/admin/libraries/pushlib/Ios/resource/AuthKey_2WV75JYP7K.p8"; //PATH from APN
PUSH_CONFIG.IOS_KEY_ID = "2WV75JYP7K"; //The A1BC23DE45 is the keyId that you need here
PUSH_CONFIG.IOS_TEAM_ID = "BMA4QXH2PW"; //IDENTIFIER [developer-team-id]
PUSH_CONFIG.IOS_VENDOR_TOPIC = "com.EazzyEats.Restaurant"; //Your Application bundle ID
PUSH_CONFIG.IOS_CUSTOMER_TOPIC = "com.EazzyEats.Customer"; //Your Application bundle ID

//Android [FCM]
PUSH_CONFIG.SERVER_API_KEY = 'AAAA3uxVcbc:APA91bGPwy2Eq_6QydCZQ1Z0l4fjjA0w1wst7hlBxiGcHczxx7JPPrzjcoDvAd9BsKhdpHlA4OXOEblGGh0Amb1NhIPIgNERZ9J0EAMQIbg0596OWkIAEOrxFOl5nZOCQEBkUxgXTX2U';


module.exports = PUSH_CONFIG