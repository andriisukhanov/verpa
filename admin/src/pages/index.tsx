import { Layout, Typography, Row, Col, Card, Statistic, Table, Space, Button, Tag } from 'antd';
import { 
  UserOutlined, 
  CrownOutlined, 
  DatabaseOutlined, 
  ApiOutlined,
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import { AdminLayout } from '@/components/AdminLayout';
import { StatsCard } from '@/components/StatsCard';
import { UsersTable } from '@/components/UsersTable';

const { Title } = Typography;

// Mock data
const stats = {
  users: {
    total: 1247,
    active: 892,
    new: 47,
    churn: 3.2
  },
  subscriptions: {
    free: 834,
    premium: 413,
    revenue: {
      daily: 2847,
      monthly: 89234,
      yearly: 987432
    },
    mrr: 89234
  },
  aquariums: {
    total: 2156,
    active: 1834,
    byType: {
      freshwater: 1542,
      marine: 498,
      brackish: 116
    }
  },
  system: {
    apiCalls: 245672,
    errorRate: 0.12,
    avgResponseTime: 127,
    storageUsed: 45.7
  }
};

const recentUsers = [
  {
    key: '1',
    id: 'usr_001',
    email: 'ivan.petrov@gmail.com',
    name: 'Иван Петров',
    subscription: 'Premium',
    status: 'Активен',
    aquariums: 3,
    lastActive: '2024-06-08 10:30',
    createdAt: '2024-05-15'
  },
  {
    key: '2',
    id: 'usr_002',
    email: 'maria.smirnova@yandex.ru',
    name: 'Мария Смирнова',
    subscription: 'Free',
    status: 'Активна',
    aquariums: 1,
    lastActive: '2024-06-08 09:15',
    createdAt: '2024-06-01'
  },
  {
    key: '3',
    id: 'usr_003',
    email: 'alex.kozlov@mail.ru',
    name: 'Алексей Козлов',
    subscription: 'Premium',
    status: 'Заблокирован',
    aquariums: 5,
    lastActive: '2024-06-07 18:45',
    createdAt: '2024-04-20'
  }
];

export default function Dashboard() {
  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        <Title level={2}>
          <DashboardOutlined /> Панель управления
        </Title>
        
        {/* Статистика */}
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              title="Пользователи"
              value={stats.users.total}
              change={`+${stats.users.new} за неделю`}
              changeType="increase"
              icon={<UserOutlined />}
              color="#1890ff"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              title="Premium подписки"
              value={stats.subscriptions.premium}
              change={`${stats.users.churn}% отток`}
              changeType="decrease"
              icon={<CrownOutlined />}
              color="#52c41a"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              title="Аквариумы"
              value={stats.aquariums.total}
              change={`${stats.aquariums.active} активных`}
              changeType="stable"
              icon={<DatabaseOutlined />}
              color="#13c2c2"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatsCard
              title="MRR"
              value={`$${(stats.subscriptions.mrr / 1000).toFixed(1)}k`}
              change="+12.5% за месяц"
              changeType="increase"
              icon={<ApiOutlined />}
              color="#722ed1"
            />
          </Col>
        </Row>

        {/* Подробная статистика */}
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} lg={12}>
            <Card title="Статистика системы" bordered={false}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic 
                    title="API вызовов/день" 
                    value={stats.system.apiCalls} 
                    suffix="вызовов"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Уровень ошибок" 
                    value={stats.system.errorRate} 
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: stats.system.errorRate > 1 ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: '16px' }}>
                <Col span={12}>
                  <Statistic 
                    title="Среднее время ответа" 
                    value={stats.system.avgResponseTime} 
                    suffix="мс"
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Использование хранилища" 
                    value={stats.system.storageUsed} 
                    precision={1}
                    suffix="ГБ"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card title="Типы аквариумов" bordered={false}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="Пресноводные" 
                    value={stats.aquariums.byType.freshwater}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Морские" 
                    value={stats.aquariums.byType.marine}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Солоноватые" 
                    value={stats.aquariums.byType.brackish}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Таблица пользователей */}
        <Card title="Недавние пользователи" bordered={false}>
          <UsersTable data={recentUsers} />
        </Card>
      </div>
    </AdminLayout>
  );
}