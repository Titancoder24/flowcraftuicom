// Magical sound effect generator using Web Audio API
export const playMagicalSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;

        // Create oscillators for a magical chord
        const createTone = (frequency, startTime, duration, type = 'sine') => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, startTime);

            // Envelope for smooth fade in/out
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        // Magical ascending arpeggio with shimmer
        const baseFreq = 523.25; // C5
        const notes = [1, 1.25, 1.5, 2, 2.5]; // Major pentatonic intervals

        notes.forEach((interval, i) => {
            createTone(baseFreq * interval, now + i * 0.08, 0.6, 'sine');
            createTone(baseFreq * interval * 2, now + i * 0.08, 0.4, 'triangle'); // Shimmer
        });

        // Add sparkle effect
        setTimeout(() => {
            createTone(1046.5, now + 0.5, 0.8, 'sine'); // High C
            createTone(1568, now + 0.55, 0.6, 'sine'); // High G
        }, 500);

    } catch (error) {
        console.log('Audio not supported:', error);
    }
};

export const playProgressSound = (progress) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Frequency increases with progress
        const frequency = 200 + (progress * 8);
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('Audio not supported:', error);
    }
};
