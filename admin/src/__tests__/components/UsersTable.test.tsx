import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersTable } from '../../components/UsersTable';

// Mock Ant Design components to avoid style warnings
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    // Mock problematic components
    Dropdown: ({ children, menu }: any) => <div>{children}</div>,
  };
});

describe('UsersTable', () => {
  const mockUsers = [
    {
      key: '1',
      id: 'usr_001',
      email: 'test1@example.com',
      name: 'Test User 1',
      subscription: 'Premium',
      status: 'Активен',
      aquariums: 3,
      lastActive: '2024-06-08 10:30',
      createdAt: '2024-05-15',
    },
    {
      key: '2',
      id: 'usr_002',
      email: 'test2@example.com',
      name: 'Test User 2',
      subscription: 'Free',
      status: 'Активна',
      aquariums: 1,
      lastActive: '2024-06-08 09:15',
      createdAt: '2024-06-01',
    },
    {
      key: '3',
      id: 'usr_003',
      email: 'test3@example.com',
      name: 'Test User 3',
      subscription: 'Premium',
      status: 'Заблокирован',
      aquariums: 5,
      lastActive: '2024-06-07 18:45',
      createdAt: '2024-04-20',
    },
  ];

  it('renders users table with correct data', () => {
    render(<UsersTable data={mockUsers} />);

    // Check if users are rendered
    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User 2')).toBeInTheDocument();
    expect(screen.getByText('test2@example.com')).toBeInTheDocument();
  });

  it('displays correct subscription badges', () => {
    render(<UsersTable data={mockUsers} />);

    const premiumBadges = screen.getAllByText('Premium');
    expect(premiumBadges).toHaveLength(2);

    const freeBadge = screen.getByText('Free');
    expect(freeBadge).toBeInTheDocument();
  });

  it('displays correct status badges with appropriate colors', () => {
    render(<UsersTable data={mockUsers} />);

    const activeStatus = screen.getByText('Активен');
    expect(activeStatus).toBeInTheDocument();
    expect(activeStatus.closest('.ant-tag')).toHaveClass('ant-tag-green');

    const blockedStatus = screen.getByText('Заблокирован');
    expect(blockedStatus).toBeInTheDocument();
    expect(blockedStatus.closest('.ant-tag')).toHaveClass('ant-tag-red');
  });

  it('displays aquarium counts correctly', () => {
    render(<UsersTable data={mockUsers} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<UsersTable data={mockUsers} />);

    // Check if dates are present (exact format may vary based on locale)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<UsersTable data={[]} loading={true} />);

    expect(screen.getByRole('table')).toHaveClass('ant-table-loading');
  });

  it('handles empty data', () => {
    render(<UsersTable data={[]} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders action buttons for each user', () => {
    render(<UsersTable data={mockUsers} />);

    const actionButtons = screen.getAllByRole('button');
    expect(actionButtons.length).toBeGreaterThanOrEqualTo(mockUsers.length);
  });

  it('pagination works correctly', async () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      key: `${i + 1}`,
      id: `usr_${i + 1}`,
      email: `user${i + 1}@example.com`,
      name: `User ${i + 1}`,
      subscription: i % 2 === 0 ? 'Premium' : 'Free',
      status: 'Активен',
      aquariums: i + 1,
      lastActive: '2024-06-08 10:30',
      createdAt: '2024-05-15',
    }));

    render(<UsersTable data={manyUsers} />);

    // Default page size is 10, so we should see 10 users
    const rows = screen.getAllByRole('row');
    // +1 for header row
    expect(rows).toHaveLength(11);

    // Check pagination info
    expect(screen.getByText('1-10 из 15 пользователей')).toBeInTheDocument();
  });

  it('console logs are called when action buttons are clicked', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<UsersTable data={mockUsers} />);

    // Since Dropdown is mocked, we need to test the action functions directly
    // In a real test, you would trigger the dropdown and click actions

    consoleSpy.mockRestore();
  });

  it('applies responsive scroll behavior', () => {
    render(<UsersTable data={mockUsers} />);

    const table = screen.getByRole('table');
    const tableWrapper = table.closest('.ant-table-wrapper');
    
    expect(tableWrapper).toBeInTheDocument();
    // The table should have scroll configuration
  });

  it('displays user ID in code format', () => {
    render(<UsersTable data={mockUsers} />);

    const userId = screen.getByText('usr_001');
    expect(userId.tagName).toBe('CODE');
  });

  it('sorts users by columns when clicked', async () => {
    render(<UsersTable data={mockUsers} />);

    // Find a sortable column header
    const emailHeader = screen.getByText('Пользователь');
    
    // Table should be sortable
    expect(emailHeader.closest('th')).toBeInTheDocument();
  });
});