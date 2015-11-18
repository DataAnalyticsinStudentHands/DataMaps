Meteor.publish('livedata', function (site, startEpoch, endEpoch) {

    var subscription = this;
    var pollData = {};

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

            for (var pubKey in pollData) {
                if (pollData.hasOwnProperty(pubKey)) {
                    subscription.added('livedata', pubKey, {
                        datapoints: pollData[pubKey]
                    });
                }
            }
        },
        function (error) {
            Meteor._debug('error during livedata publication aggregation: ' + error);
        }

    );
});

Meteor.publish('aggregatedata5min', function (site) {
    var subscription = this;
    var poll5Data = {};

    var aggPipe = [{
            $match: {
                site: site
            }
        },
        {
            $sort: {
                epoch: 1
            }
        },
        {
            $project: {
                O3: 1,
                _id: 0
            }
        }
	];

    AggrData.aggregate(aggPipe, function (err, line) {

            _.each(line, function (key) {
                _.each(key.O3, function (subKey, subType) { //subType is O3, etc.
                    if (!poll5Data[subType]) {
                        poll5Data[subType] = [];
                    }
                    poll5Data[subType].push(subKey);
                });
            });
            for (var pubKey in poll5Data) {
                if (poll5Data.hasOwnProperty(pubKey)) {
                    subscription.added('aggregatedata5min', Random.id(), {
                        pollut5Key: {
                            name: pubKey,
                            data: poll5Data[pubKey]
                        }
                    });
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