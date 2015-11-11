//required packages
var chokidar = Meteor.npmRequire('chokidar');
var csvmodule = Meteor.npmRequire('csv');
var fs = Meteor.npmRequire('fs');
var logger = Meteor.npmRequire('winston'); // this retrieves default logger which was configured in server.js

var perform5minAggregat = function (siteId, startTime, endTime) {

    var pipeline = [
        {
            $match: {
                site: siteId
            }
        },
        {
            $project: {
                epoch5min: 1,
                epoch: 1,
                site: 1,
                subTypes: 1
            }
        },
        {
            $group: {
                _id: '$epoch5min',
                site: {
                    $last: '$site'
                },
                subTypes: {
                    $push: '$subTypes'
                }
            }
        }
     ];

    LiveData.aggregate(pipeline,
        Meteor.bindEnvironment(
            function (err, result) {
                _.each(result, function (e) {
                    var subObj = {};
                    subObj._id = e.site + '_' + e._id;
                    subObj.site = e.site;
                    subObj.epoch = e._id;
                    var subTypes = e.subTypes;
                    for (var i = 0; i < subTypes.length; i++) {
                        for (var subType in subTypes[i]) {
                            if (subTypes[i].hasOwnProperty(subType)) {
                                var data = subTypes[i][subType];
                                if (data[0].val === 1) { //Flag should be valid
                                    for (var j = 1; j < data.length; j++) {
                                        var newkey = subType + '_' + data[j].metric;
                                        subObj.test = newkey;
                                        if (!subObj[newkey]) {
                                            subObj[newkey] = {
                                                'sum': data[j].val,
                                                'avg': data[j].val,
                                                'numValid': parseInt(1, 10),
                                                'Flag': 1
                                            };
                                        } else {
                                            subObj[newkey].numValid += 1;
                                            subObj[newkey].sum += data[j].val; //holds sum until end
                                            subObj[newkey].avg = subObj[newkey].sum / subObj[newkey].numValid;

                                        }
                                        if ((subObj[newkey].numValid / i) < 0.75) {
                                            subObj[newkey].Flag = 0; //should discuss how to use
                                        }
                                    }
                                }
                            }
                        }
                    }
                    AggrData.update({
                            _id: subObj._id
                        },
                        subObj, {
                            upsert: true
                        });
                });

            },
            function (error) {
                Meteor._debug('error during aggregation: ' + error);
            }
        )
    );
};

var makeObj = function (keys) {
    var obj = {};
    obj.subTypes = {};
    var metron = [];
    for (var key in keys) {
        if (keys.hasOwnProperty(key)) {
            var subKeys = key.split('_');
            if (subKeys.length > 1) { //skipping 'TheTime'
                var alphaSite = subKeys[0] + '_' + subKeys[1];
                var metric = subKeys[subKeys.length - 1]; //i.e. conc., direction, etc.
                var metrized = key.replace(alphaSite + '_', '');
                metron = metrized.replace('_' + metric, ''); //wind, O3, etc.
                var val = keys[key];
                if (!obj.subTypes[metron]) {
                    obj.subTypes[metron] = [{
                        metric: metric,
                        val: val
                }];
                } else {
                    if (metric === 'Flag') { //Flag should be always first
                        obj.subTypes[metron].unshift({
                            metric: metric,
                            val: val
                        });
                    } else {
                        obj.subTypes[metron].push({
                            metric: metric,
                            val: val
                        });
                    }
                }
            }
        }
    }

    return obj;
};

var batchLiveDataUpsert = Meteor.bindEnvironment(function (parsedLines, path) {
                //find the site information
                var pathArray = path.split('/');
                var parentDir = pathArray[pathArray.length - 2];
                var site = Monitors.find({
                    incoming: parentDir
                }).fetch()[0];

                if (site.AQSID) {
                    var allObjects = [];
                    for (var k = 0; k < parsedLines.length; k++) {
                        var singleObj = makeObj(parsedLines[k]);
                        var epoch = ((parsedLines[k].TheTime - 25569) * 86400) + 6 * 3600;
                        epoch = epoch - (epoch % 1); //rounding down
                        singleObj.epoch = epoch;
                        singleObj.epoch5min = epoch - (epoch % 300);
                        singleObj.theTime = parsedLines[k].TheTime;
                        singleObj.site = site.AQSID;
                        singleObj._id = site.AQSID + '_' + epoch;
                        allObjects.push(singleObj);
                    }
                    //LiveData.batchInsert(allObjects);
                    
                    var theRaw = LiveData.rawCollection();
                    var mongoInsertSync = Meteor.wrapAsync(theRaw.insert, theRaw);
                    var result = mongoInsertSync(allObjects);
    //        LiveData.upsert({
    //            _id: site.AQSID + '_' + obj.epoch
    //        }, {
    //            epoch: obj.epoch,
    //            epoch5min: obj.epoch5min,
    //            file: pathArray[pathArray.length - 1],
    //            site: site.AQSID,
    //            subTypes: obj.subTypes,
    //            theTime: obj.theTime
    //        });
                }

            });


var readFile = function (path) {

    fs.readFile(path, 'utf-8', function (err, output) {
        csvmodule.parse(output, {
            delimiter: ',',
            rowDelimiter: '\r',
            auto_parse: true,
            columns: true
        }, function (err, parsedLines) {
            if (err) {
                logger.error(err);
            }

            batchLiveDataUpsert(parsedLines, path);

        });
    });
};

Meteor.methods({
    new5minAggreg: function (siteId, timeChosen) {
        logger.info('Helper called 5minAgg for site: ', siteId);
        perform5minAggregat(siteId, timeChosen);
    }
});

//Meteor.setInterval(function () {
//    
//    var nowEpoch = moment().unix();
//    
//    //hardcoded, should be replaced with something more flexible
//    perform5minAggregat('481670571', nowEpoch);
//    perform5minAggregat('482010572', nowEpoch);
//    perform5minAggregat('482010570', nowEpoch);
//}, 300000); //every five minutes

//can be used when server starts up to read existing files in the directory,
//this can be slow if there are a lot of files to process
var initialRead = function (path) {
    logger.info('initialRead found file: ', path);
    readFile(path);
};

var liveWatcher = chokidar.watch('/hnet/incoming/2015', {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    usePolling: true,
    persistent: true
});

liveWatcher
    .on('add', function (path) {
        logger.info('File ', path, ' has been added.');
        readFile(path);
    })
    .on('change', function (path) {
        logger.info('File', path, 'has been changed');
        readFile(path);
    })
    .on('addDir', function (path) {
        logger.info('Directory', path, 'has been added');
    })
    .on('error', function (error) {
        logger.error('Error happened', error);
    })
    .on('ready', function () {
        //initialRead('/hnet/incoming/2015/UHCCH_DAQData/HNET_CCH_TCEQ_151103.txt');
        //initialRead('/hnet/incoming/2015/UHCBH_DAQData/HNET_CBH_TCEQ_151103.txt');
        //initialRead('/hnet/incoming/2015/UHCLH_DAQData/HNET_CLH_TCEQ_151103.txt');
        logger.info('Ready for changes in /hnet/incoming/2015/.');
    });