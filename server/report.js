// import packages
import fs from 'fs';

let lastPeriodicReportTime = 0;

function sendEmail(reportType, reportString) {
  const transporter = Nodemailer.createTransport();
  const mailOptions = {
    from: 'Hnet Watcher <admin@hnet>',
    to: 'plindner@uh.edu',
    subject: reportType,
    text: reportString,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      logger.info('Can not send email. Error: ', error);
    } else {
      logger.info('Message sent: ', info);
    }
  });
}

Meteor.setInterval(() => {
  const watchedPath = '/hnet/incoming/current/';
  let emergencyReportString = '';
  let periodicReportString = '';
  let timeDiff;
  fs.readdir(watchedPath, function (err, folders) {
    folders.forEach(function (afolder) {
      // logger.info('Folder being watched: ', afolder);
      fs.stat(watchedPath + afolder, function (err, stats) {
        if (err) {
          throw err;
        }

        const currentSiteMoment = moment(Date.parse(stats.mtime)); // from milliseconds into moments
        timeDiff = moment() - currentSiteMoment;
        if (timeDiff > 15 * 60 * 1000) {
          emergencyReportString = emergencyReportString + 'Folder: ' + afolder + ' has no update since ' + moment(currentSiteMoment).format('YYYY/MM/DD, HH:mm:ss') + '\n';
          periodicReportString = '${periodicReportString} ${Folder} ${afolder} has no update since ' + moment(currentSiteMoment).format('YYYY/MM/DD, HH:mm:ss') + '\n';
        } else {
          periodicReportString = '${periodicReportString} ${Folder} ${afolder}:  OK\n';
        }
      });
    });
  });

  if (emergencyReportString !== '') {
    logger.info(emergencyReportString);
    sendEmail('Emergency Report', emergencyReportString);
  }
  if (moment() - lastPeriodicReportTime >= 30 * 60 * 1000) {
    logger.info(periodicReportString);
    // sendEmail('Site\'s periodic report', periodicReportString);
    lastPeriodicReportTime = moment();
  }
}, 5 * 60 * 1000); // run every 5 min, to report a site is down immidiately
