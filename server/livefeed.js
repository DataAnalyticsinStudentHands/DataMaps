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
                'subTypes.metrons': 1
            }
        },
        {
            $group: {
                _id: '$epoch5min',
                site: {
                    $last: '$site'
                },
                nuisance: {
                    $push: '$subTypes.metrons'
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
                    var metrons = e.nuisance;
                    for (var i = 0; i < metrons.length; i++) {
                        for (var newkey in metrons[i]) {
                            if (metrons[i][newkey][1].metric === 'Flag' && metrons[i][newkey][1].val === 1) {
                                if (!subObj[newkey]) {
                                    subObj[newkey] = {
                                        'sum': metrons[i][newkey][0]['val'],
                                        'avg': metrons[i][newkey][0]['val'],
                                        'variance': 0.0,
                                        'stdDev': 0.0,
                                        'numValid': parseInt(1, 10),
                                        'Flag': 1
                                    };
                                } else {
                                    subObj[newkey]['numValid'] += 1;
                                    subObj[newkey]['sum'] += metrons[i][newkey][0]['val']; //holds sum until end
                                    subObj[newkey]['avg'] = subObj[newkey]['sum'] / subObj[newkey]['numValid'];
                                    subObj[newkey]['variance'] += Math.pow((metrons[i][newkey][0]['val'] - subObj[newkey]['avg']), 2);
                                }
                                subObj[newkey]['stdDev'] = Math.sqrt(subObj[newkey]['variance']);
                                if ((subObj[newkey]['numValid'] / i) < .75) {
                                    subObj[newkey]['Flag'] = 0; //should discuss how to use
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

//insert live data into DB; _id is site_epoch
//obj has subTypes, epoch5min
var liveDataUpsert = Meteor.bindEnvironment(function (dir, obj) {

    var site = Monitors.find({
        incoming: dir
    }).fetch()[0];

    if (obj.epoch > 0) {
        LiveData.upsert({
            _id: site.AQSID + '_' + obj.epoch
        }, {
            epoch: obj.epoch,
            epoch5min: obj.epoch5min,
            site: site.AQSID,
            subTypes: obj.subTypes,
            theTime: obj.theTime
        });
    }
});

var makeObj = function (keys) {
    var obj = {};
    obj.subTypes = {};
    obj.subTypes.metrons = {};
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
                if (!obj.subTypes.metrons[metron]) {
                    obj.subTypes.metrons[metron] = [{
                        metric: metric,
                        val: val
                }];
                } else {
                    obj.subTypes.metrons[metron].push({
                        metric: metric,
                        val: val
                    });
                }
            }
        }
    }

    return obj;
};

var write10Sec = function (dir, arr) {
    for (var k = 0; k < arr.length; k++) {
        var singleObj = makeObj(arr[k]);
        var epoch = ((arr[k].TheTime - 25569) * 86400) + 6 * 3600;
        singleObj.epoch = epoch - (epoch % 1); //rounding down
        singleObj.epoch5min = epoch - (epoch % 300);
        singleObj.theTime = arr[k].TheTime;
        liveDataUpsert(dir, singleObj);
    }
};

var readFile = function (path) {
    var pathArray = path.split('/');
    var parentDir = pathArray[pathArray.length - 2];

    fs.readFile(path, 'utf-8', function (err, output) {
        csvmodule.parse(output, {
            delimiter: ',',
            rowDelimiter: '\r',
            auto_parse: true,
            columns: true
        }, function (err, parsedLine) {
            if (err) {
                logger.error(err);
            }
            write10Sec(parentDir, parsedLine);
        });
    });
};

Meteor.methods({
    new5minAggreg: function (siteId, timeChosen) {
        logger.info('Helper called 5minAgg');
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
        logger.info('Ready for changes in /hnet/incoming/2015/UHCCH_DAQData/.');
    });