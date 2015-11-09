currentSites = new Meteor.Collection('currentsites');

var selectedPoints = null;
Template.currentsites.onCreated(function (){

});
Template.currentsites.onRendered(function (){
	Tracker.autorun(function () {
		//figure out which ones are to show, perhaps a dry run through the subscriptions, then ucontrol? 
		//favorites?
		//select date/time through highstock?
		//add notes to documents?
		//add flags through the watcher on the publish (checking roles/permissions on server side)? 
		//select points
		
	    site = new ReactiveVar();
	    time2find = new ReactiveVar();
		var subTypName = new ReactiveVar();
	    site.set('481670570'); 
	    var nowEpoch = moment("2015-11-08").subtract(1, 'days').unix();//'144644488'; //testing
	    var nowDown = nowEpoch - (nowEpoch % 10);
	    var fiveDown = nowDown - (nowDown % 300);
	    var hourDown = nowDown - (nowDown % 3600);
	    //var dayDown = (nowDown - 86400) - ((nowDown - 86400) % 3600);
	    time2find.set(hourDown);  //for testing 5196299900000 (uh)/5196294320000 /laptop
	    timeChosen = time2find.get();
	    timeChosenStr = timeChosen;//.toString();//.replace(/0+$/,'');
	    subTypName.set('O3'); //have in reactiveVar for selection
	    Meteor.subscribe('aggregatedata5min',site.get(),timeChosenStr,subTypName.get());
		pollutCursor5 = AggrData.find({});
	    Meteor.subscribe('livedata',site.get(),timeChosenStr,subTypName.get());
		//pollutCursor = LiveData.find({},{subTypes:1,_id:0},{limit: 10}); //why not only subTypes???
		pollutCursor = LiveData.find({});
		dataSets = new ReactiveVar(); //seems like ReactiveVar is a lot faster for retrieval
		dataFlags = new ReactiveVar();
		dataSets5 = new ReactiveVar(); 
		dataFlags5 = new ReactiveVar();
		
		dataPacks = new ReactiveDict();
        dataSeriesVar = new ReactiveVar();
		dataSeries = function(metron){
			return dataPacks.get(metron);
		};
        var metronTest = 'O3_conc';
		dataSeriesVar.set(metronTest)//;chart.series[0].setData([dataSeriesVar]);
		// dataIngraph = {};
 		pollutCursor5.forEach(function(line){ //should only be one - not sure why I can't get it more directly
 			console.time('pollutCursor54each')
 			_.each(line, function (key) {
 				var bottomObj5 = {};
 				if (key.data){
 					if (!bottomObj5[key]){
 						bottomObj5[key] = {};
 					}
 					_.each(key.data, function (subKey,subKeyname) {
 						if (subKey.vals){
 							bottomObj5[key][subKeyname] = subKey.vals;
 							if (key.name=='O3' && subKeyname=='conc'){
 								dataSets5.set(subKey.vals);
 							}
 							if (key.name=='O3' && subKeyname=='Flag'){
 								dataFlags5.set(subKey.vals);
 							}
 						}
 							//dataPacks.set(key.name,bottomObj[key]); //this seems to take 10-100 fold more time!!
 					});
 					}
 				 });
 			 console.timeEnd('pollutCursor54each')
 		 });
		pollutCursor.forEach(function(line){ //should only be one - not sure why I can't get it more directly
			console.time('pollutCursor4each')
			_.each(line, function (key) {
				var bottomObj = {};
				if (key.data){
					 //key.name is the pollutant name
					 //key.data has it's own stuff
					if (!bottomObj[key]){
						bottomObj[key] = {};
					}
					_.each(key.data, function (subKey,subKeyname) {
						if (subKey.vals){
							bottomObj[key][subKeyname] = subKey.vals;
							// console.log('subKey',subKey)//  subKey is and object
							// console.log('subKeyname',subKeyname)// i.e., Temp, Flag, Direction
							if (key.name=='O3' && subKeyname=='conc'){
								dataSets.set(subKey.vals);
							}
							if (key.name=='O3' && subKeyname=='Flag'){
								dataFlags.set(subKey.vals);
							}
						}
							//dataPacks.set(key.name,bottomObj[key]); //this seems to take 10-100 fold more time!!
					});
					}
				 });
			 console.timeEnd('pollutCursor4each')
		 });
 
		 //console.log('dfasd',dataPacks.get('O3'))
		var $report= $('#report');
		dataChart = $('#container-chart-reactive').highcharts('StockChart', {
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
		    chart:{
				events: {
					//click: function(){dataSeriesVar.set(dataSeries('O3'))},
					selection: function(event) {
						for (var i = 0; i < this.series[1].data.length; i++) {
							var point = this.series[1].data[i];
							if (point.x > event.xAxis[0].min &&
								point.x < event.xAxis[0].max &&
								point.y > event.yAxis[0].min &&
								point.y < event.yAxis[0].max) {
									console.log(point)
									point.select(true, true);
								}
	
						}
						return false;
					}
				},
				zoomType: 'xy' 
		    },
		    title: {
		        text: 'Ozone Readings at ' + site.get()
		    },
		    credits: {
		        text: "UH-HNET",
		        href: "http://hnet.uh.edu"
		
		    },
		    xAxis: {
		        type: 'datetime'
		    },
		    yAxis: {
		        title: {
		            text: 'Ozone Concentration'
		        }
		    },
			//name, interval, etc., should come from the subscription
			series: [{
				name: '5 minute',
				pointStart: time2find.get()*1000,//Date.UTC(2004, 3, 1), // first of April
			    pointInterval: 300000, // need to make dynamic
				data: dataSets5.get()
			 	//data: dataSets.get('data')
			},
			{
	    		name: '30 seconds',
				pointStart: time2find.get()*1000,//Date.UTC(2004, 3, 1), // first of April
	            pointInterval: 30000, // need to make dynamic
				data: dataSets.get()
			},
			{
			    name: 'Flags5',
				pointStart: time2find.get()*1000,//Date.UTC(2004, 3, 1), // first of April
				pointInterval: 300000, //for Flags, now - 300 * 1000, // five minute data
				data: dataFlags5.get()
			},
			{
			    name: 'Flags',
				pointStart: time2find.get()*1000,//Date.UTC(2004, 3, 1), // first of April
				pointInterval: 30000, //for Flags, now - 300 * 1000, // five minute data
				data: dataFlags.get()
					}],
		    plotOptions: {
		        series: {
		            allowPointSelect: true,
		            point: {
		                events: {
		                    select: function() {
		                        var selectedPointsStr = "";
		                        // when is the chart object updated? after this function finshes?
		                        var chart = this.series.chart;
		                        selectedPoints = chart.getSelectedPoints();
								console.log(selectedPoints)
		                        selectedPoints.push(this);
		                        $.each(selectedPoints, function(i, value) {
		                			selectedPointsStr += "<br>"+value.category;
				                    });
		                        $report.html(selectedPointsStr);
		                    }
		                }
		            }
		        }
		    },
			rangeSelector : {
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
	}); //end autorun
}); //end of onRendered

Template.currentsites.helpers({
	//switch map to sites twice to show??
	selectKeys: function(){
		//console.log(selectData.get())
		return selectData.get()
	},
	selectPacks: function(){
		return dataPacks.get('O3')//thePack//.keys
	}
	
});
Template.currentsites.events({
    "change #timeselect": function(){
        dataSeriesVar.set(dataSeries('O3_conc'));
                        },
    "click #packselect": function(){
                        },
	"change #packselect": function(event){
		dataSeriesVar.set('O3_'+event.currentTarget.value) //should be the metron_metric combo
		 //Template.instance().ctrlMenus.set('collectName', event.currentTarget.value); if works in onCreated
	},
	"change #keyselect": function(event){
		dataSeriesVar.set(dataSeries(event.currentTarget.value))
		//dataSeriesVar.set(dataSeries(event.currentTarget.value)) //should be the metron_metric combo
		 //Template.instance().ctrlMenus.set('collectName', event.currentTarget.value); if works in onCreated
	},
  "click #button2": function(e){
    var points = selectedPoints;
			
			if (!points.length) alert ('No points selected. Click a point to select it. Control click to select multiple points');
			
			jQuery.each(points, function(i, point) {
				point.remove();
				LiveData.remove(point.id);
				console.log('removed!');
				
			});
			
  },
  "click #button": function(e){
    var points = selectedPoints;
			
			if (!points.length) alert ('No points selected. Click a point to select it. Control click to select multiple points');
			var result = prompt("Enter the updated value for your selection:")
      var num1 = parseFloat(result);
      jQuery.each(points, function(i, point) {
          point.update(num1);
				  LiveData.update({_id: point.id}, {$set: {O3_conc : num1.toString()}});
				  console.log('updated!');
            
       });
			
			
  },
  "click #export": function(e){
        var chart = $('#container-chart-reactive').highcharts();
        chart.exportChart({
            type: 'application/pdf',
            filename: 'my-pdf'
        });
    }

});
