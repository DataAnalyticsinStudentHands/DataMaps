/*Meteor.publish('data2014', function(siteID, epoch, numOfRec) {
    //Meteor._sleepForMs(5000);
    var start = epoch - numOfRec*60*5;
    return Data2014.find({$and: 
                         [
                            {siteID: siteID},                          
                            {epoch: {$gt: start}},
                            {epoch: {$lt: epoch}}
                         ]
                         });
});*/

Meteor.publish('sitesdata', function(latLng) {
    return Sites.find({'location': {
      $near:  {
        $geometry: {
          type: 'Point',
          coordinates: [latLng.lng, latLng.lat]
        }, 
        $maxDistance: 50000000
      }
    }
  });
});

Meteor.publish('userData', function () {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId},
                             {fields: {'other': 1, 'things': 1}});
  } else {
    this.ready();
  }
});

Meteor.publish('favorites', function () {
    return Favorites.find({ owner: this.userId});
});