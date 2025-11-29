'use client';

import { useGameStore, Team } from '@/lib/store';
import { motion } from 'framer-motion';
import { roundThemes } from '@/lib/theme';
import { getAvatarIcon } from '@/components/IconMap';
import { Crown } from 'lucide-react';

export default function ScoreboardTracker() {
  const { teams, currentRound, _updateVersion } = useGameStore();
  const theme = roundThemes[currentRound as keyof typeof roundThemes] || roundThemes[1];

  // Sort teams by score (descending)
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-black/20 backdrop-blur-sm relative z-50 border-b border-white/5">
      <div className="max-w-[98vw] mx-auto px-4 py-2 min-h-[52px]">
        <div className="flex items-center justify-center h-full">
          {/* Teams Scoreboard - Centered and Clean */}
          {teams.length > 0 && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {sortedTeams.map((team, index) => {
                const rank = index + 1;
                const isLeader = rank === 1;
                
                return (
                  <motion.div
                    key={team.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`flex items-center gap-3 px-4 py-1.5 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                      isLeader
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    style={{
                      boxShadow: isLeader
                        ? '0 4px 20px -5px rgba(245, 158, 11, 0.3), inset 0 0 0 1px rgba(245, 158, 11, 0.1)'
                        : '0 2px 10px -2px rgba(0,0,0,0.2)',
                    }}
                  >
                    {/* Rank & Avatar Group */}
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold w-4 text-center ${
                        isLeader ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {rank}
                      </div>

                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-inner"
                        style={{
                          backgroundColor: team.color,
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        {getAvatarIcon(team.avatar || 'Target', { size: 14, className: "text-white drop-shadow-sm" })}
                      </div>
                    </div>

                    {/* Team Name & Score */}
                    <div className="flex flex-col leading-none gap-0.5 min-w-[80px]">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className={`text-xs font-bold tracking-wide uppercase truncate max-w-[120px] ${
                            isLeader ? 'text-amber-100' : 'text-slate-200'
                          }`}
                        >
                          {team.name}
                        </span>
                        {isLeader && (
                          <Crown size={10} className="text-amber-400 fill-amber-400 animate-pulse" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium tracking-wider ${
                        isLeader ? 'text-amber-300/80' : 'text-slate-400'
                      }`}>
                        {team.score.toLocaleString()} PTS
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

