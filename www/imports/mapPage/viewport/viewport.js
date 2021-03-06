// viewport.js
// Run the hexagram visualizer client.

import '/imports/lib/color';
import colorMix from '/imports/mapPage/color/colorMix';
import coords from '/imports/mapPage/viewport/coords';
import hexagons from '/imports/mapPage/viewport/hexagons';
import nodes from '/imports/mapPage/viewport/nodes'
import rx from '/imports/common/rx';
import tool from '/imports/mapPage/head/tool';

exports.create = function  () {

    // Set the map options.
    var mapOptions = {
        center: ctx.center,
        backgroundColor: rx.get('background'),
        zoom: rx.get('zoom'),
        mapTypeId: "blank",
        // Don't show a map type picker.
        mapTypeControlOptions: {
            mapTypeIds: []
        },
        minZoom: 2,
        /*
        use a data layer to draw polygons. faster per
        https://stackoverflow.com/questions/37109726/google-maps-polygons-slowing-down-the-browser
        map.data.add({
            geometry: new google.maps.Data.Polygon([coords])})
         */

        // Or a street view man that lets you walk around various Earth places.
        streetViewControl: false
    };

    // Create the actual map.
    GoogleMaps.create({
        name: 'googlemap',
        options: mapOptions,
        element: document.getElementById("visualization"),
    });
    googlemap = GoogleMaps.maps.googlemap.instance;
        
    // Attach the blank map type to the map
    googlemap.mapTypes.set("blank", new coords.BlankMap());

    // Set the proper transparency of nodes.
    if (rx.get('mapView') === 'xyCoords') {
        rx.set('transparent.on')
    }

    google.maps.event.addListener(googlemap, "center_changed", function() {
        ctx.center = googlemap.getCenter();
    });
    
    // We also have an event listener that checks when the zoom level changes,
    // and turns off hex borders if we zoom out far enough, and turns them on
    // again if we come back.
    google.maps.event.addListener(googlemap, "zoom_changed", function() {
        // Get the current zoom level (low is out)
        rx.set('zoom.set', {value: googlemap.getZoom()})
        nodes.zoomChanged();
    });
    
    // Listen to mouse events on this map
    tool.subscribe_listeners(googlemap);
};

exports.init = function () {

    // Initialize the google map and create the hexagon assignments
    exports.create();
    nodes.create();
    colorMix.refreshColors();
};
