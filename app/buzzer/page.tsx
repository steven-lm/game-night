'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-client';
import { useGameStore, Team } from '@/lib/store';
import { motion } from 'framer-motion';
import questionsData from '@/data/questions.json';
import { colors } from '@/lib/theme';
import { Bell, Lock, Flame } from 'lucide-react';
import { getAvatarIcon } from '@/components/IconMap';

export default function BuzzerPage() {
  const socket = useSocket();
  const { teams, buzzerLocked, addTeam, pressBuzzer, updateTeamScore } = useGameStore();
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors.team[0]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState(questionsData.avatars);
  const [showExistingTeams, setShowExistingTeams] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'new' | 'existing' | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Load existing teams on mount
  useEffect(() => {
    const loadExistingTeams = async () => {
      try {
        const response = await fetch('/api/state');
        const state = await response.json();
        if (state.teams && Array.isArray(state.teams) && state.teams.length > 0) {
          // Load teams into store
          state.teams.forEach((team: any) => {
            const existingTeam = teams.find((t) => t.id === team.id);
            if (!existingTeam) {
              addTeam(team);
            }
          });
          // Teams exist, show option to select existing or create new
          setShowExistingTeams(true);
        }
      } catch (e) {
        console.error('Failed to load existing teams:', e);
      }
    };
    loadExistingTeams();

    // Check localStorage for saved team
    const savedTeam = localStorage.getItem('buzzerTeam');
    if (savedTeam) {
      try {
        const parsedTeam = JSON.parse(savedTeam);
        console.log('Found saved team in localStorage:', parsedTeam);
        setCurrentTeam(parsedTeam);
        setIsRegistered(true);
        // We will emit rejoin in the socket effect
      } catch (e) {
        console.error('Failed to parse saved team:', e);
        localStorage.removeItem('buzzerTeam');
      }
    }
  }, [teams, addTeam]);

  // Save team to localStorage whenever it changes
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('buzzerTeam', JSON.stringify(currentTeam));
    }
  }, [currentTeam]);

  useEffect(() => {
    if (socket) {
      // If we have a current team, try to rejoin/register immediately upon connection
      if (currentTeam && socket.connected) {
        console.log('Socket connected, rejoining as team:', currentTeam.name);
        socket.emit('team:rejoin', {
          ...currentTeam,
          avatarId: availableAvatars.find((a) => a.imageUrl === currentTeam.avatar)?.id || '',
        });
      }

      // Also listen for connect event to rejoin if connection was lost
      const handleConnect = () => {
        if (currentTeam) {
          console.log('Socket reconnected, rejoining as team:', currentTeam.name);
          socket.emit('team:rejoin', {
            ...currentTeam,
            avatarId: availableAvatars.find((a) => a.imageUrl === currentTeam.avatar)?.id || '',
          });
        }
      };

      socket.on('connect', handleConnect);

      socket.on('team:registered', (data) => {
        // Update available avatars
        setAvailableAvatars((prev) =>
          prev.filter((avatar) => avatar.id !== data.avatarId)
        );
      });

      socket.on('buzzer:cleared', () => {
        // Buzzer cleared, can buzz again
        const currentState = useGameStore.getState();
        currentState.clearBuzzer();
      });

      socket.on('buzzer:reset', () => {
        console.log('Buzzer: Received buzzer:reset event');
        // Reset buzzer state
        const currentState = useGameStore.getState();
        currentState.resetBuzzer();
      });

      // Listen for score updates
      socket.on('score:updated', (data) => {
        console.log('Buzzer: Received score:updated', data);
        // Use the store's current state to get the team
        const currentState = useGameStore.getState();
        const team = currentState.teams.find((t) => t.id === data.teamId);
        if (team) {
          const pointsToAdd = data.newScore - team.score;
          if (pointsToAdd !== 0) {
            console.log('Buzzer: Updating score for team', data.teamId, 'by', pointsToAdd, 'points');
            updateTeamScore(data.teamId, pointsToAdd);
            // Update currentTeam if it's this team
            if (currentTeam && currentTeam.id === data.teamId) {
              setCurrentTeam({ ...currentTeam, score: data.newScore });
            }
          }
        } else {
          console.warn('Buzzer: Team not found for score update', data.teamId);
        }
      });

      // Handle being kicked/removed
      socket.on('team:removed', (data) => {
        console.log('Buzzer: Received team:removed event', data);
        if (currentTeam && data.teamId === currentTeam.id) {
          console.log('Buzzer: We have been kicked! Clearing state...');
          localStorage.removeItem('buzzerTeam');
          setCurrentTeam(null);
          setIsRegistered(false);
          setTeamName('');
          setSelectedAvatar('');
          alert('You have been removed from the game.');
        }
      });

      // Handle global game reset
      socket.on('game:reset_all', () => {
        console.log('Buzzer: Received game:reset_all, clearing state...');
        localStorage.removeItem('buzzerTeam');
        window.location.reload();
      });

      return () => {
        socket.off('connect', handleConnect);
        socket.off('team:registered');
        socket.off('buzzer:cleared');
        socket.off('buzzer:reset');
        socket.off('score:updated');
        socket.off('team:removed');
        socket.off('game:reset_all');
      };
    }
  }, [socket, updateTeamScore, currentTeam]);

  const handleSelectExistingTeam = (team: Team) => {
    setCurrentTeam(team);
    setIsRegistered(true);
    // Re-register the team with socket
    if (socket) {
      socket.emit('team:register', {
        ...team,
        avatarId: availableAvatars.find((a) => a.imageUrl === team.avatar)?.id || '',
      });
    }
  };

  const handleRegister = () => {
    if (!teamName.trim() || !selectedAvatar) {
      alert('Please enter a team name and select an avatar');
      return;
    }

    const teamId = `team-${Date.now()}`;
    const newTeam: Team = {
      id: teamId,
      name: teamName,
      color: selectedColor,
      avatar: availableAvatars.find((a) => a.id === selectedAvatar)?.imageUrl || '🎯',
      score: 0,
      streak: 0,
    };

    addTeam(newTeam);
    setCurrentTeam(newTeam);
    setIsRegistered(true);

    if (socket) {
      socket.emit('team:register', {
        ...newTeam,
        avatarId: selectedAvatar,
      });
    }
  };

  const handleBuzz = () => {
    if (!currentTeam || buzzerLocked) return;

    pressBuzzer(currentTeam.id);
    if (socket) {
      socket.emit('buzzer:press', {
        teamId: currentTeam.id,
        teamName: currentTeam.name,
      });
    }
  };

  const handleClearState = () => {
    if (confirm('Are you sure you want to clear all saved data? You will need to rejoin the game.')) {
      localStorage.removeItem('buzzerTeam');
      window.location.reload();
    }
  };

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20"
        >
          <h1 className="text-4xl font-black text-white mb-6 text-center game-show-glow">
            Team Setup
          </h1>

          {showExistingTeams && teams.length > 0 && registrationMode === null && (
            <div className="mb-6 space-y-4">
              <h2 className="text-2xl font-bold text-white text-center mb-4">Select Existing Team</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.map((team) => (
                  <motion.button
                    key={team.id}
                    onClick={() => handleSelectExistingTeam(team)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white/20 hover:bg-white/30 rounded-lg p-4 border border-white/30 transition-all flex items-center gap-3"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md"
                      style={{
                        backgroundColor: team.color,
                        boxShadow: `0 0 15px ${team.color}60`,
                      }}
                    >
                      {getAvatarIcon(team.avatar || 'Target', { size: 24 })}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-bold text-lg">{team.name}</div>
                      <div className="text-yellow-400 font-bold">{team.score.toLocaleString()}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="text-center">
                <button
                  onClick={() => setRegistrationMode('new')}
                  className="text-white/70 hover:text-white underline text-sm"
                >
                  Or create a new team
                </button>
              </div>
            </div>
          )}

          {(!showExistingTeams || registrationMode === 'new') && (
            <div className="space-y-6">
            <div>
              <label className="block text-white font-bold mb-2">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full bg-white/20 text-white placeholder-white/50 rounded-lg p-4 text-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">Team Color</label>
              <div className="grid grid-cols-4 gap-3">
                {colors.team.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-full h-16 rounded-lg border-4 transition-all ${
                      selectedColor === color
                        ? 'border-yellow-400 scale-110 ring-4 ring-yellow-400/50'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-bold mb-2">Avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {availableAvatars.map((avatar) => {
                  const isTaken = teams.some((t) => t.avatar === avatar.imageUrl);
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => !isTaken && setSelectedAvatar(avatar.id)}
                      disabled={isTaken}
                      className={`w-full h-16 rounded-lg border-4 flex items-center justify-center transition-all ${
                        selectedAvatar === avatar.id
                          ? 'border-yellow-400 scale-110 ring-4 ring-yellow-400/50 text-yellow-400'
                          : isTaken
                          ? 'border-gray-600 opacity-50 cursor-not-allowed text-gray-500'
                          : 'border-transparent hover:border-white/50 text-white'
                      }`}
                    >
                      {getAvatarIcon(avatar.imageUrl, { size: 32 })}
                    </button>
                  );
                })}
              </div>
              {availableAvatars.length === 0 && (
                <p className="text-yellow-400 text-sm mt-2">All avatars taken!</p>
              )}
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl py-4 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-yellow-400/50"
            >
              Join Game!
            </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      {/* Menu Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/20 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>
        
        {/* Menu Dropdown */}
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-14 right-0 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl overflow-hidden"
          >
            <button
              onClick={() => {
                setShowMenu(false);
                handleClearState();
              }}
              className="w-full px-6 py-3 text-left text-white hover:bg-white/20 transition-all font-bold"
            >
              Clear State
            </button>
          </motion.div>
        )}
      </div>

      {/* Team Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div
          className="mb-2 flex justify-center"
          style={{ color: currentTeam?.color }}
        >
          {currentTeam && getAvatarIcon(currentTeam.avatar || 'Target', { size: 48 })}
        </div>
        <h2
          className="text-3xl font-black game-show-glow"
          style={{ color: currentTeam?.color }}
        >
          {currentTeam?.name}
        </h2>
        <div className="text-2xl font-bold text-white mt-2">
          Score: {teams.find(t => t.id === currentTeam?.id)?.score || currentTeam?.score || 0}
        </div>
        {currentTeam && currentTeam.streak > 0 && (
          <div className="text-yellow-400 font-bold mt-2 flex items-center justify-center gap-1">
            <Flame size={20} className="fill-yellow-400" /> Streak: {currentTeam.streak}
          </div>
        )}
      </motion.div>

      {/* Buzzer Button */}
      <motion.button
        onClick={handleBuzz}
        disabled={buzzerLocked}
        whileHover={!buzzerLocked ? { scale: 1.05 } : {}}
        whileTap={!buzzerLocked ? { scale: 0.95 } : {}}
        className={`w-64 h-64 rounded-full font-black text-4xl shadow-2xl transition-all ${
          buzzerLocked
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 active:scale-95'
        }`}
        style={{
          boxShadow: buzzerLocked
            ? undefined
            : '0 0 50px rgba(239, 68, 68, 0.8), 0 0 100px rgba(239, 68, 68, 0.4)',
        }}
      >
        {buzzerLocked ? (
          <div className="text-white flex flex-col items-center">
            <Lock size={64} className="mb-2" />
            <div className="text-xl">LOCKED</div>
          </div>
        ) : (
          <div className="text-white flex flex-col items-center">
            <Bell size={64} className="mb-2" />
            <div className="text-xl">BUZZ IN!</div>
          </div>
        )}
      </motion.button>

      {/* Status */}
      {buzzerLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center text-white text-lg"
        >
          Waiting for host to clear buzzer...
        </motion.div>
      )}
    </div>
  );
}

