// reflect.js
// This captures the user input to reflect a set of nodes on another map.

import auth from '/imports/common/auth.js';
import DialogHex from '/imports/common/DialogHex.js';
import LayerNameList from '/imports/mapPage/shortlist/LayerNameList.js';
import { pollJobStatus } from '/imports/mapPage/calc/pollJobStatus';
import React from 'react';
import tool from '/imports/mapPage/head/tool.js';
import userMsg from '/imports/common/userMsg';
import util from '/imports/common/util.js';
import { checkFetchStatus, parseFetchedJson } from '/imports/common/utils.js';

import './reflect.html';

//'use strict';

var title = 'Reflect on Another Map',
    dialogHex,
    $link,
    $button,
    $dialog,
    toMapId,
    toMapIds,
    dataType,
    dataTypes,
    selectionList,
    selectionSelected = ''; // option selected from the selection list

Template.reflectT.helpers({
    tStats: function () {
        return !Session.get('reflectRanked');
    },
    ranked: function () {
        return Session.get('reflectRanked');
    },
});

function hide() {
    // Free some things, then hide the dialog
    selectionSelected = selectionList.selected;
    selectionList.destroy();
    selectionList = undefined;
    dialogHex.hide();
}

function show () {

    // Show the contents of the dialog, once per trigger button click

    // Create the target map selector

    // Put the data in the format the selector wants
    var mapIdData = [];
    toMapIds.forEach(function(mapId){
        mapIdData.push({id: mapId, text: mapId});
    });

    var $mapAnchor = $('#reflectDialog .mapIdAnchor');
    util.createOurSelect2($mapAnchor, {data: mapIdData}, toMapId);

    $mapAnchor.show();

    // Define the event handler for selecting in the list
    $mapAnchor.on('change', function (ev) {
        toMapId = ev.target.value;
    });

    // Create the layer name selector.
    selectionList = LayerNameList.create(
        $('#reflectDialog .layerNameListAnchor'),
        $('#reflectDialog .selectionListLabel'),
        selectionSelected);

    // Only include binary data types, which also includes node selections.
    selectionList.enable(true, {binary: true});

    // Create the data type selector

    // Put the data in the format the selector wants
    var dataTypeData = [];
    dataTypes.forEach(function(type){
        dataTypeData.push({id: type, text: type});
    });

    var $dataTypeAnchor = $('#reflectDialog .dataTypeAnchor');
    util.createOurSelect2($dataTypeAnchor, {data: dataTypeData}, dataType);

    $dataTypeAnchor.show();

    $link = $("<a target='_blank' class='ui-button-text'> Reflect </a>");
    var $button = $(".ui-dialog button");
    var $span = $("button").find("span");
    $span.detach();
    $button.append($link);

    // Define the event handler for selecting in the list
    $dataTypeAnchor.on('change', function (ev) {
        dataType = ev.target.value;
        //console.log('data type selected:', dataType);
    });
    
    // Event handler for the Tstats vs. ranked.
    $('#reflectDialog .ranked').on('change', function (ev) {
    
        //console.log('ranked ev.target.checked', ev.target.checked);
        
        Session.set('reflectRanked', ev.target.checked);
    });
    $('#reflectDialog .tStats').on('change', function (ev) {
    
        //console.log('tStats ev.target.checked', ev.target.checked);
        
        Session.set('reflectRanked', !ev.target.checked);
    });
}

function criteriaCheck () {

    // Bail with a message if the required data needed is not present.
    if (!(Session.get('reflectCriteria'))) {
        dialogHex.hide();
        userMsg.error('Sorry, the required data to ' +
            'reflect is not available for this map.');
        return false;
    }
    return true;
}

function preShow () {

    // First check for this user having the credentials to do this.
    var good = auth.credentialCheck('to reflect onto another map');
    if (good) {
        // Then check for the map having the proper criteria to do this.
        // Does this map have the pre-computed data needed to do this?
        good = criteriaCheck();
    }
    return good;
}

function executeReflection () {
    // Uses outer scope variables:
    //  selectionList.selected
    //  layers[selectionList.selected].data
    //  Session.get('reflectRanked');

    // Gather the user input and call the map manager.
    selectionSelected = selectionList.selected;
    
    // Bail if no selection is selected
    if (_.isUndefined(selectionSelected)) { return; }

    // Build the nodeId list to send over.
    var nodeIds = [];
    _.each(layers[selectionList.selected].data,
        function (val, key) {
            if (val === 1)  { nodeIds.push(key); }
        }
    );

    const userId = Meteor.user().username,
        rankCategories = Session.get('reflectRanked');

    let reflectionParms = {
        dataType : dataType,
        layout: dataType,
        userId : userId,
        map : ctx.project,
        toMap : toMapId,
        nodeIds : nodeIds,
        rankCategories: rankCategories,
        dynamicAttrName : selectionSelected,
        email: Meteor.user().username,
    };

    const reflectionPost  = {
        method: "POST",
        headers: new Headers({"Content-Type": "application/json"}),
        body: JSON.stringify(reflectionParms)
    };

    const url = HUB_URL + "/reflect";

    // Get the job status url and then kick off the polling.
    // When "Success" comes back from the response in the json.status
    // open up a prompt with a link to the reflected map.
    userMsg.jobSubmitted([
        'Reflection request submitted.',
        'Results will return when complete.',
    ]);


    fetch(url, reflectionPost)
        .then(parseFetchedJson)
        .then((jresp)=> pollJobStatus(jresp.jobStatusUrl, openRoutePrompt));

    const openRoutePrompt = (jresp) => {
        // Open a prompt with a link to view the completed reflection.
        const result = jresp.result;
        let msg = ` The reflection is at`

        // Notify the user if data is any data was missing from request.
        const notAllDataThere = (result.nNodes < nodeIds.length );
        if (notAllDataThere) {
        //         11000 from the 11000 nodes
            msg = `${result.nNodes} from the ${nodeIds.length}
                     nodes were available to calculate
                     the reflection at`
        }
        userMsg.jobSuccess(result, msg, { linkText: toMapId });
    };

    hide();
}

function getReflectionInfo() {
    // grab array for possible maps to reflect to
    const url = metaDataUrl();
    
    const fillMenu = (data) => {
        toMapIds = data.toMapIds;
        dataTypes = data.dataTypes;
        toMapId = toMapIds[0];
        dataType = dataTypes[0];
    };

    const setReady = () => {
        Session.set('reflectCriteria', true);
    };

    const setUnavailable = (error) => {
        if (error.message !== '204') {
            console.error(error.message);
        }
        Session.set('reflectCriteria', false)
    };
    
    fetch(url)
        .then(checkFetchStatus)
        .then(parseFetchedJson)
        .then(fillMenu)
        .then(setReady)
        .catch(setUnavailable);
}

function metaDataUrl(){
    const mapId = ctx.project;
    const url  = HUB_URL + "/reflect/metaData/mapId/" + mapId;
    return url
}

exports.init = function () {

    $button = $('.reflectTrigger');
    $dialog = $('#reflectDialog');

    Session.set('reflectRanked', false);

    // Define the dialog options & create an instance of DialogHex
    var opts = {
        title: title,
        buttons: [{ text: 'Reflect', click: executeReflection }],
    };
    dialogHex = DialogHex.create({
        $el: $dialog,
        opts: opts,
        preShowFx: preShow,
        showFx: show,
        hideFx: hide,
        helpAnchor: '/help/reflect.html',
    });

    // Listen for the menu clicked
    tool.add("reflectTrigger", function(ev) {
        if (!$('#reflectDialog .reflectTrigger').hasClass('disabled')) {
            dialogHex.show();
        }
    }, 'Reflect nodes onto another map');

    getReflectionInfo();
}
