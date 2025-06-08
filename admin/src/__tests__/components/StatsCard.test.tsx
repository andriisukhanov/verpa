import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from '../../components/StatsCard';
import { 
  TeamOutlined, 
  DollarOutlined, 
  HomeOutlined, 
  RiseOutlined, 
  FallOutlined 
} from '@ant-design/icons';

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Test Title',
    value: '1,234',
    icon: <TeamOutlined />,
    trend: 10.5,
    subtitle: 'Test Subtitle',
  };

  it('renders with all props correctly', () => {
    render(<StatsCard {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('+10.5%')).toBeInTheDocument();
  });

  it('displays positive trend with green color and up arrow', () => {
    render(<StatsCard {...defaultProps} trend={15.3} />);

    const trendElement = screen.getByText('+15.3%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveClass('trend-positive');
    
    // Check for RiseOutlined icon
    const upIcon = trendElement.querySelector('.anticon-rise');
    expect(upIcon).toBeInTheDocument();
  });

  it('displays negative trend with red color and down arrow', () => {
    render(<StatsCard {...defaultProps} trend={-5.7} />);

    const trendElement = screen.getByText('-5.7%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveClass('trend-negative');
    
    // Check for FallOutlined icon
    const downIcon = trendElement.querySelector('.anticon-fall');
    expect(downIcon).toBeInTheDocument();
  });

  it('renders without trend when not provided', () => {
    const { trend, ...propsWithoutTrend } = defaultProps;
    render(<StatsCard {...propsWithoutTrend} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.queryByText(/[+-]\d+\.?\d*%/)).not.toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    const { subtitle, ...propsWithoutSubtitle } = defaultProps;
    render(<StatsCard {...propsWithoutSubtitle} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
  });

  it('renders with different icon types', () => {
    const icons = [
      { icon: <TeamOutlined />, className: 'anticon-team' },
      { icon: <DollarOutlined />, className: 'anticon-dollar' },
      { icon: <HomeOutlined />, className: 'anticon-home' },
    ];

    icons.forEach(({ icon, className }) => {
      const { rerender } = render(<StatsCard {...defaultProps} icon={icon} />);
      
      const iconElement = document.querySelector(className);
      expect(iconElement).toBeInTheDocument();
      
      rerender(<div />); // Clear for next iteration
    });
  });

  it('handles zero trend correctly', () => {
    render(<StatsCard {...defaultProps} trend={0} />);

    const trendElement = screen.getByText('+0%');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement).toHaveClass('trend-positive');
  });

  it('formats large numbers correctly', () => {
    render(<StatsCard {...defaultProps} value="1,234,567" />);

    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('handles string values', () => {
    render(<StatsCard {...defaultProps} value="$99.99" />);

    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <StatsCard {...defaultProps} className="custom-stats-card" />
    );

    const card = container.querySelector('.ant-card');
    expect(card).toHaveClass('custom-stats-card');
  });

  it('renders with minimal props', () => {
    render(
      <StatsCard 
        title="Minimal Card" 
        value="42" 
        icon={<TeamOutlined />} 
      />
    );

    expect(screen.getByText('Minimal Card')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText(/[+-]\d+\.?\d*%/)).not.toBeInTheDocument();
  });

  it('handles decimal trend values', () => {
    render(<StatsCard {...defaultProps} trend={3.14159} />);

    expect(screen.getByText('+3.14159%')).toBeInTheDocument();
  });

  it('maintains consistent card structure', () => {
    const { container } = render(<StatsCard {...defaultProps} />);

    // Check card structure
    const card = container.querySelector('.ant-card');
    expect(card).toBeInTheDocument();

    const cardBody = card?.querySelector('.ant-card-body');
    expect(cardBody).toBeInTheDocument();

    // Check for stats content
    const statsContent = cardBody?.querySelector('.stats-content');
    expect(statsContent).toBeInTheDocument();

    // Check for icon container
    const iconContainer = cardBody?.querySelector('.stats-icon');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders percentage symbol correctly for trend', () => {
    render(<StatsCard {...defaultProps} trend={25} />);

    const trendText = screen.getByText('+25%');
    expect(trendText.textContent).toMatch(/^\+25%$/);
  });

  it('handles very small trend values', () => {
    render(<StatsCard {...defaultProps} trend={0.01} />);

    expect(screen.getByText('+0.01%')).toBeInTheDocument();
  });

  it('handles very large trend values', () => {
    render(<StatsCard {...defaultProps} trend={999.99} />);

    expect(screen.getByText('+999.99%')).toBeInTheDocument();
  });
});