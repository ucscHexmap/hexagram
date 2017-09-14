
// nodeIdSelect.js
// The UI to allow the user to select nodes by ID to create a new attribute.

import React, { Component } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Modal from './modal.js';
import './css/reactModal.css';

import NodeIdSearch from './nodeIdSearch.js';
import TextareaClean from './textareaClean.js';
import ReadFile from './readFile.js';
import U from './utils.js';

export default class NodeIdSelect extends Component {

    constructor (props) {
        super(props);
        this.cartPlaceholder = 'enter node IDs one per line';
        this.state = {
            cartText: '',
        }
        this.className = 'nodeIdSelectModal';
        
        // Build the list of node IDs.
        this.allIds = Object.keys(polygons).sort();
        
        // Save our selves.
        this.addToCart = this.addToCart.bind(this);
        this.updateCart = this.updateCart.bind(this);
        this.getCart = this.getCart.bind(this);
        this.handleCloseModal = this.handleCloseModal.bind(this);
        this.handleReadSuccess = this.handleReadSuccess.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.error = this.error.bind(this);
    }
    
    // TODO this should render the react prompt rather than go the long way
    // out of react and back in.
    error (msg) {
        Util.banner('error', msg);
    }

    getCart () {
        
        // Update and return the cart array from the cart contents.
        // The contents have already been validated.
        // We need a cart update for two reason:
        //      - the button to create the attribute has been pressed
        //      - the dropdown is open and we want to show which nodes
        //        are already in the cart.
        var self = this,
            str = this.state.cartText,
            cart = [];
        
        // If there is a cart string...
        if (!(_.isUndefined(str) || str.length < 1)) {
        
            // Parse the string into an array of arrays
            // where the inner arrays contain one node ID each.
            var data = Util.parseTsv(str);
            
            // Flatten the nested arrays into a single array,
            // remove white space from the ends of each element,
            // remove any empty elements,
            // remove duplicate elements,
            // then replace the cart contents.
            cart =
                _.filter(
                    _.uniq(
                        _.without(
                            _.map(_.flatten(data), function (el) {
                                return el.trim();
                            }),
                            null, ''
                        )
                    ),
                    function (id) {
                        return (self.allIds.indexOf(id) > -1);
                    }
                );
        }
        return (cart);
    }
    
    addToCart (newText) {
    
        // Append new text to the text area. This comes from either the
        // dropdown or from an uploaded file. Uploaded files are
        // already checked for unprintable characters and we assume
        // node IDs from the dropdown have been check upon entry to the DB.
        
        // Add a new line if needed.
        var text = this.state.cartText;
        if (text.length > 0 && !text.endsWith('\n')) {
            text += '\n';
        }
        this.setState({ cartText: text + newText });
    }
    
    handleButtonClick () {

        // Get the current cart contents.
        var cart = this.getCart();
    
        // Create the new attribute.
        if (cart.length < 1) {
            this.error(
               'there are no valid node IDs so an attribute cannot be created');
            return;
        }
        
        // Create the attribute.
        Layer.create_dynamic_selection(cart);
        
        this.handleCloseModal();
    }

    handleReadSuccess (data) {
        this.addToCart(_.flatten(data).join('\n'));
    }
    
    updateCart (val) {
    
        // Replace the cart text.
        this.setState({ cartText: val });
    }
    
    handleCloseModal () {
        this.props.closeModal();
    }
    
    render () {
        var self = this,        
            body =
                <div>
                    <NodeIdSearch
                        allIds = {this.allIds}
                        addToSelectedList = {self.addToCart}
                        getCart = {this.getCart}
                        dropdownParent = {this.props.searchDropDownParent}
                    />
                    <div>
                        <span>
                            Or
                        </span>
                        <ReadFile
                            parseTsv = {true}
                            onSuccess = {this.handleReadSuccess}
                            onError = {this.error}
                        />
                    </div>
                    <div className = 'cartLabel'>
                        Or add directly to Your Cart:
                    </div>
                    <TextareaClean
                        onChange = {this.updateCart}
                        value = {this.state.cartText}
                        placeholder = {this.cartPlaceholder}
                        className = 'cart'
                        rows = '10'
                        cols = '35'
                        ref={(TextareaClean) => {
                            self.textarea = TextareaClean; }}
                    />
                </div>,
            button =
                <button onClick = {function () {
                        self.handleButtonClick();
                    }}>
                    OK
                </button>;

        return (
            <Modal
                isOpen = {this.props.isOpen}
                onRequestClose = {self.handleCloseModal}
                className = 'nodeIdSelectModal'
                parentSelector = {() => this.props.parentSelector}
                body = {body}
                buttons = {button}
                ref={(Modal) => { this.modal = Modal; }}
            />
        );
    }
}