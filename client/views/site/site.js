var startEpoch = new ReactiveVar(moment().subtract(1, 'days').unix()); //24 hours ago - seconds
var endEpoch = new ReactiveVar(moment().unix());

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

    $('#editPointsModal').modal('show');
}

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
        //figure out which ones are to show, perhaps a dry run through the subscriptions, then ucontrol? 
        //favorites?
        //select date/time through highstock?
        //add notes to documents?
        //add flags through the watcher on the publish (checking roles/permissions on server side)? 
        //select points

        
        endEpoch.set(moment().unix());

        var site = Router.current().params._id;
        console.log('site: ', site, 'start: ', startEpoch.get(), 'end: ', endEpoch.get());
        Meteor.subscribe('dataSeries', site, startEpoch.get(), endEpoch.get());

        var seriesOptions = {};

        DataSeries.find({}).forEach(function (data) {
            //Create data series for plotting
            if (!seriesOptions[data.subType]) {
                seriesOptions[data.subType] = [];
            }
            _.each(data.datapoints, function (datapoints, i) {
                seriesOptions[data.subType].push({
                    name: i,
                    type: data.chartType,
                    lineWidth: data.lineWidth,
                    allowPointSelect: data.allowPointSelect,
                    data: datapoints

                });
            });
            _.each(seriesOptions, function (series, name) {
                //console.log('series: ', series);
                createCharts('container-chart-' + name, name, series);
            });
        });

        //        //seems like ReactiveVar is a lot faster for retrieval
        //        var dataFlags = new ReactiveDict();
        //        var dataFlags5 = new ReactiveDict();

        function createCharts(chartName, subType, seriesOptions) {

            $('#' + chartName).highcharts('StockChart', {
                exporting: {
                    chartOptions: { // specific options for the exported image
                        plotOptions: {
                            series: {
                                dataLabels: {
                                    enabled: true
                                }
                            }
                        }
                    },
                    scale: 3,
                    fallbackToExportServer: false
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
                    text: subType + ' readings at ' + site
                },
                credits: {
                    text: 'UH-HNET'
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
                plotOptions: {
                    series: {
                        events: {
                            mouseOut: function () {
                                if (this.chart.lbl) {
                                    this.chart.lbl.hide();
                                }
                            }
                        },
                        marker: {
                            radius: 2
                        },
                        point: {
                            events: {
                                mouseOver: function () {
                                    var chart = this.series.chart;
                                    if (!chart.lbl) {
                                        chart.lbl = chart.renderer.label('')
                                            .attr({
                                                padding: 10,
                                                r: 10,
                                                fill: Highcharts.getOptions().colors[2]
                                            })
                                            .css({
                                                color: '#0f0e0e'
                                            })
                                            .add();
                                    }
                                    chart.lbl
                                        .show()
                                        .attr({
                                            text: moment(this.x).format('YYYY/MM/DD HH:mm:ss') + ', ' + this.series.name + ' val: ' + this.y.toFixed(2)
                                        });
                                }
                            }
                        }
                    }
                },
                tooltip: {
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
                    selected: 1
                },
                legend: {
                    enabled: true,
                    align: 'right',
                    backgroundColor: '#FCFFC5',
                    borderColor: 'black',
                    borderWidth: 2,
                    layout: 'vertical',
                    verticalAlign: 'top',
                    y: 100,
                    shadow: true
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

Template.registerHelper('formatDate', function (epoch) {
    return moment(epoch).format('YYYY/MM/DD HH:mm:ss');
});

Template.site.events({
    'change #datepicker': function (event) {
        console.log('event:', event.target.value);
        
        console.log("converted: ", moment(event.target.value, 'YYYY-MM-DD').unix());
        startEpoch.set(moment(event.target.value, 'YYYY-MM-DD').unix());
    },
    "click #export": function (e) {
        console.log('event', e.target.value);
        var chart = $('#container-chart-reactive').highcharts();
        chart.exportChart({
            type: 'application/pdf',
            filename: 'my-pdf'
        });
    }

});