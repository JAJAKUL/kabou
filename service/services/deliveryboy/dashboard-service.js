var async = require('async');
const dashboardModel = require('../../models/deliveryboy/dashboard-model');

module.exports = {
    dashboard: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.dashboard(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    availabilityChange: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.availabilityChange(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    acceptRejectChange: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.acceptRejectChange(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    orderDetails: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.orderDetails(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    trackOrder: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.trackOrder(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    postLatLong: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.postLatLong(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    },
    orderStatus: (data, callBack) => {
        async.waterfall([
            function (nextCb) {
                dashboardModel.orderStatus(data, function (result) {
                    nextCb(null, result);
                })
            }
        ], function (err, result) {
            if (err) {
                callBack({
                    success: false,
                    STATUSCODE: 403,
                    message: 'Request Forbidden',
                    response_data: {}
                })
            } else {
                callBack(result);
            }
        });
    }
}