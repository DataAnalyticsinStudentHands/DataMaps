# DataMaps

This is an old development repository. We are currently working on a new version.

The currently active branches are reserach_sensorreceive and research_client.

## Prerequisites

* Datamaps running with a local [MongoDB](https://docs.mongodb.org/manual/installation/)

On Mac OS install via [homebrew](http://brew.sh/):

`brew install mongodb`

* [meteor](https://www.meteor.com/install)

On Mac OS or Linux:

`curl https://install.meteor.com/ | sh`

* Data Folder with correct permissions: A certain data folder structure is expected. `/hnet/incoming/current` + `/hnet/outgoing` should exist. Also, folders for incoming data from each site need to exists when sites have been created.

* For pushing data out, the server is using [lftp](https://lftp.yar.ru/) which must be installed.

Note: The bootstraping data that is in the repository doesn't work correctly if the data folder have not been setup correctly.

## Getting started

Run the following:
* `meteor npm install`

## Testing in local development environment

`MONGO_URL=mongodb://localhost:27017/DataMaps meteor`

For debugging with node inspector run `MONGO_URL=mongodb://localhost:27017/DataMaps meteor debug` and open the app in Chrome with the port listed once the app has started.

## Deployment with PM2

* change into the working directory and run `meteor build .` - this will generate a *.tar .gz file
* move the file to the install location nd extract it (you will end up with a `bundle` directory
* `cd bundle/programs/server/` and `npm install`
* generate a configuration file for PM2 (see example [gist](https://gist.github.com/fcbee3b520b4fdf97552.git)) outside of bundle
* run `pm2 start [your_pm2_conf_file] --node-args="--max_old_space_size=8192"`
