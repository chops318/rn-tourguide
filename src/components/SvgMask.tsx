import React, { Component } from 'react'
import {
  View,
  Animated,
  Easing,
  Dimensions,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native'
import Svg from 'react-native-svg'

import { AnimatedSvgPath } from './AnimatedPath'
import { ValueXY, Step } from '../types'
import { svgMaskPathMorph } from '../utilities'

const windowDimensions = Dimensions.get('window')

interface Props {
  size: ValueXY
  position: ValueXY
  style: StyleProp<ViewStyle>
  animationDuration: number
  animated: boolean
  backdropColor: string
  currentStepNumber?: number
  maskOffset?: number
  currentStep?: Step
  easing?: (value: number) => number
  onClick?(event: GestureResponderEvent): boolean
}

interface State {
  size: ValueXY
  position: ValueXY
  previousSize?: ValueXY
  previousPosition?: ValueXY
  previousStepNumber?: number
  opacity: Animated.Value
  animation: Animated.Value
  canvasSize: ValueXY
  previousPath: string
}
const FIRST_PATH = `M0,0H${windowDimensions.width}V${
  windowDimensions.height
}H0V0ZM${windowDimensions.width / 2},${
  windowDimensions.height / 2
} h 1 v 1 h -1 Z`

class SvgMask extends Component<Props, State> {
  static defaultProps = {
    animationDuration: 300,
    easing: Easing.linear,
    size: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    maskOffset: 0,
  }

  listenerID: any
  mask: any

  constructor(props: Props) {
    super(props)

    this.state = {
      canvasSize: {
        x: windowDimensions.width,
        y: windowDimensions.height,
      },
      size: props.size,
      position: props.position,
      opacity: new Animated.Value(0),
      animation: new Animated.Value(0),
      previousPath: FIRST_PATH,
    }

    this.listenerID = this.state.animation.addListener(this.animationListener)
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.position !== this.props.position ||
      prevProps.size !== this.props.size
    ) {
      this.animate()
    }
  }

  componentWillUnmount() {
    if (this.listenerID) {
      this.state.animation.removeListener(this.listenerID)
    }
  }

  getPath = () => {
    const { previousPath, animation } = this.state
    const { size, position, currentStep, maskOffset } = this.props
    return svgMaskPathMorph({
      animation: animation as any,
      previousPath,
      to: {
        position,
        size,
        shape: currentStep?.shape,
        maskOffset: currentStep?.maskOffset || maskOffset,
        borderRadius: currentStep?.borderRadius,
      },
    })
  }

  animationListener = (): void => {
    const d = this.getPath()
    if (this.mask) {
      this.mask.setNativeProps({ d })
    }
  }

  animate = () => {
    const animations = [
      Animated.timing(this.state.animation, {
        toValue: 1,
        duration: this.props.animationDuration,
        easing: this.props.easing,
        useNativeDriver: true,
      }),
    ]
    // @ts-ignore
    if (this.state.opacity._value !== 1) {
      animations.push(
        Animated.timing(this.state.opacity, {
          toValue: 1,
          duration: this.props.animationDuration,
          easing: this.props.easing,
          useNativeDriver: true,
        }),
      )
    }
    Animated.parallel(animations, { stopTogether: false }).start((result) => {
      if (result.finished) {
        this.setState({ previousPath: this.getPath() }, () => {
          // @ts-ignore
          if (this.state.animation._value === 1) {
            this.state.animation.setValue(0)
          }
        })
      }
    })
  }

  handleLayout = ({
    nativeEvent: {
      layout: { width, height },
    },
  }: LayoutChangeEvent) => {
    this.setState({
      canvasSize: {
        x: width,
        y: height,
      },
    })
  }

  render() {
    if (!this.state.canvasSize) {
      return null
    }
    const path = this.getPath()
    return (
      <View
        style={this.props.style}
        onLayout={this.handleLayout}
        pointerEvents='none'
      >
        <Svg
          pointerEvents='none'
          width={this.state.canvasSize.x}
          height={this.state.canvasSize.y}
        >
          <AnimatedSvgPath
            ref={(ref: any) => {
              this.mask = ref
            }}
            fill={this.props.backdropColor}
            strokeWidth={0}
            fillRule='evenodd'
            d={path}
            opacity={this.state.opacity}
          />
        </Svg>
      </View>
    )
  }
}

export default SvgMask