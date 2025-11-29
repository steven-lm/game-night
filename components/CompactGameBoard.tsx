'use client';

import { useGameStore } from '@/lib/store';

type Question = {
  id: string;
  points: number;
  type: 'regular' | 'special';
  specialType: string | null;
};

type Category = {
  id: string;
  name: string;
  questions: Question[];
};

type CompactGameBoardProps = {
  categories: Category[];
  onQuestionSelect: (categoryId: string, questionId: string) => void;
  selectedCategory: string | null;
  selectedQuestion: string | null;
};

export default function CompactGameBoard({
  categories,
  onQuestionSelect,
  selectedCategory,
  selectedQuestion,
}: CompactGameBoardProps) {
  const { completedQuestions, _updateVersion } = useGameStore();
  
  // Use _updateVersion to force re-render when completedQuestions changes

  const isCardCompleted = (categoryId: string, questionId: string) => {
    const key = `${categoryId}-${questionId}`;
    return completedQuestions.includes(key);
  };

  // Match GameBoard layout: categories as columns, points as rows
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 text-xs font-bold text-gray-300 border-b border-gray-700">
              Points
            </th>
            {categories.map((category) => (
              <th
                key={category.id}
                className="text-center p-2 text-xs font-bold text-gray-300 border-b border-gray-700 min-w-[80px]"
              >
                {category.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4].map((rowIndex) => {
            const points = categories[0]?.questions[rowIndex]?.points;
            if (!points) return null;
            
            return (
              <tr key={rowIndex} className="hover:bg-gray-800/50">
                <td className="p-2 text-xs font-semibold text-gray-200 border-b border-gray-800 text-center">
                  {points}
                </td>
                {categories.map((category) => {
                  const question = category.questions[rowIndex];
                  if (!question) return null;
                  
                  const isCompleted = isCardCompleted(category.id, question.id);
                  const isSelected =
                    selectedCategory === category.id && selectedQuestion === question.id;
                  const isSpecial = question.type === 'special';

                  return (
                    <td key={question.id} className="p-1 border-b border-gray-800">
                      <button
                        onClick={() => onQuestionSelect(category.id, question.id)}
                        className={`w-full py-2 px-2 rounded text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                            : isSelected
                            ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-400'
                            : isSpecial
                            ? 'bg-yellow-600/80 hover:bg-yellow-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                        title={
                          isCompleted
                            ? 'Click to unmark (completed)'
                            : isSpecial
                            ? question.specialType === 'doublePoint'
                              ? 'Double Points'
                              : 'Wager Card'
                            : `${question.points} points`
                        }
                      >
                        {isCompleted ? '✓' : question.points}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
