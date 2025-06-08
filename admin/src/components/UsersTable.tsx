import { Table, Tag, Space, Button, Dropdown } from 'antd';
import { MoreOutlined, EditOutlined, StopOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType, MenuProps } from 'antd';

interface User {
  key: string;
  id: string;
  email: string;
  name: string;
  subscription: string;
  status: string;
  aquariums: number;
  lastActive: string;
  createdAt: string;
}

interface UsersTableProps {
  data: User[];
  loading?: boolean;
}

export function UsersTable({ data, loading = false }: UsersTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Активен':
      case 'Активна':
        return 'green';
      case 'Заблокирован':
      case 'Заблокирована':
        return 'red';
      case 'Неактивен':
      case 'Неактивна':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getSubscriptionColor = (subscription: string) => {
    return subscription === 'Premium' ? 'gold' : 'blue';
  };

  const getUserActions = (record: User): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: () => console.log('Edit user:', record.id),
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Отправить email',
      onClick: () => console.log('Send email to:', record.email),
    },
    {
      type: 'divider',
    },
    {
      key: 'block',
      icon: <StopOutlined />,
      label: record.status === 'Заблокирован' ? 'Разблокировать' : 'Заблокировать',
      onClick: () => console.log('Toggle block user:', record.id),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: () => console.log('Delete user:', record.id),
    },
  ];

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => <code>{id}</code>,
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.name}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Подписка',
      dataIndex: 'subscription',
      key: 'subscription',
      width: 120,
      render: (subscription: string) => (
        <Tag color={getSubscriptionColor(subscription)}>
          {subscription}
        </Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Аквариумы',
      dataIndex: 'aquariums',
      key: 'aquariums',
      width: 100,
      align: 'center',
    },
    {
      title: 'Последняя активность',
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 160,
      render: (date: string) => (
        <div style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleString('ru-RU')}
        </div>
      ),
    },
    {
      title: 'Регистрация',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <div style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{ items: getUserActions(record) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} из ${total} пользователей`,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '50', '100'],
      }}
      scroll={{ x: 800 }}
      size="small"
    />
  );
}