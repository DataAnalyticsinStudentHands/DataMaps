Router.configure({
    layoutTemplate: 'Frame',
	loadingTemplate: 'loading',
    notFoundTemplate: 'pageNotFound',
	yieldTemplates: {
		nav: {to: 'nav'}
	    }
});
//Router.route('/:pos?',{ //should be an object with lat/lng
Router.route('/',{
	name: 'mainMap',
	template:'mainMap',
    data: function () {
		mapCollectionDistance = new ReactiveVar();
		mapCollectionDistance.set(1200);
        mapCollectionNumberVis = new ReactiveVar();
		mapCollectionNumberVis.set(10);
        Meteor.subscribe("monitors",'herenow');
    },
	action: function () {
		this.render();
	}
});
Router.route('/currentsites/:siteId?', {
//Router.route('/currentsites/', {
	name:'currentsites',
	template:'currentsites',
    data: function(){ 


    },
	action: function () {
		if (this.ready()) {
 	      this.render();
        }else{
          this.render('loading')};
	}
});
Router.route('/history/',{
     name: 'history',
     template: 'history',
 	 action: function () {
 	    this.render();
 	}
});
Router.route('/admin/',{
     name: 'admin',
     template: 'admin',
 	 action: function () {
 	    this.render();
 	}
});
Router.route('/testing/',{
     name: 'testing',
     template: 'passData',
 	 action: function () {
 	    this.render();
 	}
});
Router.plugin('ensureSignedIn', {
  only: ['currentsites','history','admin']
});
//AccountsTemplates.configureRoute('changePwd');
AccountsTemplates.configureRoute('enrollAccount');
//AccountsTemplates.configureRoute('forgotPwd');
AccountsTemplates.configureRoute('resetPwd');
AccountsTemplates.configureRoute('signIn');
AccountsTemplates.configureRoute('signUp');
AccountsTemplates.configureRoute('verifyEmail');


