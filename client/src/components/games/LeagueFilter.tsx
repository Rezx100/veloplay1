import { useState } from 'react';
import { useLocation, Link } from 'wouter';

type League = 'all' | 'nhl' | 'nba' | 'nfl' | 'mlb';

interface LeagueFilterProps {
  selectedLeague: League;
  onLeagueSelect: (league: League) => void;
}

export default function LeagueFilter({ selectedLeague, onLeagueSelect }: LeagueFilterProps) {
  const leagues = [
    { id: 'all', name: 'All Leagues', icon: '' },
    { id: 'nhl', name: 'NHL', icon: 'hockey-puck' },
    { id: 'nba', name: 'NBA', icon: 'basketball-ball' },
    { id: 'nfl', name: 'NFL', icon: 'football-ball' },
    { id: 'mlb', name: 'MLB', icon: 'baseball-ball' }
  ];

  return (
    <div className="flex mb-4 overflow-x-auto pb-2">
      {leagues.map((league) => (
        <button
          key={league.id}
          className={`whitespace-nowrap px-4 py-2 ${
            selectedLeague === league.id ? 'bg-[#202020]' : 'bg-[#1a1a1a] hover:bg-[#202020]'
          } text-white rounded-full mr-2 text-sm font-medium`}
          onClick={() => onLeagueSelect(league.id as League)}
        >
          {league.icon && <i className={`fas fa-${league.icon} mr-1`}></i>}
          {league.name}
        </button>
      ))}
    </div>
  );
}
