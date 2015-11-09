Template.mainMap.onRendered(function (){
    
    //Meteor.setInterval(function(){
    //console.log('collCtrls',collCtrls)},150)
	var latude = 29.721; //29.7604;  //Houston
	var lngtude = -95.3443; //-95.3698;
    var AQmap = L.map('displayMap', {
            doubleClickZoom: false
        });
	var geoloc = function(queryType){
	    var geooptions = {
	      enableHighAccuracy: true,
	      timeout: 80000,
	      maximumAge: 10000
	    };
	    function success(pos) {
	      console.log('your position',pos)
	      latude = pos.coords.latitude;
	      lngtude = pos.coords.longitude
		  AQmap.setView([latude,lngtude],18);
		  var marker = L.marker([latude,lngtude],{title: 'You are here'}).addTo(AQmap);
		  var contentHTML = '<div>This is where you are</div>'
		  marker.bindPopup(contentHTML);
	    }
	    function error(err) {
	        latude = 29.7604;
	        lngtude = -95.3698;
	        console.log(err);
	      console.warn('ERROR(' + err.code + '): ' + err.message);
		  //Meteor.subscribe("CenterPoint",[29.7604/1, -95.3698/1]);
	    }
	    if (navigator.geolocation) {
	      navigator.geolocation.getCurrentPosition(success, error, geooptions);
	    }
		//return [lngtude,latude];
		console.log('inside geoloc')
		console.log(latude,lngtude);
		return [latude,lngtude];
	};
	var herenow = geoloc('hereNow'); //later for passing clicks, etc. - hereNow should allow to get around no navigator etc.
    Meteor.subscribe("monitors",herenow);
    console.log('Monitors:  '+Monitors.find().count());
    var markerMap = Monitors.find().observeChanges({ 
          added: function(id,line){
//cf. AirDayWarn for loading
            var marker = L.marker([line.loc.coordinates[1], line.loc.coordinates[0]],{title: line['Name']}).addTo(AQmap);
              //var content="<div><a> href={{pathFor 'currentsites' siteId='2'}}> pathfor this AQSID</a></div>"
              //content="<div href={{pathFor 'currentsites' siteId='2'}}> pathfor this AQSID'</div>" line.AQSID);
            //marker.bindPopup(content)
            //  //need the event listener to open it
            } //end of added
        
          });
	$('#displayMap').css('height', window.innerHeight-20);
  L.Icon.Default.imagePath = 'packages/bevanhunt_leaflet/images';
  //collDistance = this.get('CenterPointInfo').distance;
//    var AQmap = L.map('displayMap', {
//            doubleClickZoom: false
//        })
    AQmap.setView(herenow,9)  //18 is the closest Leaflet zoom
  .on('dblclick', function(e) {
        Router.go('/currentsites/',{siteId: 'fuck'});
//    console.log("Lat, Lon : " + e.latlng.lat + ", " + e.latlng.lng,mapCollectionDistance.get())
//    Meteor.subscribe("Monitors",[e.latlng.lat,e.latlng.lng],mapCollectionDistance.get());
//	mapCollectionNumberVis.set(Monitors.find().count())
//      AQmap.setView(e.latlng,14);
});
    ; 
        L.tileLayer.provider('OpenStreetMap.DE').addTo(AQmap);
  
});

Template.mainMap.helpers({  //cf. collection helpers dburles
	mapCollectionDistance: function(){
        return Monitors.find().count()
		//return mapCollectionDistance.get()
        //console.log(Template.instance().data.get('CenterPointInfo').distance)
        //return this.get('CenterPointInfo').distance
	},
    templateGestures: {
        'press #test': function (event, templateInstance) {
        console.log(event)
      /* `event` is the Hammer.js event object */
      /* `templateInstance` is the `Blaze.TemplateInstance` */
      /* `this` is the data context of the element in your template, so in this case `someField` from `someArray` in the template */
    },
       'tap #test': function(event, templateInstance) {
           console.log(templateInstance.data.get('Monitors').distance)
       }
     //more gestures here   
    }
});

Template.mainMap.events({
	'click #test' : function(e){
		console.log(e)
        
		//console.log(this.get('Monitors').distance)
        
	}
});