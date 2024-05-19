// from https://github.com/linsight/react-keyboard-event-handler

import React from 'react';
import PropTypes from 'prop-types';
import { findMatchedKey } from './keyEvents';

let exclusiveHandlers = [];

export default class KeyboardEventHandler extends React.Component {
  constructor(props) {
    super(props);

    this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this);
    this.registerExclusiveHandler = this.registerExclusiveHandler.bind(this);
    this.deregisterExclusiveHandler = this.deregisterExclusiveHandler.bind(this);
  }

  componentDidMount() {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyboardEvent, false);
      document.addEventListener('keyup', this.handleKeyboardEvent, false);
      document.addEventListener('keypress', this.handleKeyboardEvent, false);

      const { isExclusive, isDisabled } = this.props;
      if (isExclusive && !isDisabled) {
        this.registerExclusiveHandler();
      }
    }
  }

  componentWillUnmount() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyboardEvent, false);
      document.removeEventListener('keyup', this.handleKeyboardEvent, false);
      document.removeEventListener('keypress', this.handleKeyboardEvent, false);
    }

    this.deregisterExclusiveHandler();
  }

  componentDidUpdate(prevProps) {
    const { isExclusive, isDisabled } = prevProps;
    const hasChanged = this.props.isExclusive !== isExclusive ||
      this.props.isDisabled !== isDisabled;

    if (hasChanged) {
      if (this.props.isExclusive && !this.props.isDisabled) {
        this.registerExclusiveHandler();
      } else {
        this.deregisterExclusiveHandler();
      }
    }
  }

  registerExclusiveHandler() {
    this.deregisterExclusiveHandler();
    exclusiveHandlers.unshift(this);
  }

  deregisterExclusiveHandler() {
    if (exclusiveHandlers.includes(this)) {
      exclusiveHandlers = exclusiveHandlers.filter(h => h !== this);
    }
  }

  handleKeyboardEvent(event) {
    const {
      isDisabled, handleKeys, onKeyEvent, handleEventType, children, handleFocusableElements,
    } = this.props;

    if (isDisabled) {
      return false;
    }

    const isEventTypeMatched = handleEventType === event.type;

    if (!isEventTypeMatched) {
      return false;
    }

    const exclusiveHandlerInPlace = exclusiveHandlers.length > 0;
    const isExcluded = exclusiveHandlerInPlace && exclusiveHandlers[0] !== this;

    if (isExcluded) {
      return false;
    }

    const isEligibleEvent = event.target === document.body || handleFocusableElements;
    const isChildrenEvent = this.childrenContainer && this.childrenContainer.contains(event.target);
    const isValidSource = children ? isChildrenEvent : isEligibleEvent;

    if (!isValidSource) {
      return false;
    }

    const matchedKey = findMatchedKey(event, handleKeys);

    if (matchedKey) {
      onKeyEvent(matchedKey, event);
      return true;
    }

    return false;
  }

  render() {
    const { children } = this.props;
    const passProps = Object.assign({}, this.props)
    for (const key of Object.keys(KeyboardEventHandler.propTypes)) {
      delete passProps[key]
    }
    return children ? (<span ref={ e => {
        this.childrenContainer = e;
      }} {...passProps}>{children}</span>) : null;
  }
}

KeyboardEventHandler.propTypes = {
  handleKeys: PropTypes.array,
  handleEventType: PropTypes.oneOf(['keydown', 'keyup', 'keypress']),
  handleFocusableElements: PropTypes.bool,
  onKeyEvent: PropTypes.func,
  isDisabled: PropTypes.bool,
  isExclusive: PropTypes.bool,
  children: PropTypes.any,
};

KeyboardEventHandler.defaultProps = {
  handleKeys: [],
  handleFocusableElements: false,
  handleEventType: 'keydown',
  onKeyEvent: () => null,
};
