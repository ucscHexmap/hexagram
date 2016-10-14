
// project.js

var fs = Npm.require('fs');
var Future = Npm.require('fibers/future');

var majors;
var namespace = false;
var projects = {};
var dataDir = VIEW_DIR;

function isDataDir (entry, major) {

    // Determine if an entry is a directory
    var isDir = false,
        fsStats,
        path = dataDir + (major ? major + '/' : '') + entry;
    
    // Find the stats on this path
    try {
        fsStats = fs.statSync(path);
        
    } catch (error) {
        console.log('Error on fs.statSync in isDataDir(', entry, ',', major, ',', path, '):', error);
        return false;
    }
    
    try {
        isDir = fsStats.isDirectory();
        
    } catch (error) {
        console.log('Error on fsStats.isDirectory in isDataDir(', entry, ',', major, '):', error);
        return false;
    }
    return isDir;
}

getDataDirs = function (major) {

    //console.log(major)
    var dirs = getAllData(major);

    // Remove any files and hidden dirs
    return _.filter(dirs, function (dir) {
        return (dir.indexOf('.') !== 0) && isDataDir(dir, major);
    });
}

function getAllData (major) {

    // Retrieve data directories
    var results,
        dir = dataDir + ((_.isUndefined(major)) ? '' : major);
    
    try {
        results = fs.readdirSync(dir);
    } catch (error) {
        console.log('Error on getAllData(', major, ',', dir, '):', error);
        console.trace()
        results = undefined;
    }
    return results;
}

function getMinors (majorIndex) {

    // Get one major's minor directory names
    var major = majors[majorIndex];
    var minors  = getDataDirs(major);
    
    // This is a single-level project, so save an empty list of sub-projects
    if (_.isUndefined(minors)) {
        minors = [];
    }

    // Save the major's minors to our projects object
    projects[major] = minors;
    
    if (majorIndex < majors.length - 1) {

        // Go get the next major's minors
        getMinors(majorIndex + 1);
    } else {

        // We've got all the minors, so we're done
        return;
    }
}

getProjectRole = function (major) {

    var meta,
        filename = dataDir + major + '/meta.json';
    
    if (fs.existsSync(filename)) {
        meta = readFromJsonFileSync(filename);
        if (meta && meta.role) {
            return meta.role;
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

function getMajors (server) { //change made by duncan so can call from server

    // Get the major directory names
    projects = {};
    var majors1 = getDataDirs();
    
    // There are no projects at all.
    if (_.isUndefined(majors1)) return;
    
    // Exclude any projects for which this user is not authorized
    majors = [];
    _.each(majors1, function(major) {
        var role = getProjectRole(major);
           
        // Authorize depending on user's role.
        if (server) {
            //console.log('getMagors');
            majors.push(major);
        } else if (is_user_authorized_to_view(role)) {
            majors.push(major);
        }
    });
    
    // Get the minor projects of each major.
    if (majors.length > 0) {
        getMinors(0);
    }
};

getMajorMinor = function () {
    //function to get the directory structure object from anywhere on the server
    // returns
    // {Major0: [minor0,minor1....],
    //  Major1: [minor0,minor1...],
    //  .
    //  .
    //  .
    //  }
    getMajors(true);
    return projects;
};

getNameSpace = function (project) {
    var future = new Future();
    var namespace = getTsvFile('namespace.tab', project,'', false, future);
    //if file wasn't there
    if (typeof (namespace) === 'string') {
        console.log("attempt to get namespace from project",project,"failed," +
            "probable cause file not found");
        return false;
    }
    return  namespace[0][0]; //only one line in namespace displaying namespace
};

Meteor.methods({

    getProjects: function () {
        getMajors();
        return projects;
    },
    getNamespace: function(project){
        return getNameSpace(project)
    },
    
});
