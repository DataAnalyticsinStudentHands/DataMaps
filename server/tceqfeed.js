//required packages
var chokidar = Meteor.npmRequire('chokidar');
var csvmodule = Meteor.npmRequire('csv');
var fs = Meteor.npmRequire('fs');
var Future = Meteor.npmRequire('fibers/future');

var logger = Meteor.npmRequire('winston'); // this retrieves default logger which was configured in log.js

//upsert TCEQ data in DB
var tceqDataUpsert = Meteor.bindEnvironment(function (obj) {
    var future = new Future();
    TCEQData.upsert({
        // Selector
        timeStamp: obj.timeStamp,
        siteRef: obj.siteRef,
        param: obj.param
    }, {
        // Modifier
        $set: {
            //timeStamp is in UTC, we convert to epoch
            epoch: moment.utc(obj.timeStamp, 'YYYYMMDDHHmmss').unix(),
            poc: obj.poc,
            method: obj.method,
            units: obj.units,
            slope: obj.slope,
            intercept: obj.intercept,
            sample: obj.samle
        },
        $push: {
            value: obj.value,
            flag: obj.flag,
            verified: obj.verified,
            fileName: obj.fileName
        }
    });

    return future.wait();
});

//starting watcher for TCEQ folder
var TCEQwatcher = chokidar.watch('/hnet/incoming/TCEQ', {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    usePolling: true,
    persistent: true
});

//parsing incoming TCEQ files
TCEQwatcher
    .on('add', function (path) {
        logger.info('File ', path, ' has been added.');
        var pathArray = path.split('/');
        var fileName = pathArray[pathArray.length - 1];
        fs.readFile(path, 'utf-8', function (err, output) {
            csvmodule.parse(output, {
                delimiter: '|',
                rowDelimiter: '\n',
                auto_parse: true,
                columns: ['siteRef', 'timeStamp', 'param', 'poc', 'method', 'units', 'value', 'flag', 'verified', 'slope', 'intercept', 'sample']
            }, function (err, siteInfo) {
                if (err) {
                    logger.error(err.message);
                }
                logger.info('timer 1: ', moment());
                _.each(siteInfo, function (line) {
                    line.fileName = fileName;
                    tceqDataUpsert(line);
                });
            });
            csvmodule.on('finished', function () {
                var newPath = '/hnet/archive/TCEQ/' + fileName;
                logger.info('timer 2: ', moment());
            });
        });
        
        fs.rename(path, newPath, function (err) {
            if (err) {
                if (err.code === 'EXDEV') {
                    logger.error(err.message);
                } else {
                    callback(err);
                }
                return;
            }
        });
    })
    .on('change', function (path) {
        logger.info('File ', path, ' has been changed.');
    })
    .on('addDir', function (path) {
        logger.info('Directory ', path, ' has been added.');
    })
    .on('error', function (error) {
        logger.error('Error happened', error);
    })
    .on('ready', function () {
        logger.info('Ready for changes in /hnet/incoming/TCEQ.');
    });