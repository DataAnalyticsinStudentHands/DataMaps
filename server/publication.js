//This works, and should make it easier/faster but I wasn't using the functions
//Meteor.publish('livedata', function (site,timeChosen) {
//	var self = this; //because 'this' is different inside of added
//	var siteTimeChosen = new RegExp('^'+site+'_'+timeChosen);
//	var live2show = LiveData.find({_id: {$regex:siteTimeChosen}}).observeChanges({
//		added: function (id, fields) {
//			self.added("livedata", id, fields);
//			// self.added("dataInGraph",id, {
//			// x: new Date(fields.epoch*1000),
//			// y: fields.subTypes.metrons.O3[0].val
//			// 	});
//		//	console.log('added', id, fields)
//		//	console.log('LiveDatacount',LiveData.find().count())
//		},
//		changed: function(id, fields) {
//		  self.changed("livedata", id, fields);
//		  //can't quite tell if it automatically calls an update to the db
//		},
//		removed: function (id) {
//			console.log('removed')
//			console.log('LiveDatacount',LiveData.find().count())
//		  self.removed("livedata", id);
//		}
//	});
//	// self.added("currentsites", id, site);
//	// self.added("dataInGraph", id, {x: "testdata", Count: count});
//	self.ready();
////	console.log(this.connection) //curious about who is connecting? could log, I guess...
//	self.onStop(function () {
//		live2show.stop();
//	});
//	//return LiveData.find({_id: {$regex:siteTimeChosen}});
//});
//Monitors._ensureIndex({ loc : "2dsphere", parameter : 1, state: 1 });
//I believe site can be an array, but need to sort at end
var site = '' //after testing, default to '481670571'
var timeChosen = '' //after testing, default to moment().subtract(1, 'days').unix();
    //need to do things like time with and without sorting after have full size data
var searchBuild = function () {
    return '$and: [{ site: ' + site + '}, {epoch: {$gt: parseInt(' + timeChosen + ',10)}},{sort:{epoch:1}}]'
}

Meteor.publish('livedata', function (site, timeChosen, subTypName) {
    //testing
    //could also pass endTime as part of $lt - 3600000 = 1 day
    self = this;
    pollData = {};
    //need to call aggPipe as a function to make it shared across publishers
    var aggPipe = [
        {
            $match: {
                $and: [{
                        site: '481670570'
                    },
                    {
                        epoch: {
                            $gt: parseInt(timeChosen, 10),
                            $lt: parseInt(timeChosen + 3600000, 10)
                        }
                    }]
            }
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
    pollutData = LiveData.aggregate(aggPipe, function (err, line) {
            _.each(line, function (key) {
                //if(line.hasOwnProperty(key)){
                _.each(key.subTypes, function (subKey, subType) { //subType is O3, etc.

                    if (!pollData[subType]) {
                        pollData[subType] = {};
                    };
                    _.each(subKey, function (sub) { //sub is the array with metric/val pairs as subarrays
                        if (subType == subTypName) { //reduces amount going to browser
                            if (!pollData[subType][sub.metric]) {
                                pollData[subType][sub.metric] = {};
                                pollData[subType][sub.metric]['name'] = sub.metric;
                                pollData[subType][sub.metric]['vals'] = [];
                            };
                            pollData[subType][sub.metric]['vals'].push(sub.val)
                        };
                    });
                })
                //}; //end ownProp on key
            });
            //console.timeEnd('pollData')
            for (var pubKey in pollData) {
                if (pollData.hasOwnProperty(pubKey)) {
                    // console.log(pubKey)
                    self.added('livedata', Random.id(), {
                        pollutKey: {
                            name: pubKey,
                            data: pollData[pubKey]
                        }
                    })
                }
            };
        },
        function (error) {
            Meteor._debug('error during livedata publication aggregation: ' + error);
        }
    );
});
//should be able to reuse this code; not sure why it's fighting me.
Meteor.publish('aggregatedata5min', function (site, timeChosen, subTypName) {
    self = this;
    poll5Data = {};
    console.time('pub5min')
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
    pollut5Data = AggrData.aggregate(aggPipe, function (err, line) {

            _.each(line, function (key) {
                _.each(key.O3, function (subKey, subType) { //subType is O3, etc.
                    if (!poll5Data[subType]) {
                        poll5Data[subType] = [];
                    };
                    poll5Data[subType].push(subKey);
                });
            });
            for (var pubKey in poll5Data) {
                if (poll5Data.hasOwnProperty(pubKey)) {
                    //console.log(pubKey)
                    self.added('aggregatedata5min', Random.id(), {
                        pollut5Key: {
                            name: pubKey,
                            data: poll5Data[pubKey]
                        }
                    })
                }
            };
        },
        function (error) {
            Meteor._debug('error during livedata publication aggregation: ' + error);
        }
    );
    console.timeEnd('pub5min')
});
Meteor.publish('tceqData', function () {
    var now = new Date();
    var adayAgo = now.getTime() / 1000 - 24 * 3600;

    return TCEQData.find({
        'epoch': {
            $gt: adayAgo
        }
    }, {
        sort: {
            'epoch': -1
        }
    });
});

Meteor.publish('siteData', function (latLng) {
    return Sites.find({
        'location': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [latLng.lng, latLng.lat]
                },
                $maxDistance: 50000000
            }
        }
    });
});
Meteor.publish('monitors', function (latLng) {
    console.log(latLng)
    //   return Monitors.find({AQSID:'481670571'})
    return Monitors.find();
    return Monitors.find({
        'loc': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [latLng.lng, latLng.lat]
                },
                $maxDistance: 50000000
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