var startEpoch = new ReactiveVar(moment().subtract(1, 'days').unix()); //24 hours ago - seconds
var endEpoch = new ReactiveVar(moment().unix());

Meteor.subscribe('sites');

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

//pass null as collection name, it will create
//local only collection
var EditPoints = new Mongo.Collection(null);
var flagsHash = {
    0: 'black',
    K: 'red',
    Q: 'darkgreen'
};

/**
 * Custom selection handler that selects points and cancels the default zoom behaviour
 */
function selectPointsByDrag(e) {

    // Select points
    Highcharts.each(this.series, function (series) {
        Highcharts.each(series.points, function (point) {
            if (point.x >= e.xAxis[0].min && point.x <= e.xAxis[0].max &&
                point.y >= e.yAxis[0].min && point.y <= e.yAxis[0].max) {
                point.select(true, true);
            }
        });
    });

    // Fire a custom event
    HighchartsAdapter.fireEvent(this, 'selectedpoints', {
        points: this.getSelectedPoints()
    });

    return false; // Don't zoom
}

/**
 * The handler for a custom event, fired from selection event
 */
function selectedPoints(e) {
    var points = [];
    _.each(e.points, function (point) {
        if (point.series.type === 'scatter') {
            //console.log('point: ', point);
            var selectedPoint = {};
            //selectedPoint.id = point.category;
            selectedPoint.x = point.x;
            selectedPoint.y = point.y;
            selectedPoint.Flag = (_.invert(flagsHash))[point.color];
            points.push(selectedPoint);
        }
    });

    console.log('Points: ', points);
    for (var i = 0; i < points.length; i++) {
        EditPoints.insert(points[i]);
    }

    $('#editPointsModal').modal({
        onDeny: function () {
            console.log('canceled');
        },
        onApprove: function () {
            _.each(points, function (point) {
                point.newFlag = 'newFlag';
            });
            console.log('updated: ', points);
        }
    }).modal('show');
}
var autoCounter = 1;

/**
 * On click, unselect all points
 */
function unselectByClick() {
    var points = this.getSelectedPoints();
    if (points.length > 0) {
        Highcharts.each(points, function (point) {
            point.select(false);
        });
    }
}

Template.site.onRendered(function () {
    Tracker.autorun(function () {
        //add notes to documents?
        //need to figure out better use of Tracker

        autoCounter += 1;
        console.log('auto counter:', autoCounter);
        console.log('site: ', Router.current().params._id, 'start: ', startEpoch.get(), 'end: ', endEpoch.get());
        Meteor.subscribe('dataSeries', Router.current().params._id, startEpoch.get(), endEpoch.get());

        //destroy existing charts, should be dynamic
        if ($('#container-chart-O3').highcharts()) {
            $('#container-chart-O3').highcharts().destroy();
        }

        if ($('#container-chart-RMY_Wind').highcharts()) {
            $('#container-chart-RMY_Wind').highcharts().destroy();
        }

        if ($('#container-chart-HMP60').highcharts()) {
            $('#container-chart-HMP60').highcharts().destroy();
        }

        var seriesOptions = {};

        var allSeries = DataSeries.find({}).fetch();
        _.each(allSeries, function (data) {
            console.log('data: ', data);
            //Create data series for plotting
            if (!seriesOptions[data.subType]) {
                seriesOptions[data.subType] = [];
            }
            _.each(data.datapoints, function (datapoints, i) {
                seriesOptions[data.subType].push({
                    name: i + ' ' + data._id.split(/[_]+/).pop(),
                    type: data.chartType,
                    lineWidth: data.lineWidth,
                    allowPointSelect: data.allowPointSelect,
                    data: datapoints,
                    zIndex: data.zIndex,
                    marker: {
                        radius: 2
                    }

                });
            });

        });

        _.each(seriesOptions, function (series, name) {
            createCharts('container-chart-' + name, name, series);
        });

        function createCharts(chartName, subType, seriesOptions) {

            $('#' + chartName).highcharts('StockChart', {
                exporting: {
                    enabled: true
                },
                chart: {
                    events: {
                        selection: selectPointsByDrag,
                        selectedpoints: selectedPoints,
                        click: unselectByClick
                    },
                    zoomType: 'xy'
                },
                title: {
                    text: subType
                },
                xAxis: {
                    type: 'datetime',
                    title: {
                        text: 'Local Time'
                    }
                },
                yAxis: {
                    title: {
                        text: subType
                    }
                },
                series: seriesOptions,
                tooltip: {
                    enabled: true,
                    crosshairs: [true],
                    positioner: function (labelWidth, labelHeight, point) {
                        var tooltipX, tooltipY;
                        if (point.plotX + this.chart.plotLeft < labelWidth && point.plotY + labelHeight > this.chart.plotHeight) {
                            tooltipX = this.chart.plotLeft;
                            tooltipY = this.chart.plotTop + this.chart.plotHeight - 2 * labelHeight - 10;
                        } else {
                            tooltipX = this.chart.plotLeft;
                            tooltipY = this.chart.plotTop + this.chart.plotHeight - labelHeight;
                        }
                        return {
                            x: tooltipX,
                            y: tooltipY
                        };
                    },
                    formatter: function () {
                        var s = moment(this.x).format('YYYY/MM/DD HH:mm:ss');
                        s += '<br/>' + this.series.name + ' <b>' + this.y.toFixed(2) + '</b>';


                        return s;
                    },
                    shared: false
                },
                credits: {
                    enabled: false
                },
                rangeSelector: {
                    inputEnabled: false,
                    allButtonsEnabled: true,
                    buttons: [{
                        type: 'month',
                        count: 3,
                        text: 'Day',
                        dataGrouping: {
                            forced: true,
                            units: [['day', [1]]]
                        }
			    }, {
                        type: 'minute',
                        count: 60,
                        text: 'Hour',
                        dataGrouping: {
                            forced: true,
                            units: [['hour', [60]]]
                        }
			    }, {
                        type: 'all',
                        text: 'All',
                        dataGrouping: {
                            forced: true,
                            units: [['month', [1]]]
                        }
			    }],
                    buttonTheme: {
                        width: 60
                    },
                    selected: 2
                },
                legend: {
                    enabled: true,
                    align: 'right',
                    layout: 'vertical',
                    verticalAlign: 'top',
                    y: 100
                }
            }); //end of chart 
        }
    }); //end autorun
}); //end of onRendered


Template.editPoints.onRendered(function () {
    //Need to call dropdown render
    this.$('.ui.dropdown').dropdown();
});

Template.editPoints.helpers({
    points: function () {
        return EditPoints.find({});
    }
});

Template.editPoints.events({
    'change select': function (event) {
        console.log('hello: ', event.target.value);
    }
});

Template.registerHelper('formatDate', function (epoch) {
    return moment(epoch).format('YYYY/MM/DD HH:mm:ss');
});

Template.site.helpers({
    site: function () {
        return Sites.findOne({
            _id: Router.current().params._id
        });
    },
    selectedDate: moment.unix(startEpoch.get()).format('YYYY-MM-DD')
});

Template.site.events({
    'change #datepicker': function (event) {
        startEpoch.set(moment(event.target.value, 'YYYY-MM-DD').unix());
        endEpoch.set(moment.unix(startEpoch.get()).add(1, 'days').unix()); //always to current?
    }
});