import { Tabs } from 'expo-router';
import { StyleSheet, View, Image, Platform } from 'react-native';
import { Hash, Dice5 } from 'lucide-react-native';

const TabBarIcon = ({ Icon, color }: { Icon: any; color: string }) => (
  <View style={styles.iconContainer}>
    <Icon size={24} color={color} strokeWidth={2.5} />
  </View>
);

const AbacusTabIcon = ({ color }: { color: string }) => (
  <View style={styles.iconContainer}>
    <Image
      source={require('../../assets/images/abacus-icon.svg')}
      style={[
        styles.abacusIcon,
        { tintColor: color }
      ]}
    />
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#A7E350',
        tabBarInactiveTintColor: '#fff',
        tabBarBackground: () => (
          <View style={styles.tabBarBackground} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tally',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={Hash} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dice"
        options={{
          title: 'Dice',
          tabBarIcon: ({ color }) => <TabBarIcon Icon={Dice5} color={color} />,
        }}
      />
      <Tabs.Screen
        name="abacus"
        options={{
          title: 'Abacus',
          tabBarIcon: ({ color }) => <AbacusTabIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    backgroundColor: 'rgba(10, 78, 46, 0.95)',
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 78, 46, 0.95)',
  },
  iconContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abacusIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});