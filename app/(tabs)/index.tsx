import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// 彩票类型
type LotteryType = 'hongkong' | 'macau' | 'newmacau';

// 六合彩预测数据（模拟数据）
const PREDICTION_DATA = [
  { period: '047期', content: '【龙猴+地肖】', result: '特鸡07' },
  { period: '046期', content: '【天肖+鸡狗】', result: '特兔03' },
  { period: '045期', content: '【猴龙+地肖】', result: '特蛇01' },
  { period: '044期', content: '【天肖+狗鸡】', result: '特猪19' },
  { period: '043期', content: '【猴龙+地肖】', result: '特蛇13' },
  { period: '041期', content: '【天肖+狗虎】', result: '特马36' },
  { period: '040期', content: '【猴马+地肖】', result: '特虎28' },
  { period: '039期', content: '【龙猴+地肖】', result: '特羊11' },
  { period: '038期', content: '【猴马+地肖】', result: '特鼠42' },
  { period: '036期', content: '【兔马+地肖】', result: '特蛇01' },
  { period: '034期', content: '【天肖+狗羊】', result: '特猪19' },
  { period: '032期', content: '【龙猪+地肖】', result: '特鼠06' },
  { period: '031期', content: '【天肖+鼠狗】', result: '特龙26' },
  { period: '030期', content: '【天肖+狗马】', result: '特牛41' },
  { period: '029期', content: '【龙牛+地肖】', result: '特蛇01' },
  { period: '028期', content: '【天肖+狗羊】', result: '特兔03' },
  { period: '027期', content: '【天肖+羊鸡】', result: '特鸡45' },
  { period: '026期', content: '【天肖+鸡狗】', result: '特猪19' },
  { period: '025期', content: '【猪牛+地肖】', result: '特蛇37' },
  { period: '024期', content: '【牛兔+地肖】', result: '特虎28' },
  { period: '023期', content: '【猪牛+地肖】', result: '特羊47' },
  { period: '022期', content: '【牛龙+地肖】', result: '特鼠18' },
  { period: '021期', content: '【兔牛+地肖】', result: '特鼠42' },
  { period: '020期', content: '【牛马+地肖】', result: '特马12' },
  { period: '019期', content: '【天肖+鸡虎】', result: '特猴46' },
  { period: '017期', content: '【牛马+地肖】', result: '特狗32' },
  { period: '016期', content: '【马猴+地肖】', result: '特鼠06' },
];

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
        
        if (isTianXiao) {
          return (
            <Text key={index}>
              <Text style={styles.tianXiaoHighlight}>【天肖】</Text>
              {part.replace('天肖', '') && (
                <Text style={styles.predictionAnimalText}>{part.replace('天肖', '')}</Text>
              )}
              {index < parts.length - 1 && <Text style={styles.plusText}>+</Text>}
            </Text>
          );
        }
        
        if (isDiXiao) {
          return (
            <Text key={index}>
              <Text style={styles.diXiaoHighlight}>【地肖】</Text>
              {part.replace('地肖', '') && (
                <Text style={styles.predictionAnimalText}>{part.replace('地肖', '')}</Text>
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
    <Text style={styles.predictionResultText}>
      特<Text style={styles.resultAnimal}>{animal}</Text>
      <Text style={styles.resultNumber}>{number}</Text>
    </Text>
  );
};

export default function LotteryPage() {
  const [activeTab, setActiveTab] = useState<LotteryType>('macau');
  const currentData = LOTTERY_DATA[activeTab];
  const router = useRouter();

  const handleProfilePress = () => {
    router.push('/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题横幅 */}
      <View style={styles.headerBanner}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>码上发</Text>
        </View>
        <TouchableOpacity style={styles.headerRight} onPress={handleProfilePress}>
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 顶部Tab切换 */}
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

      <ScrollView style={styles.content}>
        {/* 期号和按钮区域 */}
        <View style={styles.headerSection}>
          <View style={styles.periodRow}>
            <Text style={styles.periodLabel}>澳门彩</Text>
            <Text style={styles.periodNumber}>{currentData.period}</Text>
          </View>
          
          <TouchableOpacity style={styles.liveButton}>
            <Text style={styles.liveButtonText}>📺 观看直播</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.historyButton}>
            <Text style={styles.historyButtonText}>开奖记录</Text>
          </TouchableOpacity>
        </View>

        {/* 开奖号码区域 */}
        <View style={styles.numbersSection}>
          {/* 平码 */}
          <View style={styles.numbersRow}>
            {currentData.numbers.map((item, index) => (
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
              <View style={[styles.ball, getBallStyle(currentData.special.color), getBallBorderStyle(currentData.special.color)]}>
                <Text style={styles.ballNumber}>{currentData.special.num}</Text>
              </View>
              <Text style={styles.animalText}>{currentData.special.animal}</Text>
            </View>
          </View>
        </View>

        {/* 下期开奖信息 */}
        <View style={styles.nextDrawSection}>
          <View style={styles.clockIcon}>
            <Text style={styles.clockText}>🕐</Text>
          </View>
          <Text style={styles.nextDrawText}>
            下期开奖: {currentData.nextDate}{' '}
            <Text style={styles.nextPeriodText}>{currentData.nextPeriod}</Text>
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
            <Text style={styles.legendText}>
              <Text style={styles.tianXiaoLabel}>天肖：</Text>
              <Text style={styles.tianXiaoAnimals}>【兔马猴猪牛龙】</Text>
            </Text>
            <Text style={styles.legendText}>
              <Text style={styles.diXiaoLabel}>地肖：</Text>
              <Text style={styles.diXiaoAnimals}>【蛇羊鸡狗鼠虎】</Text>
            </Text>
          </View>
          
          {/* 表头 */}
          <View style={styles.predictionTableHeader}>
            <Text style={[styles.predictionHeaderCell, styles.predictionPeriodCell]}>期数</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionContentCell]}>预测内容</Text>
            <Text style={[styles.predictionHeaderCell, styles.predictionResultCell]}>开奖结果</Text>
          </View>
          
          {/* 数据列表 */}
          {PREDICTION_DATA.map((item, index) => (
            <View 
              key={item.period} 
              style={[
                styles.predictionDataRow,
                index % 2 === 0 ? styles.predictionEvenRow : styles.predictionOddRow
              ]}
            >
              <Text style={[styles.predictionCell, styles.predictionPeriodCell, styles.predictionPeriodText]}>
                {item.period}
              </Text>
              <View style={[styles.predictionCellView, styles.predictionContentCell]}>
                {renderPredictionContent(item.content)}
              </View>
              <View style={[styles.predictionCellView, styles.predictionResultCell]}>
                {renderPredictionResult(item.result)}
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    marginBottom: 20,
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
  liveButton: {
    backgroundColor: '#4a7cff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginTop: 20,
    marginBottom: 10,
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
  },
  predictionHeader: {
    backgroundColor: '#4a7cff',
    paddingVertical: 12,
    alignItems: 'center',
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffff00',
  },
  legendContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  legendText: {
    fontSize: 13,
    marginVertical: 2,
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
  },
  tianXiaoHighlight: {
    backgroundColor: '#ffff00',
    color: '#ff0000',
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
  diXiaoHighlight: {
    backgroundColor: '#ffff00',
    color: '#cc9900',
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
});
