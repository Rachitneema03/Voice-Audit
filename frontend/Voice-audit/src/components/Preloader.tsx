import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Preloader.css';

interface PreloaderProps {
  onComplete: () => void;
}

const greetings = [
  { text: 'Hello', language: 'English' },
  { text: 'नमस्ते', language: 'Hindi' },
  { text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', language: 'Punjabi' },
  { text: 'Hola', language: 'Spanish' },
  { text: 'Hallo', language: 'German' },
];

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (currentIndex < greetings.length) {
      const timer = setTimeout(() => {
        if (currentIndex === greetings.length - 1) {
          // Last greeting shown, trigger exit
          setTimeout(() => {
            setIsExiting(true);
          }, 400);
        } else {
          setCurrentIndex(prev => prev + 1);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isExiting, onComplete]);

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          className="preloader"
          initial={{ opacity: 1 }}
          exit={{ 
            y: '-100%',
            transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] }
          }}
        >
          <div className="preloader-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="greeting-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ 
                  duration: 0.25, 
                  ease: [0.25, 0.46, 0.45, 0.94] 
                }}
              >
                <span className="greeting-text">
                  {greetings[currentIndex].text}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress indicator */}
          <div className="preloader-progress">
            {greetings.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index <= currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="preloader"
          initial={{ y: 0 }}
          animate={{ 
            y: '-100%',
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
          }}
        >
          <div className="preloader-content">
            <motion.div className="greeting-wrapper">
              <span className="greeting-text">
                {greetings[greetings.length - 1].text}
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
