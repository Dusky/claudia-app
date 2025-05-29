import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Indicator } from './Indicator';

describe('Indicator Component', () => {
  it('renders basic indicator with label', () => {
    render(<Indicator label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders indicator with icon and value', () => {
    render(<Indicator icon="🔧" label="Settings" value="Active" />);
    
    expect(screen.getByText('🔧')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('becomes clickable with onClick handler', () => {
    const handleClick = vi.fn();
    render(<Indicator label="Click Me" onClick={handleClick} />);
    
    const indicator = screen.getByRole('button');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('tabIndex', '0');
    
    fireEvent.click(indicator);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation', () => {
    const handleClick = vi.fn();
    render(<Indicator label="Keyboard Test" onClick={handleClick} />);
    
    const indicator = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(indicator, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(indicator, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
    
    // Test other keys (should not trigger)
    fireEvent.keyDown(indicator, { key: 'Escape' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('applies status classes correctly', () => {
    const { rerender } = render(<Indicator label="Normal" status="normal" />);
    expect(screen.getByRole('status')).not.toHaveClass('status-error');
    
    rerender(<Indicator label="Error" status="error" />);
    expect(screen.getByRole('status')).toHaveClass('status-error');
    
    rerender(<Indicator label="Warning" status="warning" />);
    expect(screen.getByRole('status')).toHaveClass('status-warning');
    
    rerender(<Indicator label="Success" status="success" />);
    expect(screen.getByRole('status')).toHaveClass('status-success');
  });

  it('sets tooltip and aria-label correctly', () => {
    render(
      <Indicator 
        label="CPU" 
        value="45%" 
        tooltip="CPU usage percentage"
        aria-label="CPU usage: 45 percent"
      />
    );
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('title', 'CPU usage percentage');
    expect(indicator).toHaveAttribute('aria-label', 'CPU usage: 45 percent');
  });

  it('falls back to generated tooltip when none provided', () => {
    render(<Indicator label="Memory" value="8GB" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('title', 'Memory: 8GB');
    expect(indicator).toHaveAttribute('aria-label', 'Memory: 8GB');
  });

  it('applies custom className', () => {
    render(<Indicator label="Custom" className="my-custom-class" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('my-custom-class');
    expect(indicator).toHaveClass('indicator'); // Should still have base class
  });

  it('prevents click event bubbling on keyboard activation', () => {
    const handleClick = vi.fn();
    render(<Indicator label="Prevent Default" onClick={handleClick} />);
    
    const indicator = screen.getByRole('button');
    
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');
    
    fireEvent(indicator, spaceEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles numeric values correctly', () => {
    render(<Indicator label="FPS" value={60} />);
    
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('title', 'FPS: 60');
  });

  it('handles undefined/null values gracefully', () => {
    render(<Indicator label="Empty Value" value={undefined} />);
    
    expect(screen.getByText('Empty Value')).toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('title', 'Empty Value');
  });

  it('hides icon when not provided', () => {
    render(<Indicator label="No Icon" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator.querySelector('.icon')).not.toBeInTheDocument();
  });

  it('shows value element only when value is provided', () => {
    const { rerender } = render(<Indicator label="Test" />);
    
    let indicator = screen.getByRole('status');
    expect(indicator.querySelector('.value')).not.toBeInTheDocument();
    
    rerender(<Indicator label="Test" value="123" />);
    
    indicator = screen.getByRole('status');
    expect(indicator.querySelector('.value')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});