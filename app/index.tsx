// index.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  ImageBackground,
  Image,
  ImageSourcePropType,
  Platform,
  Keyboard,
  Animated,
  Alert,
  Button,
} from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVPlaybackSource, Audio } from 'expo-av';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import ImageZoom from 'react-native-image-pan-zoom';
import { registerRootComponent } from 'expo';

// Assets (fake path since it's in single-file, you must adjust this in real app)
const images = {
  home: require('./assets/home.jpg'),
  galleryBackground: require('./assets/galleryBackground.jpg'),
  campaignsBackground: require('./assets/campaignsBackground.jpg'),
  campaigns_screen: require('./assets/campaigns_screen.jpg'),
  warriors: require('./assets/warriors.jpg'),
  colorWheel: require('./assets/colorWheel.jpg'),
  about: require('./assets/about.jpg'),
  trophyRoom: require('./assets/trophyRoom.jpg'),
  splash: require('./assets/splash.jpg'),
  orks: require('./assets/orks.jpg'),
  bruce: require('./assets/bruce.jpg'),
  helper: require('./assets/helper.png'),
};

const sounds = {
  splash: require('./assets/sounds/splash.mp3'),
  campaign: require('./assets/sounds/campaign.mp3'),
  campaignRemove: require('./assets/sounds/campaign_remove.mp3'),
  warrior: require('./assets/sounds/warrior.mp3'),
  warriorRemove: require('./assets/sounds/warrior_remove.mp3'),
  trophy: require('./assets/sounds/trophy.mp3'),
};

const music = {
  backgroundMusic: require('./assets/music/background.mp3'),
};

const fonts = {
  Cinzel: require('./assets/fonts/Cinzel-Regular.ttf'),
};

// Theme
const theme = {
  fonts,
  colors: {
    background: 'black',
    text: 'white',
    accent: '#36454F',
    overlay: 'rgba(0, 0, 0, 0.65)',
    overlayStrong: 'rgba(0, 0, 0, 0.75)',
  },
  images,
  sounds,
  music,
};

// Types
type Campaign = {
  id: string;
  name: string;
  description?: string;
  image?: any;
  warriors?: Warrior[];
};

type Warrior = {
  id: string;
  name: string;
  desc: string;
  notes: string;
  image?: any;
  time: number;
};

type Theme = typeof theme;

type RootDrawerParamList = {
  Home: undefined;
  Campaigns: undefined;
  Warriors: undefined;
  Gallery: undefined;
  About: undefined;
  'Trophy Room': undefined;
  'Developer Tools': undefined;
  'Color Wheel': undefined;
};

// Drawer
const Drawer = createDrawerNavigator<RootDrawerParamList>();

// Sound Cache
const loadedSounds: Record<string, Audio.Sound> = {};

const loadSound = async (soundFile: any) => {
  const key = soundFile.toString();
  if (!loadedSounds[key]) {
    const { sound } = await Audio.Sound.createAsync(soundFile);
    loadedSounds[key] = sound;
  }
};

  
  type CampaignsScreenProps = {
    campaigns: Campaign[];
    setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
    activeCampaign: Campaign | null;
    setActiveCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
    navigation: DrawerNavigationProp<any>;
  };
  const playSound = async (soundFile: AVPlaybackSource) => {
  const key = soundFile.toString();
  let sound = loadedSounds[key];
  if (!sound) {
    const { sound: newSound } = await Audio.Sound.createAsync(soundFile);
    loadedSounds[key] = newSound;
    sound = newSound;
  }
  try {
    await sound.replayAsync();
  } catch (err) {
    console.warn('🔊 Error playing sound', err);
  }
};

// Trophy logic
const TROPHY_KEY = 'trophiesAchieved';

const getAchievedTrophies = async (): Promise<Record<string, any>> => {
  const data = await AsyncStorage.getItem(TROPHY_KEY);
  return data ? JSON.parse(data) : {};
};

const awardTrophy = async (id: string, theme: Theme) => {
  const trophies = await getAchievedTrophies();
  if (trophies[id]) return false;

  trophies[id] = {
    achieved: true,
    timestamp: new Date().toISOString(),
  };

  await AsyncStorage.setItem(TROPHY_KEY, JSON.stringify(trophies));
  if (theme?.sounds?.trophy) await playSound(theme.sounds.trophy);
  return true;
};

const resetTrophies = async () => {
  await AsyncStorage.removeItem(TROPHY_KEY);
};
// Home Screen
type HomeScreenProps = {
    navigation: DrawerNavigationProp<any>;
    activeCampaign?: Campaign;
  };
  
  const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, activeCampaign }) => {
    const [isVisible, setIsVisible] = useState(false);
    const buttonLabel = activeCampaign
      ? `▶️ Resume "${activeCampaign.name}"`
      : '🚀 Start a New Campaign';
  
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground style={styles.fullFlex} resizeMode="cover" source={theme.images.home}>
          <View style={styles.headerBlock}>
            <Text style={[styles.heading, styles.overlayBox]}>Welcome Commander</Text>
          </View>
          <View style={styles.helperRow}>
            <Pressable onPress={() => setIsVisible(!isVisible)}>
              <Image style={styles.helperIcon} source={theme.images.helper} />
            </Pressable>
            {isVisible && (
              <Text style={styles.helperText}>🔍 Let's get painting!</Text>
            )}
          </View>
          <View style={styles.bottomTextBlock}>
            <Text style={styles.infoText}>
              {activeCampaign
                ? `Your campaign "${activeCampaign.name}" awaits.`
                : 'Start a new painting campaign to build your army.'}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Campaigns')}>
            <Text style={styles.launchButton}>{buttonLabel}</Text>
          </Pressable>
        </ImageBackground>
      </SafeAreaView>
    );
  };
  
  // Color Wheel Screen
  const ColorWheelScreen: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { width, height } = Dimensions.get('window');
    const imageZoomRef = useRef<any>(null);
  
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <ImageZoom
        {...{
          ref:{imageZoomRef},
          cropWidth:{width},
          cropHeight:{height},
          imageWidth:{width},
          imageHeight:{height},
          minScale:1,
          maxScale:3,
          onDoubleClick: imageZoomRef.current?.reset(),
          } as any}>
          <Image
            style={{ width, height }}
            source={theme.images.colorWheel}
            resizeMode="contain"
          />
        </ImageZoom>
        <View style={{
          position: 'absolute',
          top: 10,
          right: 10,
          flexDirection: 'row-reverse',
          alignItems: 'center',
        }}>
          <Pressable onPress={() => setIsVisible(!isVisible)}>
            <Image
              style={{
                height: 40,
                width: 40,
                justifyContent: 'flex-end',
                alignSelf: 'flex-end',
              }}
              source={theme.images.helper}
            />
          </Pressable>
          {isVisible && (
            <Text style={styles.helperText}>🔍Double tap to reset!</Text>
          )}
        </View>
      </View>
    );
  };
  
  // Gallery Screen
  const GalleryScreen: React.FC = () => {
    const galleryImages = [
      { file: theme.images.orks, description: 'Bruce and his ride are assembled.' },
      { file: theme.images.bruce, description: 'Not all of these orks are painted.' },
    ];
  
    const [isVisible, setIsVisible] = useState(false);
    const { width, height } = Dimensions.get('window');
    const imageZoomRef = useRef<any>(null);
    const [index, setIndex] = useState(0);
  
    const goNext = () => setIndex((prev) => (prev + 1) % galleryImages.length);
    const goPrev = () => setIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <ImageBackground
          style={{ flex: 1 }}
          resizeMode="cover"
          source={theme.images.galleryBackground}>
          <View style={{
            flex: 1,
            width: '85%',
            height: 385,
            paddingTop: 80,
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'center',
          }}>
            <ImageZoom
            {...{
              ref:{imageZoomRef},
              cropWidth:{width},
              cropHeight:{height},
              imageWidth:(width * 0.9),
              imageHeight:(height * 0.9),
              minScale:1,
              maxScale:3,
              onDoubleClick: imageZoomRef.current?.reset(),
              } as any}>
              <Image
                style={{ width, height, alignItems: 'center' }}
                source={galleryImages[index].file}
                resizeMode="contain"
              />
            </ImageZoom>
          </View>
          <View style={{
            position: 'absolute',
            top: 10,
            right: 10,
            flexDirection: 'row-reverse',
            alignItems: 'center',
          }}>
            <Pressable onPress={() => setIsVisible(!isVisible)}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                  justifyContent: 'flex-end',
                  alignSelf: 'flex-end',
                }}
                source={theme.images.helper}
              />
            </Pressable>
            {isVisible && (
              <Text style={styles.helperText}>🔍Double tap to reset the image!</Text>
            )}
          </View>
          <View style={{
            alignItems: 'center',
            padding: 10,
            borderRadius: 6,
          }}>
            <Text style={{
              fontSize: 20,
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.65)',
              padding: 5,
              borderRadius: 10,
              textAlign: 'center',
              marginTop: 10,
            }}>
              {galleryImages[index].description}
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 20,
            }}>
              <TouchableOpacity onPress={goPrev}>
                <AntDesign name="leftcircle" size={48} color="white" />
              </TouchableOpacity>
              <Text style={{
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
                backgroundColor: 'rgba(0,0,0,0.65)',
              }}>
                {index + 1} / {galleryImages.length}
              </Text>
              <TouchableOpacity onPress={goNext}>
                <AntDesign name="rightcircle" size={48} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  };
  
  // About Screen
  const AboutScreen: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <ImageBackground
          style={{ height: '100%', width: '100%' }}
          source={theme.images.about}>
          <View style={{
            flexDirection: 'row-reverse',
            padding: 10,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            paddingTop: 10,
          }}>
            <Pressable onPress={() => setIsVisible(!isVisible)}>
              <Image
                style={{
                  height: 40,
                  width: 40,
                  justifyContent: 'flex-end',
                  alignSelf: 'flex-end',
                }}
                source={theme.images.helper}
              />
            </Pressable>
            {isVisible && (
              <Text style={styles.helperText}>
                🔍I am the helpful Paint Warrior!
              </Text>
            )}
          </View>
          <View style={{ paddingLeft: 20, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{
              color: 'white',
              fontSize: 24,
              marginBottom: 20,
              backgroundColor: 'rgba(0, 0, 0, .75)',
              paddingBottom: 10,
              borderRadius: 6,
            }}>
              🎨 About This App
            </Text>
            <Text style={{
              color: 'white',
              fontSize: 20,
              textAlign: 'left',
              padding: 5,
              borderRadius: 6,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            }}>
              This app helps you stay motivated while painting miniatures with goal tracking and rewards!
              {'\n'}Gamify your painting process with achievements, gallery, and a trophy room.
              {'\n'}Future features: Daily logs, reminders, recipe vault, stats, and full motivation tracker.
            </Text>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  };

  const TrophyRoomScreen: React.FC = () => {
    const [achieved, setAchieved] = useState<Record<string, any>>({});
  
    const trophies = useMemo(
      () => [
        { id: '1', name: 'First Blood', desc: 'Painted your first warrior!' },
        { id: '2', name: 'Ten Strong', desc: '10 Warriors added to your army.' },
        { id: '3', name: 'Endurance', desc: 'Painted for 1+ hour total.' },
        { id: 'visit', name: 'Welcome!', desc: 'Visited the Trophy Room!' },
      ],
      []
    );
  
    useEffect(() => {
      const checkTrophies = async () => {
        const stored = await getAchievedTrophies();
        const newAchievements = { ...stored };
        let updated = false;
  
        for (let trophy of trophies) {
          if (!stored[trophy.id] && trophy.id === 'visit') {
            const awarded = await awardTrophy(trophy.id, theme);
            if (awarded) {
              updated = true;
            }
          }
        }
  
        if (updated) {
          const refreshed = await getAchievedTrophies();
          setAchieved(refreshed);
        } else {
          setAchieved(stored);
        }
      };
  
      checkTrophies();
    }, [trophies]);
  
    return (
      <ImageBackground
        source={theme.images.trophyRoom}
        style={styles.container}
      >
        <Text style={styles.heading}>🏆 Trophy Room</Text>
        <FlatList
          data={trophies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isAchieved = achieved[item.id];
            return (
              <View style={styles.trophyCard}>
                <MaterialIcons name="military-tech" size={48} color="gold" />
                <Text style={styles.trophyText}>
                  {item.name} {isAchieved && '✅'}
                </Text>
                <Text style={{ color: 'white', textAlign: 'center' }}>
                  {item.desc}
                </Text>
              </View>
            );
          }}
        />
      </ImageBackground>
    );
  };
  
  const CampaignsScreen: React.FC<CampaignsScreenProps> = ({
    campaigns,
    setCampaigns,
    activeCampaign,
    setActiveCampaign,
    navigation,
  }) => {
    const [newCampaign, setNewCampaign] = useState({ name: '', desc: '', imageUri: null as string | null });
    const [newExpanded, setNewExpanded] = useState(false);
    const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCampaign, setEditCampaign] = useState({ name: '', desc: '', imageUri: null as string | null });
  
    useEffect(() => {
      AsyncStorage.setItem('campaigns', JSON.stringify(campaigns));
    }, [campaigns]);
  
    const handlePickImage = async (setUri: (uri: string) => void) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
  
      if (!result.canceled && result.assets.length > 0) {
        setUri(result.assets[0].uri);
      }
    };
  
    const addCampaign = async () => {
      if (!newCampaign.name.trim()) return;
      const camp: Campaign = {
        id: Date.now().toString(),
        name: newCampaign.name,
        description: newCampaign.desc,
        image: newCampaign.imageUri ? { uri: newCampaign.imageUri } : theme.images.campaignsBackground,
        warriors: [],
      };
      await playSound(theme.sounds.campaign);
      setCampaigns(prev => [...prev, camp]);
      setNewCampaign({ name: '', desc: '', imageUri: null });
      setNewExpanded(false);
      setExpandedCampaigns(prev => ({ ...prev, [camp.id]: true }));
    };
  
    const startEdit = (camp: Campaign) => {
      setEditingId(camp.id);
      setEditCampaign({
        name: camp.name,
        desc: camp.description ?? '',
        imageUri: (camp.image as any)?.uri ?? null,
      });
    };
  
    const saveEdit = () => {
      if (!editingId) return;
      setCampaigns(prev =>
        prev.map(c =>
          c.id === editingId
            ? {
                ...c,
                name: editCampaign.name,
                description: editCampaign.desc,
                image: editCampaign.imageUri ? { uri: editCampaign.imageUri } : c.image,
              }
            : c
        )
      );
      setEditingId(null);
    };
  
    const deleteCampaign = async (id: string) => {
      await playSound(theme.sounds.campaignRemove);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    };
  
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground source={theme.images.campaignsBackground} style={styles.fullFlex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={60}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.heading}>🎯 Campaigns</Text>
  
                <Pressable onPress={() => setNewExpanded(!newExpanded)}>
                  <Text style={styles.subheading}>
                    {newExpanded ? '▼' : '▶'} New Campaign
                  </Text>
                </Pressable>
  
                {newExpanded && (
                  <>
                    <TextInput
                      placeholder="Name"
                      value={newCampaign.name}
                      onChangeText={text => setNewCampaign({ ...newCampaign, name: text })}
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Description"
                      value={newCampaign.desc}
                      onChangeText={text => setNewCampaign({ ...newCampaign, desc: text })}
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => handlePickImage(uri => setNewCampaign({ ...newCampaign, imageUri: uri }))}>
                      <Text style={styles.iconButtonText}>🖼 Pick Image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={addCampaign}>
                      <Text style={styles.iconButtonText}>✅ Add Campaign</Text>
                    </TouchableOpacity>
                  </>
                )}
  
                {campaigns.map(camp => {
                  const isExpanded = expandedCampaigns[camp.id] ?? false;
  
                  return (
                    <View key={camp.id} style={styles.card}>
                      <Pressable onPress={() =>
                        setExpandedCampaigns(prev => ({ ...prev, [camp.id]: !prev[camp.id] }))
                      }>
                        <Text style={styles.text}>{isExpanded ? '▼' : '▶'} {camp.name}</Text>
                      </Pressable>
  
                      {isExpanded && (
                        <>
                          {editingId === camp.id ? (
                            <>
                              <TextInput
                                value={editCampaign.name}
                                onChangeText={text => setEditCampaign({ ...editCampaign, name: text })}
                                style={styles.input}
                              />
                              <TextInput
                                value={editCampaign.desc}
                                onChangeText={text => setEditCampaign({ ...editCampaign, desc: text })}
                                style={styles.input}
                              />
                              <TouchableOpacity onPress={() => handlePickImage(uri => setEditCampaign({ ...editCampaign, imageUri: uri }))}>
                                <Text style={styles.iconButtonText}>🖼 Change Image</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={saveEdit}>
                                <Text style={styles.iconButtonText}>💾 Save</Text>
                              </TouchableOpacity>
                            </>
                          ) : (
                            <>
                              <Text style={styles.text}>{camp.description}</Text>
                              <TouchableOpacity onPress={() => startEdit(camp)}>
                                <Text style={styles.iconButtonText}>✏️ Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => deleteCampaign(camp.id)}>
                                <Text style={styles.iconButtonText}>🗑 Delete</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => {
                                setActiveCampaign(camp);
                                AsyncStorage.setItem('activeCampaign', JSON.stringify(camp));
                                navigation.navigate('Warriors');
                              }}>
                                <Text style={styles.iconButtonText}>🎖 Set Active</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </ImageBackground>
      </SafeAreaView>
    );
  };
  
  const App: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
    const [showSplash, setShowSplash] = useState(true);
    const [ready, setReady] = useState(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;
    const navigationRef = useNavigationContainerRef();
    const [fontsLoaded] = useFonts(theme.fonts);
  
    useEffect(() => {
      const init = async () => {
        await loadSound(theme.sounds.splash);
        await loadSound(theme.sounds.campaign);
        await loadSound(theme.sounds.campaignRemove);
        await loadSound(theme.sounds.trophy);
        await playSound(theme.sounds.splash);
      };
      init();
    }, []);
  
    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start(() => setReady(true));
        });
      }, 2000);
      return () => clearTimeout(timer);
    }, []);
  
    useEffect(() => {
      const loadStored = async () => {
        const storedCamps = await AsyncStorage.getItem('campaigns');
        const storedActive = await AsyncStorage.getItem('activeCampaign');
        if (storedCamps) setCampaigns(JSON.parse(storedCamps));
        if (storedActive) setActiveCampaign(JSON.parse(storedActive));
      };
      loadStored();
    }, []);
  
    if (!fontsLoaded) return null;
  
    return (
      <SafeAreaView style={styles.container}>
        {showSplash && (
          <Animated.View style={{ ...styles.splash, opacity: fadeAnim }}>
            <Image source={theme.images.splash} style={styles.splashImage} />
          </Animated.View>
        )}
        {ready && (
          <NavigationContainer ref={navigationRef}>
            <Drawer.Navigator>
              <Drawer.Screen name="Home">
                {(props) => <HomeScreen {...props} activeCampaign={activeCampaign ?? undefined} />}
              </Drawer.Screen>
              <Drawer.Screen name="Campaigns">
                {(props) => (
                  <CampaignsScreen
                    {...props}
                    campaigns={campaigns}
                    setCampaigns={setCampaigns}
                    activeCampaign={activeCampaign}
                    setActiveCampaign={setActiveCampaign}
                  />
                )}
              </Drawer.Screen>
              <Drawer.Screen name="Gallery" component={GalleryScreen} />
              <Drawer.Screen name="Color Wheel" component={ColorWheelScreen} />
              <Drawer.Screen name="Trophy Room" component={TrophyRoomScreen} />
              <Drawer.Screen name="About" component={AboutScreen} />
            </Drawer.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaView>
    );
  };
  
  registerRootComponent(App);
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    fullFlex: {
      flex: 1,
    },
    splash: {
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      width: '100%',
      height: '100%',
      zIndex: 99,
    },
    splashImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    drawer: {
      backgroundColor: theme.colors.overlay,
      width: 240,
      borderRadius: 6,
    },
    drawerLabel: {
      color: theme.colors.text,
      fontFamily: theme.fonts.Cinzel,
    },
    headerTitle: {
      fontWeight: 'bold',
      fontFamily: theme.fonts.Cinzel,
    },
    headerBlock: {
      backgroundColor: theme.colors.background,
      flex: 0.5,
    },
    heading: {
      color: theme.colors.text,
      fontSize: 28,
      fontFamily: theme.fonts.Cinzel,
      paddingHorizontal: 12,
      textAlign: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    overlayBox: {
      backgroundColor: theme.colors.overlayStrong,
    },
    helperRow: {
      padding: 10,
      flexDirection: 'row-reverse',
    },
    helperIcon: {
      height: 40,
      width: 40,
      justifyContent: 'flex-end',
      alignSelf: 'flex-end',
    },
    helperText: {
      color: '#33ceff',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      fontSize: 20,
      fontWeight: 'bold',
      alignSelf: 'flex-end',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    bottomTextBlock: {
      flex: 6,
      justifyContent: 'flex-end',
    },
    infoText: {
      backgroundColor: theme.colors.overlay,
      color: theme.colors.text,
      fontSize: 18,
      textAlign: 'left',
      paddingHorizontal: 15,
      marginVertical: 10,
      borderRadius: 6,
      fontFamily: theme.fonts.Cinzel,
    },
    subheading: {
      color: 'white',
      fontSize: 18,
      marginTop: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    input: {
      backgroundColor: 'white',
      marginVertical: 6,
      padding: 10,
      borderRadius: 6,
    },
    card: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      padding: 10,
      borderRadius: 8,
      marginVertical: 10,
    },
    trophyCard: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
      alignItems: 'center',
    },
    trophyText: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
    },
    text: {
      color: 'white',
    },
    iconButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#555',
      padding: 10,
      borderRadius: 6,
      marginVertical: 6,
    },
    iconButtonText: {
      color: 'white',
      fontSize: 16,
    },
    launchButton: {
      color: theme.colors.text,
      fontSize: 20,
      backgroundColor: '#333',
      padding: 10,
      borderRadius: 6,
      textAlign: 'center',
      margin: 20,
      fontFamily: theme.fonts.Cinzel,
    },
  });
      