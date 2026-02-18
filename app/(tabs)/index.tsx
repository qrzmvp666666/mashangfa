import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated, Modal, Image, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { fetchTiandiSpecials, subscribeToTiandiSpecials, TiandiSpecial, BallData } from '../../lib/tiandiService';
import { getPlatformConfig } from '../../lib/platformConfigService';

// 公告横幅组件
const ANNOUNCEMENTS = [
  '🎉 有奖竞猜活动火热进行中！',
  '📢 中奖规则：猜中特码即可获得丰厚奖励',
  '💰 每日15点公布预测，21:30开奖',
  '🎯 精准天地中特，胜率88%等你来挑战',
  '🔥 登录即可查看最新一期预测内容',
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
const GROUP_QR = CUSTOMER_SERVICE_QR; // TODO: 替换为社群二维码
const CUSTOMER_SERVICE_WECHAT = '客服微信号';
const GROUP_WECHAT = '社群微信号';

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

// 渲染预测结果：显示开奖特码 + 命中/未中标识
const renderPredictionResult = (item: TiandiSpecial) => {
  const result = item.display_result;
  const match = result.match(/特([\u4e00-\u9fa5]+)(\d+)/);
  
  if (!match) {
    // 无开奖结果（待开奖）
    return <Text style={styles.pendingResultText}>{result}</Text>;
  }
  
  const [, animal, number] = match;
  const isCorrect = item.is_correct;
  
  return (
    <View style={styles.resultContainer}>
      <Text style={styles.predictionResultText}>
        特<Text style={styles.resultAnimal}>{animal}</Text>
        <Text style={styles.resultNumber}>{number}</Text>
      </Text>
      {isCorrect === true && <Text style={styles.hitBadge}>✅中</Text>}
      {isCorrect === false && <Text style={styles.missBadge}>❌</Text>}
    </View>
  );
};

export default function LotteryPage() {
  const [activeTab, setActiveTab] = useState<LotteryType>('macau');
  const [drawCountdown, setDrawCountdown] = useState<string>('');
  const [predictionCountdown, setPredictionCountdown] = useState<string>('');
  const router = useRouter();
  const { session, user } = useAuth();
  const [tiandiData, setTiandiData] = useState<TiandiSpecial[]>([]);
  const [tiandiLoading, setTiandiLoading] = useState(true);

  // 时间配置（仅用于倒计时展示）
  const [DRAW_HOUR, setDrawHour] = useState(DEFAULT_DRAW_HOUR);
  const [DRAW_MINUTE, setDrawMinute] = useState(DEFAULT_DRAW_MINUTE);
  const [PREDICTION_HOUR, setPredictionHour] = useState(DEFAULT_PREDICTION_HOUR);
  const [PREDICTION_MINUTE, setPredictionMinute] = useState(DEFAULT_PREDICTION_MINUTE);

  const [rulesVisible, setRulesVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [qrModalType, setQrModalType] = useState<'customer' | 'group' | null>(null);

  const currentSettings = LOTTERY_DATA[activeTab];
  // 当前期（后端标记 is_current=true 的记录）
  const currentIssue = tiandiData.find(item => item.is_current) || null;
  // 历史数据
  const historyItems = tiandiData.filter(item => !item.is_current);
  
  // 从开奖结果中取最新一条，计算"下期"期号
  const latestResult = tiandiData.find(item => item.result_balls && item.result_balls.length === 7);
  const latestResultPeriod = latestResult ? latestResult.issue_no : null; // e.g. "048期"
  
  // 下期期号：从开奖结果最新期号 +1（如 048期 → 049期）
  const nextPeriod = (() => {
    if (!latestResultPeriod) return '';
    const numMatch = latestResultPeriod.match(/(\d+)/);
    if (!numMatch) return '';
    const nextNum = parseInt(numMatch[1], 10) + 1;
    return String(nextNum).padStart(numMatch[1].length, '0') + '期';
  })();

  useEffect(() => {
    // 拉取数据并订阅
    const loadData = async () => {
      console.log('Fetching Tiandi Specials...');
      const data = await fetchTiandiSpecials();
      console.log('Tiandi Data fetched:', data.length);
      setTiandiData(data);
      setTiandiLoading(false);
    };
    
    loadData();
    
    // 订阅变动
    const unsubscribe = subscribeToTiandiSpecials(loadData);
    
    return () => unsubscribe();
  }, [session, user]);

  // 启动时从数据库加载时间配置（仅用于倒计时展示）
  useEffect(() => {
    getPlatformConfig().then(cfg => {
      setDrawHour(cfg.drawHour);
      setDrawMinute(cfg.drawMinute);
      setPredictionHour(cfg.predictionHour);
      setPredictionMinute(cfg.predictionMinute);
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
        Alert.alert('提示', '网页端暂不支持保存图片');
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能保存图片');
        return;
      }

      const asset = Asset.fromModule(assetModule);
      await asset.downloadAsync();
      const localUri = asset.localUri || asset.uri;
      if (!localUri) {
        Alert.alert('保存失败', '无法获取图片地址');
        return;
      }

      const filename = `${label}-${Date.now()}.jpg`;
      const dest = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: localUri, to: dest });
      await MediaLibrary.createAssetAsync(dest);
      Alert.alert('已保存到相册');
    } catch (err) {
      console.error('Save QR error:', err);
      Alert.alert('保存失败', '请稍后再试');
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
          <Text style={styles.headerTitle}>码上发（mashangfa.com）</Text>
        </View>
        <TouchableOpacity style={styles.headerRight} onPress={handleProfilePress}>
          <View style={styles.headerProfileContainer}>
            {session && currentIssue && currentIssue.visibility === 'visible' && (
              <View style={styles.headerVipBadge}>
                <Text style={styles.headerVipText}>VIP</Text>
              </View>
            )}
            <Ionicons name="person-circle-outline" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
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
              {/* 开奖时间 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>⏰ 开奖时间</Text>
                <Text style={styles.rulesText}>• 每天 <Text style={styles.rulesHighlight}>{DRAW_HOUR}点{DRAW_MINUTE > 0 ? `${DRAW_MINUTE}分` : '整'}</Text> 准时开奖</Text>
                <Text style={styles.rulesText}>• 开奖结果将在页面上方实时更新</Text>
              </View>

              {/* 预测发布时间 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🔮 预测发布</Text>
                <Text style={styles.rulesText}>• 每天 <Text style={styles.rulesHighlight}>{PREDICTION_HOUR}点{PREDICTION_MINUTE > 0 ? `${PREDICTION_MINUTE}分` : '整'}</Text> 发布当期预测内容</Text>
                <Text style={styles.rulesText}>• 预测内容包含天肖/地肖组合预测</Text>
                <Text style={styles.rulesText}>• {PREDICTION_HOUR}点前预测内容显示为“????”</Text>
              </View>

              {/* 会员购买规则 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>👑 会员购买规则</Text>
                <Text style={styles.rulesText}>• 购买“一期会员卡”后可查看当期最新预测内容</Text>
                <Text style={styles.rulesText}>• 会员有效期至当天开奖时间（<Text style={styles.rulesHighlight}>{DRAW_HOUR}点{DRAW_MINUTE > 0 ? `${DRAW_MINUTE}分` : '整'}</Text>）</Text>
                <Text style={styles.rulesText}>• 开奖后会员自动失效，需重新购买</Text>
                <Text style={styles.rulesText}>• 开奖后购买则顺延至次日开奖时间</Text>
              </View>

              {/* 查看权限说明 */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>🔐 查看权限</Text>
                <Text style={styles.rulesText}>• <Text style={styles.rulesHighlight}>会员用户</Text>：可查看当期最新预测 + 历史记录</Text>
                <Text style={styles.rulesText}>• <Text style={styles.rulesHighlight}>普通用户</Text>：可查看历史记录，最新预测需开通会员</Text>
                <Text style={styles.rulesText}>• <Text style={styles.rulesHighlight}>未登录</Text>：需先登录账号</Text>
              </View>

              {/* 温馨提示 */}
              <View style={[styles.rulesSection, styles.rulesTipSection]}>
                <Text style={styles.rulesTipText}>💡 温馨提示：预测仅供参考，请理性对待，切勿沉迷。</Text>
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
              <Text style={styles.qrTitle}>
                {qrModalType === 'customer' ? '联系客服' : '加入社群'}
              </Text>
              <TouchableOpacity onPress={() => setQrModalType(null)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() =>
                saveQrImage(
                  qrModalType === 'customer' ? CUSTOMER_SERVICE_QR : GROUP_QR,
                  qrModalType === 'customer' ? 'customer-service' : 'wechat-group'
                )
              }
            >
              <Image
                source={qrModalType === 'customer' ? CUSTOMER_SERVICE_QR : GROUP_QR}
                style={styles.qrImage}
              />
            </TouchableOpacity>

            <View style={styles.qrWechatRow}>
              <Text style={styles.qrWechatLabel}>微信号：</Text>
              <Text style={styles.qrWechatText}>
                {qrModalType === 'customer' ? CUSTOMER_SERVICE_WECHAT : GROUP_WECHAT}
              </Text>
              <TouchableOpacity
                style={styles.qrCopyButton}
                onPress={async () => {
                  const text = qrModalType === 'customer' ? CUSTOMER_SERVICE_WECHAT : GROUP_WECHAT;
                  await Clipboard.setStringAsync(text);
                  Alert.alert('已复制微信号');
                }}
              >
                <Ionicons name="copy" size={14} color="#4a7cff" />
                <Text style={styles.qrCopyText}>复制</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.qrDownloadButton}
              onPress={() =>
                saveQrImage(
                  qrModalType === 'customer' ? CUSTOMER_SERVICE_QR : GROUP_QR,
                  qrModalType === 'customer' ? 'customer-service' : 'wechat-group'
                )
              }
            >
              <Ionicons name="download" size={16} color="#fff" />
              <Text style={styles.qrDownloadText}>点击下载二维码</Text>
            </TouchableOpacity>

            <Text style={styles.qrHintText}>长按二维码也可保存</Text>
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
              {latestResultPeriod || ''}
            </Text>
          </View>
          
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>距离{DRAW_HOUR}点{DRAW_MINUTE > 0 ? `${DRAW_MINUTE}分` : ''}:</Text>
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
            // 找到最新一条有开奖结果的记录
            const latestWithResult = tiandiData.find(item => item.result_balls && item.result_balls.length === 7);
            if (latestWithResult && latestWithResult.result_balls) {
              const normalBalls = latestWithResult.result_balls.slice(0, 6);
              const specialBall = latestWithResult.result_balls[6];
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

        {/* 下期开奖信息 */}
        <View style={styles.nextDrawSection}>
          <View style={styles.clockIcon}>
            <Text style={styles.clockText}>🕐</Text>
          </View>
          <Text style={styles.nextDrawText}>
            下期开奖: {(() => {
              const now = new Date();
              const todayDraw = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DRAW_HOUR, DRAW_MINUTE);
              const nextDate = now > todayDraw ? new Date(now.getTime() + 86400000) : now;
              const month = String(nextDate.getMonth() + 1).padStart(2, '0');
              const day = String(nextDate.getDate()).padStart(2, '0');
              const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
              const weekDay = weekDays[nextDate.getDay()];
              return `${month}月${day}日(${weekDay})`;
            })()}{' '}
            <Text style={styles.nextPeriodText}>{nextPeriod}</Text>
          </Text>
        </View>

        {/* 预测列表 */}
        <View style={styles.predictionSection}>
          {/* 标题 + 会员标识 */}
          <View style={styles.predictionHeader}>
            <Text style={styles.predictionTitle}>精准天地中特</Text>
          </View>


          
          
          {/* 天肖地肖说明 */}
          <View style={styles.legendContainer}>
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
            <View style={styles.legendRight}>
              <Text style={styles.legendNotice}>每天{PREDICTION_HOUR}点告知{'\n'}距离{PREDICTION_HOUR}点:{predictionCountdown}</Text>
            </View>
          </View>
          
          {/* 表头 */}
          <View style={styles.predictionTableHeader}>
            <Text style={[styles.predictionHeaderCell, styles.predictionPeriodCell]}>期数</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionContentCell]}>预测内容</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionResultCell]}>开奖结果</Text>
          </View>
          
          {/* 数据列表 */}
          {/* 当前期预测（后端标记 is_current=true） */}
          {currentIssue && (
          <View style={[styles.predictionDataRow, styles.currentPeriodRow, currentIssue.visibility === 'locked' ? styles.lockedPeriodRow : null]}>
            <Text style={[styles.predictionCell, styles.predictionPeriodCell, styles.predictionPeriodText, styles.currentPeriodText]}>
              {currentIssue.issue_no}
            </Text>
            <View style={[styles.predictionCellView, styles.predictionContentCell]}>
              {currentIssue.visibility === 'locked' ? (
                <View style={styles.predictionContentContainer}>
                  <Text style={[styles.predictionContentText, styles.lockedText]}>{currentIssue.display_content}</Text>
                </View>
              ) : currentIssue.visibility === 'visible' ? (
                <View style={styles.predictionContentContainer}>
                  {renderPredictionContent(currentIssue.display_content || '')}
                </View>
              ) : currentIssue.cta_type === 'login' ? (
                <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginPromptContainer}>
                  <Text style={styles.loginPromptText}>{currentIssue.cta_text || '登录查看'}</Text>
                </TouchableOpacity>
              ) : currentIssue.cta_type === 'buy_or_redeem' ? (
                <TouchableOpacity onPress={() => router.push('/membership')} style={styles.loginPromptContainer}>
                  <Text style={styles.buyPromptText}>{currentIssue.display_content}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.predictionContentText}>{currentIssue.display_content}</Text>
              )}
            </View>
            <View style={[styles.predictionCellView, styles.predictionResultCell]}>
              {currentIssue.visibility === 'locked' ? (
                <Text style={[styles.pendingResultText, styles.lockedText]}>{currentIssue.display_result}</Text>
              ) : (
                renderPredictionResult(currentIssue)
              )}
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
                {renderPredictionContent(item.display_content || '')}
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
                setQrModalType('group');
              }}
            >
              <View style={styles.quickActionIconWrap}>
                <Ionicons name="people" size={24} color="#10b981" />
              </View>
              <Text style={styles.quickActionLabel}>加入社群</Text>
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
    width: '25%',
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
  nextDrawSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
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
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffff00',
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
});
