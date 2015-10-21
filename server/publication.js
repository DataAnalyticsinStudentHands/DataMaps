Meteor.publish('liveData', function () {
    var now = new Date();
    var adayAgo = now.getTime() / 1000 - 24 * 3600;

    return LiveData.find({
        'epoch': {
            $gt: adayAgo
        }
    }, {
        sort: {
            'epoch': -1
        }
    });
});

Meteor.publish('tceqData', function () {
    var now = new Date();
    var adayAgo = now.getTime() / 1000 - 24 * 3600;

    return TCEQData.find({
        'epoch': {
            $gt: adayAgo
        }
    }, {
        sort: {
            'epoch': -1
        }
    });
});

Meteor.publish('siteData', function(latLng) {
    return Monitors.find({'location': {
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