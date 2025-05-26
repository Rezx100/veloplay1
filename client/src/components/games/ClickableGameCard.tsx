import { Game } from '@shared/schema';
import { Link } from 'wouter';
import GameCard from './GameCard';

interface ClickableGameCardProps {
  game: Game;
  showRecapButton?: boolean;
  className?: string;
}

export default function ClickableGameCard({ game, showRecapButton = false, className = '' }: ClickableGameCardProps) {
  // Handle navigation to game page - scroll to top
  const handleScrollToTop = () => {
    window.scrollTo(0, 0);
  };

  return (
    <Link href={`/game/${game?.id || ''}`} onClick={handleScrollToTop}>
      <a className="block">
        <GameCard 
          game={game} 
          showRecapButton={showRecapButton} 
          className={className} 
        />
      </a>
    </Link>
  );
}