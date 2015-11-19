Sites = new Mongo.Collection('sites');

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
        startEpoch.set(yesterday);
        endEpoch.set(moment().unix());
        console.log('site: ', site.get(), 'start: ', startEpoch.get(), 'end: ', endEpoch.get());
        Meteor.subscribe('livedata', site.get(), startEpoch.get(), endEpoch.get());

        LiveData.find({}).forEach(function (data) {
            //Prepare data for plotting
            var seriesCounter = 0,
                seriesOptions = [];
            $.each(data.datapoints, function (i, datapoints) {
                seriesOptions.push({
                    name: i,
                    pointStart: startEpoch.get() * 1000,
                    pointInterval: 10000, // for 10s data need to make dynamic
                    data: datapoints
                });
                // As we're loading the data asynchronously, we don't know what order it will arrive. So
                // we keep a counter and create the chart when all the data is loaded.
                seriesCounter += 1;
                if (seriesCounter === Object.keys(data.datapoints).length) {
                    createCharts('container-chart-' + data._id, data._id, seriesOptions);
                }
            });
        });
        
        Meteor.subscribe('aggregatedata5min', site.get(), startEpoch.get(), endEpoch.get());
        
        AggrData.find({}).forEach(function (data) {
            console.log('data: ', data);
            //Prepare data for plotting
//            var seriesCounter = 0,
//                seriesOptions = [];
//            $.each(data.datapoints, function (i, datapoints) {
//                seriesOptions.push({
//                    name: i,
//                    pointStart: startEpoch.get() * 1000,
//                    pointInterval: 10000, // for 10s data need to make dynamic
//                    data: datapoints
//                });
//                // As we're loading the data asynchronously, we don't know what order it will arrive. So
//                // we keep a counter and create the chart when all the data is loaded.
//                seriesCounter += 1;
//                if (seriesCounter === Object.keys(data.datapoints).length) {
//                    createCharts('container-chart-' + data._id, data._id, seriesOptions);
//                }
//            });
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
                        //click: function(){dataSeriesVar.set(dataSeries('O3'))},
                        selection: function (event) {
                            console.log(event.xAxis[0].min);
                            console.log(this.series[1].points.length);
                            for (var i = 0; i < this.series[0].points.length; i++) {
                                var point = this.series[0].points[i];
                                if (point.x > event.xAxis[0].min &&
                                    point.x < event.xAxis[0].max &&
                                    point.y > event.yAxis[0].min &&
                                    point.y < event.yAxis[0].max) {
                                    //console.log(point)
                                    point.select(true, true);
                                }

                            }
                            return false;
                        }
                    },
                    zoomType: 'xy'
                },
                title: {
                    text: subType + ' Readings at ' + site.get()
                },
                credits: {
                    text: 'UH-HNET',
                    href: 'http://hnet.uh.edu'

                },
                xAxis: {
                    type: 'datetime'
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
                        allowPointSelect: true,
                        point: {
                            events: {
                                select: function () {
                                    var selectedPointsStr = "";
                                    // when is the chart object updated? after this function finshes?
                                    var chart = this.series.chart;
                                    selectedPoints = chart.getSelectedPoints();
                                    console.log(selectedPoints);
                                    selectedPoints.push(this);
                                    $.each(selectedPoints, function (i, value) {
                                        selectedPointsStr += "<br>" + value.category;
                                    });
                                    //$report.html(selectedPointsStr);
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
                                            text: moment(this.x).format('lll') + ', ' + this.series.name + ' val: ' + this.y.toFixed(2)
                                        });
                                }
                            }
                        }
                    }
                },
                turboThreshold: 100000,
                tooltip: {
                    enabled: false
                },
                rangeSelector: {
                    //inputEnabled: true, //can't see what it does - thought it was for the dates.
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
                        count: 1,
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
        var chart = $('#container-chart-reactive').highcharts();
        chart.exportChart({
            type: 'application/pdf',
            filename: 'my-pdf'
        });
    }

});