import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchTiandiSpecials, subscribeToTiandiSpecials, TiandiSpecial } from '../../lib/tiandiService';

// 公告横幅组件
const ANNOUNCEMENTS = [
  '🎉 有奖竞猜活动火热进行中！',
  '📢 中奖规则：猜中特码即可获得丰厚奖励',
  '💰 每日15点公布预测，21:30开奖',
  '🎯 精准天地中特，胜率88%等你来挑战',
  '🔥 登录即可查看最新一期预测内容',
];

const AnnouncementBanner: React.FC = () => {
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

  const router = useRouter();

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
      <TouchableOpacity onPress={() => router.push('/rules')} style={styles.rulesButton}>
        <Text style={styles.rulesButtonText}>查看规则</Text>
      </TouchableOpacity>
    </View>
  );
};

// 彩票类型
type LotteryType = 'hongkong' | 'macau' | 'newmacau';

// 从环境变量读取时间配置
const DRAW_HOUR = parseInt(process.env.EXPO_PUBLIC_DRAW_HOUR || '21', 10);
const DRAW_MINUTE = parseInt(process.env.EXPO_PUBLIC_DRAW_MINUTE || '30', 10);
const PREDICTION_HOUR = parseInt(process.env.EXPO_PUBLIC_PREDICTION_HOUR || '15', 10);
const PREDICTION_MINUTE = parseInt(process.env.EXPO_PUBLIC_PREDICTION_MINUTE || '0', 10);

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

// 解析结果，高亮特码
const renderPredictionResult = (result: string) => {
  const match = result.match(/特([\?\u4e00-\u9fa5]*)(\d*)/);
  if (!match) return <Text style={styles.predictionResultText}>{result}</Text>;
  
  const [, animal, number] = match;
  
  return (
    <View style={styles.resultContainer}>
      <Text style={styles.predictionResultText}>
        特<Text style={styles.resultAnimal}>{animal}</Text>
        <Text style={styles.resultNumber}>{number}</Text>
      </Text>
      <Text style={styles.hitBadge}>中！</Text>
    </View>
  );
};

export default function LotteryPage() {
  const [activeTab, setActiveTab] = useState<LotteryType>('macau');
  const [drawCountdown, setDrawCountdown] = useState<string>('');
  const [predictionCountdown, setPredictionCountdown] = useState<string>('');
  const [isAfterPredictionTime, setIsAfterPredictionTime] = useState<boolean>(false);
  const router = useRouter();
  const { session } = useAuth();
  const [tiandiData, setTiandiData] = useState<TiandiSpecial[]>([]);

  const currentSettings = LOTTERY_DATA[activeTab];
  // 当前最新的一期（数据库第一条）
  const currentIssue = tiandiData.length > 0 ? tiandiData[0] : null;
  // 历史数据（除第一条外）
  const historyItems = tiandiData.length > 1 ? tiandiData.slice(1) : [];
  
  // 显示的期号：优先使用数据库第一条，否则使用默认
  const displayPeriod = currentIssue ? currentIssue.issue_no : currentSettings.nextPeriod;

  useEffect(() => {
    // 拉取数据并订阅
    const loadData = async () => {
      console.log('Fetching Tiandi Specials...');
      const data = await fetchTiandiSpecials();
      console.log('Tiandi Data fetched:', data.length);
      setTiandiData(data);
    };
    
    loadData();
    
    // 订阅变动
    const unsubscribe = subscribeToTiandiSpecials(loadData);
    
    return () => unsubscribe();
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
      
      // 判断是否已经超过预测发布时间
      setIsAfterPredictionTime(now >= predictionTarget);
      
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
  }, []);

  const handleProfilePress = () => {
    if (session) {
      router.push('/profile');
    } else {
      router.push('/login');
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
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* 公告横幅 */}
      <AnnouncementBanner />

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
            <Text style={styles.periodNumber}>{displayPeriod}</Text>
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

        {/* 开奖号码区域 */}
        <View style={styles.numbersSection}>
          {/* 平码 */}
          <View style={styles.numbersRow}>
            {currentSettings.numbers.map((item, index) => (
              <View key={index} style={styles.ballContainer}>
                <View style={[styles.ball, getBallStyle(item.color), getBallBorderStyle(item.color)]}>
                  <Text style={styles.ballNumber}>{item.num}</Text>
                </View>
                <Text style={styles.animalText}>{item.animal}</Text>
              </View>
            ))}
            
            {/* 加号 */}
            <View style={styles.plusContainer}>
              <Text style={styles.plusText}>+</Text>
            </View>
            
            {/* 特码 */}
            <View style={styles.ballContainer}>
              <View style={[styles.ball, getBallStyle(currentSettings.special.color), getBallBorderStyle(currentSettings.special.color)]}>
                <Text style={styles.ballNumber}>{currentSettings.special.num}</Text>
              </View>
              <Text style={styles.animalText}>{currentSettings.special.animal}</Text>
            </View>
          </View>
        </View>

        {/* 下期开奖信息 */}
        <View style={styles.nextDrawSection}>
          <View style={styles.clockIcon}>
            <Text style={styles.clockText}>🕐</Text>
          </View>
          <Text style={styles.nextDrawText}>
            下期开奖: {currentSettings.nextDate}{' '}
            <Text style={styles.nextPeriodText}>{displayPeriod}</Text>
          </Text>
        </View>

        {/* 预测列表 */}
        <View style={styles.predictionSection}>
          {/* 标题 */}
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
          {/* 当前期预测（数据库第一条） */}
          <View style={[styles.predictionDataRow, styles.currentPeriodRow, !isAfterPredictionTime ? styles.lockedPeriodRow : null]}>
            <Text style={[styles.predictionCell, styles.predictionPeriodCell, styles.predictionPeriodText, styles.currentPeriodText]}>
              {displayPeriod}
            </Text>
            <View style={[styles.predictionCellView, styles.predictionContentCell]}>
              {!isAfterPredictionTime ? (
                // 预测时间前（15点前）：灰色展示????
                <View style={styles.predictionContentContainer}>
                  <Text style={[styles.predictionContentText, styles.lockedText]}>????</Text>
                </View>
              ) : session ? (
                // 预测时间后且已登录：展示真实内容
                <View style={styles.predictionContentContainer}>
                  {currentIssue ? (
                    renderPredictionContent(currentIssue.prediction_content || '')
                  ) : (
                    <Text style={styles.predictionContentText}>暂无数据</Text>
                  )}
                </View>
              ) : (
                // 预测时间后未登录：提示登录
                <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginPromptContainer}>
                  <Text style={styles.loginPromptText}>登录查看预测</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.predictionCellView, styles.predictionResultCell]}>
              {!isAfterPredictionTime ? (
                <Text style={[styles.pendingResultText, styles.lockedText]}>特?00</Text>
              ) : session ? (
                 // 已登录且时间已到
                 currentIssue && currentIssue.result_text ? (
                   renderPredictionResult(currentIssue.result_text)
                 ) : (
                   <Text style={styles.pendingResultText}>特?00</Text>
                 )
              ) : (
                <Text style={styles.pendingResultText}>--</Text>
              )}
            </View>
          </View>
          
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
                {renderPredictionResult(item.result_text || '')}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    backgroundColor: '#ff0000',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginLeft: 4,
  },
});
