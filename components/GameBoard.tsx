'use client';

import { motion } from 'framer-motion';
import { roundThemes } from '@/lib/theme';
import { useGameStore } from '@/lib/store';

type Question = {
  id: string;
  points: number;
  type: 'regular' | 'special';
  specialType: string | null;
  question: {
    type: string;
    content: string;
    mediaUrl: string | null;
  };
  answer: {
    type: string;
    content: string;
    mediaUrl: string | null;
  };
};

type Category = {
  id: string;
  name: string;
  questions: Question[];
};

type GameBoardProps = {
  categories: Category[];
  onQuestionSelect?: (categoryId: string, questionId: string) => void;
  isInteractive?: boolean;
  showSpecialCards?: boolean; // Whether to reveal special card types
};

export default function GameBoard({ 
  categories, 
  onQuestionSelect,
  isInteractive = false,
  showSpecialCards = false,
}: GameBoardProps) {
  const { currentRound, selectedCategory, selectedQuestion, completedQuestions, revealedSpecialCards, _updateVersion } = useGameStore();
  const theme = roundThemes[currentRound as keyof typeof roundThemes] || roundThemes[1];
  
  // Use _updateVersion to force re-render when completedQuestions changes
  // This ensures the component always updates when the store changes
  // The _updateVersion is incremented whenever completedQuestions changes
  // By reading it here, we ensure the component subscribes to it and re-renders

  const handleCardClick = (categoryId: string, questionId: string) => {
    if (!isInteractive || !onQuestionSelect) return;
    onQuestionSelect(categoryId, questionId);
  };

  const isCardRevealed = (categoryId: string, questionId: string) => {
    const key = `${categoryId}-${questionId}`;
    return revealedSpecialCards.includes(key);
  };

  const getCardContent = (question: Question, categoryId: string, questionId: string) => {
    // Only show special card labels if they are REVEALED (surprise element!)
    const isRevealed = isCardRevealed(categoryId, questionId);
    if (isRevealed && question.type === 'special') {
      if (question.specialType === 'doublePoint') {
        return 'DOUBLE';
      }
      if (question.specialType === 'challenge') {
        return 'WAGER';
      }
    }
    // Always show points value for unrevealed cards (even special ones)
    return question.points.toString();
  };

  const isCardCompleted = (categoryId: string, questionId: string) => {
    const key = `${categoryId}-${questionId}`;
    return completedQuestions.includes(key);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2 pb-8">
      <div className="grid grid-cols-5 grid-rows-[auto_repeat(5,1fr)] gap-3 w-full h-full max-w-full">
        {/* Category Headers */}
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-center pb-1"
          >
            <h3 
              className="text-lg md:text-xl font-normal text-white text-center px-2 leading-tight"
              style={{
                fontFamily: "'Patua One', serif",
                letterSpacing: '0.05em',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
              }}
            >
              {category.name.toUpperCase()}
            </h3>
          </motion.div>
        ))}

        {/* Question Cards */}
        {[0, 1, 2, 3, 4].map((rowIndex) => (
          <>
            {categories.map((category, colIndex) => {
              const question = category.questions[rowIndex];
              if (!question) return null;

              const cardKey = `${category.id}-${question.id}`;
              const isCompleted = isCardCompleted(category.id, question.id);
              const isSelected = selectedCategory === category.id && selectedQuestion === question.id;
              const isRevealed = isCardRevealed(category.id, question.id);
              // Special cards only show special styling when revealed
              const isSpecial = question.type === 'special' && isRevealed;

              return (
                <motion.div
                  key={cardKey}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rowIndex * 5 + colIndex) * 0.02 }}
                  className="w-full h-full"
                >
                  {isInteractive ? (
                    <motion.button
                      onClick={() => handleCardClick(category.id, question.id)}
                      whileHover={!isCompleted ? { scale: 1.05 } : {}}
                      whileTap={!isCompleted ? { scale: 0.95 } : {}}
                      className={`w-full h-full rounded-xl font-medium text-xl md:text-2xl shadow-md transition-all duration-300 flex items-center justify-center ${
                        isCompleted
                          ? 'bg-slate-800/40 text-slate-500 border border-slate-600/50 cursor-pointer'
                          : isSpecial
                          ? 'bg-gradient-to-br from-purple-600/60 via-purple-500/60 to-cyan-600/60 text-white cursor-pointer border border-purple-400/50'
                          : 'bg-gradient-to-br from-blue-600/60 via-blue-500/60 to-cyan-500/60 text-white cursor-pointer border border-blue-400/50'
                      } ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2' : ''} ${isRevealed ? 'animate-pulse' : ''}`}
                      style={{
                        boxShadow: isCompleted 
                          ? 'inset 0 0 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)' 
                          : isSpecial
                          ? isRevealed
                            ? '0 4px 16px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 15px rgba(255,255,255,0.1)'
                            : '0 2px 8px rgba(168, 85, 247, 0.3), inset 0 0 10px rgba(255,255,255,0.05)'
                          : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(255,255,255,0.05)'
                      }}
                      title={isCompleted ? 'Click to unmark (completed)' : undefined}
                    >
                      {isCompleted ? (
                        <span className="text-3xl opacity-40">✓</span>
                      ) : (
                        <span 
                          style={{
                            fontFamily: "'Roboto', sans-serif",
                            fontWeight: '500',
                          }}
                        >
                          {getCardContent(question, category.id, question.id)}
                        </span>
                      )}
                    </motion.button>
                  ) : (
                    <motion.div
                      whileHover={!isCompleted ? { scale: 1.02 } : {}}
                      className={`w-full h-full rounded-xl font-medium text-xl md:text-2xl shadow-md flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-slate-800/40 text-slate-500 border border-slate-600/50'
                          : isSpecial
                          ? 'bg-gradient-to-br from-purple-600/60 via-purple-500/60 to-cyan-600/60 text-white border border-purple-400/50'
                          : 'bg-gradient-to-br from-blue-600/60 via-blue-500/60 to-cyan-500/60 text-white border border-blue-400/50'
                      } ${isRevealed ? 'animate-pulse' : ''}`}
                      style={{
                        boxShadow: isCompleted 
                          ? 'inset 0 0 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)' 
                          : isSpecial
                          ? isRevealed
                            ? '0 4px 16px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 15px rgba(255,255,255,0.1)'
                            : '0 2px 8px rgba(168, 85, 247, 0.3), inset 0 0 10px rgba(255,255,255,0.05)'
                          : '0 2px 8px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(255,255,255,0.05)'
                      }}
                    >
                      {isCompleted ? (
                        <span className="text-3xl opacity-40">✓</span>
                      ) : (
                        <span 
                          style={{
                            fontFamily: "'Roboto', sans-serif",
                            fontWeight: '500',
                          }}
                        >
                          {getCardContent(question, category.id, question.id)}
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
