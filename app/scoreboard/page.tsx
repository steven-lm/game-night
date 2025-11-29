'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-client';
import { useGameStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Flame, Star, Sparkles } from 'lucide-react';

// Infinite Banner Component
const InfiniteFacesBanner = () => {
  // Array of face images 1-11
  const faces = Array.from({ length: 11 }, (_, i) => `/images/faces/${i + 1}.png`);
  
  // Duplicate the array to ensure seamless looping
  const duplicatedFaces = [...faces, ...faces, ...faces];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-t from-black/90 to-transparent z-50 overflow-hidden pointer-events-none">
      <div className="absolute bottom-0 left-0 flex items-end pb-2 md:pb-4">
        <motion.div
          className="flex items-end gap-8 md:gap-12 px-4"
          animate={{
            x: ['0%', '-33.33%'],
          }}
          transition={{
            duration: 20,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {duplicatedFaces.map((face, index) => (
            <motion.div
              key={index}
              className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            >
              <img
                src={face}
                alt="Face"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

// Floating stars background effect
const FloatingStars = () => {
  const stars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        >
          <Star className="text-yellow-300/30" size={12} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

export default function ScoreboardPage() {
  const { teams, currentRound, addTeam, setCurrentRound } = useGameStore();
  const socket = useSocket();
  const [isLoading, setIsLoading] = useState(true);

  // Load state from API on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/state');
        const state = await response.json();
        
        if (state.currentRound) setCurrentRound(state.currentRound);
        if (state.teams && Array.isArray(state.teams)) {
          state.teams.forEach((team: any) => {
            const existingTeam = teams.find((t) => t.id === team.id);
            if (!existingTeam) addTeam(team);
          });
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('score:updated', () => {
        // Scores updated automatically via store subscription
      });
    }
  }, [socket]);

  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const topThree = sortedTeams.slice(0, 3);
  const runnersUp = sortedTeams.slice(3);

  // Reorder top 3 for podium: 2nd, 1st, 3rd
  const podiumOrder = [
    topThree[1], // 2nd place (Left)
    topThree[0], // 1st place (Center)
    topThree[2]  // 3rd place (Right)
  ].filter(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/70 text-xl font-medium flex items-center gap-3"
        >
          <Sparkles className="text-purple-400" size={24} />
          Loading Scoreboard...
        </motion.div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <FloatingStars />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
        <div className="z-10 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          >
            <Crown className="text-purple-400 mx-auto mb-6" size={80} />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
            WAITING FOR PLAYERS
          </h1>
          <p className="text-slate-400 text-xl">Join the game to see your name in lights!</p>
        </div>
        <InfiniteFacesBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden font-sans selection:bg-purple-500/30">
      {/* Floating Stars Background */}
      <FloatingStars />
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4 md:py-6 flex flex-col min-h-screen pb-32">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-4 md:mb-8"
        >
          <motion.div
            animate={{ 
              textShadow: [
                "0 0 20px rgba(168, 85, 247, 0.4)",
                "0 0 40px rgba(168, 85, 247, 0.6)",
                "0 0 20px rgba(168, 85, 247, 0.4)",
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <h1 className="mb-12 text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-purple-300 to-pink-400 drop-shadow-2xl">
              LEADERBOARD
            </h1>
          </motion.div>
        </motion.div>

        {/* Podium Section */}
        <div className="flex justify-center items-end gap-4 md:gap-8 mb-6 md:mb-10 min-h-[250px]">
          <AnimatePresence mode='popLayout'>
            {podiumOrder.map((team, index) => {
              // Determine actual rank based on original sorted array
              const rank = team === topThree[0] ? 1 : team === topThree[1] ? 2 : 3;
              
              // Styling based on rank
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              
              const height = isFirst ? 'min-h-[16rem] md:min-h-[20rem]' : isSecond ? 'min-h-[13rem] md:min-h-[16rem]' : 'min-h-[10rem] md:min-h-[13rem]';
              const color = isFirst 
                ? 'from-yellow-400 via-yellow-300 to-amber-500' 
                : isSecond 
                  ? 'from-slate-300 via-slate-200 to-slate-400' 
                  : 'from-orange-400 via-orange-300 to-orange-600';
              const bgGradient = isFirst
                ? 'from-yellow-900/40 to-amber-900/40'
                : isSecond
                  ? 'from-slate-700/40 to-slate-800/40'
                  : 'from-orange-800/40 to-orange-900/40';
              const glowColor = isFirst
                ? 'shadow-yellow-500/40'
                : isSecond
                  ? 'shadow-slate-400/30'
                  : 'shadow-orange-500/30';
              
              return (
                <motion.div
                  key={team.id}
                  layoutId={team.id}
                  initial={{ y: 100, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 20,
                    delay: index * 0.15
                  }}
                  className={`relative flex flex-col items-center justify-end w-1/3 max-w-[280px] ${isFirst ? 'z-20 -mt-12' : 'z-10'}`}
                >

                  {/* Podium Box */}
                  <motion.div 
                    className={`w-full ${height} rounded-t-3xl bg-gradient-to-b ${bgGradient} backdrop-blur-xl border-t-2 border-x-2 border-white/20 flex flex-col items-center p-4 md:p-6 shadow-2xl ${glowColor} relative overflow-hidden`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: index * 0.5 }}
                    />
                    
                    {/* Rank number */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
                      className={`text-6xl md:text-7xl font-black mb-2 bg-gradient-to-br ${color} bg-clip-text text-transparent opacity-30`}
                    >
                      {rank}
                    </motion.div>

                    <div className="text-center w-full relative z-10">
                      <h3 className="text-white font-black text-lg md:text-2xl truncate px-2 mb-2 drop-shadow-lg">
                        {team.name}
                      </h3>
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br ${color} drop-shadow-lg`}>
                          {team.score.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white/60 text-xs md:text-sm font-medium mt-1">points</p>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Runners Up List */}
        {runnersUp.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-4xl mx-auto w-full space-y-3"
          >
            <AnimatePresence>
              {runnersUp.map((team, index) => (
                <motion.div
                  key={team.id}
                  layoutId={team.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="group relative bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4 md:gap-6 border border-white/10 hover:border-purple-400/40 transition-all duration-300 shadow-lg hover:shadow-purple-500/20"
                >
                  {/* Rank badge */}
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 font-black text-slate-300 text-xl shadow-inner ring-2 ring-white/10">
                    #{index + 4}
                  </div>
                  
                  {/* Team name */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-xl md:text-2xl truncate group-hover:text-purple-200 transition-colors">
                      {team.name}
                    </h3>
                  </div>

                  {/* Score */}
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-2xl md:text-3xl font-black text-white/90 group-hover:text-white transition-colors">
                      {team.score.toLocaleString()}
                    </div>
                  </div>

                  {/* Hover sparkle effect */}
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="text-purple-400/50" size={20} />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <InfiniteFacesBanner />
    </div>
  );
}
