import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Minus, RefreshCw } from 'lucide-react-native';
import { Accelerometer } from 'expo-sensors';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface DiceProps {
  value: number;
  size: number;
  isRolling: boolean;
  index: number;
}

const SHAKE_THRESHOLD = 1.8;
const SHAKE_TIMEOUT = 500;

const DiceFace: React.FC<DiceProps> = ({ value, size, isRolling, index }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isRolling) {
      // Initial "throw" animation
      const delay = index * 25; // Reduced from 50 to 25 for faster stagger
      
      translateY.value = withSequence(
        withDelay(
          delay,
          withTiming(-size * 0.5, { duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1) })
        ),
        withSpring(0, { damping: 12, stiffness: 100 })
      );

      // Random horizontal movement
      translateX.value = withSequence(
        withDelay(
          delay,
          withTiming(Math.random() * size * 0.3 * (Math.random() > 0.5 ? 1 : -1), { duration: 150 })
        ),
        withSpring(0, { damping: 12, stiffness: 100 })
      );

      // Rotation animation
      rotation.value = withSequence(
        withDelay(
          delay,
          withTiming(360 * (2 + Math.random()), {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ),
        withSpring(0)
      );

      // Scale animation
      scale.value = withSequence(
        withDelay(
          delay,
          withTiming(1.2, { duration: 75 })
        ),
        withTiming(0.8, { duration: 75 }),
        withSpring(1, {
          damping: 8,
          stiffness: 100,
        })
      );
    }
  }, [isRolling, size, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const renderDots = () => {
    const dotSize = size * 0.15;
    const dotPositions = {
      1: [[0.5, 0.5]],
      2: [[0.25, 0.25], [0.75, 0.75]],
      3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.25, 0.75], [0.75, 0.25], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.25, 0.75], [0.5, 0.5], [0.75, 0.25], [0.75, 0.75]],
      6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
    };

    const positions = dotPositions[value as keyof typeof dotPositions] || [];
    const padding = size * 0.1;
    const innerSize = size - padding * 2;

    return positions.map((pos, index) => (
      <View
        key={index}
        style={{
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: '#0A4E2E',
          left: padding + pos[0] * innerSize - dotSize / 2,
          top: padding + pos[1] * innerSize - dotSize / 2,
        }}
      />
    ));
  };

  return (
    <Animated.View style={[styles.diceFace, { width: size, height: size }, animatedStyle]}>
      {renderDots()}
    </Animated.View>
  );
};

export default function DiceScreen() {
  const [diceCount, setDiceCount] = useState(1);
  const [diceValues, setDiceValues] = useState<number[]>([6]);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShakeEnabled, setIsShakeEnabled] = useState(Platform.OS !== 'web');
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  useEffect(() => {
    // Skip audio setup on web platform
    if (Platform.OS === 'web') return;

    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        
        const source = Platform.select({
          web: { uri: 'https://adventuresinspeechpathology.com/wp-content/uploads/2025/06/dice.mp3' },
          default: require('../../assets/sounds/dice.mp3')
        });
        
        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false }
        );
        setSound(sound);
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    }

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const adjustDiceCount = useCallback((increment: boolean) => {
    if (isRolling) {
      setError('Cannot change dice count while rolling');
      return;
    }

    setError(null);
    
    if (increment && diceCount >= 4) {
      setError('Maximum 4 dice allowed');
      return;
    }
    
    if (!increment && diceCount <= 1) {
      setError('Minimum 1 die required');
      return;
    }

    const newCount = increment ? diceCount + 1 : diceCount - 1;
    setDiceCount(newCount);
    setDiceValues(Array(newCount).fill(6));
  }, [diceCount, isRolling]);

  const rollDice = useCallback(async () => {
    if (isRolling) return;
    
    // Trigger haptic feedback on native platforms
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error('Error triggering haptics:', error);
      }
    }

    setIsRolling(true);
    setError(null);

    // Only play sound if not on web platform and sound is loaded
    if (Platform.OS !== 'web' && sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }

    const newValues = Array(diceCount).fill(0).map(() => 
      Math.floor(Math.random() * 6) + 1
    );
    
    setDiceValues(newValues);

    setTimeout(() => {
      setIsRolling(false);
    }, 400);
  }, [diceCount, isRolling, sound]);

  useEffect(() => {
    let subscription: ReturnType<typeof Accelerometer.addListener>;

    if (isShakeEnabled && Platform.OS !== 'web') {
      Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_TIMEOUT && !isRolling) {
          setLastShakeTime(now);
          rollDice();
        }
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isShakeEnabled, lastShakeTime, isRolling, rollDice]);

  const getDiceSize = () => {
    const maxWidth = Math.min(windowWidth - 40, 500);
    const maxHeight = windowHeight * 0.4;
    
    let baseSize;
    if (diceCount === 1) {
      baseSize = Math.min(maxWidth * 0.45, maxHeight * 0.45);
    } else {
      // For 2 or more dice, make them slightly smaller
      baseSize = Math.min(maxWidth * 0.3, maxHeight * 0.3);
    }
    
    return Math.min(Math.max(baseSize, 60), 120);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://adventuresinspeechpathology.com/wp-content/uploads/2025/04/Adventures-In-Speech-Pathology-Logo-white.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[
                styles.controlButton,
                (diceCount <= 1 || isRolling) && styles.controlButtonDisabled
              ]}
              onPress={() => adjustDiceCount(false)}
              disabled={diceCount <= 1 || isRolling}>
              <Minus color={diceCount <= 1 || isRolling ? "#666" : "#A7E350"} size={24} />
            </TouchableOpacity>
            <Text style={styles.diceCount}>{diceCount}</Text>
            <TouchableOpacity
              style={[
                styles.controlButton,
                (diceCount >= 4 || isRolling) && styles.controlButtonDisabled
              ]}
              onPress={() => adjustDiceCount(true)}
              disabled={diceCount >= 4 || isRolling}>
              <Plus color={diceCount >= 4 || isRolling ? "#666" : "#A7E350"} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.mainContent}>
          <View style={styles.diceContainer}>
            <View style={[
              styles.diceWrapper,
              diceCount >= 3 && styles.gridWrapper
            ]}>
              {diceCount >= 3 ? (
                <>
                  <View style={styles.gridRow}>
                    {diceValues.slice(0, 2).map((value, index) => (
                      <View key={index} style={styles.diceItem}>
                        <DiceFace
                          value={value}
                          size={getDiceSize()}
                          isRolling={isRolling}
                          index={index}
                        />
                      </View>
                    ))}
                  </View>
                  <View style={styles.gridRow}>
                    {diceValues.slice(2, 4).map((value, index) => (
                      <View key={index + 2} style={styles.diceItem}>
                        <DiceFace
                          value={value}
                          size={getDiceSize()}
                          isRolling={isRolling}
                          index={index + 2}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                diceValues.map((value, index) => (
                  <View key={index} style={styles.diceItem}>
                    <DiceFace
                      value={value}
                      size={getDiceSize()}
                      isRolling={isRolling}
                      index={index}
                    />
                  </View>
                ))
              )}
            </View>
          </View>

          {diceValues.length > 0 && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {diceValues.reduce((sum, value) => sum + value, 0)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.rollButton, isRolling && styles.rollButtonDisabled]}
            onPress={rollDice}
            disabled={isRolling}>
            <Text style={styles.rollButtonText}>
              {isRolling ? 'Rolling...' : Platform.OS === 'web' ? 'Roll Dice' : 'Roll or Shake'}
            </Text>
            <RefreshCw size={24} color="#0A4E2E" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A4E2E',
  },
  content: {
    flex: 1,
    margin: 10,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    height: 80,
  },
  logoContainer: {
    flex: 1,
    marginRight: 16,
    height: '100%',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  diceCount: {
    color: '#A7E350',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  diceContainer: {
    flex: 1,
    backgroundColor: '#1EA067',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  diceWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  gridWrapper: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 40,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  diceItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceFace: {
    backgroundColor: '#fff',
    borderRadius: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  totalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  totalValue: {
    color: '#A7E350',
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
  },
  rollButton: {
    backgroundColor: '#A7E350',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rollButtonDisabled: {
    opacity: 0.5,
  },
  rollButtonText: {
    color: '#0A4E2E',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
});