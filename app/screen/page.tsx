'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket-client';
import { useGameStore } from '@/lib/store';
import questionsData from '@/data/questions.json';
import { motion } from 'framer-motion';
import GameBoard from '@/components/GameBoard';
import ScoreboardTracker from '@/components/ScoreboardTracker';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { roundThemes } from '@/lib/theme';
import { Bell, Sparkles } from 'lucide-react';

export default function ScreenPage() {
  const socket = useSocket();
  const {
    currentRound,
    currentQuestion,
    currentAnswer,
    revealedQuestion,
    revealedAnswer,
    buzzerLocked,
    buzzerTeam,
    teams,
    setCurrentQuestion,
    setCurrentAnswer,
    revealQuestion,
    revealAnswer,
    hideQuestion,
    hideAnswer,
    pressBuzzer,
    clearBuzzer,
    addTeam,
    updateTeamScore,
    setCurrentRound,
    markQuestionComplete,
    unmarkQuestionComplete,
    setCompletedQuestions,
    removeTeam,
    resetBuzzer,
    resetQuestion,
    completedQuestions,
    revealedSpecialCards,
    revealSpecialCard,
    hideSpecialCard,
    _updateVersion,
  } = useGameStore();

  const [currentRoundData, setCurrentRoundData] = useState(
    questionsData.rounds.find((r) => r.roundNumber === currentRound) || questionsData.rounds[0]
  );
  const [questionType, setQuestionType] = useState<string>('text');
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);
  const [answerType, setAnswerType] = useState<string>('text');
  const [answerMediaUrl, setAnswerMediaUrl] = useState<string | null>(null);

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const theme = roundThemes[currentRound as keyof typeof roundThemes] || roundThemes[1];

  // Get round-specific gradient colors for progression/leveling up effect
  const getRoundGradient = (round: number) => {
    switch (round) {
      case 1:
        // Round 1: Cool, calm blues and cyans - starting out
        return 'conic-gradient(from 180deg at 50% 50%, rgba(59, 130, 246, 0.4) 0deg, rgba(6, 182, 212, 0.4) 60deg, rgba(14, 165, 233, 0.4) 120deg, rgba(59, 130, 246, 0.4) 180deg, rgba(6, 182, 212, 0.4) 240deg, rgba(14, 165, 233, 0.4) 300deg, rgba(59, 130, 246, 0.4) 360deg)';
      case 2:
        // Round 2: More energetic purples, magentas, and blues - building excitement
        return 'conic-gradient(from 180deg at 50% 50%, rgba(99, 102, 241, 0.5) 0deg, rgba(139, 92, 246, 0.5) 60deg, rgba(168, 85, 247, 0.5) 120deg, rgba(236, 72, 153, 0.5) 180deg, rgba(59, 130, 246, 0.5) 240deg, rgba(99, 102, 241, 0.5) 300deg, rgba(139, 92, 246, 0.5) 360deg)';
      case 3:
        // Round 3: Most intense - warm oranges, reds, yellows with purples - final round intensity
        return 'conic-gradient(from 180deg at 50% 50%, rgba(251, 146, 60, 0.6) 0deg, rgba(239, 68, 68, 0.6) 60deg, rgba(236, 72, 153, 0.6) 120deg, rgba(168, 85, 247, 0.6) 180deg, rgba(251, 191, 36, 0.6) 240deg, rgba(251, 146, 60, 0.6) 300deg, rgba(239, 68, 68, 0.6) 360deg)';
      default:
        return 'conic-gradient(from 180deg at 50% 50%, rgba(59, 130, 246, 0.5) 0deg, rgba(16, 185, 129, 0.5) 72deg, rgba(99, 102, 241, 0.5) 144deg, rgba(139, 92, 246, 0.5) 216deg, rgba(236, 72, 153, 0.5) 288deg, rgba(59, 130, 246, 0.5) 360deg)';
    }
  };




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

  // All socket listeners - set up when socket connects
  useEffect(() => {
    if (!socket) {
      console.log('Screen: No socket available yet');
      return;
    }

    if (!socket.connected) {
      console.log('Screen: Socket not connected yet, waiting for connection...');
      const connectHandler = () => {
        console.log('Screen: Socket connected, ID:', socket.id);
        // Listeners will be set up in the next effect run
      };
      socket.once('connect', connectHandler);
      return () => {
        socket.off('connect', connectHandler);
      };
    }

    console.log('Screen: Setting up socket listeners, socket ID:', socket.id, 'connected:', socket.connected);

    // Store reference for cleanup
    const store = useGameStore;

    // Question completion - THE CRITICAL ONE
    const handleQuestionCompleted = (data: { categoryId: string; questionId: string }) => {
      console.log('Screen: ===== RECEIVED question:completed event =====', data);
      const key = `${data.categoryId}-${data.questionId}`;
      console.log('Screen: Marking complete with key:', key);
      
      // Update store directly - this will trigger re-render
      const currentState = store.getState();
      console.log('Screen: Current completedQuestions before:', currentState.completedQuestions);
      
      currentState.markQuestionComplete(data.categoryId, data.questionId);
      
      // Verify immediately
      const afterState = store.getState();
      console.log('Screen: After update, completedQuestions:', afterState.completedQuestions);
      console.log('Screen: Key exists?', afterState.completedQuestions.includes(key));
      console.log('Screen: Update version:', afterState._updateVersion);
    };
    
    socket.on('question:completed', handleQuestionCompleted);
    console.log('Screen: Registered listener for question:completed');

    socket.on('question:uncompleted', (data) => {
      console.log('Screen: RECEIVED question:uncompleted event', data);
      store.getState().unmarkQuestionComplete(data.categoryId, data.questionId);
    });

    socket.on('question:revealed', (data) => {
      store.getState().setCurrentQuestion(data.question);
      store.getState().revealQuestion();
      setQuestionType(data.questionType || 'text');
      setQuestionMediaUrl(data.mediaUrl || null);
    });

    socket.on('answer:revealed', (data) => {
      // Hide question if it's currently revealed when answer is shown
      const currentState = store.getState();
      if (currentState.revealedQuestion) {
        currentState.hideQuestion();
      }
      currentState.setCurrentAnswer(data.answer);
      currentState.revealAnswer();
      setAnswerType(data.answerType || 'text');
      setAnswerMediaUrl(data.mediaUrl || null);
    });

    socket.on('question:hidden', () => {
      store.getState().hideQuestion();
    });

    socket.on('answer:hidden', () => {
      store.getState().hideAnswer();
    });

    socket.on('buzzer:pressed', (data) => {
      store.getState().pressBuzzer(data.teamId);
    });

    socket.on('buzzer:cleared', () => {
      store.getState().clearBuzzer();
    });

    socket.on('score:updated', (data) => {
      console.log('Screen: Received score:updated', data);
      const currentState = store.getState();
      const team = currentState.teams.find((t) => t.id === data.teamId);
      if (team) {
        const pointsToAdd = data.newScore - team.score;
        if (pointsToAdd !== 0) {
          currentState.updateTeamScore(data.teamId, pointsToAdd);
        }
      }
    });

    socket.on('score:set', (data) => {
      console.log('Screen: Received score:set', data);
      store.getState().setTeamScore(data.teamId, data.score);
    });

    socket.on('round:changed', (data) => {
      store.getState().setCurrentRound(data.round);
      const roundData = questionsData.rounds.find((r) => r.roundNumber === data.round);
      if (roundData) {
        setCurrentRoundData(roundData);
      }
    });

    socket.on('team:registered', (data) => {
      const currentState = store.getState();
      const existingTeam = currentState.teams.find((t) => t.id === data.id);
      if (!existingTeam) {
        currentState.addTeam(data);
      }
    });

    // REMOVED: team:disconnected listener to prevent auto-removal of teams on disconnect
    // socket.on('team:disconnected', (data) => {
    //   store.getState().removeTeam(data.teamId);
    // });

    socket.on('buzzer:reset', () => {
      store.getState().resetBuzzer();
    });

    socket.on('question:cleared', () => {
      store.getState().resetQuestion();
      store.getState().setCurrentQuestion(null);
      store.getState().setCurrentAnswer(null);
      setQuestionType('text');
      setQuestionMediaUrl(null);
      setAnswerType('text');
      setAnswerMediaUrl(null);
      setRevealedSpecialCard(null); // Clear special card modal when screen is cleared
    });

    socket.on('special:revealed', (data: { categoryId: string; questionId: string; specialType: string; specialConfig?: any }) => {
      console.log('Screen: Received special:revealed event', data);
      // Update store first
      store.getState().revealSpecialCard(data.categoryId, data.questionId);
      // Also directly set the modal state to ensure it shows immediately
      setTimeout(() => {
        setRevealedSpecialCard({
          categoryId: data.categoryId,
          questionId: data.questionId,
          specialType: data.specialType,
          specialConfig: data.specialConfig,
        });
      }, 100);
    });

      socket.on('special:hide', (data: { categoryId: string; questionId: string }) => {
        console.log('Screen: Received special:hide event', data);
        // Hide from store
        store.getState().hideSpecialCard(data.categoryId, data.questionId);
        // Also clear the modal state
        setRevealedSpecialCard(null);
      });

      // Audio events
      socket.on('audio:play', () => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.error('Audio play failed:', e));
          setIsPlaying(true);
        }
      });

      socket.on('audio:pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });

      socket.on('audio:seek', (data: { time: number }) => {
        if (audioRef.current) {
          audioRef.current.currentTime = data.time;
          setCurrentTime(data.time);
        }
      });

      // Debug: listen to ALL events - this will help us see if events are coming through
      const handleAnyEvent = (eventName: string, ...args: any[]) => {
      console.log('Screen: ===== Received ANY socket event =====', eventName, args);
    };
    socket.onAny(handleAnyEvent);
    
    // Test: emit a test event to verify connection
    console.log('Screen: Socket is ready, testing connection...');

    // Cleanup function
    return () => {
      console.log('Screen: Cleaning up socket listeners');
      socket.off('question:completed', handleQuestionCompleted);
      socket.off('question:uncompleted');
      socket.off('question:revealed');
      socket.off('answer:revealed');
      socket.off('question:hidden');
      socket.off('answer:hidden');
      socket.off('buzzer:pressed');
      socket.off('buzzer:cleared');
      socket.off('score:updated');
      socket.off('round:changed');
      socket.off('team:registered');
      socket.off('team:disconnected');
      socket.off('buzzer:reset');
      socket.off('question:cleared');
      socket.off('special:revealed');
      socket.off('special:hide');
      socket.offAny(handleAnyEvent);
    };
  }, [socket, socket?.connected]); // Re-run when socket or connection status changes

  // Force re-render when completedQuestions changes - this ensures GameBoard updates
  // The GameBoard component subscribes to completedQuestions, but we also subscribe here
  // to ensure the screen page re-renders and passes updated data
  useEffect(() => {
    // This effect runs whenever completedQuestions or _updateVersion changes
    // It doesn't do anything, but by subscribing to these values, we ensure
    // the component re-renders when they change
    console.log('Screen: completedQuestions changed, count:', completedQuestions.length, 'version:', _updateVersion);
  }, [completedQuestions, _updateVersion]);

  const buzzerTeamData = buzzerTeam ? teams.find((t) => t.id === buzzerTeam) : null;
  
  // Track special card reveal for popup
  const [revealedSpecialCard, setRevealedSpecialCard] = useState<{ categoryId: string; questionId: string; specialType: string; specialConfig?: { title?: string; image?: string } } | null>(null);
  const [lastProcessedReveal, setLastProcessedReveal] = useState<string>('');

  // Listen for special card reveals
  useEffect(() => {
    if (revealedSpecialCards.length > 0) {
      // Get the most recently revealed card
      const lastRevealed = revealedSpecialCards[revealedSpecialCards.length - 1];
      
      // Only process if this is a new reveal (not already processed)
      if (lastRevealed !== lastProcessedReveal) {
        const [categoryId, questionId] = lastRevealed.split('-');
        
        // Find the question to get specialType
        const roundData = questionsData.rounds.find(r => r.roundNumber === currentRound);
        const category = roundData?.categories.find(c => c.id === categoryId);
        const question = category?.questions.find(q => q.id === questionId);
        
        if (question && question.type === 'special') {
          console.log('Screen: Setting revealed special card modal', { categoryId, questionId, specialType: question.specialType, config: (question as any).specialConfig });
          setRevealedSpecialCard({
            categoryId,
            questionId,
            specialType: question.specialType || '',
            // @ts-ignore
            specialConfig: question.specialConfig,
          });
          setLastProcessedReveal(lastRevealed);
        }
      }
    }
  }, [revealedSpecialCards, currentRound, lastProcessedReveal]);

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative">
      {/* Background with spinning gradient and grid - colors intensify per round */}
      <div className="absolute -z-10 inset-0 h-full w-full bg-gradient-to-br from-black to-slate-900">
        <div 
          className="absolute inset-0 blur-[75px] animate-spin"
          style={{
            background: getRoundGradient(currentRound),
            animationDuration: '15s',
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.07) 2px, transparent 2px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 2px, transparent 2px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      {/* QR Code Overlay */}
      <QRCodeDisplay />

      {/* Scoreboard Tracker - Fixed at top */}
      <div className="flex-shrink-0 relative z-10">
        <ScoreboardTracker />
      </div>

      {/* Round Header - With proper spacing */}
      <div className="flex-shrink-0 text-center pt-2 relative z-10">
        <div className="flex items-center justify-center gap-4 md:gap-8">
          {/* Host Face 1 - Left */}
          <motion.img
            src="/images/faces/5.png"
            alt="Host 1"
            className="w-20 h-20 md:w-24 md:h-24"
            animate={{
              rotate: [0, -15, 15, -10, 10, -5, 5, 0],
              x: [0, -8, 8, -5, 5, -3, 3, 0],
              y: [0, -5, 5, -3, 3, -2, 2, 0],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl font-normal text-white tracking-wide"
            style={{
              fontFamily: "'Patua One', serif",
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
            }}
          >
            {currentRoundData.name.toUpperCase()}
          </motion.h1>
          
          {/* Host Face 3 - Right */}
          <motion.img
            src="/images/faces/10.png"
            alt="Host 3"
            className="w-20 h-20 md:w-24 md:h-24"
            animate={{
              rotate: [0, 15, -15, 10, -10, 5, -5, 0],
              x: [0, 8, -8, 5, -5, 3, -3, 0],
              y: [0, -5, 5, -3, 3, -2, 2, 0],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>

      {/* Game Board - Takes remaining space with proper bottom padding */}
      {/* Game Board - Takes remaining space with proper bottom padding */}
      <div className="flex-1 overflow-hidden flex justify-center px-4 pb-4 relative z-10">
        <div className="w-full h-full max-w-[95vw]">
          <GameBoard
            categories={currentRoundData.categories as any}
            isInteractive={false}
            showSpecialCards={false}
          />
        </div>
      </div>

      {/* Buzzer Status - Overlay */}
      {buzzerLocked && buzzerTeamData && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-3xl p-8 shadow-2xl border-4 border-yellow-400"
            style={{
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.9), inset 0 0 30px rgba(234, 179, 8, 0.3)',
            }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-6xl mb-4 text-white flex justify-center"
              >
                <Bell size={80} className="fill-white" />
              </motion.div>
              <div
                className="text-4xl font-black text-white tracking-wider"
                style={{ 
                  textShadow: `0 0 30px ${buzzerTeamData.color}, 0 0 60px ${buzzerTeamData.color}`,
                  color: buzzerTeamData.color
                }}
              >
                {buzzerTeamData.name.toUpperCase()}
              </div>
              <div className="text-2xl font-bold text-yellow-400 mt-2 tracking-widest">
                BUZZED IN!
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Question/Answer Display Overlay */}
      {(revealedQuestion || revealedAnswer) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <div className="max-w-5xl w-full mx-4 space-y-4">
            {/* Question Display */}
            {revealedQuestion && (currentQuestion || questionMediaUrl) && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-black/80 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl"
              >
                <div className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                  Question
                </div>
                {questionType === 'image' && questionMediaUrl ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={questionMediaUrl} 
                      alt="Question" 
                      className="h-[50vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-lg mb-4"
                    />
                    {currentQuestion && (
                      <p className="text-white text-xl md:text-2xl text-center max-w-4xl">{currentQuestion}</p>
                    )}
                  </div>
                ) : questionType === 'video' && questionMediaUrl ? (
                  <div className="flex flex-col items-center">
                    <video 
                      src={questionMediaUrl} 
                      controls 
                      autoPlay
                      className="h-[50vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-lg mb-4"
                    />
                    {currentQuestion && (
                      <p className="text-white text-xl md:text-2xl text-center max-w-4xl">{currentQuestion}</p>
                    )}
                  </div>
                ) : questionType === 'audio' && questionMediaUrl ? (
                  <div className="text-center w-full">
                    <audio 
                      ref={audioRef}
                      src={questionMediaUrl} 
                      onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                      onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden" 
                    />
                    
                    <div className="flex flex-col items-center justify-center py-12 gap-8">
                      {/* Visualizer Animation */}
                      <div className="flex items-end justify-center gap-1 h-32">
                        {[...Array(20)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-3 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-t-full"
                            animate={{
                              height: isPlaying ? [20, Math.random() * 100 + 20, 20] : 20,
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              repeatType: "reverse",
                              delay: i * 0.05,
                            }}
                          />
                        ))}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full max-w-2xl bg-gray-800/50 rounded-full h-4 overflow-hidden border border-white/10">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                      </div>
                      
                      <p className="text-white text-2xl font-bold tracking-wider mt-4">{currentQuestion}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-white text-xl md:text-2xl">{currentQuestion}</p>
                )}
              </motion.div>
            )}

            {/* Answer Display */}
            {revealedAnswer && (currentAnswer || answerMediaUrl) && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-black/80 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30 shadow-2xl"
              >
                <div className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-wider">
                  Answer
                </div>
                {answerType === 'image' && answerMediaUrl ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={answerMediaUrl} 
                      alt="Answer" 
                      className="h-[50vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-lg mb-4"
                    />
                    {currentAnswer && (
                      <p className="text-white text-xl md:text-2xl text-center max-w-4xl">{currentAnswer}</p>
                    )}
                  </div>
                ) : answerType === 'video' && answerMediaUrl ? (
                  <div className="flex flex-col items-center">
                    <video 
                      src={answerMediaUrl} 
                      controls 
                      autoPlay
                      className="h-[50vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-lg mb-4"
                    />
                    {currentAnswer && (
                      <p className="text-white text-xl md:text-2xl text-center max-w-4xl">{currentAnswer}</p>
                    )}
                  </div>
                ) : answerType === 'audio' && answerMediaUrl ? (
                  <div className="text-center">
                    <audio src={answerMediaUrl} controls className="w-full" />
                    <p className="text-white mt-2">{currentAnswer}</p>
                  </div>
                ) : (
                  <p className="text-white text-xl md:text-2xl">{currentAnswer}</p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Special Card Reveal - Modal Dialog */}
      {revealedSpecialCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Modal Dialog */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0, opacity: 0, rotateY: 180 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 max-w-2xl w-full mx-4"
          >
            <div
              className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-600 rounded-3xl p-12 shadow-2xl border-4 border-yellow-300"
              style={{
                boxShadow: '0 0 80px rgba(234, 179, 8, 0.9), inset 0 0 40px rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-8xl mb-6 text-yellow-200 flex justify-center"
                >
                  {revealedSpecialCard.specialType === 'doublePoint' ? (
                    <img 
                      src="/images/double.gif" 
                      alt="Double Points" 
                      className="h-[40vh] w-auto object-contain mb-6"
                    />
                  ) : revealedSpecialCard.specialType === 'duel' ? (
                    <img 
                      src="/images/duel.gif" 
                      alt="Duel Challenge" 
                      className="h-[40vh] w-auto object-contain mb-6"
                    />
                  ) : revealedSpecialCard.specialType === 'wager' ? (
                    <img 
                      src="/images/all-in.gif" 
                      alt="Wager Challenge" 
                      className="h-[40vh] w-auto object-contain mb-6"
                    />
                  ) : revealedSpecialCard.specialType === 'textOnly' ? (
                    revealedSpecialCard.specialConfig?.image ? (
                        <img 
                        src={revealedSpecialCard.specialConfig.image} 
                        alt={revealedSpecialCard.specialConfig.title || "Special Event"} 
                        className="h-[40vh] w-auto object-contain mb-6"
                        />
                    ) : (
                        <Sparkles size={120} className="fill-yellow-200 mb-6" />
                    )
                  ) : (
                    <Sparkles size={120} className="fill-yellow-200" />
                  )}
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-bold text-yellow-200 tracking-widest uppercase"
                  style={{
                    textShadow: '0 0 20px rgba(0,0,0,0.5)',
                  }}
                >
                  {revealedSpecialCard.specialType === 'doublePoint' 
                    ? 'DOUBLE POINTS!' 
                    : revealedSpecialCard.specialType === 'duel' 
                    ? 'DUEL!' 
                    : revealedSpecialCard.specialType === 'textOnly'
                    ? (revealedSpecialCard.specialConfig?.title)
                    : 'WAGER!'}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
