//required packages
var converter = Meteor.npmRequire('json-2-csv');
var fs = Meteor.npmRequire('fs');
var logger = Meteor.npmRequire('winston'); // this retrieves default logger which was configured in server.js

var exportDataAsCSV = Meteor.bindEnvironment(function (aqsid, startEpoch, endEpoch) {

    var dir = Monitors.find({
        AQSID: aqsid
    }).fetch()[0];

    if (dir !== undefined) {

        //output folder
        var siteName = dir.incoming.match(/[^_]*/);
        var outputFile = '/hnet/outgoing/2015/' + dir.incoming + '/' + siteName + moment.unix(startEpoch).format('YYMMDDHHmmss') + '.txt';

        var aggregatData = AggrData.find({
            $and: [{
                site: aqsid
        }, {
                epoch: {
                    $gt: parseInt(startEpoch, 10)
                }
        }, {
                epoch: {
                    $lt: parseInt(endEpoch, 10)
                }
        }]
        }).fetch();

        var dataObject = [];

        _.each(aggregatData, function (e) {
            var obj = {};

            obj.siteID = e.site;
            obj.dateGMT = moment.unix(e.epoch).format('YY/MM/DD');
            obj.timeGMT = moment.utc(moment.unix(e.epoch)).format('HH:mm:ss');
            obj.BIT = 1;
            obj.o3_channel = 25;
            obj.o3_flag = e.O3.Flag;
            obj.o3_value = e.O3.avg;
            obj.QCref_channel = 50;
            obj.QCref_flag = 'K';
            obj.QCref_value = 0;
            obj.QCstatus_channel = 51;
            obj.QCstatus_flag = 'K';
            obj.QCstatus_value = 99000;
            dataObject.push(obj);
        });

        converter.json2csv(dataObject, function (err, csv) {
            if (err) {
                console.log(err);
            }
            console.log(csv);
            fs.writeFile(outputFile, csv, function (err) {
                if (err) {
                    throw err;
                }
                console.log('file saved');
            });
        });
    } else {
        logger.info('Could not find dir for AQSID: ', aqsid, ' in Monitors.');
    }

});

Meteor.methods({
    exportData: function (startEpoch, endEpoch) {
        exportDataAsCSV('481670571', startEpoch, endEpoch);
    }
});