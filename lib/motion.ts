import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';

/** Soft screen enter — used by Screen wrapper */
export const screenEntering = FadeInDown.duration(280);

/** Cards / rows — pass delayMs for stagger */
export function cardEntering(delayMs = 0) {
  return FadeInDown.delay(delayMs).duration(260);
}

/** Headers / hero blocks */
export const heroEntering = FadeIn.duration(300);

/** Bottom-weighted sections (forms, CTAs) */
export const riseEntering = FadeInUp.duration(280);

/** Package / highlight enter */
export function popEntering(delayMs = 0) {
  return FadeInDown.delay(delayMs).duration(260);
}

export const fadeOut = FadeOut.duration(160);

export { Animated };
