var site = new ReactiveVar('482010570');
var startEpoch = new ReactiveVar();
var endEpoch = new ReactiveVar(moment().unix());

var selectedPoints = null;

Highcharts.setOptions({
    global: {
        useUTC: false
    }
});

Template.currentsites.onCreated(function () {
    var sites4show = ['482010570', '481670571', '482010572'];
    Meteor.subscribe('sites', sites4show);
});

Template.currentsites.onRendered(function () {
    Tracker.autorun(function () {
        //figure out which ones are to show, perhaps a dry run through the subscriptions, then ucontrol? 
        //favorites?
        //select date/time through highstock?
        //add notes to documents?
        //add flags through the watcher on the publish (checking roles/permissions on server side)? 
        //select points

        var yesterday = moment().subtract(1, 'days').unix(); //24 hours ago - seconds
        //startEpoch.set(yesterday);
        //endEpoch.set(moment().unix());
        startEpoch.set(1447826411);
        endEpoch.set(1447902295);
        console.log('site: ', site.get(), 'start: ', startEpoch.get(), 'end: ', endEpoch.get());
        Meteor.subscribe('dataSeries', site.get(), startEpoch.get(), endEpoch.get());

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
                        selection: function (event) {
                            for (var i = 0; i < this.series[0].points.length; i++) {
                                var point = this.series[0].points[i];
                                if (point.x > event.xAxis[0].min &&
                                    point.x < event.xAxis[0].max &&
                                    point.y > event.yAxis[0].min &&
                                    point.y < event.yAxis[0].max) {
                                    point.select(true, true);
                                }
                            }
                            return false;
                        }
                    },
                    zoomType: 'xy'
                },
                title: {
                    text: subType + ' readings at ' + site.get()
                },
                credits: {
                    text: 'UH-HNET'
                },
                xAxis: {
                    type: 'datetime',
                    title: {text: 'Local Time'}
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
                                select: function () {
                                    var selectedPointsStr = "";
                                    // when is the chart object updated? after this function finshes?
                                    var chart = this.series.chart;
                                    selectedPoints = chart.getSelectedPoints();
                                    $('#editPointsModal').modal('show');
                                    console.log('events: ', selectedPoints);
                                    selectedPoints.push(this);
                                    $.each(selectedPoints, function (i, value) {
                                        selectedPointsStr += "<br>" + value.category;
                                    });
                                },
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
                                            text: moment(this.x).format('YYYY-MM-DD HH:mm:ss') + ', ' + this.series.name + ' val: ' + this.y.toFixed(2)
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
                    selected: 2
                }
            }); //end of chart 
        }
    }); //end autorun
}); //end of onRendered

Template.currentsites.helpers({

    sites: function () {
        var sites4show = ['482010570', '483390698', '481670571', '481570696', '481670697'];
        Meteor.subscribe('sites', sites4show);
        return Monitors.find({});
    },
    sitename: function () {
        return site.get();
    }
});

Template.currentsites.events({
    'change select': function (e) {
        console.log('event', e.target.value);
        site.set(e.target.value);
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