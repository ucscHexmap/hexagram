// jobs.js
// This creates a job control dialog based on the meteor package:
//      vsivsi:job-collection
// Makes status on jobs visible and allows status changes by user. Jobs are
// created elsewhere.

var app = app || {};

(function (hex) { // jshint ignore: line
Jobs = (function () { // jshint ignore: line

    var title = 'Jobs',
        dialogHex, // instance of the class DialogHex
        $dialog; // our dialog DOM element
        logDisplay = new ReactiveDict(),
        jobQueue = JobCollection('jobQueue'),
        jobSubscription = null;
        
    Template.jobT.helpers({
        jobs: function () {
            return jobQueue.find({});
            // TODO Show newest tasks at the top
            // return Tasks.find({}, { sort: { createdAt: -1 } });
        },
        headerDisplay: function () {
            return Session.get('dialogIsOpen') ? 'table-row' : 'none';
        },
        changeButtonText: function () {
            if (jobQueue.jobStatusRemovable.indexOf(this.status) > -1) {
                return 'Remove';
            } else {
                return 'Cancel';
            }
        },
        logDisplay: function () {
            var display = logDisplay.get(this._id);
            return (!display) ? 'none' : display;;
        },
        log: function () {
            var lines = '';
            _.each(this.log, function (l) {
                lines += '\n' + l.time + ' ' + l.level + ' ' + l.message;
            });
            
            // Trim the leading newline
            if (lines.length > 2) {
                lines = lines.slice(1);
            }
            
            // Give some time for the log message to show up before scrolling
            Meteor.setTimeout(function () {
                var $log = $('#jobDialog .log');
                if ($log && $log[0]) {
                    $log.scrollTop($log[0].scrollHeight);
                }
            }, 0);
            return lines;
        },
    });

    function cancel_clicked () {
        hide();
	}

    function show () {
 
        // Show the contents of the dialog, once per trigger click
        
        // Retrieve all job IDs for this user
        jobSubscription = Meteor.subscribe("allJobs");

        // Handle log button clicks
        $dialog.on('click', '.logButton', function (ev) {
            var job_id = $(ev.target).data().job_id;
            var display = logDisplay.get(job_id);
            if (display && (display === 'inline-block')) {
                display = 'none';
            } else {
                display = 'inline-block';
            }
            logDisplay.set(job_id, display);
        });
        
        // Handle cancel/remove button click
        $dialog.on('click', '.changeButton', function (ev) {
            console.log('changeButton');
            var job_id = $(ev.target).data().job_id;
            var job = jobQueue.findOne({_id: job_id});
            
            console.log('job.status:', job.status);
            console.log('job.remove:', job.remove);
            
            if (jobQueue.jobStatusRemovable.indexOf(job.status) > -1) {
                job.remove();
            } else {
                job.cancel();
            }
        });
        
        // Save the dialog open state
        Session.set('dialogIsOpen', true);
    }

    function hide() {

        // Free any memory we can before destroying the dialog
        jobSubscription.stop();
        dialogHex.hide();
        Session.set('dialogIsOpen', false);
        $dialog.off('click .logButton');
        $dialog.off('click .changeButton');
    }
    
    return { // Public methods
        init: function () {
     
            $dialog = $('#jobDialog');
            var $button = $('#navBar .job');
     
            // Define the dialog options & create an instance of DialogHex
            var opts = {
                title: title,
                buttons: [{ text: 'Cancel', click: cancel_clicked }],
                position: { my: "center top", at: "center-300 top+150",
                    of: window },
                maxHeight: $(window).height() - 150,
                //modal: true,
            };
            dialogHex = createDialogHex(undefined, undefined, $dialog, opts,
                show, hide, 'help/job.html');
        
            // Log to the console any DDP method calls from JobCollection
            jobQueue.logConsole = true;
     
            // Listen for the menu clicked
            Tool.add("jobs", function() {
                dialogHex.show();
            }, 'Job Status');
        },
    };
}());
})(app);