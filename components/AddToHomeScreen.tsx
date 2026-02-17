import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../lib/i18n';

const { width } = Dimensions.get('window');

interface Step {
  icon: string;
  title: string;
  description: string;
  illustration?: string;
}

export const AddToHomeScreen = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const iosSteps: Step[] = [
    {
      icon: 'phone-portrait-outline',
      title: t('addToHomeScreen.welcomeTitle'),
      description: t('addToHomeScreen.welcomeDesc'),
    },
    {
      icon: 'share-outline',
      title: t('addToHomeScreen.iosShareButton'),
      description: t('addToHomeScreen.iosShareButtonDesc'),
      illustration: 'arrow-down',
    },
    {
      icon: 'add-circle-outline',
      title: t('addToHomeScreen.iosAddToHome'),
      description: t('addToHomeScreen.iosAddToHomeDesc'),
    },
    {
      icon: 'checkmark-circle',
      title: t('addToHomeScreen.iosComplete'),
      description: t('addToHomeScreen.iosCompleteDesc'),
    },
  ];

  const androidSteps: Step[] = [
    {
      icon: 'phone-portrait-outline',
      title: t('addToHomeScreen.welcomeTitle'),
      description: t('addToHomeScreen.welcomeDesc'),
    },
    {
      icon: 'menu-outline',
      title: t('addToHomeScreen.androidOpenMenu'),
      description: t('addToHomeScreen.androidOpenMenuDesc'),
    },
    {
      icon: 'add-circle-outline',
      title: t('addToHomeScreen.androidAddToHome'),
      description: t('addToHomeScreen.androidAddToHomeDesc'),
    },
    {
      icon: 'checkmark-circle',
      title: t('addToHomeScreen.androidComplete'),
      description: t('addToHomeScreen.androidCompleteDesc'),
    },
  ];

  const steps = isIOS ? iosSteps : androidSteps;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // @ts-ignore
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const hasClosed = localStorage.getItem('hasClosedAddToHomeScreen_v4');
    if (hasClosed) return;

    // @ts-ignore
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    setTimeout(() => {
      setIsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1500);
  }, []);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (dontShowAgain) {
        localStorage.setItem('hasClosedAddToHomeScreen_v4', 'true');
      }
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({ x: nextStep * (width - 80), animated: true });
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollViewRef.current?.scrollTo({ x: prevStep * (width - 80), animated: true });
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (width - 80));
    setCurrentStep(slideIndex);
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.scrollView}
            >
              {steps.map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <View style={styles.iconWrapper}>
                    <Ionicons name={step.icon as any} size={48} color="#2ebd85" />
                  </View>
                  
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.indicatorContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentStep === index && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity onPress={handlePrev} style={styles.btnSecondary}>
                  <Text style={styles.btnSecondaryText}>{t('addToHomeScreen.prevStep')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                style={[styles.btnPrimary, currentStep === 0 && styles.btnPrimaryFull]}
              >
                <Text style={styles.btnPrimaryText}>
                  {currentStep === steps.length - 1
                    ? t('addToHomeScreen.complete')
                    : currentStep === 0
                      ? t('addToHomeScreen.start')
                      : t('addToHomeScreen.nextStep')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.checkboxContainer}
              activeOpacity={0.8}
              onPress={() => setDontShowAgain(!dontShowAgain)}
            >
              <Ionicons
                name={dontShowAgain ? "checkbox" : "square-outline"}
                size={18}
                color={dontShowAgain ? "#2ebd85" : "#9ca3af"}
              />
              <Text style={styles.checkboxText}>{t('addToHomeScreen.dontShowAgain')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width - 80,
    maxWidth: 340,
    zIndex: 10,
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 20,
  },
  scrollView: {
    marginTop: 8,
  },
  stepContainer: {
    width: width - 120,
    maxWidth: 300,
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  illustrationContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  illustrationText: {
    color: '#2ebd85',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3f3f46',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#2ebd85',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#2ebd85',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryFull: {
    flex: 1,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#27272a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnSecondaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  checkboxText: {
    color: '#9ca3af',
    fontSize: 13,
    marginLeft: 6,
  },
});
