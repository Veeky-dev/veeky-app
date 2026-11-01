/**
 * ./theme/elevation.ts
 *
 * Shadow / elevation tokens for Veeky. Spread one into a style instead of
 * writing shadow values by hand, so raised surfaces look the same everywhere:
 *
 *   ...elevation.chip   small lift for chips and pills over video
 *   ...elevation.raised floating buttons
 *   ...elevation.sheet  bottom sheets (shadow falls upward, onto the content above)
 *
 * Uses `boxShadow`, which React Native 0.76+ (new architecture) and
 * react-native-web both support, so one value works on phone and web.
 */
import type { ViewStyle } from 'react-native';

export const elevation = {
  none: {} as ViewStyle,
  chip: { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.35)' } as ViewStyle,
  raised: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)' } as ViewStyle,
  sheet: { boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.5)' } as ViewStyle,
};
