'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket-client';
import { useGameStore } from '@/lib/store';
import questionsData from '@/data/questions.json';
import { motion } from 'framer-motion';
import CompactGameBoard from '@/components/CompactGameBoard';

export default function HostPage() {
  const socket = useSocket();
  const {
    currentRound,
    currentQuestion,
    currentAnswer,
    buzzerLocked,
    buzzerTeam,
    teams,
    setCurrentRound,
    setCurrentQuestion,
    setCurrentAnswer,
    clearBuzzer,
    resetQuestion,
    updateTeamScore,
    setTeamScore,
    updateTeamStreak,
    selectQuestion,
    selectedCategory,
    selectedQuestion,
    addTeam,
    removeTeam,
    resetBuzzer,
    markQuestionComplete,
    unmarkQuestionComplete,
    setCompletedQuestions,
    completedQuestions,
    revealSpecialCard,
    hideSpecialCard,
    revealedSpecialCards,
    revealedQuestion,
    revealedAnswer,
    revealQuestion,
    revealAnswer,
    hideQuestion,
    hideAnswer,
    resetRevealStates,
  } = useGameStore();

  const [currentRoundData, setCurrentRoundData] = useState(
    questionsData.rounds.find((r) => r.roundNumber === currentRound) || questionsData.rounds[0]
  );
  const [selectedQuestionData, setSelectedQuestionData] = useState<any>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [challengeOpponent, setChallengeOpponent] = useState<string>('');
  const [assignTeamId, setAssignTeamId] = useState<string>('');
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [pendingUnmarkCategory, setPendingUnmarkCategory] = useState<string | null>(null);
  const [pendingUnmarkQuestion, setPendingUnmarkQuestion] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; score: number } | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<string>('');

  // Audio controls state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load state from JSON file on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/state');
        const state = await response.json();
        
        // Restore completed questions - directly set the array
        if (state.completedQuestions && Array.isArray(state.completedQuestions)) {
          setCompletedQuestions(state.completedQuestions);
        }
        // Restore round
        if (state.currentRound) {
          setCurrentRound(state.currentRound);
          const roundData = questionsData.rounds.find((r) => r.roundNumber === state.currentRound);
          if (roundData) {
            setCurrentRoundData(roundData);
          }
        }
        // Restore teams (without socket IDs)
        if (state.teams && Array.isArray(state.teams)) {
          state.teams.forEach((team: any) => {
            const existingTeam = teams.find((t) => t.id === team.id);
            if (!existingTeam) {
              addTeam(team);
            }
          });
        }
        // Restore buzzer state
        if (state.buzzerLocked !== undefined) {
          useGameStore.setState({ buzzerLocked: state.buzzerLocked });
        }
        if (state.buzzerTeam) {
          useGameStore.setState({ buzzerTeam: state.buzzerTeam });
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      }
    };
    loadState();
  }, []); // Only run on mount

  // Save state to JSON file whenever it changes
  useEffect(() => {
    const saveState = async () => {
      try {
        const state = {
          currentRound,
          completedQuestions: completedQuestions, // Already an array
          teams: teams.map(t => ({ 
            id: t.id,
            name: t.name,
            color: t.color,
            avatar: t.avatar,
            score: t.score,
            streak: t.streak,
          })), // Don't save socket IDs
          buzzerLocked,
          buzzerTeam,
        };
        const response = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
        if (!response.ok) {
          throw new Error(`Failed to save: ${response.statusText}`);
        }
        console.log('State saved successfully');
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    };
    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(saveState, 500);
    return () => clearTimeout(timeoutId);
  }, [currentRound, completedQuestions, teams, buzzerLocked, buzzerTeam]);

  // Sync currentRoundData when questionsData changes (e.g. HMR)
  useEffect(() => {
    const roundData = questionsData.rounds.find((r) => r.roundNumber === currentRound);
    if (roundData) {
      setCurrentRoundData(roundData);
      // Also update selectedQuestionData if it exists and matches the current round
      if (selectedQuestionData) {
        const category = roundData.categories.find((c) => c.id === selectedCategory);
        const question = category?.questions.find((q) => q.id === selectedQuestion);
        if (question) {
          setSelectedQuestionData(question);
        }
      }
    }
  }, [questionsData, currentRound, selectedCategory, selectedQuestion]);

  useEffect(() => {
    if (socket) {
      socket.on('team:registered', (data) => {
        const existingTeam = teams.find((t) => t.id === data.id);
        if (!existingTeam) {
          addTeam(data);
        }
      });

      // REMOVED: team:disconnected listener to prevent auto-removal of teams on disconnect
      // socket.on('team:disconnected', (data) => {
      //   removeTeam(data.teamId);
      // });

      // Buzzer events
      socket.on('buzzer:pressed', (data) => {
        // Only allow if not already locked (though store handles this too)
        if (!buzzerLocked) {
          const { teamId } = data;
          // Update store
          useGameStore.getState().pressBuzzer(teamId);
        }
      });

      socket.on('buzzer:cleared', () => {
        clearBuzzer();
      });

      socket.on('buzzer:reset', () => {
        resetBuzzer();
      });

      return () => {
        socket.off('team:registered');
        socket.off('team:disconnected');
        socket.off('buzzer:pressed');
        socket.off('buzzer:cleared');
        socket.off('buzzer:reset');
      };
    }
  }, [socket, teams, addTeam, removeTeam, buzzerLocked, clearBuzzer, resetBuzzer]);

  const handleRoundChange = (round: number) => {
    setCurrentRound(round);
    const roundData = questionsData.rounds.find((r) => r.roundNumber === round);
    if (roundData) {
      setCurrentRoundData(roundData);
      resetQuestion(); // Reset when changing rounds
    }
    if (socket) {
      socket.emit('round:change', { round });
    }
  };

  const handleQuestionSelect = (categoryId: string, questionId: string) => {
    const category = currentRoundData.categories.find((c) => c.id === categoryId);
    const question = category?.questions.find((q) => q.id === questionId);
    if (question) {
      const key = `${categoryId}-${questionId}`;
      const isCompleted = completedQuestions.includes(key);
      
      // If clicking a completed question, show reassign dialog instead of unmarking
      if (isCompleted) {
        setPendingUnmarkCategory(categoryId);
        setPendingUnmarkQuestion(questionId);
        setShowReassignDialog(true);
        // Still select the question so user can see it
        selectQuestion(categoryId, questionId);
        setSelectedQuestionData(question);
        const qContent = 'content' in question.question ? (question.question as any).content : '';
        const aContent = 'content' in question.answer ? (question.answer as any).content : '';
        setCurrentQuestion(qContent);
        setCurrentAnswer(aContent);
        return;
      }
      
      selectQuestion(categoryId, questionId);
      setSelectedQuestionData(question);
      const qContent = 'content' in question.question ? (question.question as any).content : '';
      const aContent = 'content' in question.answer ? (question.answer as any).content : '';
      setCurrentQuestion(qContent);
      setCurrentAnswer(aContent);
      setAssignTeamId('');
      // Reset reveal states when selecting new question
      resetRevealStates();
      if (socket) {
        socket.emit('question:clear');
      }
    }
  };


  const handleClearScreen = () => {
    if (socket) {
      socket.emit('question:clear');
    }
    resetQuestion();
    setSelectedQuestionData(null);
    setCurrentQuestion(null);
    setCurrentAnswer(null);
    setAssignTeamId('');
  };

  const handleClearBuzzer = () => {
    if (socket) {
      socket.emit('buzzer:clear');
      clearBuzzer();
    }
  };

  const handleResetBuzzer = () => {
    if (socket) {
      socket.emit('buzzer:reset');
      resetBuzzer();
    }
  };

  const handleMarkCorrect = () => {
    if (!buzzerTeam || !selectedQuestionData || !selectedCategory || !selectedQuestion) return;

    let points = selectedQuestionData.points;
    if (selectedQuestionData.type === 'special' && selectedQuestionData.specialType === 'doublePoint') {
      points *= 2;
    }

    // Get current team state before update
    const currentState = useGameStore.getState();
    const team = currentState.teams.find((t) => t.id === buzzerTeam);
    const currentScore = team?.score || 0;
    const newScore = currentScore + points;

    // Update score and streak
    updateTeamScore(buzzerTeam, points);
    if (team) {
      updateTeamStreak(buzzerTeam, team.streak + 1);
    }

    // Emit score update to all clients
    if (socket) {
      socket.emit('score:update', {
        teamId: buzzerTeam,
        points,
        newScore,
      });
    }

    handleClearBuzzer();
    
    // Auto-mark complete after correct answer
    handleMarkComplete();
  };

  const handleMarkIncorrect = () => {
    if (!buzzerTeam || !selectedQuestionData) return;

    const team = teams.find((t) => t.id === buzzerTeam);
    if (team) {
      updateTeamStreak(buzzerTeam, 0);
    }

    handleClearBuzzer();
  };

  const handleMarkComplete = (assignToTeam?: string) => {
    if (!selectedCategory || !selectedQuestion) return;
    
    const teamId = assignToTeam || assignTeamId;
    if (teamId && selectedQuestionData) {
      let points = selectedQuestionData.points;
      if (selectedQuestionData.type === 'special' && selectedQuestionData.specialType === 'doublePoint') {
        points *= 2;
      }
      
      // Get current team state before update
      const currentState = useGameStore.getState();
      const team = currentState.teams.find((t) => t.id === teamId);
      const currentScore = team?.score || 0;
      const newScore = currentScore + points;
      
      // Update score and streak
      updateTeamScore(teamId, points);
      if (team) {
        updateTeamStreak(teamId, team.streak + 1);
      }

      // Emit score update to all clients
      if (socket) {
        socket.emit('score:update', {
          teamId: teamId,
          points,
          newScore,
        });
      }
    }
    
    const key = `${selectedCategory}-${selectedQuestion}`;
    console.log('Host: Marking complete', { categoryId: selectedCategory, questionId: selectedQuestion, key });
    
    // Mark complete locally first (this updates the host view immediately)
    markQuestionComplete(selectedCategory, selectedQuestion);
    
    // Verify it was added - access store state directly
    setTimeout(() => {
      const afterState = useGameStore.getState();
      console.log('Host: After markQuestionComplete, completedQuestions:', afterState.completedQuestions);
      console.log('Host: Key exists?', afterState.completedQuestions.includes(key));
    }, 0);
    
    // Then broadcast to all clients (including screen) - CRITICAL: emit AFTER local update
    if (socket) {
      const isConnected = socket.connected;
      console.log('Host: Socket status', { exists: !!socket, connected: isConnected });
      
      if (isConnected) {
        console.log('Host: Emitting question:complete', { categoryId: selectedCategory, questionId: selectedQuestion });
        socket.emit('question:complete', {
          categoryId: selectedCategory,
          questionId: selectedQuestion,
        });
        console.log('Host: Event emitted successfully');
      } else {
        console.error('Host: Socket exists but not connected! Waiting for connection...');
        // Wait for connection and retry
        socket.once('connect', () => {
          console.log('Host: Socket connected, retrying emit');
          socket.emit('question:complete', {
            categoryId: selectedCategory,
            questionId: selectedQuestion,
          });
        });
      }
    } else {
      console.error('Host: NO SOCKET! Cannot emit event');
    }
    
    // Auto-clear screen when marking complete
    if (socket) {
      socket.emit('question:clear');
    }
    
    resetQuestion();
    setSelectedQuestionData(null);
    setAssignTeamId('');
  };

  const handleUnmarkComplete = () => {
    const categoryId = pendingUnmarkCategory || selectedCategory;
    const questionId = pendingUnmarkQuestion || selectedQuestion;
    
    if (!categoryId || !questionId) return;
    
    // Unmark complete locally first
    unmarkQuestionComplete(categoryId, questionId);
    
    // Then broadcast to all clients (including screen)
    if (socket) {
      socket.emit('question:uncomplete', {
        categoryId: categoryId,
        questionId: questionId,
      });
    }
    
    // Close dialog and reset pending values
    setShowReassignDialog(false);
    setPendingUnmarkCategory(null);
    setPendingUnmarkQuestion(null);
  };

  const handleReassignQuestion = () => {
    const categoryId = pendingUnmarkCategory || selectedCategory;
    const questionId = pendingUnmarkQuestion || selectedQuestion;
    
    if (!categoryId || !questionId) return;
    
    // First unmark the question
    unmarkQuestionComplete(categoryId, questionId);
    
    // Then broadcast unmark
    if (socket) {
      socket.emit('question:uncomplete', {
        categoryId: categoryId,
        questionId: questionId,
      });
    }
    
    // If a team is selected, assign points and mark as complete again
    if (assignTeamId && selectedQuestionData) {
      let points = selectedQuestionData.points;
      if (selectedQuestionData.type === 'special' && selectedQuestionData.specialType === 'doublePoint') {
        points *= 2;
      }
      
      // Get current team state before update
      const currentState = useGameStore.getState();
      const team = currentState.teams.find((t) => t.id === assignTeamId);
      const currentScore = team?.score || 0;
      const newScore = currentScore + points;
      
      // Update score and streak
      updateTeamScore(assignTeamId, points);
      if (team) {
        updateTeamStreak(assignTeamId, team.streak + 1);
      }

      // Emit score update to all clients
      if (socket) {
        socket.emit('score:update', {
          teamId: assignTeamId,
          points,
          newScore,
        });
      }
      
      // Mark as complete again with the new assignment
      markQuestionComplete(categoryId, questionId);
      if (socket) {
        socket.emit('question:complete', {
          categoryId: categoryId,
          questionId: questionId,
        });
      }
    }
    
    // Close dialog and reset pending values
    setShowReassignDialog(false);
    setPendingUnmarkCategory(null);
    setPendingUnmarkQuestion(null);
    setAssignTeamId('');
  };

  const handleClearGameState = async () => {
    if (confirm('Clear all game state? This will reset completed questions and scores.')) {
      try {
        await fetch('/api/state', { method: 'DELETE' });
        // Emit reset to all connected devices (buzzers)
        if (socket) {
          socket.emit('game:reset_all');
        }
        window.location.reload();
      } catch (e) {
        console.error('Failed to clear state:', e);
        alert('Failed to clear state');
      }
    }
  };

  const handleRemoveTeam = (teamId: string) => {
    if (confirm('Are you sure you want to kick this team?')) {
      if (socket) {
        socket.emit('team:remove', { teamId });
      }
      removeTeam(teamId);
    }
  };

  const handleEditScore = (team: { id: string; name: string; score: number }) => {
    setEditingTeam(team);
    setEditScoreValue(team.score.toString());
  };

  const handleSaveScore = () => {
    if (!editingTeam) return;
    
    const newScore = parseInt(editScoreValue);
    if (isNaN(newScore)) {
      alert('Please enter a valid number');
      return;
    }

    // Update local store
    setTeamScore(editingTeam.id, newScore);

    // Emit to socket
    if (socket) {
      socket.emit('score:set', {
        teamId: editingTeam.id,
        score: newScore,
      });
    }

    setEditingTeam(null);
    setEditScoreValue('');
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (socket) socket.emit('audio:pause');
      } else {
        audioRef.current.play();
        if (socket) socket.emit('audio:play');
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (socket) socket.emit('audio:seek', { time });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const isQuestionCompleted = selectedCategory && selectedQuestion 
    ? completedQuestions.includes(`${selectedCategory}-${selectedQuestion}`)
    : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black text-yellow-400">Host Control</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map((round) => (
              <button
                key={round}
                onClick={() => handleRoundChange(round)}
                className={`px-4 py-1 rounded font-bold text-sm transition-all ${
                  currentRound === round
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                R{round}
              </button>
            ))}
            <button
              onClick={handleClearGameState}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded font-bold text-xs text-white transition-all"
              title="Clear game state"
            >
              Clear State
            </button>
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('question:clear');
                }
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded font-bold text-xs text-white transition-all border border-gray-500"
              title="Clear any displayed content on screen"
            >
              Clear Screen
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Compact Game Board - Fixed Height */}
          <div className="lg:col-span-2 bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-200">Question Board</h2>
              <span className="text-xs text-gray-400">Round {currentRound}</span>
            </div>
            <div className="min-h-[400px]">
              <CompactGameBoard
                categories={currentRoundData.categories as any}
                onQuestionSelect={handleQuestionSelect}
                selectedCategory={selectedCategory}
                selectedQuestion={selectedQuestion}
              />
            </div>
          </div>

          {/* Right: Current Question & Controls - Fixed Height Container */}
          <div className="space-y-4">
            {/* Selected Question Info - Always visible with fixed height */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-200">Current Question</h2>
                {selectedQuestionData?.type === 'special' && (
                  <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                    {selectedQuestionData.specialType === 'doublePoint' 
                      ? 'DOUBLE' 
                      : selectedQuestionData.specialType === 'duel' 
                        ? 'DUEL' 
                        : selectedQuestionData.specialType === 'textOnly'
                          ? (selectedQuestionData.specialConfig?.title)
                          : 'WAGER'}
                  </span>
                )}
              </div>
              {selectedQuestionData ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Points: </span>
                    <span className="font-bold text-gray-200">{selectedQuestionData.points}</span>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 max-h-32 overflow-y-auto">
                    <p className="text-gray-300 text-xs mb-1">
                      <strong>Q:</strong> {currentQuestion || selectedQuestionData.question.content}
                    </p>
                    <p className="text-gray-300 text-xs">
                      <strong>A:</strong> {currentAnswer || selectedQuestionData.answer.content}
                    </p>
                  </div>
                  
                  {selectedQuestionData.question.type === 'audio' && selectedQuestionData.question.mediaUrl && (
                    <div className="mt-2 bg-gray-900 rounded p-3 border border-gray-700">
                      <audio
                        ref={audioRef}
                        src={selectedQuestionData.question.mediaUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="w-8 h-8 flex items-center justify-center bg-yellow-500 text-gray-900 rounded-full hover:bg-yellow-400 font-bold transition-colors"
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                        <div className="flex-1 flex flex-col gap-1">
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                          />
                          <div className="flex justify-between text-xs text-gray-400 font-mono">
                            <span>{Math.floor(currentTime)}s</span>
                            <span>{Math.floor(duration)}s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {isQuestionCompleted && (
                    <div className="text-xs text-green-400">✓ Completed</div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No question selected</div>
              )}
            </div>

            {/* Question Controls - Always visible with fixed height */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 min-h-[280px]">
              <h3 className="text-sm font-bold text-gray-200 mb-3">Controls</h3>
              {selectedQuestionData ? (
                <div className="space-y-2">
                  {/* Assign Points Section */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Assign Points To (optional):</label>
                    <select
                      value={assignTeamId}
                      onChange={(e) => setAssignTeamId(e.target.value)}
                      className="w-full bg-gray-700 text-gray-100 p-2 rounded text-xs border border-gray-600 mb-2"
                    >
                      <option value="">No team (skip question)</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedQuestionData?.type === 'special' && !isQuestionCompleted && (
                    <button
                      onClick={() => {
                        if (selectedCategory && selectedQuestion && socket) {
                          const cardKey = `${selectedCategory}-${selectedQuestion}`;
                          const isRevealed = revealedSpecialCards.includes(cardKey);
                          
                          if (isRevealed) {
                            // Hide/Unreveal the special card
                            hideSpecialCard(selectedCategory, selectedQuestion);
                            socket.emit('special:hide', {
                              categoryId: selectedCategory,
                              questionId: selectedQuestion,
                            });
                          } else {
                            // Reveal the special card
                            revealSpecialCard(selectedCategory, selectedQuestion);
                            socket.emit('special:reveal', {
                              categoryId: selectedCategory,
                              questionId: selectedQuestion,
                              specialType: selectedQuestionData.specialType,
                              specialConfig: selectedQuestionData.specialConfig,
                            });
                          }
                        }
                      }}
                      className={`w-full px-3 py-2 rounded text-xs font-bold text-white transition-all mb-2 ${
                        revealedSpecialCards.includes(`${selectedCategory}-${selectedQuestion}`)
                          ? 'bg-gray-600 hover:bg-gray-500'
                          : 'bg-amber-600 hover:bg-amber-500'
                      }`}
                    >
                      {revealedSpecialCards.includes(`${selectedCategory}-${selectedQuestion}`)
                        ? '🚫 Unreveal Special Card'
                        : '✨ Reveal Special Card'}
                    </button>
                  )}
                  
                  {/* Reveal Question and Answer Buttons */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => {
                        if (selectedQuestionData && socket) {
                          if (revealedQuestion) {
                            // Hide question
                            hideQuestion();
                            socket.emit('question:hide');
                            
                            // Stop audio if applicable
                            if (selectedQuestionData.question.type === 'audio' && audioRef.current) {
                              audioRef.current.pause();
                              audioRef.current.currentTime = 0;
                              setIsPlaying(false);
                              setCurrentTime(0);
                              if (socket) {
                                socket.emit('audio:pause');
                                socket.emit('audio:seek', { time: 0 });
                              }
                            }
                          } else {
                            // Reveal question
                            const questionContent = 'content' in selectedQuestionData.question 
                              ? (selectedQuestionData.question as any).content 
                              : '';
                            revealQuestion();
                            socket.emit('question:reveal', {
                              question: questionContent,
                              questionType: selectedQuestionData.question.type,
                              mediaUrl: selectedQuestionData.question.mediaUrl,
                            });

                            // Auto-play audio if applicable
                            if (selectedQuestionData.question.type === 'audio' && audioRef.current) {
                              audioRef.current.play().catch(e => console.error('Auto-play failed:', e));
                              setIsPlaying(true);
                              if (socket) socket.emit('audio:play');
                            }
                          }
                        }
                      }}
                      className={`px-3 py-2 rounded text-xs font-bold text-white transition-all ${
                        revealedQuestion 
                          ? 'bg-green-600 hover:bg-green-500' 
                          : 'bg-blue-600 hover:bg-blue-500'
                      }`}
                    >
                      {revealedQuestion ? '✓ Hide Question' : '📋 Reveal Question'}
                    </button>
                    <button
                      onClick={() => {
                        if (selectedQuestionData && socket) {
                          if (revealedAnswer) {
                            // Hide answer
                            hideAnswer();
                            socket.emit('answer:hide');
                          } else {
                            // Reveal answer
                            const answerContent = 'content' in selectedQuestionData.answer 
                              ? (selectedQuestionData.answer as any).content 
                              : '';
                            revealAnswer();
                            socket.emit('answer:reveal', {
                              answer: answerContent,
                              answerType: selectedQuestionData.answer.type,
                              mediaUrl: selectedQuestionData.answer.mediaUrl,
                            });
                          }
                        }
                      }}
                      className={`px-3 py-2 rounded text-xs font-bold text-white transition-all ${
                        revealedAnswer 
                          ? 'bg-green-600 hover:bg-green-500' 
                          : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                    >
                      {revealedAnswer ? '✓ Hide Answer' : '💡 Reveal Answer'}
                    </button>
                  </div>

                  {/* Dismiss/Hide Controls */}
                  {(revealedQuestion || revealedAnswer) && (
                    <button
                      onClick={() => {
                        if (socket) {
                          if (revealedAnswer) {
                            hideAnswer();
                            socket.emit('answer:hide');
                          }
                          if (revealedQuestion) {
                            hideQuestion();
                            socket.emit('question:hide');
                            
                            // Stop audio if applicable
                            if (selectedQuestionData?.question.type === 'audio' && audioRef.current) {
                              audioRef.current.pause();
                              audioRef.current.currentTime = 0;
                              setIsPlaying(false);
                              setCurrentTime(0);
                              if (socket) {
                                socket.emit('audio:pause');
                                socket.emit('audio:seek', { time: 0 });
                              }
                            }
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-xs font-bold text-white transition-all mb-2 border border-gray-500"
                    >
                      🚫 Dismiss / Hide All
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    {isQuestionCompleted ? (
                      <button
                        onClick={() => setShowReassignDialog(true)}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded text-xs font-bold text-white transition-all"
                      >
                        Reassign/Unmark
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkComplete()}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold text-white transition-all"
                      >
                        Mark Complete
                      </button>
                    )}
                    <button
                      onClick={handleClearScreen}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-xs font-bold text-white transition-all"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-xs">Select a question to enable controls</div>
              )}
            </div>

            {/* Buzzer Controls - Fixed height */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 min-h-[140px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-200">Buzzer</h3>
                <button
                  onClick={handleResetBuzzer}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold text-white transition-all"
                >
                  Reset
                </button>
              </div>
              {buzzerLocked && buzzerTeam && (
                <div className="space-y-2">
                  <div className="bg-red-900/30 border border-red-500 rounded p-2">
                    <div className="text-sm font-bold text-red-400 mb-2">
                      {teams.find((t) => t.id === buzzerTeam)?.name}
                    </div>

                  </div>
                </div>
              )}
              {!buzzerLocked && (
                <p className="text-gray-400 text-xs">Waiting...</p>
              )}
            </div>

            {/* Teams - Fixed height with scroll */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 min-h-[200px] max-h-[200px] flex flex-col">
              <h3 className="text-sm font-bold text-gray-200 mb-2">Teams ({teams.length})</h3>
              <div className="space-y-1 overflow-y-auto flex-1">
                {teams.length === 0 ? (
                  <p className="text-gray-400 text-xs">No teams</p>
                ) : (
                  teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between bg-gray-900/50 rounded p-2 text-xs"
                      style={{ borderLeft: `3px solid ${team.color}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate" style={{ color: team.color }}>
                          {team.name}
                        </div>
                        <div className="text-gray-300">{team.score}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditScore(team)}
                          className="text-gray-400 hover:text-white text-xs"
                          title="Edit Points"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveTeam(team.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                          title="Kick Team"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Score Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Edit Score: {editingTeam.name}</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Points</label>
              <input
                type="number"
                value={editScoreValue}
                onChange={(e) => setEditScoreValue(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingTeam(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScore}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold text-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign/Unmark Dialog */}
      {showReassignDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Question Already Completed</h3>
            <p className="text-sm text-gray-400 mb-4">
              This question is already marked as complete. What would you like to do?
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Reassign to team (optional):</label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full bg-gray-700 text-gray-100 p-2 rounded text-xs border border-gray-600"
                >
                  <option value="">No team (unmark only)</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReassignQuestion}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold text-white transition-all"
                >
                  {assignTeamId ? 'Reassign' : 'Unmark Only'}
                </button>
                <button
                  onClick={() => {
                    setShowReassignDialog(false);
                    setPendingUnmarkCategory(null);
                    setPendingUnmarkQuestion(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-bold text-white transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
