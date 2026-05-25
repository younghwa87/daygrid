import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type AnimType = 'short' | 'medium' | 'long';

const PARTICLE_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#34D399', '#60A5FA'];
const PARTICLE_X_PX = [24, 48, 72, 96, 36]; // 블록 내 절대 x 위치(px)

interface ParticleProps {
  color: string;
  x: number;
  delay: number;
}

function Particle({ color, x, delay }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.linear }),
        -1,
        false
      )
    );
    return () => cancelAnimation(progress);
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 서서히 나타났다가 사라짐
    const opacity = p < 0.2 ? (p / 0.2) * 0.6 : p > 0.8 ? ((1 - p) / 0.2) * 0.6 : 0.6;
    return {
      opacity,
      transform: [{ translateY: -p * 80 }], // 위쪽으로 80px 떠오름
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 12,
          left: x,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

interface Props {
  type: AnimType;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Reanimated 3 기반 숨쉬기 애니메이션 래퍼
export default function BreathingAnimation({ type, style, children }: Props) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (type === 'short') {
      // 배경 opacity만 0.6~1.0 반복 (텍스트 유지를 위해 배경 레이어에만 적용)
      opacity.value = withRepeat(
        withTiming(0.6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    } else {
      // medium/long: opacity + 미세 이동
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      translateY.value = withRepeat(
        withTiming(-4, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [type]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
      {type === 'long' &&
        PARTICLE_COLORS.map((color, i) => (
          <Particle key={i} color={color} x={PARTICLE_X_PX[i]} delay={i * 700} />
        ))}
    </Animated.View>
  );
}
