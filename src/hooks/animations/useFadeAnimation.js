// @flow

import { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated'

import { useIsEffectRender } from './useIsEffectRender'

export type AnimationOptions = { noFadeIn: boolean, duration: number, fadeInOpacity: number, fadeOutOpacity: number }

// Animate the opacity based on the visibility toggle:
export const useFadeAnimation = (visible: boolean, options: AnimationOptions) => {
  const { noFadeIn, fadeInOpacity, fadeOutOpacity, duration } = options

  const { isRender } = useIsEffectRender(visible, duration)

  const animatedStyle = useAnimatedStyle(() => {
    const opacityValue = visible ? fadeInOpacity : fadeOutOpacity
    const durationValue = noFadeIn && visible ? 0 : duration

    return {
      opacity: withTiming(opacityValue, {
        duration: durationValue,
        easing: Easing.linear
      })
    }
  }, [visible, noFadeIn, duration])

  return { animatedStyle, isRender }
}
