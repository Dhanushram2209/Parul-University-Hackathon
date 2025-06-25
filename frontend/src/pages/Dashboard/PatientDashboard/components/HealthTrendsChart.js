import React from 'react';
import { Line } from '@ant-design/charts';
import { Card, Typography } from 'antd';
import { HeartOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
const { TabPane } = Tabs;


const { Text } = Typography;

const HealthTrendsChart = ({ data }) => {
  const processData = () => {
    return data.map(item => ({
      date: new Date(item.recordedAt).toLocaleDateString(),
      bloodPressure: item.bloodPressure,
      systolic: parseInt(item.bloodPressure?.split('/')[0]) || null,
      diastolic: parseInt(item.bloodPressure?.split('/')[1]) || null,
      heartRate: item.heartRate,
      bloodSugar: item.bloodSugar,
      oxygenLevel: item.oxygenLevel
    }));
  };

  const chartData = processData();

  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'category',
    xAxis: {
      label: {
        formatter: (text) => {
          const date = new Date(text);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      }
    },
    yAxis: {
      label: {
        formatter: (text) => `${text}`,
      },
    },
    legend: {
      position: 'top',
    },
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 5000,
      },
    },
    interactions: [{ type: 'marker-active' }],
  };

  return (
    <div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Blood Pressure" key="1">
          <Line
            {...config}
            data={chartData.map(item => ({
              date: item.date,
              value: item.systolic,
              category: 'Systolic'
            })).concat(chartData.map(item => ({
              date: item.date,
              value: item.diastolic,
              category: 'Diastolic'
            })))}
            color={['#ff4d4f', '#1890ff']}
          />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <HeartOutlined /> Normal range: 90-120 (systolic) / 60-80 (diastolic)
            </Text>
          </div>
        </TabPane>
        <TabPane tab="Heart Rate" key="2">
          <Line
            {...config}
            data={chartData.map(item => ({
              date: item.date,
              value: item.heartRate,
              category: 'Heart Rate'
            }))}
            color={['#52c41a']}
          />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <HeartOutlined /> Normal range: 60-100 bpm
            </Text>
          </div>
        </TabPane>
        <TabPane tab="Blood Sugar" key="3">
          <Line
            {...config}
            data={chartData.map(item => ({
              date: item.date,
              value: item.bloodSugar,
              category: 'Blood Sugar'
            }))}
            color={['#faad14']}
          />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <HeartOutlined /> Normal fasting range: 70-100 mg/dL
            </Text>
          </div>
        </TabPane>
        <TabPane tab="Oxygen Level" key="4">
          <Line
            {...config}
            data={chartData.map(item => ({
              date: item.date,
              value: item.oxygenLevel,
              category: 'Oxygen Level'
            }))}
            color={['#13c2c2']}
          />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              <HeartOutlined /> Normal range: 95-100%
            </Text>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default HealthTrendsChart;