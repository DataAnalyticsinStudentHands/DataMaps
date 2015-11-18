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
        {
            $limit: 5 //testingpubsub
        },
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

        //console.log('polldatalive: ', pollData);
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

Meteor.publish('aggregatedata5min', function (site, startEpoch, endEpoch) {
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
        {
            $limit: 1 //testingpubsub
        },
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

    AggrData.aggregate(aggPipe, function (err, line) {
            
            //create new structure for data series to be used for charts
            _.each(line, function (key) {
                console.log('line: ', line);
                _.each(key.subTypes, function (subKey, subType) { //subType is O3, etc.
                    if (!pollData[subType]) {
                        pollData[subType] = {};
                    }
                    _.each(subKey, function (sub) { //sub is the array with metric/val pairs as subarrays
                        var keys = Object.keys(subKey);
                        if (!pollData[subType][keys[0]]) {
                            pollData[subType][keys[0]] = [];
                        }
                        pollData[subType][keys[0]].push(sub[0].val);
                    });
                });
            });

        console.log('polldata: ', pollData);
            for (var pubKey in pollData) {
                if (pollData.hasOwnProperty(pubKey)) {
                    subscription.added('livedata', pubKey, {
                        datapoints: pollData[pubKey]
                    });
                }
            }
        },
        function (error) {
            Meteor._debug('error during agg5min publication aggregation: ' + error);
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