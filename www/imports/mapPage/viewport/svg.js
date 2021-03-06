// svg.js

// A tool to download an svg file of the current viewport

import coords from '/imports/mapPage/viewport/coords.js';
import download from '/imports/mapPage/data/download.js';
import Layer from '/imports/mapPage/longlist/Layer.js';
import legend from '/imports/mapPage/color/legend.js';
import rx from '/imports/common/rx'
import select from '/imports/mapPage/shortlist/select.js';
import shortlist from '/imports/mapPage/shortlist/shortlist.js';

var xyMapSize = 5120 * 2,
    dims = null,
    initiated = false;

function get_xySvgMap (latLng, dims) {

    // Convert world coordinates within the current viewport
    // to xy map coordinates

    // Transform the world coordinates to xy in the range: 1 - 256
    var xy = coords.get_xyWorld(latLng),

        // Offset the xy by the minimum xy of the google polygons,
        // then scale it to our big svg map
        x = (xy.x - dims.xMin) * dims.scale,
        y = (xy.y - dims.yMin) * dims.scale;

    return {x:x, y:y};
}

function googleToSvgPoly (gp, dims) {

    // Transform a google polygon to an svg polygon
    var verts = gp.getPath(),
        points = '',
        i,
        xy;

    // Transform world coord vertices to our svg xy space
    for (i = 0; i < verts.getLength(); i += 1) {
        xy = get_xySvgMap(verts.getAt(i), dims);
        points += ' ' + xy.x + ',' + xy.y;
    }

        // Write the svg for this polygon
    return "<polygon"
        + " points='" + points
        + "' fill='" + gp.fillColor
        + "' fill-opacity='" + gp.fillOpacity
        + "' stroke='" + gp.strokeColor
        + "' stroke-width='" + 1
        + "' stroke-opacity='" + gp.strokeOpacity
        + " ' />\n";
}

function googleToSvg () {

    // Transform google elements to svg format
    var i,
        sPoly,
        hexagonKeys = select.findHexagonsInViewport(),
        dims,
        svg;
        
    dims = coords.findPolygonExtents(hexagonKeys, xyMapSize);

    // Define the svg element,
    // setting its size to that of the visible polygons area
    svg = "<svg version='1.1' xmlns='http://www.w3.org/2000/svg'" +
        " xmlns:xlink='http://www.w3.org/1999/xlink' " +
        " width='" + dims.xSize +
        "' height='" + dims.ySize +
        "' ><defs/><g>\n";

    // Add a background to the svg area
    svg += "'<rect"
        + " x='1' y='1'"
        + " width='100%'"
        + " height='100%'"
        + " fill='" + rx.get('background') + "'"
        + " ></rect>\n";

    // Transform each polygon to xy space
    for (i in hexagonKeys) {
         sPoly = googleToSvgPoly(polygons[hexagonKeys[i]], dims);
         if (sPoly !== null) {
            svg += sPoly;
         }
    }

    return svg + "</g></svg>\n";
}

function click(event) {

    import '/imports/lib/canvas2svg.js';

    // Download the map.
    var svg = googleToSvg();
    download.save('tumormap.svg', svg);
}

function clickLegend(event) {

    import '/imports/lib/canvas2svg.js';

    // Download the legend.
    var context = new C2S(200,2000),
        current_layers = shortlist.get_active_coloring_layers();
    Layer.with_many(current_layers, function(retrieved_layers) {
        legend.redraw(retrieved_layers, current_layers, context);
    });
    var svg = context.getSerializedSvg(); //returns the serialized SVG document
    //svg = context.getSvg(); //inline svg
    download.save('tumormapLegend.svg', svg);

    // Redraw the legend on the screen since the svg doesn't look good there.
    Layer.with_many(current_layers, function(retrieved_layers) {
        legend.redraw(retrieved_layers, current_layers);
    });
}

exports.init = function () {
    if (initiated) return;
    initiated = true;
    $('#svgDownload')
        .on('click', click);
    $('#svgDownloadLegend')
        .on('click', clickLegend);
}
