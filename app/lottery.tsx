import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';

// 彩票类型
type LotteryType = 'hongkong' | 'macau' | 'newmacau';

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

export default function LotteryPage() {
  const [activeTab, setActiveTab] = useState<LotteryType>('macau');
  const currentData = LOTTERY_DATA[activeTab];

  return (
    <SafeAreaView style={styles.container}>
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

        {/* 分隔线 */}
        <View style={styles.divider} />

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginVertical: 20,
  },
  numbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ballContainer: {
    alignItems: 'center',
    marginHorizontal: 3,
  },
  ball: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 30,
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
    paddingVertical: 10,
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
});
