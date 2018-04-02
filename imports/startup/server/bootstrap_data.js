import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // Insert roles
  if (Meteor.roles.find().count() === 0) {
    JSON.parse(Assets.getText('roles.json')).forEach((doc) => {
      Meteor.roles.insert(doc);
    });
  }

  // Insert users
  if (Meteor.users.find().count() === 0) {
    JSON.parse(Assets.getText('users.json')).forEach((doc) => {
      Meteor.users.insert(doc);
    });
  }
});
