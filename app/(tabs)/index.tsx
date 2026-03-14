import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { fetchTiandiSpecials, subscribeToTiandiSpecials, TiandiSpecial, BallData, fetchLatestLotteryResult, subscribeToLotteryResults, LotteryResult } from '../../lib/tiandiService';
import { getPlatformConfig } from '../../lib/platformConfigService';
import { useAddToHomeScreen } from '../../contexts/AddToHomeScreenContext';
import { supabase } from '../../lib/supabase';
import Toast from '../../components/Toast';

// 呼吸边框组件
const BreathingBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const borderOpacity = useRef(new Animated.Value(0.3)).current;
  const borderWidth = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(borderOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(borderOpacity, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(borderWidth, {
            toValue: 3,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(borderWidth, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
    breathe.start();
    return () => {
      breathe.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.breathingBorderContainer,
        {
          borderColor: borderOpacity.interpolate({
            inputRange: [0.3, 1],
            outputRange: ['rgba(106, 168, 255, 0.3)', 'rgba(106, 168, 255, 1)'],
          }),
          borderWidth: borderWidth,
          shadowOpacity: borderOpacity.interpolate({
            inputRange: [0.3, 1],
            outputRange: [0.1, 0.5],
          }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 脉动按钮组件
const PulseButton: React.FC<{ onPress: () => void; text: string }> = ({ onPress, text }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity onPress={onPress} style={styles.pulseButton}>
        <Text style={styles.pulseButtonText}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 付费用户模拟数据（基础样本）
const PAID_USERS_BASE = [
  { name: '13847291563', time: '刚刚' },
  { name: 'zhangsan2024', time: '1分钟前' },
  { name: '15938472615', time: '2分钟前' },
  { name: 'lihua2024', time: '3分钟前' },
  { name: '18694725381', time: '5分钟前' },
  { name: 'wangwu2024', time: '6分钟前' },
  { name: '17758291473', time: '8分钟前' },
  { name: 'xiaoming2024', time: '10分钟前' },
  { name: '13926184735', time: '12分钟前' },
  { name: 'chen2024', time: '15分钟前' },
  { name: '13573948261', time: '18分钟前' },
  { name: 'laoliu2024', time: '20分钟前' },
  { name: '18819472836', time: '22分钟前' },
  { name: 'sunqi2024', time: '25分钟前' },
  { name: '13658391742', time: '28分钟前' },
  { name: 'zhouba2024', time: '30分钟前' },
  { name: '15092746183', time: '32分钟前' },
  { name: 'wujiu2024', time: '35分钟前' },
  { name: '13746192835', time: '38分钟前' },
  { name: 'zhengshi2024', time: '40分钟前' },
  { name: '15183927461', time: '42分钟前' },
  { name: 'dongfang2024', time: '45分钟前' },
  { name: '15267491823', time: '48分钟前' },
  { name: 'ximen2024', time: '50分钟前' },
  { name: '15329184756', time: '52分钟前' },
  { name: 'nangua2024', time: '55分钟前' },
  { name: '15584736291', time: '58分钟前' },
  { name: 'beifang2024', time: '1小时前' },
  { name: '15646382917', time: '1小时前' },
  { name: 'zhongnan2024', time: '1小时前' },
  { name: '15791827364', time: '1小时前' },
  { name: 'huabei2024', time: '2小时前' },
  { name: '15853629184', time: '2小时前' },
  { name: 'dongbei2024', time: '2小时前' },
  { name: '15918273645', time: '2小时前' },
  { name: 'huazhong2024', time: '3小时前' },
  { name: '13064738291', time: '3小时前' },
  { name: 'huanan2024', time: '3小时前' },
  { name: '13192836471', time: '4小时前' },
  { name: 'xibei2024', time: '4小时前' },
  { name: '13247582916', time: '4小时前' },
  { name: 'xinjiang2024', time: '5小时前' },
  { name: '13383927164', time: '5小时前' },
  { name: 'xizang2024', time: '5小时前' },
  { name: '13456291837', time: '6小时前' },
  { name: 'yunnan2024', time: '6小时前' },
  { name: '13574829163', time: '6小时前' },
  { name: 'guizhou2024', time: '7小时前' },
  { name: '13629184735', time: '7小时前' },
  { name: 'sichuan2024', time: '7小时前' },
  { name: '13758291634', time: '8小时前' },
];

// 付费用户模拟数据（500条）
const PAID_USERS = Array.from({ length: 500 }, (_, index) => {
  const baseUser = PAID_USERS_BASE[index % PAID_USERS_BASE.length];
  return {
    ...baseUser,
  };
});

// 脱敏处理函数
const maskName = (name: string) => {
  if (name.includes('@')) {
    // 邮箱
    const [local, domain] = name.split('@');
    const maskedLocal = local.slice(0, 2) + '****';
    return `${maskedLocal}@${domain}`;
  } else if (/^\d{11}$/.test(name)) {
    // 手机号
    return name.slice(0, 3) + '****' + name.slice(7);
  } else {
    // 用户名
    if (name.length <= 2) return name + '****';
    return name.slice(0, 2) + '****';
  }
};

// 付费用户轮播组件
const PaidUsersMarquee: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % PAID_USERS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const user = PAID_USERS[currentIndex];

  return (
    <View style={styles.paidUsersContainer}>
      <Animated.Text style={[styles.paidUsersText, { opacity: fadeAnim }]}>
        <Text style={styles.paidUsersName}>{maskName(user.name)}</Text>
        <Text style={styles.paidUsersAction}> 已成功付费兑换</Text>
      </Animated.Text>
    </View>
  );
};

// 公告横幅组件
const ANNOUNCEMENTS = [
  '🎉 有奖竞猜活动火热进行中！',
  '� 每日15点公布预测，21:30开奖',
  '🔥 登录即可查看最新一期预测内容',
  '📱 下载APP享受更好体验',
];

const AnnouncementBanner: React.FC<{ onShowRules: () => void }> = ({ onShowRules }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // 淡出
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // 切换文字
        setCurrentIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
        // 淡入
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.announcementContainer}>
      <View style={styles.announcementIcon}>
        <Text style={styles.announcementIconText}>🔔</Text>
      </View>
      <View style={styles.announcementContent}>
        <Animated.Text style={[styles.announcementText, { opacity: fadeAnim }]}>
          {ANNOUNCEMENTS[currentIndex]}
        </Animated.Text>
      </View>
      <TouchableOpacity onPress={onShowRules} style={styles.rulesButton}>
        <Text style={styles.rulesButtonText}>查看规则</Text>
      </TouchableOpacity>
    </View>
  );
};

// 彩票类型
type LotteryType = 'hongkong' | 'macau' | 'newmacau';

// 时间配置默认值（启动后从数据库 platform_config 表加载）
const DEFAULT_DRAW_HOUR = 21;
const DEFAULT_DRAW_MINUTE = 35;
const DEFAULT_PREDICTION_HOUR = 15;
const DEFAULT_PREDICTION_MINUTE = 0;

// 二维码资源与微信号（如需替换请修改这里）
const CUSTOMER_SERVICE_QR = require('../../assets/images/customer-service-qr.jpg');
const CUSTOMER_SERVICE_WECHAT = '客服微信号';

// 六合彩预测数据（模拟数据）- 已废弃，使用数据库数据
// const PREDICTION_DATA = [];

// 模拟开奖数据
const LOTTERY_DATA = {
  hongkong: {
    name: '香港六合彩',
    period: '047期',
    numbers: [
      { num: '41', animal: '牛', color: 'blue' },
      { num: '08', animal: '狗', color: 'red' },
      { num: '20', animal: '狗', color: 'blue' },
      { num: '49', animal: '蛇', color: 'green' },
      { num: '14', animal: '龙', color: 'blue' },
      { num: '43', animal: '猪', color: 'green' },
    ],
    special: { num: '33', animal: '鸡', color: 'green' },
    nextDate: '02月17日(周二)',
    nextPeriod: '048期',
  },
  macau: {
    name: '澳门六合彩',
    period: '047期',
    numbers: [
      { num: '12', animal: '马', color: 'red' },
      { num: '25', animal: '鼠', color: 'blue' },
      { num: '38', animal: '虎', color: 'green' },
      { num: '07', animal: '鸡', color: 'red' },
      { num: '19', animal: '猪', color: 'red' },
      { num: '44', animal: '马', color: 'green' },
    ],
    special: { num: '21', animal: '蛇', color: 'green' },
    nextDate: '02月17日(周二)',
    nextPeriod: '048期',
  },
  newmacau: {
    name: '新澳门六合彩',
    period: '047期',
    numbers: [
      { num: '05', animal: '兔', color: 'green' },
      { num: '16', animal: '鼠', color: 'blue' },
      { num: '29', animal: '猴', color: 'red' },
      { num: '32', animal: '羊', color: 'green' },
      { num: '11', animal: '马', color: 'red' },
      { num: '47', animal: '羊', color: 'blue' },
    ],
    special: { num: '03', animal: '牛', color: 'blue' },
    nextDate: '02月17日(周二)',
    nextPeriod: '048期',
  },
};

// 获取球的颜色样式
const getBallStyle = (color: string) => {
  switch (color) {
    case 'red':
      return styles.redBall;
    case 'blue':
      return styles.blueBall;
    case 'green':
      return styles.greenBall;
    default:
      return styles.blueBall;
  }
};

// 获取球的边框颜色
const getBallBorderStyle = (color: string) => {
  switch (color) {
    case 'red':
      return styles.redBallBorder;
    case 'blue':
      return styles.blueBallBorder;
    case 'green':
      return styles.greenBallBorder;
    default:
      return styles.blueBallBorder;
  }
};

// 解析预测内容，高亮天肖/地肖
const renderPredictionContent = (content: string) => {
  const innerContent = content.replace(/[【】]/g, '');
  const parts = innerContent.split('+');
  
  return (
    <View style={styles.predictionContentContainer}>
      {parts.map((part, index) => {
        const isTianXiao = part.includes('天肖');
        const isDiXiao = part.includes('地肖');
        
        if (isTianXiao || isDiXiao) {
          return (
            <Text key={index}>
              <Text style={styles.xiaoHighlight}>【{isTianXiao ? '天肖' : '地肖'}】</Text>
              {part.replace(/天肖|地肖/, '') && (
                <Text style={styles.predictionAnimalText}>{part.replace(/天肖|地肖/, '')}</Text>
              )}
              {index < parts.length - 1 && <Text style={styles.plusText}>+</Text>}
            </Text>
          );
        }
        
        return (
          <Text key={index} style={styles.predictionAnimalText}>
            {part}
            {index < parts.length - 1 && <Text style={styles.plusText}>+</Text>}
          </Text>
        );
      })}
    </View>
  );
};

const renderDescriptionContent = (description?: string | null) => {
  if (!description || !description.trim()) {
    return (
      <View style={styles.legendLeft}>
        <Text style={styles.legendText}>
          <Text style={styles.tianXiaoLabel}>天肖：</Text>
          <Text style={styles.tianXiaoAnimals}>【兔马猴猪牛龙】</Text>
        </Text>
        <Text style={styles.legendText}>
          <Text style={styles.diXiaoLabel}>地肖：</Text>
          <Text style={styles.diXiaoAnimals}>【蛇羊鸡狗鼠虎】</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.legendLeft}>
      {description.split(/\r?\n/).filter(Boolean).map((line, index) => (
        <Text key={`${line}-${index}`} style={styles.legendText}>
          {line}
        </Text>
      ))}
    </View>
  );
};

// 渲染预测结果：直接使用 JOIN 后的 special_animal / special_num
const renderPredictionResult = (item: TiandiSpecial) => {
  if (item.special_num === null || item.special_num === undefined) {
    return <Text style={styles.pendingResultText}>待开奖</Text>;
  }

  const numStr = String(item.special_num).padStart(2, '0');

  return (
    <View style={styles.resultContainer}>
      <Text style={styles.predictionResultText}>
        特<Text style={styles.resultAnimal}>{item.special_animal}</Text>
        <Text style={styles.resultNumber}>{numStr}</Text>
      </Text>
      {item.is_correct === true  && <Text style={styles.hitBadge}>✅</Text>}
      {item.is_correct === false && <Text style={styles.missBadge}>❌</Text>}
    </View>
  );
};

export default function LotteryPage() {
  const { showPrompt } = useAddToHomeScreen();
  const [activeTab, setActiveTab] = useState<LotteryType>('macau');
  const [drawCountdown, setDrawCountdown] = useState<string>('');
  const [predictionCountdown, setPredictionCountdown] = useState<string>('');
  const router = useRouter();
  const { session, user, profile, refreshProfile } = useAuth();
  const [tiandiData, setTiandiData] = useState<TiandiSpecial[]>([]);
  const [tiandiLoading, setTiandiLoading] = useState(true);
  const [lotteryResult, setLotteryResult] = useState<LotteryResult | null>(null);

  // 时间配置（仅用于倒计时展示）
  const [DRAW_HOUR, setDrawHour] = useState(DEFAULT_DRAW_HOUR);
  const [DRAW_MINUTE, setDrawMinute] = useState(DEFAULT_DRAW_MINUTE);
  const [PREDICTION_HOUR, setPredictionHour] = useState(DEFAULT_PREDICTION_HOUR);
  const [PREDICTION_MINUTE, setPredictionMinute] = useState(DEFAULT_PREDICTION_MINUTE);
  const [pageTitle, setPageTitle] = useState('精准天地中特');
  const [pageDescription, setPageDescription] = useState('天肖：【兔马猴猪牛龙】\n地肖：【蛇羊鸡狗鼠虎】');

  const [rulesVisible, setRulesVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [qrModalType, setQrModalType] = useState<'customer' | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleMembershipAccessPress = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    router.push('/membership');
  };

  const currentSettings = LOTTERY_DATA[activeTab];
  // 当前期：draw_date === 今天（is_current=true 由后端计算）
  const currentIssue = tiandiData.find(item => item.is_current) || null;
  // 历史数据：其余期数
  const historyItems = tiandiData.filter(item => !item.is_current);

  // 从开奖结果中取最新一条
  const latestResultPeriod = lotteryResult ? lotteryResult.issue_no : null;

  // 当前期期号
  const currentPeriod = currentIssue ? currentIssue.issue_no : '';

  // 使用 useMemo 响应式计算会员状态，当 profile 更新时自动重新计算
  const isVip = useMemo(() => {
    if (!profile?.membership_expires_at) {
      console.log('[VIP Check] No membership_expires_at, profile:', profile ? 'exists' : 'null', 'isVip = false');
      return false;
    }
    const expiresAt = new Date(profile.membership_expires_at);
    const now = new Date();
    const isValid = expiresAt > now;
    console.log('[VIP Check] membership_expires_at:', profile.membership_expires_at, 'isVip:', isValid);
    return isValid;
  }, [profile?.membership_expires_at]);

  // 页面加载时获取用户 profile
  useEffect(() => {
    if (user && !profile) {
      console.log('[Home] User logged in, fetching profile...');
      refreshProfile();
    }
  }, [user, profile]);

  // 订阅 users 表变化，实时更新会员状态
  useEffect(() => {
    if (!user) return;

    console.log('[Home] Setting up users table subscription for user:', user.id);
    const channel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `auth_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[Home] 🔄 User profile updated:', payload.new);
          // 立即更新 profile，触发 isVip 重新计算
          if (payload.new && payload.new.membership_expires_at !== undefined) {
            console.log('[Home] ✅ membership_expires_at changed, rerender triggered');
          }
          refreshProfile();
        }
      )
      .subscribe((status) => {
        console.log('[Home] Users subscription status:', status);
      });

    return () => {
      console.log('[Home] Unsubscribing from users table...');
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // 拉取数据并订阅
    const loadData = async () => {
      console.log('[Home] Fetching Tiandi Specials...');
      const data = await fetchTiandiSpecials();
      console.log('[Home] Tiandi Data fetched:', data.length);
      setTiandiData(data);
      setTiandiLoading(false);
    };
    
    loadData();
    
    // 订阅 featured_tiandi_specials 表变动
    const unsubscribe = subscribeToTiandiSpecials(() => {
      console.log('[Home] 🔄 Tiandi Specials changed, reloading...');
      loadData();
    });

    // 订阅 lottery_results 表变动（因为 tiandiData 包含 JOIN 自 lottery_results 的数据）
    const unsubscribeLotteryForTiandi = subscribeToLotteryResults(() => {
      console.log('[Home] 🔄 Lottery Results changed (for Tiandi), reloading Tiandi data...');
      loadData();
    }, 'lottery_results_for_tiandi');

    // 独立拉取最新开奖结果并订阅
    const loadLotteryData = async () => {
      console.log('[Home] Fetching Latest Lottery Result...');
      const result = await fetchLatestLotteryResult();
      console.log('[Home] Lottery Result fetched:', result);
      setLotteryResult(result);
    };
    loadLotteryData();
    const unsubscribeLottery = subscribeToLotteryResults(() => {
      console.log('[Home] 🔄 Lottery Results changed (for Latest), reloading Latest result...');
      loadLotteryData();
    }, 'lottery_results_for_latest');
    
    return () => {
      unsubscribe();
      unsubscribeLotteryForTiandi();
      unsubscribeLottery();
    };
  }, [session, user]);

  // 启动时从数据库加载时间配置
  useEffect(() => {
    getPlatformConfig().then(cfg => {
      setDrawHour(cfg.drawHour);
      setDrawMinute(cfg.drawMinute);
      setPredictionHour(cfg.predictionHour);
      setPredictionMinute(cfg.predictionMinute);
      setPageTitle(cfg.tiandiPageTitle);
      setPageDescription(cfg.tiandiPageDescription);
    });
  }, []);

  // 计算两个倒计时：开奖时间和预测发布时间
  useEffect(() => {
    const calculateCountdowns = () => {
      const now = new Date();
      
      // 1. 计算距离开奖时间（21:30）的倒计时
      const drawTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE, 0);
      if (now > drawTarget) {
        drawTarget.setDate(drawTarget.getDate() + 1);
      }
      const drawDiff = drawTarget.getTime() - now.getTime();
      const drawHours = Math.floor(drawDiff / (1000 * 60 * 60));
      const drawMinutes = Math.floor((drawDiff % (1000 * 60 * 60)) / (1000 * 60));
      const drawSeconds = Math.floor((drawDiff % (1000 * 60)) / 1000);
      setDrawCountdown(`${drawHours.toString().padStart(2, '0')}:${drawMinutes.toString().padStart(2, '0')}:${drawSeconds.toString().padStart(2, '0')}`);
      
      // 2. 计算距离预测发布时间（15:00）的倒计时
      const predictionTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), PREDICTION_HOUR, PREDICTION_MINUTE, 0);
      
      if (now > predictionTarget) {
        predictionTarget.setDate(predictionTarget.getDate() + 1);
      }
      const predictionDiff = predictionTarget.getTime() - now.getTime();
      const predictionHours = Math.floor(predictionDiff / (1000 * 60 * 60));
      const predictionMinutes = Math.floor((predictionDiff % (1000 * 60 * 60)) / (1000 * 60));
      const predictionSeconds = Math.floor((predictionDiff % (1000 * 60)) / 1000);
      setPredictionCountdown(`${predictionHours.toString().padStart(2, '0')}:${predictionMinutes.toString().padStart(2, '0')}:${predictionSeconds.toString().padStart(2, '0')}`);
    };

    calculateCountdowns();
    const interval = setInterval(calculateCountdowns, 1000);
    
    return () => clearInterval(interval);
  }, [DRAW_HOUR, DRAW_MINUTE, PREDICTION_HOUR, PREDICTION_MINUTE]);

  const handleProfilePress = () => {
    if (session) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
  };

  const saveQrImage = async (assetModule: number, label: string) => {
    try {
      if (Platform.OS === 'web') {
        showToast('网页端暂不支持直接保存到相册', 'warning');
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('需要相册权限才能保存图片', 'warning');
        return;
      }

      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();
      const localUri = asset.localUri || asset.uri;
      if (!localUri) {
        showToast('保存失败：无法获取图片地址', 'error');
        return;
      }

      await MediaLibrary.createAssetAsync(localUri);
      showToast('二维码已保存到相册', 'success');
    } catch (err) {
      console.error('Save QR error:', err);
      showToast('保存失败，请稍后再试', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题横幅 */}
      <LinearGradient
        colors={['#6aa8ff', '#4a7cff', '#3a6cee']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerBanner}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>马上有码（msym.beer）</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity onPress={showPrompt} style={{ marginRight: 15 }}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerRight} onPress={handleProfilePress}>
            <View style={styles.headerProfileContainer}>
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* 公告横幅 */}
      <AnnouncementBanner onShowRules={() => setRulesVisible(true)} />





      {/* 规则弹窗 */}
      <Modal
        visible={rulesVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRulesVisible(false)}
      >
        <View style={styles.rulesOverlay}>
          <View style={styles.rulesModal}>
            <View style={styles.rulesModalHeader}>
              <Text style={styles.rulesModalTitle}>📜 平台规则</Text>
              <TouchableOpacity onPress={() => setRulesVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.rulesContent} showsVerticalScrollIndicator={false}>
              {/* 平台介绍 */}
              <View style={[styles.rulesSection, styles.rulesIntroSection]}>
                <Text style={styles.rulesIntroText}>心水天地生肖凭借多年行业经验和丰富数据积累，为广大竞猜者提供权威、实时、专业的参考资料，汇聚资深分析师们深度解读和汇总后选择可靠的心水资料，即刻提升你的竞猜准确率。专业成就非凡，实力助你赢在起跑线上！</Text>
                <Text style={styles.rulesIntroTip}>友情提示：坚持就是胜利！</Text>
              </View>

              {/* 警示提醒 - 置顶显示 */}
              <View style={[styles.rulesSection, styles.rulesTipSection]}>
                <Text style={styles.rulesTipText}>⚠️ 重要提示：严禁18岁以下用户参与，预测资料仅供参考娱乐，请理性对待，切勿赌博。</Text>
              </View>

              {/* 开奖时间 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>⏰ 开奖时间</Text>
                <Text style={styles.rulesText}>• 每天 <Text style={styles.rulesHighlight}>{DRAW_HOUR}点{DRAW_MINUTE > 0 ? `${DRAW_MINUTE}分` : '整'}</Text> 同官方同步开奖</Text>
                <Text style={styles.rulesText}>• 开奖结果将在页面上方实时更新</Text>
              </View>

              {/* 预测发布时间 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🔮 预测发布</Text>
                <Text style={styles.rulesText}>• 每天 <Text style={styles.rulesHighlight}>{PREDICTION_HOUR}点{PREDICTION_MINUTE > 0 ? `${PREDICTION_MINUTE}分` : '整'}</Text> 发布当期预测内容</Text>
                <Text style={styles.rulesText}>• 预测内容包含天肖/地肖组合预测</Text>
              </View>

              {/* 会员购买规则 */}
              <View style={[styles.rulesSection, styles.rulesFeaturedSection]}>
                <Text style={styles.rulesSectionTitle}>👑 会员购买规则</Text>
                <Text style={styles.rulesText}>• 请联系客服获取兑换码；</Text>
                <Text style={styles.rulesText}>• 登录平台可在预测内容点击【开通会员后查看】；</Text>
                <Text style={styles.rulesText}>• 点击【开通会员后查看】进入兑换页面；</Text>
                <Text style={styles.rulesText}>• 输入兑换码并点击兑换即可；</Text>
                <Text style={styles.rulesText}><Text style={styles.rulesHighlight}>• 若当期付费用户未猜中，可联系客服免费领取下一期兑换码</Text></Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        visible={qrModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalType(null)}
      >
        <View style={styles.qrOverlay}>
          <TouchableOpacity
            style={styles.qrBackdrop}
            activeOpacity={1}
            onPress={() => setQrModalType(null)}
          />
          <View style={styles.qrModal}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>联系客服</Text>
              <TouchableOpacity onPress={() => setQrModalType(null)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() =>
                saveQrImage(
                  CUSTOMER_SERVICE_QR,
                  'customer-service'
                )
              }
            >
              <Image
                source={CUSTOMER_SERVICE_QR}
                style={styles.qrImage}
              />
            </TouchableOpacity>

            <View style={styles.qrWechatRow}>
              <Text style={styles.qrWechatLabel}>微信号：</Text>
              <Text style={styles.qrWechatText}>{CUSTOMER_SERVICE_WECHAT}</Text>
              <TouchableOpacity
                style={styles.qrCopyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(CUSTOMER_SERVICE_WECHAT);
                  showToast('微信号已复制', 'success');
                }}
              >
                <Ionicons name="copy" size={14} color="#4a7cff" />
                <Text style={styles.qrCopyText}>复制</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrHintText}>可截图保留二维码，通过微信扫一扫添加客服</Text>
          </View>
        </View>
      </Modal>

      {/* 顶部Tab切换 - 暂时隐藏 */}
      {false && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hongkong' && styles.activeTab]}
            onPress={() => setActiveTab('hongkong')}
          >
            <Text style={[styles.tabText, activeTab === 'hongkong' && styles.activeTabText]}>
              香港六合彩
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'macau' && styles.activeTab]}
            onPress={() => setActiveTab('macau')}
          >
            <Text style={[styles.tabText, activeTab === 'macau' && styles.activeTabText]}>
              澳门六合彩
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'newmacau' && styles.activeTab]}
            onPress={() => setActiveTab('newmacau')}
          >
            <Text style={[styles.tabText, activeTab === 'newmacau' && styles.activeTabText]}>
              新澳门六合彩
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* 期号和按钮区域 */}
        <View style={styles.headerSection}>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>新澳门彩</Text>
            <Text style={styles.periodNumber}>
              {latestResultPeriod || currentPeriod || ''}
            </Text>
          </View>
          
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>距下期:</Text>
            <Text style={styles.countdownTime}>{drawCountdown}</Text>
          </View>
          
          {/* 开奖记录按钮 - 暂时隐藏 */}
          {false && (
            <TouchableOpacity style={styles.historyButton}>
              <Text style={styles.historyButtonText}>开奖记录</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 开奖号码区域 - 显示最新一期完整开奖结果 */}
        <View style={styles.numbersSection}>
          {(() => {
            // 直接根据 independent lotteryResult 判断
            let normalBalls: BallData[] = [];
            let specialBall: BallData | null = null;

            if (lotteryResult && lotteryResult.balls && lotteryResult.balls.length === 7) {
               normalBalls = lotteryResult.balls.slice(0, 6);
               specialBall = lotteryResult.balls[6];
            }

            if (specialBall) {
              return (
                <View style={styles.latestResultContainer}>
                  <View style={styles.numbersRow}>
                    {normalBalls.map((ball: BallData, index: number) => (
                      <View key={index} style={styles.ballContainer}>
                        <View style={[styles.ball, getBallStyle(ball.color), getBallBorderStyle(ball.color)]}>
                          <Text style={[styles.ballNumber, { color: ball.color === 'red' ? '#ff4444' : ball.color === 'blue' ? '#4488ff' : '#44aa44' }]}>{ball.num}</Text>
                        </View>
                        <Text style={styles.animalText}>{ball.animal}</Text>
                      </View>
                    ))}
                    <View style={styles.plusContainer}>
                      <Text style={styles.plusSignText}>+</Text>
                    </View>
                    <View style={styles.ballContainer}>
                      <View style={[styles.ball, styles.specialBallHighlight, getBallBorderStyle(specialBall.color)]}>
                        <Text style={styles.specialBallNum}>{specialBall.num}</Text>
                      </View>
                      <Text style={styles.specialAnimalLabel}>{specialBall.animal}</Text>
                    </View>
                  </View>
                </View>
              );
            }
            // 无开奖数据时显示占位
            return (
              <View style={styles.latestResultContainer}>
                <Text style={styles.latestResultPlaceholder}>等待开奖...</Text>
              </View>
            );
          })()}
        </View>

        {/* 本期开奖信息和推荐参考 - 整体边框包裹 */}
        <BreathingBorder>
          {/* 本期开奖信息 */}
          <View style={styles.nextDrawSection}>
            <View style={styles.clockIcon}>
              <Text style={styles.clockText}>🕐</Text>
            </View>
            <Text style={styles.nextDrawText}>
              本期开奖: {(() => {
                const now = new Date();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                const weekDay = weekDays[now.getDay()];
                return `${month}月${day}日(${weekDay})`;
              })()}
            </Text>
          </View>

          {/* 最新期数推荐参考 */}
          {currentIssue && (
            <View style={styles.latestRecommendationSection}>
              <View style={styles.latestRecommendationLeft}>
                <Text style={styles.latestRecommendationPeriod}>{currentIssue.issue_no}</Text>
              </View>
              <View style={styles.latestRecommendationCenter}>
                {currentIssue.prediction_content ? (
                  isVip ? (
                    <View style={styles.latestRecommendationTextContainer}>
                      {renderPredictionContent(currentIssue.prediction_content)}
                    </View>
                  ) : (
                    <Text style={styles.latestRecommendationPendingText}>内容已更新</Text>
                  )
                ) : (
                  <Text style={styles.latestRecommendationPendingText}>
                    {PREDICTION_HOUR}点{PREDICTION_MINUTE > 0 ? `${PREDICTION_MINUTE}分` : ''}后更新
                  </Text>
                )}
              </View>
              <View style={styles.latestRecommendationRight}>
                {currentIssue.prediction_content ? (
                  isVip ? (
                    <Text style={styles.latestRecommendationReservedText}>已为您更新</Text>
                  ) : (
                    <PulseButton onPress={handleMembershipAccessPress} text="付费查看" />
                  )
                ) : (
                  isVip ? (
                    <Text style={styles.latestRecommendationReservedText}>您已预约</Text>
                  ) : (
                    <PulseButton onPress={handleMembershipAccessPress} text="兑换预约" />
                  )
                )}
              </View>
            </View>
          )}
        </BreathingBorder>

        {/* 付费用户轮播 */}
        <PaidUsersMarquee />

        {/* 预测列表 */}
        <View style={styles.predictionSection}>
          {/* 标题 */}
          <View style={styles.predictionHeader}>
            <Text style={styles.predictionTitle}>{pageTitle}</Text>
          </View>

          {/* 天肖地肖说明 */}
          <View style={styles.legendContainer}>
            {renderDescriptionContent(pageDescription)}
          </View>
          
          {/* 表头 */}
          <View style={styles.predictionTableHeader}>
            <Text style={[styles.predictionHeaderCell, styles.predictionPeriodCell]}>期数</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionContentCell]}>推荐参考</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionResultCell]}>开奖结果</Text>
          </View>
          
          {/* 数据列表 */}
          {/* 当前期：draw_date === 今天（is_current=true） */}
          {currentIssue && (
          <View style={[styles.predictionDataRow, styles.currentPeriodRow]}>
            <Text style={[styles.predictionCell, styles.predictionPeriodCell, styles.predictionPeriodText, styles.currentPeriodText]}>
              {currentIssue.issue_no}
            </Text>
            <View style={[styles.predictionCellView, styles.predictionContentCell]}>
              {!session ? (
                // 未登录：显示"付费可查看"按钮
                <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginPromptContainer}>
                  <Text style={styles.loginPromptText}>付费可查看</Text>
                </TouchableOpacity>
              ) : isVip ? (
                // 已登录且是会员
                currentIssue.prediction_content ? (
                  // 内容不为空：显示预测内容
                  <View style={styles.predictionContentContainer}>
                    {renderPredictionContent(currentIssue.prediction_content)}
                  </View>
                ) : (
                  // 内容为空：显示"XX点后更新"
                  <Text style={[styles.predictionContentText, styles.lockedText]}>
                    {PREDICTION_HOUR}点{PREDICTION_MINUTE > 0 ? `${PREDICTION_MINUTE}分` : ''}后更新
                  </Text>
                )
              ) : (
                // 已登录但不是会员：显示"付费可查看"按钮
                <TouchableOpacity onPress={() => router.push('/membership')} style={styles.loginPromptContainer}>
                  <Text style={styles.loginPromptText}>付费可查看</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.predictionCellView, styles.predictionResultCell]}>
              {renderPredictionResult(currentIssue)}
            </View>
          </View>
          )}

          {historyItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.predictionDataRow,
                index % 2 === 0 ? styles.predictionEvenRow : styles.predictionOddRow
              ]}
            >
              <Text style={[styles.predictionCell, styles.predictionPeriodCell, styles.predictionPeriodText]}>
                {item.issue_no}
              </Text>
              <View style={[styles.predictionCellView, styles.predictionContentCell]}>
                {renderPredictionContent(item.prediction_content || '')}
              </View>
              <View style={[styles.predictionCellView, styles.predictionResultCell]}>
                {renderPredictionResult(item)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 悬浮金刚区 */}
      {quickActionsVisible && (
        <TouchableOpacity
          style={styles.quickActionsOverlay}
          activeOpacity={1}
          onPress={() => setQuickActionsVisible(false)}
        >
          <View style={styles.quickActionsPanel}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/membership')}>
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="diamond" size={24} color="#ff8c00" />
              </View>
              <Text style={styles.quickActionLabel}>购买会员</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/purchase-history')}>
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="receipt" size={24} color="#4a7cff" />
              </View>
              <Text style={styles.quickActionLabel}>购买记录</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                setQuickActionsVisible(false);
                setQrModalType('customer');
              }}
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="headset" size={24} color="#f97316" />
              </View>
              <Text style={styles.quickActionLabel}>联系客服</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* 右下角悬浮按钮 */}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setQuickActionsVisible((prev) => !prev)}
      >
        <Ionicons name="apps" size={22} color="#fff" />
      </TouchableOpacity>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // 公告横幅样式
  announcementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ff9800',
  },
  announcementIcon: {
    marginRight: 8,
  },
  announcementIconText: {
    fontSize: 16,
  },
  announcementContent: {
    flex: 1,
    overflow: 'hidden',
  },
  announcementText: {
    fontSize: 13,
    color: '#ff6600',
    fontWeight: '500',
  },
  rulesButton: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#ff9800',
    borderRadius: 3,
  },
  rulesButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  // 规则弹窗样式
  rulesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rulesModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  rulesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rulesModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  rulesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rulesSection: {
    marginBottom: 18,
  },
  rulesFeaturedSection: {
    padding: 0,
  },
  rulesIntroSection: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  rulesIntroText: {
    fontSize: 13,
    color: '#4a7cff',
    lineHeight: 20,
    textAlign: 'left',
  },
  rulesIntroTip: {
    fontSize: 13,
    color: '#ff6600',
    lineHeight: 20,
    textAlign: 'left',
    marginTop: 8,
    fontWeight: 'bold',
  },
  rulesSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 24,
    paddingLeft: 4,
  },
  rulesHighlight: {
    color: '#ff6600',
    fontWeight: 'bold',
  },
  rulesTipSection: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rulesTipText: {
    fontSize: 13,
    color: '#e65100',
    lineHeight: 20,
  },
  quickActionsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingBottom: 90,
  },
  quickActionsPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  quickActionItem: {
    width: '33.33%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  floatingActionButton: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4a7cff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  qrModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  qrWechatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  qrWechatLabel: {
    fontSize: 13,
    color: '#666',
  },
  qrWechatText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  qrCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eef4ff',
  },
  qrCopyText: {
    fontSize: 12,
    color: '#4a7cff',
    fontWeight: '600',
  },
  qrDownloadButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4a7cff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrDownloadText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  qrHintText: {
    marginTop: 8,
    fontSize: 11,
    color: '#999',
  },
  // 顶部标题横幅
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4a7cff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 44,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'KaiTi',
  },
  headerRight: {
    padding: 4,
  },
  headerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerVipBadge: {
    backgroundColor: '#ff8c00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerVipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a7cff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4a7cff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 15,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  periodNumber: {
    fontSize: 16,
    color: '#ff4444',
    marginLeft: 5,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ff9800',
    marginHorizontal: 10,
  },
  countdownLabel: {
    fontSize: 12,
    color: '#ff6600',
    marginRight: 5,
  },
  countdownTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff4444',
    fontFamily: 'monospace',
  },
  liveButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff6600',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  liveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#ff6600',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  historyButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  historyButtonText: {
    color: '#666',
    fontSize: 13,
  },
  numbersSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  latestResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  latestResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  latestResultLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  latestResultPeriod: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a7cff',
  },
  latestResultContent: {
    alignItems: 'center',
  },
  specialBallHighlight: {
    backgroundColor: '#fff',
    borderWidth: 3,
  },
  specialBallNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  specialAnimalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 5,
  },
  plusSignText: {
    fontSize: 20,
    color: '#999',
    fontWeight: '400',
  },
  latestResultPlaceholder: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 20,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  ballContainer: {
    alignItems: 'center',
    flex: 1,
  },
  ball: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  redBall: {
    backgroundColor: '#fff',
  },
  redBallBorder: {
    borderColor: '#ff4444',
  },
  blueBall: {
    backgroundColor: '#fff',
  },
  blueBallBorder: {
    borderColor: '#4488ff',
  },
  greenBall: {
    backgroundColor: '#fff',
  },
  greenBallBorder: {
    borderColor: '#44aa44',
  },
  ballNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  animalText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  plusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  plusText: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  breathingBorderContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 5,
    marginTop: 10,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingBottom: 10,
    shadowColor: '#6aa8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 5,
  },
  nextDrawSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clockIcon: {
    marginRight: 8,
  },
  clockText: {
    fontSize: 16,
  },
  nextDrawText: {
    fontSize: 15,
    color: '#333',
  },
  nextPeriodText: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  // 最新期数推荐参考样式
  latestRecommendationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  latestRecommendationLeft: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestRecommendationCenter: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestRecommendationRight: {
    width: '25%',
    alignItems: 'flex-end',
  },
  latestRecommendationPeriod: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ff4444',
  },
  latestRecommendationLabel: {
    fontSize: 13,
    color: '#666',
  },
  latestRecommendationLoginBtn: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  latestRecommendationLoginText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  latestRecommendationTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  latestRecommendationPendingText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  latestRecommendationReservedText: {
    fontSize: 12,
    color: '#52c41a',
    fontWeight: '500',
  },
  // 付费用户轮播样式
  paidUsersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    marginTop: 5,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  paidUsersText: {
    fontSize: 11,
    color: '#999',
  },
  paidUsersName: {
    color: '#ff6600',
    fontWeight: 'bold',
  },
  paidUsersAction: {
    color: '#666',
  },
  paidUsersTime: {
    color: '#999',
    fontSize: 12,
  },
  pulseButton: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#ff6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  pulseButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 预测列表样式
  predictionSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  predictionHeader: {
    backgroundColor: '#4a7cff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffff00',
  },
  predictionCountdownTag: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  predictionCountdownTagText: {
    fontSize: 11,
    color: '#ff6600',
    fontWeight: '500',
  },
  winRateBadge: {
    position: 'absolute',
    right: 10,
    top: 8,
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ff6600',
    transform: [{ rotate: '15deg' }],
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  winRateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: '#ff6600',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  legendContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flex: 1,
    alignItems: 'center',
  },
  legendRight: {
    paddingLeft: 10,
  },
  legendNotice: {
    fontSize: 12,
    color: '#ff6600',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ff9800',
    textAlign: 'center',
  },
  legendNoticeSub: {
    fontSize: 10,
    color: '#ff4444',
    marginTop: 4,
    textAlign: 'center',
  },
  legendText: {
    fontSize: 15,
    marginVertical: 2,
    textAlign: 'center',
  },
  tianXiaoLabel: {
    color: '#ff00ff',
    fontWeight: 'bold',
  },
  tianXiaoAnimals: {
    color: '#ff00ff',
    fontWeight: 'bold',
  },
  diXiaoLabel: {
    color: '#cc9900',
    fontWeight: 'bold',
  },
  diXiaoAnimals: {
    color: '#cc9900',
    fontWeight: 'bold',
  },
  predictionTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 2,
    borderBottomColor: '#999',
    paddingVertical: 10,
  },
  predictionHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  predictionDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    alignItems: 'center',
  },
  predictionEvenRow: {
    backgroundColor: '#fff',
  },
  predictionOddRow: {
    backgroundColor: '#f9f9f9',
  },
  predictionCell: {
    fontSize: 13,
    textAlign: 'center',
  },
  predictionCellView: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  predictionPeriodCell: {
    width: '20%',
  },
  predictionContentCell: {
    width: '50%',
  },
  predictionResultCell: {
    width: '30%',
  },
  predictionPeriodText: {
    fontWeight: '600',
    color: '#333',
  },
  predictionContentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  predictionContentText: {
    fontSize: 14,
    color: '#333',
  },
  xiaoHighlight: {
    backgroundColor: '#ffff00',
    color: '#ff0000',
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
  predictionAnimalText: {
    color: '#333',
    fontWeight: '500',
  },
  predictionResultText: {
    color: '#333',
    fontWeight: '500',
  },
  currentPeriodRow: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  lockedPeriodRow: {
    backgroundColor: '#f5f5f5',
    borderLeftColor: '#999',
  },
  currentPeriodText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  lockedText: {
    color: '#bbb',
  },
  pendingResultText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  loginPromptContainer: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  loginPromptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buyPromptText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  membershipBadgeContainer: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    borderColor: '#ff8c00',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  vipBadgeText: {
    color: '#ff8c00',
    fontSize: 13,
    fontWeight: 'bold',
  },
  normalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  normalBadgeText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeTip: {
    color: '#4a7cff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultAnimal: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  resultNumber: {
    color: '#ff0000',
    fontWeight: 'bold',
    backgroundColor: '#ffff00',
    paddingHorizontal: 2,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitBadge: {
    color: '#ff0000',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  missBadge: {
    fontSize: 11,
    marginLeft: 3,
  },
  downloadButton: {
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  downloadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
});
