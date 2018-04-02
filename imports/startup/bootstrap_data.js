import { Meteor } from 'meteor/meteor';
import { LiveSites } from '../api/collections_server';

Meteor.startup(() => {
  // Insert sample data if the live site collection is empty
  if (LiveSites.find().count() === 0) {
    JSON.parse(Assets.getText('livesites.json')).forEach((doc) => {
      LiveSites.insert(doc);
    });
  }
});
