'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tv, Gamepad2, Bell, Trophy } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <h1 className="text-7xl font-black text-white mb-4 game-show-glow">
          TRIVIA NIGHT
        </h1>
        <p className="text-2xl text-white/80 mb-12">Choose your view</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Link href="/screen">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-400 transition-all cursor-pointer"
            >
              <div className="mb-4 text-white">
                <Tv size={48} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Screen</h2>
              <p className="text-white/70">TV Display View</p>
            </motion.div>
          </Link>

          <Link href="/host">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-400 transition-all cursor-pointer"
            >
              <div className="mb-4 text-white">
                <Gamepad2 size={48} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Host</h2>
              <p className="text-white/70">Control Panel</p>
            </motion.div>
          </Link>

          <Link href="/buzzer">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-400 transition-all cursor-pointer"
            >
              <div className="mb-4 text-white">
                <Bell size={48} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Buzzer</h2>
              <p className="text-white/70">Team Buzzer</p>
            </motion.div>
          </Link>

          <Link href="/scoreboard">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-yellow-400 transition-all cursor-pointer"
            >
              <div className="mb-4 text-white">
                <Trophy size={48} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Scoreboard</h2>
              <p className="text-white/70">Leaderboard View</p>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
