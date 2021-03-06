// download.js

import Colormap from '/imports/mapPage/color/Colormap';
import pdf from '/imports/mapPage/viewport/pdf';
import rx from '/imports/common/rx';
import shortlist from '/imports/mapPage/shortlist/shortlist';
import svg from '/imports/mapPage/viewport/svg';
import tool from '/imports/mapPage/head/tool';
import util from '/imports/common/util';

import '/imports/mapPage/viewport/pdf.html';

function initDownloadSelectTool () {

    // And a tool for exporting selections as lists of hexes
    // TODO this doesn't need to be modal, only tools mousing on the screen
    // need to be modal
    tool.add("hexagonNames", function() {
        // Make the export form
        var export_form = $("<form/>").attr("title", "Attribute Download");
        
        // Make a select box for picking from all selections.
        var WIDTH = 275;
        // Add a little more to the width so the select and text box line up.
        var select_box = $("<select/>").width(WIDTH+6);

        // Populate the select box with all entries in the shortlist.
        var activeLayers = shortlist.getAllLayerNames();
        let shortEntryMenuAttr = rx.get('shortEntry.menu.attr')
        activeLayers.map(
            function(layerName) {
                let selected = false
                if (layerName === shortEntryMenuAttr) {
                    selected = true
                }
                select_box
                    .append($("<option/>")
                        .text(layerName).attr({value: layerName, selected: selected}));
            }
        );
        
        export_form.append(select_box);

        // Make the text box.
        var text_area = $("<textarea/>")
            .addClass("export")
            .width(WIDTH)
            .height(WIDTH)
            .prop("readonly", true);
        export_form.append(text_area);

        // Add a download file link. The "download" attribute makes the
        // browser save it, and the href data URI holds the data.
        var download_link = $("<a/>")
            .attr("href", "data:text/plain;base64,")
            .html("<button type='button'>Download</button>")
            .css({
                "position": "relative",
                "left": "67%",
            });
        export_form.append(download_link);

        /* eslint-disable no-unused-vars */
        function selectionStringExtender(textAreaStr, nodeId, value, layerName){
            // Used to fill the text box when the layer is a selection.
            return textAreaStr.concat(nodeId);
        }

        /* eslint-disable no-unused-vars */
        function contStringExtender(textAreaStr, nodeId, value, layerName){
            // Used to fill the text box when the layer is continuous.
            return textAreaStr.concat(nodeId)
                .concat("\t")
                .concat(value);
        }

        function catOrBinStringExtender(textAreaStr, nodeId, value, layerName){
            // Used to fill the text box when the layer is categorical or
            // binary.
            var categoryString = Colormap.getCategoryString(
                layerName,
                value
            );
            return textAreaStr.concat(nodeId)
                .concat("\t")
                .concat(categoryString);
        }

        function textAreaExtender(layerName){
            // Returns a function for extending text
            // depending on the datatype of the layer name.
            var extender;
            if (layers[layerName].dynamic){
                extender = selectionStringExtender;
            } else if (util.is_categorical(layerName) ||
                util.is_binary(layerName)) {
                extender = catOrBinStringExtender;
            } else if (util.is_continuous(layerName) ) {
                extender = contStringExtender;
            } else {
                throw "DataType for downloading not found.";
            }

            return extender;
        }
        function firstLine(layerName){
            // Put a header unless the layerName is a selection.
            return (
                (layers[layerName].dynamic)
                    ? ""
                    : "samples".concat("\t").concat(layerName)
            );

        }
        function updateTextArea(layer_data, layerName, linelimit){
            // Updates the text_area element with downloadable text.
            // Will write no more lines than linelimit.
            var textAreaStr = firstLine(layerName),
                linecount = 0,
                // The function used to extend the text string:
                textExtender = textAreaExtender(layerName);

            // Make the string that will populate the text box.
            for(var nodeId in layer_data) {
                var value = layer_data[nodeId];
                // Skip undefined values.
                if(_.isUndefined(value)) continue;
                // Skip selections whose value is 0.
                if(layers[layerName].dynamic && !value) continue;
                // Break out if we've reached our limit.
                linecount+=1;
                if(!_.isUndefined(linelimit)
                    && linelimit < linecount) break;

                // If there's already text, add a newline.
                if(textAreaStr !== "") textAreaStr += "\n";
                
                // Extend the text string with the nodeId and value.
                textAreaStr = textExtender(
                    textAreaStr,
                    nodeId,
                    value,
                    layerName
                );
            }
            // Update the text area.
            text_area.text(textAreaStr);
        }

        text_area.focus(function() {
            // Select all on focus.
            var NO_LIMIT = undefined,
                layerName = select_box.val();
            // Exit if there is somehow no entry for the layer.
            if (_.isUndefined(layers[layerName])) return;

            var layerData = layers[layerName].data;

            updateTextArea(layerData, layerName, NO_LIMIT);

            // Highlight all the text.
            $(this).select();

            // Fill in the download data URI.
            download_link
                .attr("href", "data:text/plain;base64,"
                    + window.btoa(text_area.text()))
                .attr("download", layerName.concat(".txt"));

        });
        
        text_area.mouseup(function(event) {
            // Don't change selection on mouseup. See
            // http://stackoverflow.com/a/5797700/402891 and
            // http://stackoverflow.com/q/3380458/402891
            event.preventDefault();
        });
        
        select_box.change(function() {
            // Update the text area with a smaller version of the data so
            // initialization is faster.
            var MOST_TO_DISPLAY=200,
                NO_LIMIT = undefined,
                layerName = select_box.val();
            if (_.isUndefined(layers[layerName])) { return; }
            var layerData = layers[layerName].data;

            updateTextArea(layerData, layerName, MOST_TO_DISPLAY);

            // When the download button is clicked all of the data is put
            // into the text area before downloading.
            download_link
                .on("click", function () {
                    updateTextArea(layerData, layerName, NO_LIMIT);
                    // Fill in the download data URI.
                    download_link.attr("href",
                        "data:text/plain;base64,"
                        + window.btoa(text_area.text())
                    )
                        .attr("download", layerName.concat(".txt"));
                });
        });
        // Populate the text area and select box by triggering the change event.
        select_box.change();
        
        export_form.dialog({
            dialogClass: 'dialog',
            modal: true,
            width: '20em',
            close: function() {
                // They didn't want to use this tool.
                tool.activity(false);
            }
        });
    }, "Download the attribute's values", 'mapShow');
}

function getDataUrl (prefix) {
    return HUB_URL + '/dataOk404/view/' + ctx.project
        + prefix + Session.get('layoutIndex') + '.tab';
}

exports.save = function (filename, data) {
    var blob = new Blob([data], {type: 'text/csv'});
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
};

exports.init = function () {
    initDownloadSelectTool();
    svg.init();
    pdf.init();

    // Add the link to the menu for XY coordinate download.
    var link = $('<a href=' + getDataUrl('xyPreSquiggle_') +
            ' title=' +
            '"Download xy positions of nodes before binning to hexagonal ' +
            'grid" download > XY Coordinates </>');
    $('.fileMenu .xyPreSquiggleAnchor').append(link);
    
    // Add the link to the menu for hexagon coordinate download.
    link = $('<a href=' + getDataUrl('assignments') +
        ' title="Download positions of nodes on the hexagonal grid"' +
        ' download > Hexagon Coordinates </>');
    $('.fileMenu .xyAssignmentAnchor').append(link);
};
