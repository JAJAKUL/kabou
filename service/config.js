var config = {
    port: 3482,
    serverhost: 'http://localhost',
    environment: 'development', //development,staging,live
    environmentSslFile: '0', //0=> No Ssl File, 1=> Ssl file
    secretKey: 'hyrgqwjdfbw4534efqrwer2q38945765',
    restaurantSearchDistance: 7000,
    adminUrl: 'http://localhost:4200/#/',
    production: {
        username: 'brain1uMMong0User',
        password: 'PL5qnU9nuvX0pBa',
        host: '68.183.173.21',
        port: '27017',
        dbName: 'Kabou',
        authDb: 'admin'
    },
    sslPath: {
        key: '/etc/letsencrypt/live/nodeserver.mydevfactory.com/privkey.pem',
        cert: '/etc/letsencrypt/live/nodeserver.mydevfactory.com/fullchain.pem'
    },
    emailConfig: {
        MAIL_USERNAME: "liveapp.brainium@gmail.com",
        MAIL_PASS: "YW5kcm9pZDIwMTY",
        MAIL_HOST: "smtp.gmail.com",
        MAIL_PORT: 465,
    },
    google: {
        API_KEY: "AIzaSyBwnF4m_VZfTxZBHDglWX94CmUGzmYzwxU"
    },
    emailTemplete: {
        logoUrl: "https://logo.com/",
        appUrl: "https://app.com/",
        helpUrl: "https://help.com/",
        facebookUrl: "https://facebook.com/",
        twitterUrl: "https://twitter.com",
        instagramUrl: "https://instagram.com/",
        snapchatUrl: "https://snapchat.com/",
        linkedinUrl: "https://www.linkedin.com",
        youtubeUrl: "https://www.youtube.com",
        loginUrl: "https://login.com/",
        androidUrl: "https://android.com/",
        iosUrl: "https://ios.com/",
    },
    payment: {
        secret_key: "sk_test_9c05820e4b8710f303e023355798b220a0678230",
        encryptedKey: "Aa7F6d7F9cF0bEb238dBbE0d715E3d6B",
        ivCode: "9bAd74D61e7E03bB",
        defaultPercentage: '80',
    },
    delivery: {
        deliveryUrl : "https://private-anon-076ab7f11f-gokada2.apiary-proxy.com/api/developer/",
        api_key : "pCAgyzS4OA4xd4PCPoucatpk0lTFoRwvf4PXnisWD2B59vMNlR8rp6l6lFkt_test",
        testMode : "YES"
    },
    twilio: { //ACfedaebdaf1d5e6efd2c98e32a4b0467a
        //fe70348ea32f41a2ceb7338d284ebf8c
        testMode: "NO",
        TWILIO_SID: "AC4b541fbcb6cbb952f685c20b8abdb9f2",
        TWILIO_AUTHTOKEN: "a48faa9b7140a80358483957e917d22b",
        friendlyName: "eazzy eats"
    },
}

module.exports = config;