
// Logic and state for the short list entry context menu.

import { connect } from 'react-redux'

import shortlist from '/imports/mapPage/shortlist/shortlist'
import ShortEntryMenuPres from '/imports/mapPage/shortlist/ShortEntryMenuPres'
import ShortEntryMenuFilter
    from '/imports/mapPage/shortlist/ShortEntryMenuFilter'
import tool from '/imports/mapPage/head/tool'
import util from '/imports/common/util'

const getCapability = (state) => {
    let attr = state['shortEntry.menu.attr']
    if (!(attr)) {
        return []
    }
    
    // Initialize capability to those that all attrs have all the time.
    let able = ['correlationSort', 'editColors', 'download']
    
    // Capability due to hide or show of filters
    able.push((state['shortEntry.menu.hideBgNodes']) ?
        'hideBgNodes' : 'showBgNodes')

    // Capability due to having a filter.
    able.push('createFilterAttr')
    /*
    let filters = state'shortEntry.filter']
    let filtersLength = filters.length
    let thresholdFiltersLength = (_.filter(filters, (filter) => {
        return filter.by === 'threshold'
    })).length
    console.log('thresholdFiltersLength', thresholdFiltersLength)
    
    // Only consider when there are filters other than 'threshold'.
    if (filtersLength > 0 && filtersLength > thresholdFiltersLength) {
        let filter = filters[attr]
        
        // If this is the only filter and it
        if ((filter && filter.by !== 'threshold') || thresholdFiltersLength > 1) {
            able.push('createFilterAttr')
        }
    }
    */
    // Capabilities based on dataType.
    switch (util.getDataType(attr)) {
    case 'binary':
        able.push('category', 'setOperation')
        if (Session.equals('reflectCriteria', true)) {
            able.push('reflection')
        }
        break
    case 'categorical':
        able.push('category', 'setOperation')
        break
    case 'continuous':
        able.push('range', 'threshold')
        break
    }
    return able
}

const mapStateToProps = (state) => {

    // Map state to the properties.
    return {
        able: getCapability(state),
        filterChecked: ShortEntryMenuFilter.getChecked(state),
        filterList: ShortEntryMenuFilter.getList(state),
        filterValues: ShortEntryMenuFilter.getValues(state),
        anyFilters: ShortEntryMenuFilter.getAnyFilters(state),
    }
}

const mapDispatchToProps = (dispatch) => {

    // Map the event handlers to the properties.
    return {
        onTrigger: ev => {
            dispatch({
                type: 'shortEntry.menu.attr',
                attr: shortlist.get_layer_name_from_child(ev.target)
            })
        },
        onMainMenu: (ev, data) => {
            let attr = shortlist.get_layer_name_from_child(ev.target)
            switch (data.id) {
            case 'category':
            case 'range':
            case 'threshold':
            case 'hideBgNodes':
            case 'createFilterAttr':
                ShortEntryMenuFilter.onMenu(attr, data.id, dispatch)
                break
            case 'setOperation':
                tool.getCallback('setOperations')()
                break
            case 'correlationSort':
                tool.getCallback('statsSort')()
                break
            case 'reflection':
                tool.getCallback('reflectTrigger')()
                break
            case 'editColors':
                tool.getCallback('colormap')()
                break
            case 'download':
                tool.getCallback('hexagonNames')()
                break
            }
        },
        onFilterValue: (ev, data) => {
            ShortEntryMenuFilter.onValue(ev, data, dispatch)
        },
    }
}

// Connect the value props and eventHandler props
// to the presentational component.
const ShortEntryMenu = connect(
    mapStateToProps,
    mapDispatchToProps
)(ShortEntryMenuPres)

export default ShortEntryMenu;
