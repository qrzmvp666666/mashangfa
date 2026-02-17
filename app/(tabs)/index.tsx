import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

// 六合彩预测数据（模拟数据）
const PREDICTION_DATA = [
  { period: '047期', content: '【龙猴+地肖】', result: '特? 00' },
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

// 解析内容，高亮天肖/地肖
const renderContent = (content: string) => {
  // 移除【】括号
  const innerContent = content.replace(/[【】]/g, '');
  
  // 分割内容
  const parts = innerContent.split('+');
  
  return (
    <View style={styles.contentContainer}>
      {parts.map((part, index) => {
        const isTianXiao = part.includes('天肖');
        const isDiXiao = part.includes('地肖');
        
        if (isTianXiao) {
          return (
            <Text key={index}>
              <Text style={styles.tianXiaoHighlight}>【天肖】</Text>
              {part.replace('天肖', '') && (
                <Text style={styles.animalText}>{part.replace('天肖', '')}</Text>
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
                <Text style={styles.animalText}>{part.replace('地肖', '')}</Text>
              )}
              {index < parts.length - 1 && <Text style={styles.plusText}>+</Text>}
            </Text>
          );
        }
        
        return (
          <Text key={index} style={styles.animalText}>
            {part}
            {index < parts.length - 1 && <Text style={styles.plusText}>+</Text>}
          </Text>
        );
      })}
    </View>
  );
};

// 解析结果，高亮特码
const renderResult = (result: string) => {
  const match = result.match(/特([\?\u4e00-\u9fa5]*)(\d*)/);
  if (!match) return <Text style={styles.resultText}>{result}</Text>;
  
  const [, animal, number] = match;
  
  return (
    <Text style={styles.resultText}>
      特<Text style={styles.resultAnimal}>{animal}</Text>
      <Text style={styles.resultNumber}>{number}</Text>
    </Text>
  );
};

export default function IndexPage() {
  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>精准天地中特</Text>
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
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.periodCell]}>期数</Text>
        <Text style={[styles.headerCell, styles.contentCell]}>预测内容</Text>
        <Text style={[styles.headerCell, styles.resultCell]}>开奖结果</Text>
      </View>
      
      {/* 数据列表 */}
      <ScrollView style={styles.scrollView}>
        {PREDICTION_DATA.map((item, index) => (
          <View 
            key={item.period} 
            style={[
              styles.dataRow,
              index % 2 === 0 ? styles.evenRow : styles.oddRow
            ]}
          >
            <Text style={[styles.cell, styles.periodCell, styles.periodText]}>
              {item.period}
            </Text>
            <View style={[styles.cell, styles.contentCell]}>
              {renderContent(item.content)}
            </View>
            <View style={[styles.cell, styles.resultCell]}>
              {renderResult(item.result)}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4a7cff',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffff00',
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  legendContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  legendText: {
    fontSize: 14,
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 2,
    borderBottomColor: '#999',
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    alignItems: 'center',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 13,
    textAlign: 'center',
  },
  periodCell: {
    width: '20%',
  },
  contentCell: {
    width: '50%',
  },
  resultCell: {
    width: '30%',
  },
  periodText: {
    fontWeight: '600',
    color: '#333',
  },
  contentContainer: {
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
  animalText: {
    color: '#333',
    fontWeight: '500',
  },
  plusText: {
    color: '#666',
    marginHorizontal: 2,
  },
  resultText: {
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
