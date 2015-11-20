//aggregation of data to be plotted with highstock
Meteor.publish('dataSeries', function (site, startEpoch, endEpoch) {

    var subscription = this;
    var pollData = {},
        poll5Data = {};

    var aggPipe = [
        {
            $match: {
                $and: [{
                        site: site
                    },
                    {
                        epoch: {
                            $gt: parseInt(startEpoch, 10),
                            $lt: parseInt(endEpoch, 10)
                        }
                    }]
            }
        },
//        {
//            $limit: 5 //testingpubsub
//        },
        {
            $sort: {
                epoch: 1
            }
        },
        {
            $project: {
                subTypes: 1,
                _id: 0
            }
        }
	];

    LiveData.aggregate(aggPipe, function (err, line) {
            //create new structure for data series to be used for charts
            _.each(line, function (key) {
                _.each(key.subTypes, function (subKey, subType) { //subType is O3, etc.
                    if (!pollData[subType]) {
                        pollData[subType] = {};
                    }

                    _.each(subKey, function (sub) { //sub is the array with metric/val pairs as subarrays
                        //if(subType==subTypName){ //reduces amount going to browser
                        if (!pollData[subType][sub.metric]) {
                            pollData[subType][sub.metric] = [];
                        }
                        pollData[subType][sub.metric].push(sub.val);
                    });
                });
            });

            console.log('polldatalive: ', pollData.O3.conc.length);
            for (var pubKey in pollData) {
                if (pollData.hasOwnProperty(pubKey)) {
                    subscription.added('dataSeries', pubKey + '_10s', {
                        subType: pubKey,
                        chartType: 'line',
                        pointInterval: 10000,
                        datapoints: pollData[pubKey]
                    });
                }
            }
        },
        function (error) {
            Meteor._debug('error during livedata publication aggregation: ' + error);
        }

    );

    var agg5Pipe = [
        {
            $match: {
                $and: [{
                        site: site
                    },
                    {
                        epoch: {
                            $gt: parseInt(startEpoch, 10),
                            $lt: parseInt(endEpoch, 10)
                        }
                    }]
            }
        },
//        {
//            $limit: 5 //testingpubsub
//        },
        {
            $sort: {
                epoch: 1
            }
        },
        {
            $project: {
                site: 1,
                subTypes: 1,
                _id: 0
            }
        },
        {
            $group: {
                _id: '$site',
                subTypes: {
                    $push: '$subTypes'
                }
            }
        }
	];

    AggrData.aggregate(agg5Pipe, function (err, result) {
            //create new structure for data series to be used for charts
            if (result.length > 0) {
                var lines = result[0].subTypes;

                _.each(lines, function (line) {
                    _.each(line, function (subKey, subType) { //subType is O3, etc.              
                        if (!poll5Data[subType]) {
                            poll5Data[subType] = {};
                        }
                        _.each(subKey, function (sub, key) { //sub is the array with metric/val pairs as subarrays
                            if (!poll5Data[subType][key]) { //create placeholder if not exists
                                poll5Data[subType][key] = [];
                            }
                            if (!poll5Data[subType].Flag) { //create placeholder if not exists
                                poll5Data[subType].Flag = [];
                            }
                            poll5Data[subType][key].push(sub[1].val);
                            if (poll5Data[subType].Flag.length < lines.length) { //flags have to be pushed only for first loop since they should be the same for all subkeys
                                poll5Data[subType].Flag.push(sub[3].val);
                            }
                        });
                    });
                });

                for (var pubKey in poll5Data) {
                    if (poll5Data.hasOwnProperty(pubKey)) {
                        subscription.added('dataSeries', pubKey + '_5m', {
                            subType: pubKey,
                            chartType: 'scatter',
                            pointInterval: 300000,
                            datapoints: poll5Data[pubKey]
                        });
                    }
                }
            }
        },
        function (error) {
            Meteor._debug('error during livedata publication aggregation: ' + error);
        }
    );
});

Meteor.publish('sites', function (sites4show) {
    return Monitors.find({
        AQSID: {
            $in: sites4show
        }
    }, {
        AQSID: 1,
        name: 1
    });
});

Meteor.publish('monitors', function (latLng) {
    return Monitors.find({
        'loc': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: latLng
                },
                $maxDistance: 80000
            }
        }
    });
});

Meteor.publish('userData', function () {
    if (this.userId) {
        return Meteor.users.find({
            _id: this.userId
        }, {
            fields: {
                'other': 1,
                'things': 1
            }
        });
    } else {
        this.ready();
    }
});

Meteor.publish('favorites', function () {
    return Favorites.find({
        owner: this.userId
    });
});