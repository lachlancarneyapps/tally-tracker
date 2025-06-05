import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, LayoutChangeEvent, Modal, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw, Plus, Minus, Smile, Frown, X, Check, Palette, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TallyIcon from '../../assets/images/tally-icon.svg';

interface TallyData {
  name: string;
  correct: number;
  tryAgain: number;
  total: number;
}

interface ColorPair {
  primary: string;
  secondary: string;
}

interface Action {
  playerIndex: number;
  type: 'correct' | 'tryAgain';
  timestamp: number;
}

const initialTallyData = {
  name: '',
  correct: 0,
  tryAgain: 0,
  total: 0,
};

const availableColors: ColorPair[] = [
  { primary: '#2ACE80', secondary: '#1EA067' }, // Green
  { primary: '#FF6B6B', secondary: '#E85D5D' }, // Red
  { primary: '#4D96FF', secondary: '#3F7FD9' }, // Blue
  { primary: '#FF69B4', secondary: '#D957A0' }, // Pink
  { primary: '#FFA500', secondary: '#E69500' }, // Orange
  { primary: '#9B59B6', secondary: '#8E44AD' }, // Purple
  { primary: '#FFD700', secondary: '#E6C200' }, // Gold
  { primary: '#00CED1', secondary: '#00B4B7' }, // Turquoise
];

function colorLuminance(hex: string, lum: number): string {
  hex = hex.replace(/^#/, '');
  let rgb = parseInt(hex, 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >> 8) & 0xff;
  let b = rgb & 0xff;

  r = Math.round(Math.min(Math.max(0, r + (r * lum)), 255));
  g = Math.round(Math.min(Math.max(0, g + (g * lum)), 255));
  b = Math.round(Math.min(Math.max(0, b + (b * lum)), 255));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function TallyTracker() {
  const [playerCount, setPlayerCount] = useState(1);
  const [buttonWidth, setButtonWidth] = useState<number>(0);
  const [showButtonText, setShowButtonText] = useState(true);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ColorPair | null>(null);
  const [actionHistory, setActionHistory] = useState<Action[]>([]);
  const [showTallyMarks, setShowTallyMarks] = useState(false);
  const [playerColors, setPlayerColors] = useState<ColorPair[]>([
    availableColors[0],
    availableColors[1],
    availableColors[2],
    availableColors[3],
  ]);
  const [players, setPlayers] = useState<TallyData[]>([
    { ...initialTallyData, name: 'Player 1' },
    { ...initialTallyData, name: 'Player 2' },
    { ...initialTallyData, name: 'Player 3' },
    { ...initialTallyData, name: 'Player 4' },
  ]);

  const adjustPlayerCount = (increment: boolean) => {
    if (increment && playerCount < 4) {
      setPlayerCount(playerCount + 1);
    } else if (!increment && playerCount > 1) {
      setPlayerCount(playerCount - 1);
    }
  };

  const handleCorrect = (index: number) => {
    setPlayers(current =>
      current.map((player, i) =>
        i === index
          ? {
              ...player,
              correct: player.correct + 1,
              total: player.total + 1,
            }
          : player
      )
    );
    setActionHistory(current => [
      ...current,
      { playerIndex: index, type: 'correct', timestamp: Date.now() }
    ]);
  };

  const handleTryAgain = (index: number) => {
    setPlayers(current =>
      current.map((player, i) =>
        i === index
          ? {
              ...player,
              tryAgain: player.tryAgain + 1,
              total: player.total + 1,
            }
          : player
      )
    );
    setActionHistory(current => [
      ...current,
      { playerIndex: index, type: 'tryAgain', timestamp: Date.now() }
    ]);
  };

  const handleUndo = () => {
    if (actionHistory.length === 0) return;

    const lastAction = actionHistory[actionHistory.length - 1];
    
    setPlayers(current =>
      current.map((player, i) =>
        i === lastAction.playerIndex
          ? {
              ...player,
              [lastAction.type]: player[lastAction.type] - 1,
              total: player.total - 1,
            }
          : player
      )
    );
    
    setActionHistory(current => current.slice(0, -1));
  };

  const handleReset = () => {
    setPlayers(current =>
      current.map(player => ({
        ...player,
        correct: 0,
        tryAgain: 0,
        total: 0,
      }))
    );
    setActionHistory([]);
  };

  const calculateAccuracy = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const getFontSizes = (playerCount: number) => {
    if (playerCount === 1) {
      return {
        total: 18,
        stat: 16,
        statValue: 36,
        accuracy: 16,
        accuracyValue: 24,
        button: 16,
        padding: 32,
      };
    }

    if (playerCount === 2) {
      return {
        total: 16,
        stat: 14,
        statValue: 32,
        accuracy: 14,
        accuracyValue: 20,
        button: 14,
        padding: 24,
      };
    }

    return {
      total: 14,
      stat: 12,
      statValue: 24,
      accuracy: 12,
      accuracyValue: 18,
      button: 12,
      padding: 16,
    };
  };

  const handleButtonLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setButtonWidth(width);
    setShowButtonText(width > 100);
  };

  const openColorPicker = (index: number) => {
    setSelectedPlayerIndex(index);
    setSelectedColor(null);
    setColorPickerVisible(true);
  };

  const handleColorSelect = (color: ColorPair) => {
    setSelectedColor(color);
  };

  const confirmColorSelection = () => {
    if (selectedColor) {
      setPlayerColors(current => {
        const newColors = [...current];
        newColors[selectedPlayerIndex] = selectedColor;
        return newColors;
      });
      setColorPickerVisible(false);
      setSelectedColor(null);
    }
  };

  const renderTallyMarks = (total: number) => {
    const groups = Math.floor(total / 5);
    const remainder = total % 5;
    const marks = [];

    for (let i = 0; i < groups; i++) {
      marks.push(
        <View key={`group-${i}`} style={styles.tallyGroup}>
          <View style={styles.tallyMarkContainer}>
            <View style={styles.tallyMark} />
            <View style={styles.tallyMark} />
            <View style={styles.tallyMark} />
            <View style={styles.tallyMark} />
            <View style={styles.tallyMark} />
            <View style={styles.tallyMarkDiagonal} />
          </View>
        </View>
      );
    }

    if (remainder > 0) {
      const remainingMarks = [];
      for (let i = 0; i < remainder; i++) {
        remainingMarks.push(
          <View
            key={`remainder-${i}`}
            style={styles.tallyMark}
          />
        );
      }
      marks.push(
        <View key="remainder-group" style={styles.tallyGroup}>
          <View style={styles.tallyMarkContainer}>
            {remainingMarks}
            {remainder === 5 && <View style={styles.tallyMarkDiagonal} />}
          </View>
        </View>
      );
    }

    return <View style={styles.tallyContainer}>{marks}</View>;
  };

  const renderQuadrant = (player: TallyData, index: number) => {
    const accuracy = calculateAccuracy(player.correct, player.total);
    const fontSizes = getFontSizes(playerCount);
    const { primary, secondary } = playerColors[index];
    
    const lighterPrimary = colorLuminance(primary, 0.8);
    const lighterSecondary = colorLuminance(secondary, 0.9);
    
    return (
      <Pressable 
        key={index}
        style={[
          styles.quadrant,
          playerCount === 1 && styles.singlePlayerQuadrant,
          playerCount === 2 && styles.twoPlayerQuadrant,
          playerCount >= 3 && styles.multiPlayerQuadrant,
        ]}>
        <LinearGradient
          colors={[primary, secondary]}
          style={[styles.quadrantContent, { padding: fontSizes.padding }]}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              onPress={() => openColorPicker(index)}
              style={[
                styles.quadrantIconButton,
                playerCount >= 3 && styles.leftToggle
              ]}>
              <Palette size={19} color="#fff" />
            </TouchableOpacity>
            {playerCount === 1 && (
              <TouchableOpacity 
                style={[
                  styles.quadrantIconButton,
                  playerCount >= 3 && styles.rightToggle,
                  showTallyMarks && { backgroundColor: '#fff' }
                ]}
                onPress={() => setShowTallyMarks(!showTallyMarks)}>
                <TallyIcon width={19} height={19} color={showTallyMarks ? primary : '#fff'} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[
            styles.statsContainer,
            playerCount === 2 && styles.statsContainerDouble
          ]}>
            <View style={[
              styles.totalBadge,
              playerCount === 2 && { marginTop: 20, marginBottom: 10 }
            ]}>
              <Text style={[
                styles.totalText,
                { fontSize: fontSizes.total, color: primary }
              ]}>
                Total: {player.total}
              </Text>
            </View>
            {showTallyMarks && playerCount === 1 && player.total > 0 && renderTallyMarks(player.total)}
            <View style={styles.mainStats}>
              <View style={styles.statBlock}>
                <Text style={[styles.statLabel, { fontSize: fontSizes.stat }]}>Correct</Text>
                <Text style={[styles.statValue, { fontSize: fontSizes.statValue }]}>{player.correct}</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={[styles.statLabel, styles.tryAgainLabel, { fontSize: fontSizes.stat }]}>Try Again</Text>
                <Text style={[styles.statValue, { fontSize: fontSizes.statValue }]}>{player.tryAgain}</Text>
              </View>
            </View>
            <View style={styles.accuracyContainer}>
              <Text style={[styles.accuracyLabel, { fontSize: fontSizes.accuracy }]}>Accuracy</Text>
              <Text style={[styles.accuracyValue, { fontSize: fontSizes.accuracyValue }]}>{accuracy}%</Text>
            </View>

            <View style={[
              styles.progressBarContainer,
              playerCount === 2 && { marginBottom: 40}
            ]}>
              <LinearGradient
                colors={[lighterPrimary, lighterSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                locations={[0, 1]}
                style={[
                  styles.progressBar,
                  { 
                    width: `${accuracy}%`,
                    opacity: 0.9,
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.buttonContainer} onLayout={handleButtonLayout}>
            <TouchableOpacity
              style={[styles.button, styles.correctButton]}
              onPress={() => handleCorrect(index)}>
              <Smile color="#2ACE80" size={fontSizes.button * 1.5} />
              {(playerCount === 1) && (
                <Text style={[styles.buttonText, { fontSize: fontSizes.button }]} numberOfLines={1}>
                  Correct
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.tryAgainButton]}
              onPress={() => handleTryAgain(index)}>
              <Frown color="#fb6969" size={fontSizes.button * 1.5} />
              {(playerCount === 1) && (
                <Text style={[styles.buttonText, styles.tryAgainButtonText, { fontSize: fontSizes.button }]} numberOfLines={1}>
                  Try Again
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Pressable>
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
          <View style={styles.headerButtons}>
            <Pressable 
              style={[styles.iconButton, playerCount <= 1 && styles.iconButtonDisabled]} 
              onPress={() => adjustPlayerCount(false)}
              disabled={playerCount <= 1}>
              <Minus size={24} color={playerCount <= 1 ? "#666" : "#A7E350"} />
            </Pressable>
            <Text style={styles.playerCount}>{playerCount}</Text>
            <Pressable 
              style={[styles.iconButton, playerCount >= 4 && styles.iconButtonDisabled]}
              onPress={() => adjustPlayerCount(true)}
              disabled={playerCount >= 4}>
              <Plus size={24} color={playerCount >= 4 ? "#666" : "#A7E350"} />
            </Pressable>
            <Pressable 
              style={[styles.iconButton, actionHistory.length === 0 && styles.iconButtonDisabled]} 
              onPress={handleUndo}
              disabled={actionHistory.length === 0}>
              <RotateCcw size={24} color={actionHistory.length === 0 ? "#666" : "#A7E350"} />
            </Pressable>
            <Pressable 
              style={[styles.iconButton, players.every(p => p.total === 0) && styles.iconButtonDisabled]} 
              onPress={handleReset}
              disabled={players.every(p => p.total === 0)}>
              <RefreshCw size={24} color={players.every(p => p.total === 0) ? "#666" : "#A7E350"} />
            </Pressable>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <View style={[
            styles.grid,
            playerCount === 2 && styles.twoPlayerGrid,
            playerCount >= 3 && styles.multiPlayerGrid,
          ]}>
            {playerCount === 1 ? (
              renderQuadrant(players[0], 0)
            ) : playerCount === 2 ? (
              players.slice(0, 2).map((player, index) => renderQuadrant(player, index))
            ) : (
              <>
                <View style={styles.gridRow}>
                  {players.slice(0, 2).map((player, index) => renderQuadrant(player, index))}
                </View>
                {playerCount > 2 && (
                  <View style={styles.gridRow}>
                    {players.slice(2, playerCount).map((player, index) => renderQuadrant(player, index + 2))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <Modal
          visible={colorPickerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setColorPickerVisible(false)}>
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setColorPickerVisible(false)}>
            <Pressable style={styles.colorPickerContainer}>
              <View style={styles.colorPickerHeader}>
                <Text style={styles.colorPickerTitle}>Choose Color</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setColorPickerVisible(false)}>
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.colorGrid}>
                {availableColors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleColorSelect(color)}
                    style={[
                      styles.colorOption,
                      selectedColor === color && styles.colorOptionSelected,
                    ]}>
                    <LinearGradient
                      colors={[color.primary, color.secondary]}
                      style={styles.colorSwatch}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedColor && styles.confirmButtonDisabled,
                ]}
                onPress={confirmColorSelection}
                disabled={!selectedColor}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
                <Check size={20} color="#fff" />
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButtonsMulti: {
    right: 'auto',
    left: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  playerCount: {
    color: '#A7E350',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  gridContainer: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flex: 1,
    gap: 16,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  twoPlayerGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  multiPlayerGrid: {
    flexDirection: 'column',
  },
  quadrant: {
    flex: 1,
  },
  singlePlayerQuadrant: {
    flex: 1,
  },
  twoPlayerQuadrant: {
    flex: 1,
    minHeight: 285,
  },
  multiPlayerQuadrant: {
    flex: 1,
  },
  quadrantContent: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  statsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statsContainerDouble: {
    paddingTop: 24,
  },
  tallyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  tallyGroup: {
    marginHorizontal: 4,
  },
  tallyMarkContainer: {
    flexDirection: 'row',
    gap: 4,
    width: 42,
    height: 20,
    position: 'relative',
  },
  tallyMark: {
    width: 2,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  tallyMarkDiagonal: {
    position: 'absolute',
    width: 37,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
    top: 10,
    left: 0,
    transform: [
      { translateY: 2 },
      { rotate: '20deg' },
      { translateX: -6 },
    ],
    transformOrigin: 'center',
  },
  totalBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  totalText: {
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    color: '#fff',
    marginBottom: 4,
  },
  tryAgainLabel: {
    color: '#fff',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  accuracyContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  accuracyLabel: {
    fontFamily: 'Inter_400Regular',
    color: '#fff',
    marginBottom: 2,
  },
  accuracyValue: {
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 6,
  },
  correctButton: {
    backgroundColor: '#fff',
  },
  tryAgainButton: {
    backgroundColor: '#fff',
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#2ACE80',
  },
  tryAgainButtonText: {
    color: '#fb6969',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPickerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  colorOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  colorOptionSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.1 }],
  },
  colorSwatch: {
    width: '100%',
    height: '100%',
  },
  confirmButton: {
    backgroundColor: '#2ACE80',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  toggleContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  quadrantIconButton: {
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftToggle: {
    position: 'absolute',
    left: 0,
  },
  rightToggle: {
    position: 'absolute',
    right: 0,
  },
});