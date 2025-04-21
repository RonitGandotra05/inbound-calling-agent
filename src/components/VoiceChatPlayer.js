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
  
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Streaming audio playback
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const bufferQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
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
    };
  }, []);
  
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
  
  const startRecording = async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      // Handle data available event
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      mediaRecorderRef.current.onstop = () => {
        // Process the recorded audio
        processAudio();
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone: ' + error.message);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setError('No audio recorded');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Convert audio chunks to blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        
        // Prepare request payload
        const payload = {
          audio_data: base64Audio,
          phone_number: '+11234567890', // Mock phone number for testing
          audio_enabled: true,
          streaming: useStreaming,
          conversation_id: conversationId
        };
        
        // Set up streaming or traditional response handling
        if (useStreaming) {
          await handleStreamingRequest(payload);
        } else {
          await handleTraditionalRequest(payload);
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      setError('Failed to process audio: ' + error.message);
      setIsProcessing(false);
    }
  };
  
  const handleStreamingRequest = async (payload) => {
    let response; // Define response variable outside the try block
    try {
      // Set up streaming audio playback
      if (!setupStreamingAudio()) {
        // Fall back to traditional request if streaming setup fails
        console.warn('Streaming setup failed, falling back to traditional request.');
        await handleTraditionalRequest(payload);
        return;
      }
      
      // Reset play state
      isPlayingRef.current = false;
      
      // Make fetch request with streaming response
      response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token' // You'd use a real token here
        },
        body: JSON.stringify(payload)
      });
      
      // CRITICAL CHECK: Verify initial response status and content type
      if (!response.ok) {
        // Try to get error message from body if possible, otherwise use status text
        let errorMsg = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { 
          // If body isn't JSON, just use the status text
          console.warn('Failed to parse error response as JSON.');
        }
        throw new Error(errorMsg);
      }
      
      const contentType = response.headers.get('content-type');
      // Ensure we are getting an audio stream before proceeding
      if (!contentType || !contentType.includes('audio/mpeg')) {
         console.warn(`Expected audio/mpeg stream but received ${contentType}. Falling back.`);
         // We didn't get the expected audio stream, attempt fallback
         await handleTraditionalRequest(payload); 
         return;
      }
      
      // Add timeout to handle potential stalled streams
      let streamTimeout;
      const resetStreamTimeout = () => {
        if (streamTimeout) clearTimeout(streamTimeout);
        streamTimeout = setTimeout(() => {
          console.warn('Stream timeout - no data received within timeout period');
          setError('Stream timed out. Falling back to traditional response...');
          // Fall back to traditional request if stream times out
          handleTraditionalRequest(payload);
        }, 10000); // 10 second timeout
      };
      
      resetStreamTimeout();
      
      // Handle the streaming response body
      const reader = response.body.getReader();
      let receivedAnyData = false;
      
      // Process the stream chunks
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // End of stream
            if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
              try {
                // Wait a bit before ending to ensure all buffers are processed
                setTimeout(() => {
                  try {
                    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
                      mediaSourceRef.current.endOfStream();
                    }
                  } catch (err) {
                    console.warn('Error ending media stream:', err);
                  }
                }, 500);
              } catch (err) {
                console.warn('Error ending media stream:', err);
              }
            }
            break;
          }
          
          // Reset timeout since we received data
          resetStreamTimeout();
          receivedAnyData = true;
          
          // Queue the audio chunk for playback
          queueAudioBuffer(value);
        }
      } catch (streamError) {
        console.error('Error reading stream:', streamError);
        // If we've already received some data, just let it play
        // If not, fall back to traditional request
        if (!receivedAnyData) {
          setError('Error streaming audio. Falling back to traditional response...');
          handleTraditionalRequest(payload);
          return;
        }
      } finally {
        if (streamTimeout) clearTimeout(streamTimeout);
      }
      
      // Update conversation ID if provided by headers (check response variable)
      if (response && response.headers.get('X-Conversation-ID')) {
        const newConversationId = response.headers.get('X-Conversation-ID');
        onConversationIdChange(newConversationId);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Error in handleStreamingRequest:', error);
      setError('Streaming error: ' + error.message);
      setIsProcessing(false);
      
      // Try fallback to traditional request if streaming fails
      if (useStreaming) {
        console.warn('Attempting fallback to traditional request due to streaming error.');
        setUseStreaming(false);
        await handleTraditionalRequest(payload); // Pass the original payload
      }
    }
  };
  
  const handleTraditionalRequest = async (payload) => {
    try {
      setIsProcessing(true);
      
      // Make regular fetch request
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token' // You'd use a real token here
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        // Try to get a meaningful error message
        let errorMsg = `Server error: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            // Get the response as text first
            const responseText = await response.text();
            
            // Check if we actually have content
            if (!responseText || responseText.trim() === '') {
              throw new Error('Empty response received');
            }
            
            // Try to parse it as JSON
            try {
              const errorData = JSON.parse(responseText);
              errorMsg = errorData.error || errorMsg;
            } catch (parseError) {
              console.warn('Failed to parse error response as JSON:', parseError);
              errorMsg = `Parse error: ${parseError.message}. Response: ${responseText.slice(0, 100)}`;
            }
          } catch (e) {
            console.warn('Failed to read error response:', e);
          }
        } else {
          // Not JSON, try to get error message as text
          try {
            const errorText = await response.text();
            // Check if it's an HTML response
            if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
              console.error('Received HTML error page instead of JSON');
              errorMsg = 'Received HTML response from server. This likely indicates a server-side error.';
            } else if (errorText.length < 100) {
              // Only use the error text if it's reasonably short
              errorMsg += `: ${errorText}`;
            }
          } catch (textError) {
            console.warn('Failed to read error response as text:', textError);
          }
        }
        
        throw new Error(errorMsg);
      }
      
      // Check content type after successful request
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`Expected JSON but got: ${contentType}`);
        throw new Error(`Unexpected content type: ${contentType || 'unknown'}`);
      }
      
      // Parse response as JSON with safety checks
      let responseData;
      try {
        // Get the response as text first
        const responseText = await response.text();
        
        // Check if the response is empty
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response received from server');
        }
        
        // Log the response for debugging
        console.log('Response text received (first 200 chars):', responseText.slice(0, 200));
        
        // Verify it's not an HTML response before parsing
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error('Received HTML instead of JSON data');
        }
        
        try {
          responseData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          // In case of JSON parse error, try to create a minimal valid response
          if (responseText.includes('response') && responseText.includes(':')) {
            try {
              // Try to extract just the response text using regex
              const match = responseText.match(/"response"\s*:\s*"([^"]+)"/);
              if (match && match[1]) {
                console.log('Extracted response text from malformed JSON:', match[1]);
                responseData = {
                  success: true,
                  response: match[1],
                  transcription: { text: payload.transcribedText || '' }
                };
              } else {
                throw new Error('Could not extract response from malformed JSON');
              }
            } catch (extractError) {
              throw new Error(`Failed to parse response as JSON: ${jsonError.message}\nResponse starts with: ${responseText.slice(0, 150)}`);
            }
          } else {
            throw new Error(`Failed to parse response as JSON: ${jsonError.message}\nResponse starts with: ${responseText.slice(0, 150)}`);
          }
        }
      } catch (textError) {
        console.error('Error reading response text:', textError);
        throw new Error(`Failed to read response: ${textError.message}`);
      }
      
      console.log('Traditional response received:', responseData);
      
      // Check for and handle any errors in the response data
      if (!responseData.success && responseData.error) {
        setError(responseData.error);
        setIsProcessing(false);
        return;
      }
      
      // Extract response text
      if (responseData.response) {
        setResponse(responseData.response);
      }
      
      // Get and play audio if available
      if (responseData.audio_url) {
        console.log('Playing audio from URL:', responseData.audio_url);
        
        try {
          // Set up audio playback
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          
          audioRef.current.src = responseData.audio_url;
          
          // Set up event listeners
          audioRef.current.onplay = () => {
            console.log('Audio playback started');
            isPlayingRef.current = true;
          };
          
          audioRef.current.onended = () => {
            console.log('Audio playback ended');
            isPlayingRef.current = false;
          };
          
          audioRef.current.onerror = (e) => {
            console.error('Audio playback error:', e);
            setError(`Error playing audio: ${e.target.error?.message || 'unknown error'}`);
            isPlayingRef.current = false;
          };
          
          // Start playback
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.error('Error during play():', e);
              setError(`Playback failed: ${e.message}`);
              isPlayingRef.current = false;
            });
          }
        } catch (audioError) {
          console.error('Error setting up audio:', audioError);
          setError(`Audio setup error: ${audioError.message}`);
        }
      } else {
        console.log('No audio URL provided in response');
      }
      
      // Update conversation ID if provided
      if (responseData.conversation_id) {
        onConversationIdChange(responseData.conversation_id);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Error in handleTraditionalRequest:', error);
      setError(error.message || 'An error occurred processing your request');
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="voice-chat-player">
      <h2>Voice Chat</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="controls">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        <label>
          <input 
            type="checkbox" 
            checked={useStreaming} 
            onChange={(e) => setUseStreaming(e.target.checked)} 
            disabled={isRecording || isProcessing}
          />
          Use Streaming (Real-time Voice)
        </label>
      </div>
      
      {transcript && (
        <div className="transcript">
          <h3>You said:</h3>
          <p>{transcript}</p>
        </div>
      )}
      
      {response && (
        <div className="response">
          <h3>Agent Response:</h3>
          <p>{response}</p>
        </div>
      )}
      
      <div className="audio-player">
        <audio ref={audioRef} controls />
      </div>
      
      {isProcessing && (
        <div className="loading">
          Processing...
        </div>
      )}
    </div>
  );
};

export default VoiceChatPlayer; 