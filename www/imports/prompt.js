
// prompt.js
// The UI to prompt the user with a string and an optional text field.

import React, { Component } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import Modal from './modal.js';
import './css/reactModal.css';

class Prompt extends Component {
    constructor (props) {
        super(props);
        this.state = {};
        if (this.props.textStr) {
            this.state.textStr = this.props.textStr;
        }
        if (this.props.severity === 'error') {
            this.title = 'Error';
        }
        this.modalClass = 'promptModal';

        this.handleOpenModal = this.handleOpenModal.bind(this);
        this.handleCloseModal = this.handleCloseModal.bind(this);
        this.handleTextKeyPress = this.handleTextKeyPress.bind(this);
        this.handleTextChange = this.handleTextChange.bind(this);
        this.handleButtonClick = this.handleButtonClick.bind(this);
    }
    
    handleOpenModal() {
        
        // Set the text value here to force the cursor to the end.
        if (this.state.textStr) {
            this.$text.val(this.state.textStr).focus();
        }
    }

    handleCloseModal (response) {
        this.props.closeModal(response);
    }
    
    handleButtonClick () {
        if (this.state.textStr) {
            this.handleCloseModal(this.state.textStr.trim());
        }
    }
  
    handleTextKeyPress (event) {
    
        // Allow a return key press to trigger the button.
        if (event.which === 13 || event.keyCode === 13) {
            this.handleButtonClick();
        }
    }
    
    handleTextChange (event) {
        this.state.textStr = event.target.value;
    }
        
    render () {
        var self = this,
            body = null,
            input = null,
            button = null;
        
        // Build the text box and buttons in the button box.
        if (this.state.textStr) {
            var input =
                <input
                    type = 'text'
                    onKeyPress = {self.handleTextKeyPress}
                    onChange = {self.handleTextChange}
                    ref={(input) => { this.$text = $(input); }}
                />,
                button = <button onClick = {function () {
                        self.handleButtonClick();
                    }}
                >
                    OK
                </button>;
        }
        
        return (
            <Modal
                onAfterOpen = {this.handleOpenModal}
                onRequestClose = {self.handleCloseModal}
                overlayClassName = 'prompt'
                className = {this.modalClass + ' ' + this.props.severity}
                parentSelector = {() => this.props.parentSelector}
                title = {this.title}
                body = {
                    <div>
                        <div
                            className = 'modalLabel'>
                            {this.props.promptStr}
                        </div>
                        {input}
                    </div>
                }
                buttons = {button}
            />
        );
    }
}

var containerId = 'prompt',
    callback;

function closeModal (response) {

    // TODO
    // If we could do this within the component the .show routine could be
    // removed and the non-react caller would call the component directly.
    $('#' + containerId).remove();
    if (callback) {
        callback(response);
    }
}

exports.show = function (promptStr, opts) {
    
    // Create and render this modal.
    //
    // @param         promptStr: the prompt string
    // @param      opts.textStr: the text to put in the input box, optional
    // @param     opts.callback: function to call upon modal close, optional
    // @param     opts.severity: one of [error, info, warning], optional
    
    callback = opts ? opts.callback : null;

    $('body').append($('<div id="' + containerId + '" />'));

    var parentSelector = $('#' + containerId)[0];
    
    render(
        <Prompt
            promptStr = {promptStr}
            textStr = {opts.textStr}
            parentSelector = {parentSelector}
            severity = {opts.severity}
            closeModal = {closeModal}
         />, parentSelector);
}