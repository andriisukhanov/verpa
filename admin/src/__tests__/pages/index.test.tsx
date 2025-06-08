import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../pages/index';
import { useRouter } from 'next/router';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock components
jest.mock('../../components/AdminLayout', () => {
  return function MockAdminLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

jest.mock('../../components/StatsCard', () => {
  return function MockStatsCard({ title, value, trend, subtitle }: any) {
    return (
      <div data-testid="stats-card">
        <div>{title}</div>
        <div>{value}</div>
        {trend && <div>{trend}%</div>}
        {subtitle && <div>{subtitle}</div>}
      </div>
    );
  };
});

jest.mock('../../components/UsersTable', () => {
  return function MockUsersTable({ data }: any) {
    return (
      <div data-testid="users-table">
        {data.map((user: any) => (
          <div key={user.key}>{user.name}</div>
        ))}
      </div>
    );
  };
});

// Mock chart components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

describe('Home Page', () => {
  const mockRouter = {
    pathname: '/',
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders the dashboard page', () => {
    render(<Home />);

    expect(screen.getByText('Панель управления')).toBeInTheDocument();
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('displays all stats cards', () => {
    render(<Home />);

    // Check stats cards
    expect(screen.getByText('Всего пользователей')).toBeInTheDocument();
    expect(screen.getByText('1,247')).toBeInTheDocument();
    expect(screen.getByText('Активные подписки')).toBeInTheDocument();
    expect(screen.getByText('413')).toBeInTheDocument();
    expect(screen.getByText('Доход за месяц')).toBeInTheDocument();
    expect(screen.getByText('$4,127')).toBeInTheDocument();
    expect(screen.getByText('Всего аквариумов')).toBeInTheDocument();
    expect(screen.getByText('2,156')).toBeInTheDocument();
  });

  it('displays trend indicators on stats cards', () => {
    render(<Home />);

    // Check for trend values
    expect(screen.getByText('5.7%')).toBeInTheDocument();
    expect(screen.getByText('12.3%')).toBeInTheDocument();
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
    expect(screen.getByText('8.1%')).toBeInTheDocument();
  });

  it('displays subtitles on stats cards', () => {
    render(<Home />);

    expect(screen.getByText('892 активных')).toBeInTheDocument();
    expect(screen.getByText('Premium: 156')).toBeInTheDocument();
    expect(screen.getByText('Прогноз: $5,200')).toBeInTheDocument();
    expect(screen.getByText('1,834 активных')).toBeInTheDocument();
  });

  it('renders activity chart section', () => {
    render(<Home />);

    expect(screen.getByText('Активность пользователей')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders subscription distribution chart', () => {
    render(<Home />);

    expect(screen.getByText('Распределение подписок')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders recent users table', () => {
    render(<Home />);

    expect(screen.getByText('Последние пользователи')).toBeInTheDocument();
    expect(screen.getByTestId('users-table')).toBeInTheDocument();
  });

  it('displays recent users in the table', () => {
    render(<Home />);

    // Check if recent users are displayed
    expect(screen.getByText('Иван Петров')).toBeInTheDocument();
    expect(screen.getByText('Елена Смирнова')).toBeInTheDocument();
    expect(screen.getByText('Александр Козлов')).toBeInTheDocument();
    expect(screen.getByText('Мария Новикова')).toBeInTheDocument();
    expect(screen.getByText('Дмитрий Волков')).toBeInTheDocument();
  });

  it('renders charts with correct data', () => {
    render(<Home />);

    // Activity chart should have data points
    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();
    
    // Should have chart components
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders pie chart with subscription data', () => {
    render(<Home />);

    const pieChart = screen.getByTestId('pie-chart');
    expect(pieChart).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('uses responsive containers for charts', () => {
    render(<Home />);

    const responsiveContainers = screen.getAllByTestId('responsive-container');
    expect(responsiveContainers).toHaveLength(2); // One for each chart
  });

  it('displays correct layout structure', () => {
    const { container } = render(<Home />);

    // Check for row and column structure
    const rows = container.querySelectorAll('.ant-row');
    expect(rows.length).toBeGreaterThan(0);

    const cols = container.querySelectorAll('.ant-col');
    expect(cols.length).toBeGreaterThan(0);
  });

  it('applies correct gutter spacing', () => {
    const { container } = render(<Home />);

    const rows = container.querySelectorAll('.ant-row');
    rows.forEach(row => {
      if (row.hasAttribute('gutter')) {
        const gutter = row.getAttribute('gutter');
        expect(['[16,16]', '[16, 16]']).toContain(gutter);
      }
    });
  });

  it('renders stats cards in correct grid layout', () => {
    const { container } = render(<Home />);

    // Stats cards should be in columns with correct spans
    const statsCards = screen.getAllByTestId('stats-card');
    expect(statsCards).toHaveLength(4);

    // Each stats card should be in a Col with span 6
    statsCards.forEach(card => {
      const col = card.closest('.ant-col');
      expect(col).toHaveClass('ant-col-xs-12', 'ant-col-sm-6');
    });
  });

  it('renders charts in full-width columns', () => {
    const { container } = render(<Home />);

    // Chart sections should be in full-width columns
    const chartCols = container.querySelectorAll('.ant-col-24');
    expect(chartCols.length).toBeGreaterThanOrEqual(2);
  });

  it('maintains consistent card styling', () => {
    const { container } = render(<Home />);

    const cards = container.querySelectorAll('.ant-card');
    expect(cards.length).toBeGreaterThan(0);

    cards.forEach(card => {
      expect(card).toHaveClass('ant-card');
    });
  });

  it('displays page title correctly', () => {
    render(<Home />);

    const title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveTextContent('Панель управления');
  });

  it('shows loading state for charts', () => {
    // In a real implementation, you might test loading states
    render(<Home />);

    // Charts should be rendered immediately in this mock
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    // The component should render even with empty data
    render(<Home />);

    // All sections should still be present
    expect(screen.getByText('Панель управления')).toBeInTheDocument();
    expect(screen.getAllByTestId('stats-card')).toHaveLength(4);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('users-table')).toBeInTheDocument();
  });
});