import { render, screen, fireEvent } from '@testing-library/react';
import GameCard from '../GameCard';

describe('GameCard Component', () => {
  const mockProps = {
    emoji: '🎮',
    isFlipped: false,
    isMatched: false,
    onClick: jest.fn(),
  };

  test('renders emoji when flipped', () => {
    render(<GameCard {...mockProps} isFlipped={true} />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    render(<GameCard {...mockProps} />);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(mockProps.onClick).toHaveBeenCalledTimes(1);
  });

  test('applies matched styling', () => {
    render(<GameCard {...mockProps} isMatched={true} />);
    const card = screen.getByRole('button');
    expect(card).toHaveClass('matched');
  });
});
