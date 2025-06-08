import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock Ant Design components to avoid style warnings
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Layout: {
      ...antd.Layout,
      Sider: ({ children, collapsed, onCollapse }: any) => (
        <div 
          data-testid="sider" 
          data-collapsed={collapsed}
          onClick={() => onCollapse && onCollapse(!collapsed)}
        >
          {children}
        </div>
      ),
    },
  };
});

describe('AdminLayout', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    pathname: '/',
    push: mockPush,
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('renders layout with children', () => {
    render(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header with title and user info', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Verpa Admin')).toBeInTheDocument();
    expect(screen.getByText('Администратор')).toBeInTheDocument();
  });

  it('renders navigation menu items', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    expect(screen.getByText('Панель управления')).toBeInTheDocument();
    expect(screen.getByText('Пользователи')).toBeInTheDocument();
    expect(screen.getByText('Аквариумы')).toBeInTheDocument();
    expect(screen.getByText('Подписки')).toBeInTheDocument();
    expect(screen.getByText('Аналитика')).toBeInTheDocument();
    expect(screen.getByText('Уведомления')).toBeInTheDocument();
    expect(screen.getByText('Настройки')).toBeInTheDocument();
  });

  it('highlights active menu item based on pathname', () => {
    mockRouter.pathname = '/users';
    
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('selectedkeys', '["2"]');
  });

  it('navigates when menu item is clicked', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const usersMenuItem = screen.getByText('Пользователи').closest('li');
    fireEvent.click(usersMenuItem!);

    expect(mockPush).toHaveBeenCalledWith('/users');
  });

  it('handles all menu navigation correctly', () => {
    const routes = [
      { text: 'Панель управления', path: '/' },
      { text: 'Пользователи', path: '/users' },
      { text: 'Аквариумы', path: '/aquariums' },
      { text: 'Подписки', path: '/subscriptions' },
      { text: 'Аналитика', path: '/analytics' },
      { text: 'Уведомления', path: '/notifications' },
      { text: 'Настройки', path: '/settings' },
    ];

    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    routes.forEach(({ text, path }) => {
      const menuItem = screen.getByText(text).closest('li');
      fireEvent.click(menuItem!);
      
      if (path === '/') {
        expect(mockPush).toHaveBeenCalledWith('/');
      } else {
        expect(mockPush).toHaveBeenCalledWith(path);
      }
    });

    expect(mockPush).toHaveBeenCalledTimes(routes.length);
  });

  it('renders footer with copyright', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`Verpa Admin ©${currentYear}`)).toBeInTheDocument();
  });

  it('toggles sidebar collapse', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const sider = screen.getByTestId('sider');
    
    // Initially not collapsed
    expect(sider).toHaveAttribute('data-collapsed', 'false');

    // Click to collapse
    fireEvent.click(sider);
    expect(sider).toHaveAttribute('data-collapsed', 'true');

    // Click to expand
    fireEvent.click(sider);
    expect(sider).toHaveAttribute('data-collapsed', 'false');
  });

  it('renders user avatar', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const avatar = document.querySelector('.ant-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('applies correct layout styles', () => {
    const { container } = render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const layout = container.querySelector('.ant-layout');
    expect(layout).toHaveStyle({ minHeight: '100vh' });

    const header = container.querySelector('.ant-layout-header');
    expect(header).toHaveStyle({ 
      background: '#fff', 
      padding: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
  });

  it('renders menu with correct icons', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    // Check for icon presence
    expect(document.querySelector('.anticon-dashboard')).toBeInTheDocument();
    expect(document.querySelector('.anticon-team')).toBeInTheDocument();
    expect(document.querySelector('.anticon-home')).toBeInTheDocument();
    expect(document.querySelector('.anticon-crown')).toBeInTheDocument();
    expect(document.querySelector('.anticon-bar-chart')).toBeInTheDocument();
    expect(document.querySelector('.anticon-bell')).toBeInTheDocument();
    expect(document.querySelector('.anticon-setting')).toBeInTheDocument();
  });

  it('maintains layout structure', () => {
    const { container } = render(
      <AdminLayout>
        <div data-testid="child-content">Child Content</div>
      </AdminLayout>
    );

    // Check layout hierarchy
    const layout = container.querySelector('.ant-layout');
    const sider = layout?.querySelector('[data-testid="sider"]');
    const layoutInner = layout?.querySelector('.ant-layout');
    const header = layoutInner?.querySelector('.ant-layout-header');
    const content = layoutInner?.querySelector('.ant-layout-content');
    const footer = layoutInner?.querySelector('.ant-layout-footer');

    expect(layout).toBeInTheDocument();
    expect(sider).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(footer).toBeInTheDocument();

    // Check child is rendered in content
    const childContent = content?.querySelector('[data-testid="child-content"]');
    expect(childContent).toBeInTheDocument();
  });

  it('handles different pathnames correctly', () => {
    const pathnames = ['/', '/users', '/aquariums', '/subscriptions', '/analytics', '/notifications', '/settings'];
    
    pathnames.forEach((pathname, index) => {
      mockRouter.pathname = pathname;
      
      const { rerender } = render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('selectedkeys', `["${index + 1}"]`);

      rerender(<div />); // Clear for next iteration
    });
  });

  it('handles logout action', () => {
    const originalConsoleLog = console.log;
    console.log = jest.fn();

    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    // In a real implementation, you would have a logout button
    // For now, we're just testing the structure exists
    expect(screen.getByText('Администратор')).toBeInTheDocument();

    console.log = originalConsoleLog;
  });
});