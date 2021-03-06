
// Public API for the redux store.

// Pieces of state to retrieve, used with rx.get().
// Usage:  rx.get(<state-bit>);
// Where <state-bit> is one of the below.
// Example:  rx.get('layout.name');
const statePieces =  [ // eslint-disable-line
    'activeAttrs',
    'background',
    'bookmarkUsed',
    'doNotTrack',
    'dynamicAttrs',
    'firstAttr',
    'init.layoutNames',
    'init.map',
    'inited.attrSummary',
    'inited.attrTypes',
    'inited.coloringAttrs',
    'inited.colormap',
    'inited.ctx',
    'inited.dom',
    'inited.googleMapApi',
    'inited.layout',
    'inited.nodes',
    'inited.state',
    'initialized',
    'mapView', // one of honeycomb or xyCoords
    'opacity', // value of opacity from zero to 1.0 which is totally opaque
    'projectList',
    'shortEntry.filter',
    'shortEntry.menu.attr',
    'shortEntry.menu.filter',
    'shortEntry.menu.hideBgNodes',
    'shortlist',
    'showHoverInfo', // boolean where true means hovering on a node shows its ID
    'snake.map',
    'snake.project',
    'snake.shortlist',
    'transparent', // boolean where true means nodes will be transparent
    'user.mapAuthorized',
    'user.roles',
    'zoom', // zoom level of the map
];

// The global redux state.
var reduxStore = null;

// Functions to access the redux state.
exports.get = function (statePiece) {
    
    // Retrieve the state of one piece of state.
    // @param statePiece: one of the items tracked in redux state
    // @returns: the current state of the piece of state
    // usage example:  rx.get('layout.name');
    return reduxStore.getState()[statePiece];
};

exports.getState = function () {

    // Retrieve the entire state tree.
    return reduxStore.getState();
};

exports.set = function (stateAction, optsIn) {
    
    // Set the state using an state action type.
    // @param stateAction: the action type required for any operation
    // @param optsIn: object containing options specific to a redux action,
    //                optional depending on the action
    // @returns: the new state tree
    // usage example:  rx.set('layout.nameSelected', { name: 'RPPA' });
    var opts = optsIn  || {};
    opts.type = stateAction;
    return reduxStore.dispatch(opts);
};

exports.dispatch = function (stateAction) {

    // Dispatch an action.
    return reduxStore.dispatch(stateAction);
};

exports.subscribe = function (callback) {

    // Subscribe to state changes to call back upon change.
    // @param callback: a function to call when the state changes
    // @returns: a function to unsubscribe from state changes.
    return reduxStore.subscribe(callback);
};

export function isArrayEqual(a1, a2) {

    // Performs a compare between two arrays of strings or arrays of simple
    // values; arrays may not contain objects.
    // Arrays with the same elements but different order are unequal.
    // Null and undefined are considered equal.
    if (!a2 && !a1) {
        return true
    }
    let is = true;
    if (a2 && a1 &&
        typeof a1 === 'object' && typeof a2 === 'object' &&
        a1.length === a2.length) {
        for (var i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) {
                is = false;
                break;
            }
        }
    } else {
        is = false;
    }
    return is;
}

export function getStore () {
    return reduxStore;
}

export function copyStringArray(orig) {

    // Make a deep copy of an array of strings.
    return orig.map(str => str.slice());
}

exports.init = function (store) {
    reduxStore = store;
};
