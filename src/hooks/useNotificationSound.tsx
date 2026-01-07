import { useCallback, useRef } from 'react';

// Simple notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playTone = () => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Second tone for "ding-dong" effect
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      
      osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
      osc2.type = 'sine';
      
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.4);
    }, 150);
  };
  
  return playTone;
};

let audioContextInstance: (() => void) | null = null;

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);
  
  const playNotification = useCallback(() => {
    // Debounce: don't play more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) {
      return;
    }
    lastPlayedRef.current = now;
    
    try {
      if (!audioContextInstance) {
        audioContextInstance = createNotificationSound();
      }
      audioContextInstance();
      console.log('🔔 Notification sound played');
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);
  
  return { playNotification };
};

// Singleton for global use
let globalPlayNotification: (() => void) | null = null;

export const getGlobalNotificationSound = () => {
  if (!globalPlayNotification) {
    let lastPlayed = 0;
    globalPlayNotification = () => {
      const now = Date.now();
      if (now - lastPlayed < 1000) return;
      lastPlayed = now;
      
      try {
        if (!audioContextInstance) {
          audioContextInstance = createNotificationSound();
        }
        audioContextInstance();
        console.log('🔔 Global notification sound played');
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    };
  }
  return globalPlayNotification;
};
