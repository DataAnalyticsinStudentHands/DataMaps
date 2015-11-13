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
            _.each(line, function (key) {
                _.each(key.subTypes, function (subKey, subType) { //subType is O3, etc.
                    if (!pollData[subType]) {
                        pollData[subType] = {};
                    }
                    _.each(subKey, function (sub) { //sub is the array with metric/val pairs as subarrays
                        //if(subType==subTypName){ //reduces amount going to browser
                        if (!pollData[subType][sub.metric]) {
                            pollData[subType][sub.metric] = {};
                            pollData[subType][sub.metric].name = sub.metric;
                            pollData[subType][sub.metric].vals = [];
                        }
                        pollData[subType][sub.metric].vals.push(sub.val);
                    });
                });
            });

            for (var pubKey in pollData) {
                if (pollData.hasOwnProperty(pubKey)) {
                    console.log('pubKey: ', pubKey, ' poll data: ', pollData[pubKey]);
                    subscription.added('livedata', Random.id(), {
                        pollutKey: {
                            name: pubKey,
                            data: pollData[pubKey]
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
                    //console.log(pubKey)
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
    console.timeEnd('pub5min');
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
    console.log(latLng);
    //    return Monitors.find();
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