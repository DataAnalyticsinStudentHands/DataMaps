SubscribedLiveData = new Mongo.Collection('subcribedlive');

var site = new ReactiveVar();
var time2find = new ReactiveVar();
var subTypName = new ReactiveVar();
var dataPacks = new ReactiveDict();
var dataSeriesVar = new ReactiveVar();
var dataSets = new ReactiveDict();

var dataSeries = function (metron) {
            return dataPacks.get(metron);
        };

var selectedPoints = null;

Template.currentsites.onRendered(function () {
    Tracker.autorun(function () {
        //console.log('params',this.params)
        //figure out which ones are to show, perhaps a dry run through the subscriptions, then ucontrol? 
        //favorites?
        //select date/time through highstock?
        //add notes to documents?
        //add flags through the watcher on the publish (checking roles/permissions on server side)? 
        //select points

        

        site.set('482010572'); //483390698//481670571//481570696 //481670697

        var nowEpoch = moment('2015-11-03').subtract(3, 'days').unix(); //seconds
        time2find.set(nowEpoch); //for testing 5196299900000 (uh)/5196294320000 /laptop
        //var startEpoch = time2find.get();
        
        subTypName.set('O3'); //have in reactiveVar for selection
        Meteor.subscribe('livedata', site.get(), '1447135215', '1447221602', subTypName.get());
        
        //var data = SubscribedLiveData.find({}).fetch();
        
        var pollutCursor = LiveData.find({});
        //seems like ReactiveVar is a lot faster for retrieval
        var dataFlags = new ReactiveDict();
        
        var pollutCursor5 = AggrData.find({});
        console.log(pollutCursor5);
        var dataSets5 = new ReactiveDict();
        var dataFlags5 = new ReactiveDict();

        
        
        
        
        
        

        pollutCursor.forEach(function (line) { 
            _.each(line, function (key) {
                
                if (key.data) {
                    _.each(key.data, function (subKey, subKeyname) {
                        if (subKey.vals) {
                            dataSets.set(key.name + '_' + subKeyname, subKey.vals);
              
                        }
    
                    });
                }
            });
        });
        
        var createCharts = function (chartName, subType, all) {
            
            var dataChart = $('#' + chartName).highcharts('StockChart', {
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
                //name, interval, etc., should come from the subscription
                series: [{
                        name: subType + ' 5 minute',
                        type: 'scatter',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 300000, // need to make dynamic
                        data: dataSets5.get(subType)
                            //data: dataSets.get('data')
			},
                    {
                        name: subType + ' 10 second',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, // need to make dynamic
                        data: dataSets.get(subType + '_conc')
			},
                    {
                        name: subType + ' 10 second',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, // need to make dynamic
                        data: dataSets.get(subType + '_RH')
			},
                    {
                        name: subType + ' 10 second',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, // need to make dynamic
                        data: dataSets.get(subType + '_Temp')
			},
                    {
                        name: subType + ' Flags5',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 300000, //for Flags, now - 300 * 1000, // five minute data
                        data: dataFlags5.get(subType)
			},
                    {
                        name: subType + ' 10 second',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, // need to make dynamic
                        data: dataSets.get(subType + '_Direction')
			},
                    {
                        name: subType + ' 10 second',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, // need to make dynamic
                        data: dataSets.get(subType + '_Speed')
			},
                    {
                        name: subType + ' Flags',
                        pointStart: time2find.get() * 1000, //Date.UTC(2004, 3, 1), // first of April
                        pointInterval: 10000, //for Flags, now - 300 * 1000, // five minute data
                        data: dataFlags.get(subType + '_Flag')
					}],
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
                                    var selectedPointsStr = '';
                                    // when is the chart object updated? after this function finshes?
                                    var chart = this.series.chart;
                                    selectedPoints = chart.getSelectedPoints();
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
                                            text: moment.utc(this.x).format('lll') + ', ' + this.series.name + ' val: ' + this.y.toFixed(2)
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
        };
        
        createCharts('container-chart-O3', 'O3');
        createCharts('container-chart-RMY_Wind', 'RMY_Wind');
        createCharts('container-chart-HMP60', 'HMP60');
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
    "change #siteselect": function (e) {
        site.set(e.target.value);
    },
    "change #timeselect": function () {
        dataSeriesVar.set(dataSeries('O3_conc'));
    },
    "click #packselect": function () {},
    "change #packselect": function (event) {
        dataSeriesVar.set('O3_' + event.currentTarget.value);
    },
    "change #keyselect": function (event) {
        dataSeriesVar.set(dataSeries(event.currentTarget.value));
    },
    "click #export": function (e) {
        var chart = $('#container-chart-reactive').highcharts();
        chart.exportChart({
            type: 'application/pdf',
            filename: 'my-pdf'
        });
    }

});