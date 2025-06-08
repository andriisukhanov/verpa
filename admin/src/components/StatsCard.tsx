import { Card, Statistic, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

interface StatsCardProps {
  title: string;
  value: number | string;
  change: string;
  changeType: 'increase' | 'decrease' | 'stable';
  icon: React.ReactNode;
  color: string;
}

export function StatsCard({ title, value, change, changeType, icon, color }: StatsCardProps) {
  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <ArrowUpOutlined style={{ color: '#3f8600' }} />;
      case 'decrease':
        return <ArrowDownOutlined style={{ color: '#cf1322' }} />;
      default:
        return <MinusOutlined style={{ color: '#666' }} />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return '#3f8600';
      case 'decrease':
        return '#cf1322';
      default:
        return '#666';
    }
  };

  return (
    <Card bordered={false} style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Statistic
            title={title}
            value={value}
            valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
          />
          <Space style={{ marginTop: '8px', fontSize: '12px', color: getChangeColor() }}>
            {getChangeIcon()}
            {change}
          </Space>
        </div>
        <div style={{ 
          fontSize: '32px', 
          color: color, 
          opacity: 0.7,
          marginLeft: '16px'
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}