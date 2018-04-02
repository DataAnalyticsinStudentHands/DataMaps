import fs from 'fs-extra';
import chokidar from 'chokidar';
import { Meteor } from 'meteor/meteor';
import { logger } from 'meteor/votercircle:winston';
import { moment } from 'meteor/momentjs:moment';
import { LiveSites } from '../api/collections_server';
import { readFile } from '../methods/livefeedFunctions';

Meteor.startup(() => {
  // Create directory for outgoing files for tomorrow
  fs.mkdirs(`/hnet/outgoing/${moment().year()}/${moment().month() + 1}/${moment().date() + 1}`, (err) => {
    if (err) {
      logger.error(err);
    }
  });

  // Setting up directory in which this server expects incoming files (uses an environment variable)
  export const globalsite = LiveSites.findOne({ AQSID: `${process.env.aqsid}` });

  logger.info(`This instance is for AQSID ${process.env.aqsid} - ${globalsite.siteName}`);

  export const liveWatcher = chokidar.watch(`/hnet/incoming/current/${globalsite.incoming}`, {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    usePolling: true,
    persistent: true
  });

  liveWatcher.on('add', (path) => {
    logger.info('File ', path, ' has been added.');
    readFile(path);
  }).on('change', (path) => {
    logger.info('File', path, 'has been changed');
    readFile(path);
  }).on('addDir', (path) => {
    logger.info('Directory', path, 'has been added');
  }).on('error', (error) => {
    logger.error('Error happened', error);
  }).on('ready', () => {
    logger.info(`Ready for changes in /hnet/incoming/current/${globalsite.incoming}`);
  });
});
