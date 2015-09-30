//required packages
var chokidar = Meteor.npmRequire('chokidar');
var csvmodule = Meteor.npmRequire('csv');
var fs = Meteor.npmRequire('fs');
var Future = Meteor.npmRequire('fibers/future');

var logger = Meteor.npmRequire('winston'); // this retrieves default logger which was configured in log.js

//insert live data into DB
var liveDataInsert = Meteor.bindEnvironment(function (obj) {
    var future = new Future();
    LiveData.insert(obj);
    return future.wait();
});

//overwrite 5 minute data in DB
var aggrDataUpcert = Meteor.bindEnvironment(function (obj) {
    var future = new Future();
    AggrData.upsert({
        // Selector
        timeStamp: obj.timeStamp,
        siteRef: obj.siteRef,
        param: obj.param
    }, {
        // Modifier
        $push: {
            flag: obj.flag,
            overwriteTimeStamp: moment()
        }
    });
    return future.wait();
});

//starting watcher for live incoming data
var liveWatcher = chokidar.watch('/hnet/incoming/2015', {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    usePolling: true,
    persistent: true
});

liveWatcher
    .on('add', function (path) {
        logger.info('File ', path, ' has been added.');
        var pathArray = path.split('/');
        var parentDir = pathArray[pathArray.length - 2];
        fs.readFile(path, 'utf-8', function (err, output) {
            csvmodule.parse(output, {
                delimiter: ',',
                rowDelimiter: '\r',
                auto_parse: true,
                columns: true
            }, function (err, siteInfo) {
                if (err) {
                    logger.error(err);
                }
                _.each(siteInfo, function (line) {
                    var epoch = parseInt((line.TheTime - 25569) * 86400) + 6 * 3600;
                    line.epoch = epoch;
                    line.siteRef = parentDir;
                    liveDataInsert(line);
                });
            });
        });
    })
    .on('change', function (path) {
        logger.info('File', path, 'has been changed');
    })
    .on('addDir', function (path) {
        logger.info('Directory', path, 'has been added');
    })
    .on('error', function (error) {
        logger.error('Error happened', error);
    })
    .on('ready', function () {
        logger.info('Initial scan for hnetincoming2015 complete. Ready for changes');
    });

