//simple template to test server functions
Template.simple.result = function () {
    return Session.get('serverSimpleResponse') || '';
};
Template.simple.events = {
    'click input': function () {
        Meteor.call('getCurrentTime', function (err, response) {
            Session.set('serverSimpleResponse', response);
        });

    }
};

Template.passData.result = function () {
    return Session.get('serverDataResponse') || '';
};

Template.passData.events = {
    'click #passDataResult': function () {
        Meteor.call('new5minAggreg', 481670571, $('input[type=text]').val(), function (err, response) {
            if (err) {
                Session.set('serverDataResponse', 'Error:' + err.reason);
                return;
            }
            Session.set('serverDataResponse', response);
        });
    },
    'click #exportDataResult': function () {
        Meteor.call('exportData', $('#start').val(), $('#end').val(), function (err, response) {
            if (err) {
                Session.set('serverExportDataResponse', 'Error:' + err.reason);
                return;
            }
            Session.set('serverExportDataResponse', response);
        });
    }  
};