import React, { useState, useEffect, useRef } from 'react';

/**
 * Voice Chat Player Component
 * Handles voice input and streaming audio output with our optimized agent
 */
const VoiceChatPlayer = ({ conversationId = null, onConversationIdChange = () => {} }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState(null);
  const [useStreaming, setUseStreaming] = useState(true);
  
  // Audio refs
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const vadTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // VAD settings
  const SILENCE_THRESHOLD = -50; // dB
  const SILENCE_DURATION = 1500; // ms to consider "finished talking"
  const silenceStartRef = useRef(null);
  
  // Streaming audio playback
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const bufferQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  
  useEffect(() => {
    // Set up WebSocket connection
    setupWebSocket();
    
    // Clean up on unmount
    return () => {
      stopRecording();
      closeWebSocket();
      
      if (mediaSourceRef.current) {
        try {
          if (sourceBufferRef.current) {
            mediaSourceRef.current.removeSourceBuffer(sourceBufferRef.current);
          }
          mediaSourceRef.current.endOfStream();
        } catch (error) {
          console.error('Error cleaning up MediaSource:', error);
        }
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const setupWebSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.hostname; // Only get the hostname without port
    const wsPort = 8000; // WebSocket server port
    socketRef.current = new WebSocket(`${protocol}${host}:${wsPort}/api/websocket`);
    
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      
      // Send initial metadata
      socketRef.current.send(JSON.stringify({
        type: 'init',
        conversationId: conversationId || `conv-${Date.now()}`,
        phoneNumber: '+11234567890' // Mock phone number for testing
      }));
    };
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init_ack') {
          // Connection initialized
          if (data.conversationId && data.conversationId !== conversationId) {
            onConversationIdChange(data.conversationId);
          }
        } else if (data.type === 'transcription') {
          setTranscript(data.text);
        } else if (data.type === 'response') {
          setResponse(data.text);
          setIsProcessing(false);
        } else if (data.type === 'audio') {
          // Handle audio response
          try {
            const audioData = data.data;
            const audioBlob = new Blob(
              [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], 
              { type: 'audio/mp3' }
            );
            const url = URL.createObjectURL(audioBlob);
            
            // Play the audio
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            audio.play();
          } catch (audioError) {
            console.error('Error playing audio response:', audioError);
          }
        } else if (data.type === 'error') {
          setError(data.error);
          setIsProcessing(false);
        }
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
      }
    };
    
    socketRef.current.onerror = (wsError) => {
      console.error('WebSocket error event:', wsError);
      setError('Connection error. Please check console and server logs.');
      setIsProcessing(false);
    };
    
    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      // Try to reconnect after a delay
      setTimeout(setupWebSocket, 3000);
    };
  };
  
  const closeWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };
  
  const setupVAD = async (stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create analyzer for voice activity detection
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    // Connect microphone to analyzer
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    
    // Start monitoring voice activity
    checkVoiceActivity();
  };
  
  const checkVoiceActivity = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const dB = 20 * Math.log10(average / 255);
    
    // Check for silence
    if (dB < SILENCE_THRESHOLD) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION && isRecording) {
        // User stopped talking
        stopRecording();
        return; // Stop monitoring after stopping recording
      }
    } else {
      silenceStartRef.current = null;
    }
    
    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(checkVoiceActivity);
  };
  
  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if WebSocket is connected, if not reconnect
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        setupWebSocket();
        // Wait for connection to establish
        await new Promise((resolve) => {
          const checkConnection = () => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup VAD
      setupVAD(stream);
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });
      audioChunksRef.current = [];
      
      // Handle data available event - send chunks as they become available
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          // Convert to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result;
            socketRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64Audio
            }));
          };
          reader.readAsDataURL(event.data);
          
          // Also add to local chunks for reference
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording with small timeslices (200ms)
      mediaRecorderRef.current.start(200);
      setIsRecording(true);
      setIsProcessing(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone: ' + error.message);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop voice activity detection
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop and release microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Reset VAD state
      silenceStartRef.current = null;
      
      // Notify server that recording has stopped
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'recording_stopped'
        }));
      }
    }
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const setupStreamingAudio = () => {
    if (!window.MediaSource) {
      console.warn('MediaSource API not supported. Falling back to non-streaming mode.');
      setUseStreaming(false);
      return false;
    }
    
    try {
      // Create a new MediaSource
      mediaSourceRef.current = new MediaSource();
      
      // Set up the audio element
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(mediaSourceRef.current);
      }
      
      // Configure MediaSource when it opens
      mediaSourceRef.current.addEventListener('sourceopen', () => {
        try {
          // Add source buffer for MP3 audio
          sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer('audio/mpeg');
          
          // Handle buffer updates
          sourceBufferRef.current.addEventListener('updateend', () => {
            // Process queued buffers
            processBufferQueue();
            
            // Start playing if not already playing and we have data
            if (audioRef.current && 
                !isPlayingRef.current && 
                sourceBufferRef.current.buffered.length > 0) {
              audioRef.current.play()
                .then(() => {
                  isPlayingRef.current = true;
                })
                .catch(err => {
                  console.error('Error playing audio:', err);
                });
            }
          });
          
          console.log('Streaming audio setup complete');
        } catch (error) {
          console.error('Error setting up MediaSource:', error);
          setUseStreaming(false);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error creating MediaSource:', error);
      setUseStreaming(false);
      return false;
    }
  };
  
  const processBufferQueue = () => {
    // Process queued buffers if the source buffer is not updating
    if (sourceBufferRef.current && 
        !sourceBufferRef.current.updating && 
        bufferQueueRef.current.length > 0) {
      const nextBuffer = bufferQueueRef.current.shift();
      try {
        sourceBufferRef.current.appendBuffer(nextBuffer);
      } catch (error) {
        console.error('Error appending buffer:', error);
      }
    }
  };
  
  const queueAudioBuffer = (buffer) => {
    // Queue buffer for appending
    bufferQueueRef.current.push(buffer);
    
    // Try to process queue immediately
    if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
      processBufferQueue();
    }
  };
  
  return (
    <div className="voice-chat-container p-4 bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">Voice Assistant</h2>
        <p className="text-gray-400 text-sm mb-4">
          {isRecording 
            ? "I'm listening... (will automatically stop when you pause speaking)" 
            : "Click the microphone button and start speaking"}
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex justify-center mb-6">
        <button
          onClick={toggleRecording}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={isProcessing && !isRecording}
        >
          <span className="sr-only">{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            className="w-8 h-8 text-white"
          >
            {isRecording ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
        </button>
      </div>
      
      {isProcessing && !isRecording && (
        <div className="text-center mb-4 text-blue-400">
          <div className="inline-block animate-spin mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          Processing...
        </div>
      )}
      
      <div className="space-y-4">
        {transcript && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-1">You said:</h3>
            <p className="text-white">{transcript}</p>
          </div>
        )}
        
        {response && (
          <div className="p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
            <h3 className="text-sm font-medium text-indigo-400 mb-1">Assistant:</h3>
            <p className="text-white">{response}</p>
          </div>
        )}
      </div>
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default VoiceChatPlayer; 