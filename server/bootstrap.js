Meteor.startup(function() {
        
    if (Sites.find().count() === 0) {
    var sites = [
      {
          'siteRef': 'UHCLH_DAQData',
          'siteName': 'Clear Lake High School',
          'location': [-95.10570, 29.5823],
          'url': '/clearlake'
      },
      {
          'siteRef': 'UHCCH_DAQData',
          'siteName': 'Clear Creek High School',
          'location': [-95.0712, 29.5255],
          'url': '/clearcreek'
      },
      {
          'siteRef': 'UHCBH_DAQData',
          'siteName': 'Clear Brook High School',
          'location': [-95.1867, 29.5480],
          'url': '/clearbrook'
      }
    ];
       _.each(sites, function(site) {
        Sites.insert(site);
    }); 

       Sites._ensureIndex({'location': '2dsphere'});

  };

}
});