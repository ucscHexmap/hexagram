/*
 * Initialize the map page.
 */

import { Meteor } from 'meteor/meteor';
import colorEdit from '/imports/mapPage/color/colorEdit';
import coords from '/imports/mapPage/viewport/coords';
import createMap from '/imports/mapPage/calc/createMap';
import data from '/imports/mapPage/data/data';
import download from '/imports/mapPage/data/download';
import { checkFetchStatus, parseFetchedJson, fetchError }
    from '/imports/common/utils';
import gChart from '/imports/mapPage/shortlist/gChart';
import nodes from '/imports/mapPage/viewport/nodes';
import viewport from '/imports/mapPage/viewport/viewport';
import Layer from '/imports/mapPage/longlist/Layer';
import layout from '/imports/mapPage/head/layout';
import legend from '/imports/mapPage/color/legend';
import navBar from '/imports/common/navBar';
import perform from '/imports/common/perform';
import reflect from '/imports/mapPage/calc/reflect';
import rx from '/imports/common/rx';
import shortlistInit from '/imports/mapPage/shortlist/shortlistInit';
import select from '/imports/mapPage/shortlist/select';
import setOper from '/imports/mapPage/shortlist/setOper';
import snake from '/imports/mapPage/init/snake.js';
import sort from '/imports/mapPage/longlist/sort';
import sortUi from '/imports/mapPage/longlist/sortUi';
import tool from '/imports/mapPage/head/tool';
import util from '/imports/common/util';
import utils from '/imports/common/utils';

import '/imports/mapPage/init/mapPage.html';
import '/imports/mapPage/init/mapPage.css';
import '/imports/mapPage/head/header.css';

// Global
reverseCategorySortToMatchLayoutPyAndLegend = true

var shortlistSaved;

// State unsubscribe functions.
var unsubFx = {};

Template.headerT.helpers({
    sort: function () {
        return Session.get('sort');
    },
    nodeCount: function () {
        return Session.get('nodeCount');
    },
});
Template.mapPage.rendered = function () {
    rx.set('inited.dom');
    navBar.init();
};

// Phase 6c init: when the active layers have been added to the shortlist
//                and layout selector has been populated,
//                and the map has rendered
//                and the layer summary loaded
//                complete initialization.
function areLayoutsPopulated () {
    var R = rx.getState();
    /*
    console.log('\nareLayoutsPopulated()')
    console.log('inited.attrTypes', R['inited.attrTypes'])
    console.log('init.layoutNames', R['init.layoutNames'])
    console.log('init.map', R['init.map'])
    console.log('inited.attrSummary', R['inited.attrSummary'])
    */
    if (R['inited.attrTypes'] &&
        R['init.layoutNames'] === 'populated' &&
        R['init.map'] === 'rendered' &&
        R['inited.attrSummary']) {
        
        unsubFx.areLayoutsPopulated();
        //perform.log('6c-init:complete initialization');

        // Initial those that need data retrieved.
        layout.initList();

        // Timeout to allow the map to render.
        setTimeout(function () {
            rx.set('shortlist.initAll', { attrs: shortlistSaved });
            shortlistInit.complete_initialization();
            //perform.log(' 6c-init:after-timeout');
            sortUi.init();

            import lazyLoader from '/imports/mapPage/init/lazyLoader';
            lazyLoader.init();
            legend.init();
            reflect.init();
            tool.initLabel();
            download.init();
            colorEdit.init();
            
            import infoWindow from '/imports/mapPage/viewport/infoWindow';
            infoWindow.init();
            setOper.init();
            createMap.init();
            select.init();
            gChart.init();
            //perform.log('google-analytics-loading');
            util.googleCheck();
            rx.set('initialized');
        });
    }
}

// Phase 6a init: when the layout names have been received,
//                populate the layout selector.
function areLayoutNamesReceived () {
    if (rx.get('init.layoutNames') === 'received') {

        unsubFx.areLayoutNamesReceived();
        //perform.log('6a-init:layout-names-received');

        layout.initList();
        rx.set('init.layoutNames.populated');
    }
}

// Phase 5 init: when the map has been rendered,
//               request the secondary data.
function isMapRendered () {
    if (rx.get('init.map') === 'rendered') {
    
        unsubFx.isMapRendered();
        //perform.log('5-init:request-secondary-data');
        
        // Timeout to allow the map to render.
        setTimeout(function () {
            //perform.log(' 5-init:after-timeout');

            // Populate the longlist.
            import longlist from '/imports/mapPage/longlist/longlist';
            longlist.init();
            
            // Populate the shortlist with only the active layers by faking
            // the shortlist state var.
            shortlistSaved = rx.get('shortlist');
            rx.set('shortlist.initActives', { attrs: rx.get('activeAttrs') });
            shortlistInit.init();
        });
    }
}

function loadGoogleMapApi () {
    
    // Request google map api
    Tracker.autorun(function (autorun) {
        if (GoogleMaps.loaded()) {
            autorun.stop();
            rx.set('inited.googleMapApi');
        }
    });

    // Pause to let other processing complete, like the snake display.
    setTimeout(function () {
        GoogleMaps.load(
            { v: '3', key: 'AIzaSyBb8AJUB4x-xxdUCnjzb-Xbcg0-T1mPw3I' });
    });
}

// Phase 4 init: when the map prep is complete and user is authorized,
//               render the map.
function isMapPreppedAndUserAuthorized () {
    var R = rx.getState();
    /*
    console.log('\nisMapPreppedAndUserAuthorized()')
    console.log("R['init.map']:", R['init.map'])
    console.log("R['user.mapAuthorized']:", R['user.mapAuthorized'])
    */
    if (R['init.map'] === 'prepared' &&
        R['user.mapAuthorized'] !== 'not')  {
        
        unsubFx.isMapPreppedAndUserAuthorized();
        //perform.log('4-init:render-map');
        
        // Request secondary data.
        data.requestLayoutNames(
            { rxAction: 'init.layoutNames.received' });
        data.requestAttributeTags();
        data.requestMapMeta();
        
        // This timeout prevents isMapRendered() from executing twice,
        // for some timing reason.
        setTimeout(function () {
            viewport.init();
            rx.set('init.map.rendered');
            setTimeout(function () {
                rx.set('snake.map.hide');
            });
        });
    }
}

// Phase 3 init: when layout assignments have been received,
//               colormap has been received,
//               active attributes loaded,
//               google map api loaded,
//               and DOM loaded,
//               prepare to draw the map.
function isReadyToRenderMap () {
    var R = rx.getState();
    /*
    console.log('\nisReadyToRenderMap()')
    console.log("R['inited.layout']:", R['inited.layout'])
    console.log("R['inited.colormap']:", R['inited.colormap'])
    console.log("R['inited.coloringAttrs']:", R['inited.coloringAttrs'])
    console.log("R['inited.googleMapApi']:", R['inited.googleMapApi'])
    console.log("R['inited.dom']:", R['inited.dom'])
    */
    if (R['inited.layout'] &&
        R['inited.colormap'] &&
        R['inited.coloringAttrs'] &&
        R['inited.googleMapApi'] &&
        R['inited.dom']) {
        
        unsubFx.isReadyToRenderMap();
        //perform.log('3-init:prep-map');

        // Pause to let other processing complete.
        setTimeout(function () {
            //perform.log(' 3-init:after-timeout');
            coords.init();
            nodes.init();

            // Prepare to draw the map.
            utils.resizeMap();
            $(window).resize(utils.resizeMap);
            $('#shortlist_holder').css('top', $('#navBar').height());
            ctx.center = coords.centerToLatLng(ctx.center);
            rx.set('init.map.prepared');
        });
    }
}

// Phase 2b init: when the layer summary is received,
//                do the initial sort by density,
//                find an initial coloring layer if we haven't already.
function haveLayerSummary () {
    var R = rx.getState();
    /*
    console.log('\nhaveLayerSummary()')
    console.log('inited.attrSummary', R['inited.attrSummary'])
    console.log('inited.attrTypes', R['inited.attrTypes'])
    */
    if (R['inited.attrSummary'] &&
        R['inited.attrTypes']) {
    
        unsubFx.haveLayerSummary();
        //perform.log('2b-init:find-first-layer-by-density');

        // Pause to let other processing complete.
        setTimeout(function () {
            //perform.log(' 2b-init:after-timeout');

            // Do the initial sort.
            let first = rx.get('firstAttr');
            sort.initialDensitySort();
            
            // If there are any static layers...
            if (Session.get('sortedLayers').length > 0) {
                if (!first) {
                    first = Session.get('sortedLayers')[0];
                    rx.set('firstAttr', { attr: first });
                }
                if (rx.get('activeAttrs').length < 1) {

                    // Load the first layer's data.
                    rx.set('shortlist.initFirst', { attr: first });
                    rx.set('activeAttrs.updateAll', { attrs: [first] });
                }

            } else {
            
                // No layers at all, so say they are loaded to proceed.
                rx.set('inited.coloringAttrs');
            }
        });
    }
}

// Phase 2a init: when data types are received,
//                look for initial color layer.
function haveDataTypes () {
    var R = rx.getState();
    /*
    console.log('\haveDataTypes()')
    console.log('inited.attrTypes', R['inited.attrTypes'])
    */
    if (R['inited.attrTypes']) {

        unsubFx.haveDataTypes();
        //perform.log('2a-init:get-active-attr-values');
        
        let first = rx.get('firstAttr');

        // Pause to let other processing complete.
        setTimeout(function () {

            // Request the 'first' attr as the initial coloring layer
            // if we don't have active layers identified yet.
            if (first && rx.get('activeAttrs').length < 1) {
                rx.set('shortlist.initFirst', { attr: first });
                rx.set('activeAttrs.updateAll', { attrs: [first] });
            }
        });
    }
}

// Phase 1b init: when the DOM has loaded,
//                show the loading snake.
function hasDomLoaded () {
    if (rx.get('inited.dom')) {
        unsubFx.hasDomLoaded();
        //perform.log('1b-init:snakes,dom-loaded');
        
        snake.init();
        if (DEV) {
            document.querySelector('#navBar .devMessage').classList.add('dev');
        }
    }
}

function getFirstAttr () {

    function loadData(first) {
        if (first === null) { return; }
        
        rx.set('firstAttr', { attr: first });
        rx.set('shortlist.initFirst', { attr: first });
        rx.set('activeAttrs.updateAll', { attrs: [first] });
    }
    
    let url = HUB_URL + '/firstAttr/mapId/' + ctx.project;
    fetch(url)
        .then(checkFetchStatus)
        .then(parseFetchedJson)
        .then(loadData)
        .catch(fetchError);
}

// Phase 1a init: State has been received,
//                so request primary.
exports.init = function () {
    //perform.log('1a-init:request-primary-data');

    // Initialize some session vars we don't want carried over
    // from the last session.
    Session.set('mapMeta', {});
    
    // Initialize the data types arrays.
    ctx.bin_layers = [];
    ctx.cat_layers = [];
    ctx.cont_layers = [];
    
    // Request the initial coloring layers if we know them yet.
    Layer.loadInitialLayers();
    let activeAttrs = rx.get('activeAttrs');
    let shortList = rx.get('shortlist');
    if (activeAttrs.length > 0) {
        rx.set('firstAttr', { attr: activeAttrs[0] });
    } else if (shortList.length > 0) {
        rx.set('firstAttr', { attr: shortList[0] });
        rx.set('activeAttrs.updateAll', { attrs: [shortList[0]] });
    } else {
        getFirstAttr();
    }
    
    // Request the primary data.
    data.requestLayerSummary();
    data.requestLayoutAssignments();
    data.requestColormaps({ rxAction: 'inited.colormap' });
    data.requestDataTypes();

    // Subscribe to state changes.
    unsubFx.hasDomLoaded = rx.subscribe(hasDomLoaded);
    unsubFx.haveLayerSummary = rx.subscribe(haveLayerSummary);
    unsubFx.isReadyToRenderMap = rx.subscribe(isReadyToRenderMap);
    unsubFx.haveDataTypes = rx.subscribe(haveDataTypes);
    unsubFx.isMapPreppedAndUserAuthorized =
        rx.subscribe(isMapPreppedAndUserAuthorized);
    unsubFx.isMapRendered = rx.subscribe(isMapRendered);
    unsubFx.areLayoutsPopulated = rx.subscribe(areLayoutsPopulated);
    unsubFx.areLayoutNamesReceived  = rx.subscribe(areLayoutNamesReceived);

    loadGoogleMapApi();
};
