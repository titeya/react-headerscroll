import React, { Component } from 'react' // eslint-disable-line import/no-unresolved
import PropTypes from 'prop-types'
import shallowequal from 'shallowequal'
import raf from 'raf'
import shouldUpdate from './shouldUpdate'

const noop = () => {}

export default class Headscroll extends Component {
  static propTypes = {
    parent: PropTypes.func,
    children: PropTypes.any.isRequired,
    disableInlineStyles: PropTypes.bool,
    disable: PropTypes.bool,
    upTolerance: PropTypes.number,
    downTolerance: PropTypes.number,
    onPin: PropTypes.func,
    onUnpin: PropTypes.func,
    onUnfix: PropTypes.func,
    wrapperStyle: PropTypes.object,
    pinStart: PropTypes.number,
    style: PropTypes.object,
    offsettop: PropTypes.any.isRequired,
    fixed: PropTypes.bool,
    position: PropTypes.string,
  };

  static defaultProps = {
    parent: () => window,
    disableInlineStyles: false,
    disable: false,
    fixed:false,
    position:'top',
    upTolerance: 5,
    downTolerance: 0,
    offsettop: '-100%',
    onPin: noop,
    onUnpin: noop,
    onUnfix: noop,
    wrapperStyle: {},
    pinStart: 0,
  };

  constructor (props) {
    super(props)
    // Class variables.
    this.currentScrollY = 0
    this.lastKnownScrollY = 0
    this.ticking = false
    this.state = {
      state: 'unfixed',
      translateY: 0,
      className: 'headscroll headscroll--unfixed',
    }
  }

  componentDidMount () {
    this.setHeightOffset()
    if (!this.props.disable) {
      this.props.parent().addEventListener('scroll', this.handleScroll)
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.disable && !this.props.disable) {
      this.unfix()
      this.props.parent().removeEventListener('scroll', this.handleScroll)
    } else if (!nextProps.disable && this.props.disable) {
      this.props.parent().addEventListener('scroll', this.handleScroll)
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    return (
      !shallowequal(this.props, nextProps) ||
      !shallowequal(this.state, nextState)
    )
  }

  componentDidUpdate (prevProps) {
    // If children have changed, remeasure height.
    if (prevProps.children !== this.props.children ) {
      this.setHeightOffset()
    }
    if (this.getDocumentHeight() < this.getViewportHeight()) {
      this.pin()
    }
  }

  componentWillUnmount () {
    this.props.parent().removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('scroll', this.handleScroll)
  }

  setHeightOffset = () => {
    this.setState({
      height: this.refs.inner.offsetHeight,
    })
  }

  getScrollY = () => {
    if (this.props.parent().pageYOffset !== undefined) {
      return this.props.parent().pageYOffset
    } else if (this.props.parent().scrollTop !== undefined) {
      return this.props.parent().scrollTop
    } else {
      return (document.documentElement || document.body.parentNode || document.body).scrollTop
    }
  }

  getViewportHeight = () => (
    window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight
  )

  getDocumentHeight = () => {
    const body = document.body
    const documentElement = document.documentElement

    return Math.max(
      body.scrollHeight, documentElement.scrollHeight,
      body.offsetHeight, documentElement.offsetHeight,
      body.clientHeight, documentElement.clientHeight
    )
  }

  getElementPhysicalHeight = elm => Math.max(
    elm.offsetHeight,
    elm.clientHeight
  )

  getElementHeight = elm => Math.max(
    elm.scrollHeight,
    elm.offsetHeight,
    elm.clientHeight,
  )

  getScrollerPhysicalHeight = () => {
    const parent = this.props.parent()

    return (parent === window || parent === document.body)
      ? this.getViewportHeight()
      : this.getElementPhysicalHeight(parent)
  }

  getScrollerHeight = () => {
    const parent = this.props.parent()

    return (parent === window || parent === document.body)
      ? this.getDocumentHeight()
      : this.getElementHeight(parent)
  }

  isOutOfBound = (currentScrollY) => {
    const pastTop = currentScrollY < 0

    const scrollerPhysicalHeight = this.getScrollerPhysicalHeight()
    const scrollerHeight = this.getScrollerHeight()

    const pastBottom = currentScrollY + scrollerPhysicalHeight > scrollerHeight

    return pastTop || pastBottom
  }

  handleScroll = () => {
    if (!this.ticking) {
      this.ticking = true
      raf(this.update)
    }
  }

  unpin = () => {
    this.props.onUnpin()

    this.setState({
      translateY: this.props.offsettop == '-100%' ? this.props.offsettop : this.props.offsettop+'px',
      className: 'headscroll headscroll--unpinned',
    }, () => {
      setTimeout(() => {
        this.setState({ state: 'unpinned' })
      }, 0)
    })
  }

  pin = () => {
    this.props.onPin()

    this.setState({
      translateY: 0,
      className: 'headscroll headscroll--pinned',
      state: 'pinned',
    })
  }

  unfix = () => {
    this.props.onUnfix()

    this.setState({
      translateY: 0,
      className: 'headscroll headscroll--unfixed',
      state: 'unfixed',
    })
  }

  update = () => {
    this.currentScrollY = this.getScrollY()

    if (!this.isOutOfBound(this.currentScrollY)) {
      const { action } = shouldUpdate(
        this.lastKnownScrollY,
        this.currentScrollY,
        this.props,
        this.state
      )

      if (action === 'pin') {
        this.pin()
      } else if (action === 'unpin') {
        this.unpin()
      } else if (action === 'unfix') {
        this.unfix()
      }
    }

    this.lastKnownScrollY = this.currentScrollY
    this.ticking = false
  }

  render () {
    const { ...divProps } = this.props
    delete divProps.onUnpin
    delete divProps.onPin
    delete divProps.onUnfix
    delete divProps.disableInlineStyles
    delete divProps.disable
    delete divProps.parent
    delete divProps.children
    delete divProps.upTolerance
    delete divProps.downTolerance
    delete divProps.pinStart
    delete divProps.offsettop
    delete divProps.fixed


    const { style, wrapperStyle, ...rest } = divProps

    let innerStyle = {
      position: (this.props.fixed || (this.props.disable || this.state.state)) === 'unfixed' ? 'relative' : 'fixed',
      left: 0,
      right: 0,
      zIndex: 2,
      WebkitTransform: `translate3d(0, ${this.state.translateY}, 0)`,
      MsTransform: `translate3d(0, ${this.state.translateY}, 0)`,
      transform: `translate3d(0 ${this.state.translateY}, 0)`,
    }
    if (this.props.position === 'top') {
      innerStyle = {
        ...innerStyle,
        top:0,
    } else {
      innerStyle = {
        ...innerStyle,
        bottom:0,
    }
    if (this.props.fixed) {
      innerStyle = {
        ...innerStyle,
        WebkitTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        MozTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        OTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        transition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
      }
    }

    let className = this.state.className

    // Don't add css transitions until after we've done the initial
    // negative transform when transitioning from 'unfixed' to 'unpinned'.
    // If we don't do this, the header will flash into view temporarily
    // while it transitions from 0 — -100%.
    if (this.state.state !== 'unfixed') {
      innerStyle = {
        ...innerStyle,
        WebkitTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        MozTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        OTransition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
        transition: 'all 0.5s cubic-bezier(0.165, 0.840, 0.440, 1.000)',
      }
      className += ' headscroll--scrolled'
    }

    if (!this.props.disableInlineStyles) {
      innerStyle = {
        ...innerStyle,
        ...style,
      }
    } else {
      innerStyle = style
    }

    const wrapperStyles = {
      ...wrapperStyle,
      height: this.state.height ? this.state.height : null,
    }

    return (
      <div style={wrapperStyles} className="headscroll-wrapper">
        <div
          ref="inner"
          {...rest}
          style={innerStyle}
          className={className}
        >
          {this.props.children}
        </div>
      </div>
    )
  }
}
