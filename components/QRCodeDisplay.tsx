'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { BUZZER_URL } from '@/lib/config';
import { useGameStore } from '@/lib/store';

export default function QRCodeDisplay() {
  const { teams } = useGameStore();
  const [isVisible, setIsVisible] = useState(true);
  const [hasTeams, setHasTeams] = useState(false);

  // Don't show if teams exist and it's been hidden
  if (hasTeams && !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsVisible(false)}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 shadow-2xl border-4 border-yellow-400 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-4xl font-black text-white mb-2 game-show-glow">
                SCAN TO JOIN!
              </h2>
              <p className="text-white/90 text-lg">
                Scan this QR code to access the buzzer
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl mb-6 flex items-center justify-center">
              <QRCode
                value={BUZZER_URL}
                size={256}
                level="H"
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                fgColor="#000000"
                bgColor="#ffffff"
                viewBox="0 0 256 256"
              />
            </div>

            <div className="text-center">
              <p className="text-white/80 text-sm mb-4 font-mono break-all">
                {BUZZER_URL}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsVisible(false)}
                className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg transition-all border-2 border-white/30"
              >
                Close
              </motion.button>
            </div>

            {teams.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-yellow-300 text-sm"
              >
                {teams.length} team{teams.length !== 1 ? 's' : ''} joined!
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

