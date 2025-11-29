'use client';

import { create } from 'zustand';

export type Team = {
  id: string;
  name: string;
  color: string;
  avatar: string;
  score: number;
  streak: number;
  socketId?: string;
};

export type GameState = {
  currentRound: number;
  currentQuestion: string | null;
  currentAnswer: string | null;
  revealedQuestion: boolean;
  revealedAnswer: boolean;
  buzzerLocked: boolean;
  buzzerTeam: string | null;
  teams: Team[];
  selectedCategory: string | null;
  selectedQuestion: string | null;
  completedQuestions: string[];
  revealedSpecialCards: string[]; // Array of "categoryId-questionId" for revealed special cards
  _updateVersion: number; // Force re-renders when this changes
};

type GameStore = GameState & {
  setCurrentRound: (round: number) => void;
  setCurrentQuestion: (question: string | null) => void;
  setCurrentAnswer: (answer: string | null) => void;
  revealQuestion: () => void;
  revealAnswer: () => void;
  hideQuestion: () => void;
  hideAnswer: () => void;
  resetRevealStates: () => void;
  pressBuzzer: (teamId: string) => void;
  clearBuzzer: () => void;
  addTeam: (team: Team) => void;
  updateTeamScore: (teamId: string, points: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  updateTeamStreak: (teamId: string, streak: number) => void;
  selectQuestion: (categoryId: string, questionId: string) => void;
  resetQuestion: () => void;
  markQuestionComplete: (categoryId: string, questionId: string) => void;
  unmarkQuestionComplete: (categoryId: string, questionId: string) => void;
  setCompletedQuestions: (questions: string[]) => void;
  revealSpecialCard: (categoryId: string, questionId: string) => void;
  hideSpecialCard: (categoryId: string, questionId: string) => void;
  removeTeam: (teamId: string) => void;
  resetBuzzer: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  currentRound: 1,
  currentQuestion: null,
  currentAnswer: null,
  revealedQuestion: false,
  revealedAnswer: false,
  buzzerLocked: false,
  buzzerTeam: null,
  teams: [],
  selectedCategory: null,
  selectedQuestion: null,
  completedQuestions: [],
  revealedSpecialCards: [],
  _updateVersion: 0,

  setCurrentRound: (round) => set({ currentRound: round }),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setCurrentAnswer: (answer) => set({ currentAnswer: answer }),
  revealQuestion: () => set({ revealedQuestion: true }),
  revealAnswer: () => set({ revealedAnswer: true }),
  hideQuestion: () => set({ revealedQuestion: false }),
  hideAnswer: () => set({ revealedAnswer: false }),
  resetRevealStates: () => set({ revealedQuestion: false, revealedAnswer: false }),
  pressBuzzer: (teamId) =>
    set((state) => {
      if (state.buzzerLocked) return state;
      return { buzzerLocked: true, buzzerTeam: teamId };
    }),
  clearBuzzer: () => set({ buzzerLocked: false, buzzerTeam: null }),
  addTeam: (team) =>
    set((state) => {
      if (state.teams.some((t) => t.id === team.id)) {
        return state;
      }
      return {
        teams: [...state.teams, team],
      };
    }),
  updateTeamScore: (teamId, points) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId ? { ...team, score: team.score + points } : team
      ),
    })),
  setTeamScore: (teamId, score) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId ? { ...team, score } : team
      ),
    })),
  updateTeamStreak: (teamId, streak) =>
    set((state) => ({
      teams: state.teams.map((team) =>
        team.id === teamId ? { ...team, streak } : team
      ),
    })),
  selectQuestion: (categoryId, questionId) =>
    set({ selectedCategory: categoryId, selectedQuestion: questionId }),
  resetQuestion: () =>
    set({
      currentQuestion: null,
      currentAnswer: null,
      revealedQuestion: false,
      revealedAnswer: false,
      selectedCategory: null,
      selectedQuestion: null,
    }),
  markQuestionComplete: (categoryId, questionId) =>
    set((state) => {
      const key = `${categoryId}-${questionId}`;
      if (state.completedQuestions.includes(key)) {
        return state; // Already completed
      }
      // Create new array and increment version to force re-render
      const newCompleted = [...state.completedQuestions, key];
      return { 
        completedQuestions: newCompleted,
        _updateVersion: state._updateVersion + 1
      };
    }),
  unmarkQuestionComplete: (categoryId, questionId) =>
    set((state) => {
      const key = `${categoryId}-${questionId}`;
      const newCompleted = state.completedQuestions.filter((k) => k !== key);
      // Only update if something changed
      if (newCompleted.length === state.completedQuestions.length) {
        return state; // Nothing to remove
      }
      return { 
        completedQuestions: newCompleted,
        _updateVersion: state._updateVersion + 1
      };
    }),
  setCompletedQuestions: (questions) => 
    set((state) => ({ 
      completedQuestions: questions,
      _updateVersion: state._updateVersion + 1
    })),
  revealSpecialCard: (categoryId, questionId) =>
    set((state) => {
      const key = `${categoryId}-${questionId}`;
      if (state.revealedSpecialCards.includes(key)) {
        return state; // Already revealed
      }
      return {
        revealedSpecialCards: [...state.revealedSpecialCards, key],
        _updateVersion: state._updateVersion + 1
      };
    }),
  hideSpecialCard: (categoryId, questionId) =>
    set((state) => {
      const key = `${categoryId}-${questionId}`;
      const newRevealed = state.revealedSpecialCards.filter((k) => k !== key);
      if (newRevealed.length === state.revealedSpecialCards.length) {
        return state; // Nothing to remove
      }
      return {
        revealedSpecialCards: newRevealed,
        _updateVersion: state._updateVersion + 1
      };
    }),
  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
    })),
  resetBuzzer: () => set({ buzzerLocked: false, buzzerTeam: null }),
}));
