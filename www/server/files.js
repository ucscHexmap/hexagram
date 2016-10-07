// files.js

// Contains the Meteor methods for accessing flat files on the server.

var exec = Npm.require('child_process').exec;
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');
var fs = Npm.require('fs');
var os = Npm.require('os');
var crypto = Npm.require('crypto');
var path = Npm.require('path');

writeToTempFile = function (data, fileExtension) {

    // Write arbitrary data to a file, blocking until the write is complete
    var filename = os.tmpdir() + '/' + crypto.randomBytes(4).readUInt32LE(0);
    if (!_.isUndefined(fileExtension)) {
        filename += fileExtension;
    }
    fs.writeFileSync(filename, data);
    return filename;
}

function parseTsv (data) {

    // separate the data in to an array of rows
    var data1 = data.split('\n'),

    // Separate each row into an array of values
    parsed = _.map(data1, function(row) {
        return row.split('\t');
    });
    
    // Remove any empty row left from the new-line split
    if (parsed[parsed.length-1].length === 1
            && parsed[parsed.length-1][0] === '') {
        parsed.pop();
    }
    return parsed;
}

readFromTsvFileSync = function (filename) {

    // Parse the data after reading the file
    return parseTsv(fs.readFileSync(filename, 'utf8'));
}

readFromJsonFileSync = function (filename) {
    
    // Parse the data after reading the file
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

readFromJsonBaseFile = function (baseFilename) {

    return readFromJsonFileSync(VIEW_DIR + baseFilename);
}

getTsvFile = function (filename, project, unparsed, future) {

    // This reads an entire tsv file into memory, then parses the TSVs into
    // and array of arrays with the outside array being the lines.
    var path;
    
    if (filename.indexOf('layer_') > -1 || filename.indexOf('stats') > -1) {
        path = VIEW_DIR + filename;
    } else {
        path = VIEW_DIR + project + filename;
    }

    if (fs.existsSync(path)) {
        fs.readFile(path, 'utf8', function (error, results) {
            if (error) {
                future.throw(error);
            }
            if (unparsed) {
                future.return(results);
            } else {
                future.return(parseTsv(results));
            }
        });
    } else if (filename === 'layouts.tab') {
    
        // Special handling for this file because we have a better name
        // and have added the raw layout data filenames
        getTsvFile('matrixnames.tab', project, unparsed, future);
    } else {
        future.return('Error: file not found on server: ' + path);
    }
    return future.wait();
}

Meteor.methods({

    write_tsv_file_to_server: function (dir, file_name, data, start) {

        // Upload a tsv file to the server in chunks and synchronously
        var buf = Buffer(data);
        var mode = (start === 0) ? 'w' : 'a';

        if (mode === 'w') {
        
            // Create the directory if need be
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
        }

        var fd = fs.openSync(dir + file_name, mode);
        fs.writeSync(fd, buf, 0, buf.length, start);
        fs.closeSync(fd);
    },

    getTsvFile: function (filename, project, unparsed) {

        // Retrieve data from a tab-separated file
        this.unblock();
        var future = new Future();
        
        return getTsvFile(filename, project, unparsed, future);
    },

});