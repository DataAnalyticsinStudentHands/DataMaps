Router.configure({
  layoutTemplate: 'layout' // whole template fra
});

Router.route('/', {
  name: 'home',
  template: 'home',
  data: function() {
    mapCollectionDistance = new ReactiveVar();
    mapCollectionDistance.set(1200);
    mapCollectionNumberVis = new ReactiveVar();
    mapCollectionNumberVis.set(10);
  },
  action: function() {
    this.render();
  }
});
Router.route('site', {
  path: '/site/:_id',
  // data: function() {
  //   return LiveSites.findOne({AQSID: this.params._id});
  // },
  template: 'public',
	waitOn: function() {
        return [
               Meteor.subscribe('aggregatedata5min', this.params._id)];
  },
  data: function() {
        return {
        site : LiveSites.findOne({AQSID: this.params._id}),
        currentData: AggrData.findOne({site: this.params._id})}
      },
  action: function() {
    const start = Router.current().params.query.startEpoch;
    if (start) {
      this.state.set('fromRouter', (start));
    } else {
      this.state.set('fromRouter', moment().subtract(4320, 'minutes').unix());
    }
    this.render();
  }
});

Router.route('hnetsite', {
  path: '/hnetsite/:_id',
  data: function() {
    return LiveSites.findOne({AQSID: this.params._id});
  },
  template: 'site',
  action: function() {
    const start = Router.current().params.query.startEpoch;
    if (start) {
      this.state.set('fromRouter', (start));
    } else {
      this.state.set('fromRouter', moment().subtract(4320, 'minutes').unix());
    }
    this.render();
  }
});

Router.route('/composite/', {
  name: 'composite',
  template: 'composite',
  action: function() {
    this.render();
  }
});
Router.route('/listEdits/', {
  name: 'listEdits',
  template: 'listEdits',
  action: function() {
    this.render();
  }
});
Router.route('/listPushes/', {
  name: 'listPushes',
  template: 'listPushes',
  action: function() {
    this.render();
  }
});
Router.route('/datamanagement/', {
  name: 'datamanagement',
  template: 'datamanagement',
  action: function() {
    this.render();
  }
});
Router.route('about', {
  path: '/about/:_id',
  data: function() {
    return LiveSites.findOne({AQSID: this.params._id});
  },
  template: 'about',
  action: function() {
    const start = Router.current().params.query.startEpoch;
    if (start) {
      this.state.set('fromRouter', (start));
    } else {
      this.state.set('fromRouter', moment().subtract(4320, 'minutes').unix());
    }
    this.render();
  }
});

Router.route('fixSites', {
  path: AdminDashboard.path('LiveSites/fixSites'),
  controller: 'AdminController',
  onAfterAction: function() {
    Session.set('admin_title', 'Troubleshooting for Sites');
  }
});

Router.route('versionInfo', {
  path: AdminDashboard.path('versionInfo'),
  controller: 'AdminController',
  onAfterAction: function() {
    Session.set('admin_title', 'Version Information');
  }
});

Router.plugin('ensureSignedIn', {
  only: ['hnetsite', 'composite', 'admin']
});

// AccountsTemplates.configureRoute('changePwd');
AccountsTemplates.configureRoute('enrollAccount');
// AccountsTemplates.configureRoute('forgotPwd');
AccountsTemplates.configureRoute('resetPwd');
AccountsTemplates.configureRoute('signIn');
AccountsTemplates.configureRoute('signUp');
AccountsTemplates.configureRoute('verifyEmail');
