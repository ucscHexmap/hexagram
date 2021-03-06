
// The colormap editor.

import Colormap from '/imports/mapPage/color/Colormap';
import colorMix from '/imports/mapPage/color/colorMix';
import DialogHex from '/imports/common/DialogHex';
import nodes from '/imports/mapPage/viewport/nodes';
import overlayNodes from '/imports/mapPage/calc/overlayNodes';
import rx from '/imports/common/rx';
import shortlist from '/imports/mapPage/shortlist/shortlist';
import tool from '/imports/mapPage/head/tool';
import userMsg from '/imports/common/userMsg';
import viewport from '/imports/mapPage/viewport/viewport';
import { checkFetchStatus, parseFetchedJson } from '/imports/common/utils';
import './colorEdit.html';
import './colorEdit.css';

var badValue = false, // The current category input has a bad value
    $download,
    $form,
    backgroundTemplate = ReactiveVar();

// Define the colormap template helper, at this scope for some reason
Template.colormapT.helpers({

    // Use the Session version of the colormap
    colorArray: function () {
        var colorArray = Session.get('colorArray');
        return colorArray;
    }
});

// Define the background color template helper
Template.navBarT.helpers({

    background: function () {
        return (backgroundTemplate.get() === 'white') ? 'Black' : 'White'
    }
});

function findRowIndex ($row, colorArray) {

    // Find the layer in the colorArray from a row element
    var attr = $row[0].dataset.attr
    let row
    colorArray.find((line, index) => {
        row = index
        return (line.name === attr);
    })
    return row
}

function findColumnIndex ($input, colorArray) {

    // Find the category in the colorArray from an input element
    let cat = $input[0].dataset.cat
    let row = findRowIndex($input, colorArray)
    let col
    colorArray[row].cats.find((column, index) => {
        col = index
        return (column.name === cat)
    })
    return {row, col}
}

function setCatAttrs (a) {

    // Set category input attributes that may change with user edits.
    a.isFileVal = (!a.persistVal || a.operVal === a.persistVal) ?
        'isFileVal' : ''
}

function updateColormap (aCat) {

    // Update the colormap, then redraw the hexmap
    Colormap.updateCategoryColor(aCat.layer, aCat.name, aCat.operVal);
    colorMix.refreshColors();
}

function rowClick(ev) {

    // Fires when a row is clicked.
    // Highlights the clicked row to make it easier for the user
    // to follow across all of the categories for this layer.
    var $t = $(ev.currentTarget),
        colorArray = Session.get('colorArray'),
        rowIndex = findRowIndex($t, colorArray)

    // Set the 'selected' attribute of all layers
    colorArray.forEach((row, i) => {
        row.selected = (i === rowIndex) ? 'selected' : ''
    })
    Session.set('colorArray', colorArray);
}

function inputBlur (ev) {

    // Fires when a color input field loses focus.
    // Update its properties & the map
    var t = ev.currentTarget,
        $t = $(t),
        newVal = $t.prop('value').trim().toUpperCase(),
        colorArray = Session.get('colorArray'),
        index = findColumnIndex($t, colorArray),
        cat = colorArray[index.row].cats[index.col]

    if (!newVal.match(/^#([A-F0-9]{6})$/)) {

        // An invalid hex string, so put the focus back to this.
        badValue = true;
        t.classList.add('error')
        $t.focus();
        return;
    }
    badValue = false;

    // Clean up the input box value.
    t.classList.remove('error')
    $t.prop('value', newVal);

    if (newVal !== cat.operVal) {
    
        // The new value is not the same as the operating color,
        // so update the operating color & update the colormap
        cat.operVal = newVal;
        setCatAttrs(cat);
        Session.set('colorArray', colorArray);
        updateColormap(cat);
    }
}

function inputKeyup (ev) {

    // Fires when a key is released in a color text input field
    var $t = $(ev.currentTarget),
        newVal = $t.prop('value').trim(),
        colorArray;

    if (newVal === '') {

        // The textbox is empty so display the file color string
        // so the user will know what that is.
        colorArray = Session.get('colorArray');
        let index = findColumnIndex($t, colorArray);
        $t.prop('value', colorArray[index.row].cats[index.col].persistVal);
        
        // Trigger the blur event so the color block and map will update.
        $t.parent().next().next().find('input').focus();
    }
    if (ev.which === 13) {

        // This is the return key, so trigger a blur event
        $t.parent().next().next().find('input').focus();
    }
}

function makeTsv($download) {
    // Make a colormaps formatted string for a requested download.
    var tsv = '';
    // Only add layers in the string that have been loaded into the
    // shortlist.
    Object.keys(colormaps).forEach(function (layer) {
        if (shortlist.inShortList(layer)) {
            tsv += layer;
            _.each(colormaps[layer], function (cat, catIndex) {
            
                // If the colormap entry is not empty...
                if (Object.keys(colormaps[layer]).length > 0) {
                    tsv += '\t' + catIndex + '\t' + cat.name + '\t' +
                        cat.color.hexString();
                }
            });
            tsv += '\n';
        }
    });

    // Fill in the data URI for saving. We use the handy
    // window.bota encoding function.
    $download.attr("href", "data:text/plain;base64," + window.btoa(tsv));
    $download[0].click();
}

function colormapToColorArray (layerVal, layerKey) {

    // Convert one attr colormap colors into a form that templates
    // can use.
    var cats = _.map(layerVal, function(val) {

        var cat = {
            name:  val.name,
            persistVal: val.persistColor ?
                val.persistColor.hexString() : val.color.hexString(),
            operVal: val.color.hexString(),
            layer: layerKey,
        };
        setCatAttrs(cat);
        return cat;
    });
    return {name: layerKey, cats: cats, selected: ''};
}

function colormapsToColorArray () {

    // Convert the colormaps into a form the template can use,
    // filtering out any entries with no categories, and any entry
    // that is not in the shortlist.
    return _.filter(
        _.map(colormaps, colormapToColorArray), function (entry) {
            return (entry.cats.length > 0 &&
                    shortlist.inShortList(entry.name)
            );
        }
    );
}

function save() {

    // Tell the data server to remove this map.
    // Map our colors to the format expected by the data server.
    // attrs = {
    //  attr1: [cat1-0, color, cat1-1, color, cat1-2, color],
    //  attr2: [cat2-0, color, cat2-1, color],
    
    let colorArray = Session.get('colorArray')
    let colors = {}
    colorArray.forEach(attr => {
        let cats = []
        attr.cats.forEach(cat => {
            cats.push(cat.name, cat.operVal)
        })
        colors[attr.name] = cats
    })
    const post  = {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
            mapId: ctx.project,
            colors: colors,
            userEmail: Meteor.user().username,
        }),
    };

    const url = URL_BASE + '/updateColor'
    fetch(url, post)
        .then(checkFetchStatus)
        .then(parseFetchedJson)
        .catch(() => {
            userMsg.error(['Unable to save new colors.']);
        });
}

function render() {
    Session.set('colorArray', colormapsToColorArray());
    $form
        .append($download)
        .on('click', 'tr', rowClick)
        .on('blur', 'input.text', inputBlur)
        .on('keyup', 'input.text', inputKeyup)
        .on('change', 'input.color', inputBlur)
}

function binaryColorChanged (layerName) {
    // Determines whether the user has changed a binary colormap,
    // dependent on what background they are on.
    if (_.isUndefined(colormaps[layerName])){
        return false;
    }
    var on = 1,
        off = 0,
        currentOn = colormaps[layerName][on].color.hexString().toLowerCase(),
        currentOff= colormaps[layerName][off].color.hexString().toLowerCase(),
        originalOff = Colormap.defaultBinaryOff().toLowerCase(),
        originalOn = Colormap.defaultBinaryOn().toLowerCase();

    return (currentOn !== originalOn) || (currentOff !== originalOff);
}

// BREAK THESE UP INTO LIGHT AND DARK INSTEAD OF RELYING ON THE BACKGROUND
// SO THAT YOU CAN CHANGE IN A GOOD WAY
function continuosColorChanged (layerName) {
    // Determines whether the user has changed a continuous colormap,
    // dependent on what background they are on.
    //layerValue is 0 for low and 1 for high.
    if (_.isUndefined(colormaps[layerName])){
        return false;
    }
    var high = 1,
        low = 0,
        currentH = colormaps[layerName][high].color
            .hexString().toLowerCase(),
        currentL = colormaps[layerName][low].color
            .hexString().toLowerCase(),
        originalH = Colormap.defaultContHigh().toLowerCase(),
        originalL = Colormap.defaultContLow().toLowerCase();

    return (currentH !== originalH) || (currentL !== originalL);
}

exports.init = function () {
    $form = $('#colorMapDiv');
    $download = $('#colorMapDiv a.download');
    
    backgroundTemplate.set(rx.get('background'))

    $('#background').on('click', function () {
        // Continuous/binary layers in the shortlist whose
        // colors have not been changed must have their colors updated
        // with the new background.
        var contLayers = shortlist.getContinuousLayerNames()
            .filter(function(layerName) {
                return !continuosColorChanged(layerName);
            });
        var binLayers = shortlist.getBinaryLayerNames()
            .filter(function(layerName) {
                return !binaryColorChanged(layerName);
            });

        // Toggle the session variable for the blaze template and
        // toggle the persistent state variable.
        if (rx.get('background') === 'white') {
            backgroundTemplate.set('black');
        } else {
            backgroundTemplate.set('white');
        }
        rx.set('background.toggle')

        //Provide colormaps in accordance with the new background.
        _.forEach(contLayers, function(layerName) {
            colormaps[layerName] = Colormap.defaultContinuous();
        });
        _.forEach(binLayers, function (layerName) {
            colormaps[layerName] = Colormap.defaultBinary();
        });

        // The background change requires a new map to show the
        // background.
        viewport.create();
        nodes.create();
        colorMix.refreshColors();
        overlayNodes.show();
    });

    // Prepare to display a dialog
    var opts = {
        width: $(window).width() * 2 / 3,
        height: $(window).height() * 2 / 3,
        position: {my: 'left top', at: 'left top+50', of: window},
        buttons: [
            {
                text: 'Download',
                click: function () {
                    if (!badValue) {
                        makeTsv($download);
                    }
                }
            }
        ],
    };
    // Add the save button if the user has edit ability.
    if (rx.get('user.mapAuthorized') === 'edit') {
        opts.buttons.push({
            text: 'Save',
            click: save,
        })
    }
    
    // Create the dialog.
    var dialogHex = DialogHex.create({
        $el: $form,
        opts: opts,
        showFx: render,
        helpAnchor: '/help/menus.html#colormap'
    });

    // Create a link from the navBar
    tool.add("colormap", function () {
        dialogHex.show();
        tool.activity(false);
    }, 'Change colors of attributes', 'mapShow');
};

