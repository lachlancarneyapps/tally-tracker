import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const NUM_RODS = 6;
const BEADS_PER_ROD = 10;

const BEAD_COLORS = [
  '#FF69B4', '#FF6B6B', '#FFA500', '#FFD700', '#4169E1', '#9370DB'
];

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const abacusWidth = Math.min(windowWidth - 32, 1000);
const abacusHeight = Math.min(windowHeight * 0.85, 800);
const rodHeight = 4;
const availableWidth = abacusWidth - 48;
const beadWidth = Math.min(rodHeight * 10, availableWidth / (BEADS_PER_ROD * 1.5));
const beadHeight = beadWidth * 1.7;
const beadSpacing = 2;
const beadUnit = beadWidth + beadSpacing;

export default function AbacusScreen() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isSoundReady, setIsSoundReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const lastBeadPositionRef = useRef<{ [key: string]: number }>({});

  const sharedValuesRef = useRef(
    Array.from({ length: NUM_RODS }, () =>
      Array.from({ length: BEADS_PER_ROD }, (_, beadIndex) =>
        useSharedValue(beadIndex * beadUnit)
      )
    )
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSound() {
      if (Platform.OS === 'web') return;

      try {
        console.log('Setting up audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        console.log('Loading sound file...');
        const source = Platform.select({
          web: { uri: 'https://adventuresinspeechpathology.com/wp-content/uploads/2025/06/abacus.mp3' },
          default: require('../../assets/sounds/abacus.mp3')
        });

        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false, volume: 1.0 }
        );

        if (isMounted) {
          soundRef.current = sound;
          setIsSoundReady(true);
          console.log('Sound loaded successfully!');
        }
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    }

    loadSound();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const playBeadSound = async () => {
    console.log('Attempting to play bead sound...');
    console.log('Sound ready:', isSoundReady);
    console.log('Sound ref exists:', !!soundRef.current);

    if (Platform.OS === 'web' || !isSoundReady || !soundRef.current) {
      console.log('Skipping sound playback due to conditions not met');
      return;
    }

    try {
      console.log('Playing sound...');
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      console.log('Sound played successfully!');
    } catch (error) {
      console.error('Error playing bead sound:', error);
    }
  };

  const resetAbacus = () => {
    sharedValuesRef.current.forEach((rodBeads) => {
      rodBeads.forEach((sharedValue, beadIndex) => {
        sharedValue.value = beadIndex * beadUnit;
      });
    });
    setResetKey((prev) => prev + 1);
  };

  const rods = Array.from({ length: NUM_RODS }, (_, rodIndex) => ({
    id: `rod-${rodIndex}`,
    color: BEAD_COLORS[rodIndex],
    beads: Array.from({ length: BEADS_PER_ROD }, (_, beadIndex) => ({
      id: `bead-${rodIndex}-${beadIndex}`,
      index: beadIndex,
      sharedX: sharedValuesRef.current[rodIndex][beadIndex],
    })),
  }));

  const BeadComponent = ({ bead, rod }: any) => {
    const isDragging = useSharedValue(false);
    const lastTranslationX = useSharedValue(0);
    const beadKey = `${rod.id}-${bead.id}`;

    const gesture = Gesture.Pan()
      .onBegin(() => {
        isDragging.value = true;
        lastTranslationX.value = 0;
        lastBeadPositionRef.current[beadKey] = bead.sharedX.value;
      })
      .onUpdate((e) => {
        const dx = e.translationX - lastTranslationX.value;
        lastTranslationX.value = e.translationX;

        const rodBeads = rod.beads;
        const thisIndex = bead.index;
        const direction = dx > 0 ? 1 : -1;

        const minX = 0;
        const maxX = availableWidth - beadWidth;

        let index = thisIndex;

        while (index >= 0 && index < rodBeads.length) {
          const current = rodBeads[index];
          const nextIndex = index + direction;

          let proposedX = current.sharedX.value + dx;
          proposedX = Math.max(minX, Math.min(proposedX, maxX));

          const hasNext = nextIndex >= 0 && nextIndex < rodBeads.length;

          if (hasNext) {
            const nextBead = rodBeads[nextIndex];
            const nextX = nextBead.sharedX.value;

            const spacing = direction > 0
              ? proposedX + beadUnit > nextX
              : proposedX < nextX + beadUnit;

            if (spacing) {
              proposedX = direction > 0
                ? nextX - beadUnit
                : nextX + beadUnit;
            }
          }

          current.sharedX.value = proposedX;

          if (!hasNext) break;

          const overlapResolved = direction > 0
            ? proposedX + beadUnit >= maxX
            : proposedX <= minX;

          if (overlapResolved) break;

          index = nextIndex;
        }
      })
      .onFinalize(() => {
        isDragging.value = false;
        lastTranslationX.value = 0;

        // Only play sound if bead position has changed
        const finalPosition = bead.sharedX.value;
        const initialPosition = lastBeadPositionRef.current[beadKey];
        if (Math.abs(finalPosition - initialPosition) > 1) {
          console.log('Bead moved, playing sound...');
          playBeadSound().catch(console.error);
        } else {
          console.log('Bead movement too small, skipping sound');
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: bead.sharedX.value },
        { scale: withSpring(isDragging.value ? 1.1 : 1) },
      ],
      zIndex: isDragging.value ? 1 : 0,
    }));

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.bead,
            {
              width: beadWidth,
              height: beadHeight,
              backgroundColor: rod.color,
              borderColor: '#000',
              borderWidth: 1,
              top: -(beadHeight / 2) + rodHeight / 2,
              left: 0,
            },
            animatedStyle,
          ]}
        />
      </GestureDetector>
    );
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
          <TouchableOpacity style={styles.resetButton} onPress={resetAbacus}>
            <RefreshCw size={24} color="#A7E350" />
          </TouchableOpacity>
        </View>

        <View style={styles.abacusWrapper} key={resetKey}>
          <View style={[styles.abacusContainer, { width: abacusWidth, height: abacusHeight }]}>
            <View style={[styles.frame, { width: abacusWidth }]}>
              {rods.map((rod) => (
                <View
                  key={rod.id}
                  style={[
                    styles.rod,
                    {
                      height: rodHeight,
                      width: availableWidth,
                      marginVertical: 40,
                      backgroundColor: '#3e2622',
                    }
                  ]}>
                  {rod.beads.map((bead) => (
                    <BeadComponent key={bead.id} bead={bead} rod={rod} />
                  ))}
                </View>
              ))}
            </View>
          </View>
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
  resetButton: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  abacusWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  abacusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  frame: {
    backgroundColor: '#1EA067',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  rod: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 2,
    position: 'relative',
  },
  bead: {
    position: 'absolute',
    borderRadius: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
});