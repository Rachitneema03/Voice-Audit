import * as React from "react";
import "./VoicePromptBox.css";

// --- SVG Icon Components ---
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
  </svg>
);

const StopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 4v6h6"></path>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>
);

interface VoicePromptBoxProps {
  isRecording: boolean;
  transcribedText: string;
  editedText: string;
  onEditedTextChange: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSend: () => void;
  onCancel: () => void;
  onRecordAgain: () => void;
  isProcessing?: boolean;
}

export const VoicePromptBox = React.forwardRef<HTMLTextAreaElement, VoicePromptBoxProps>(
  (
    {
      isRecording,
      transcribedText,
      editedText,
      onEditedTextChange,
      onStartRecording,
      onStopRecording,
      onSend,
      onCancel,
      onRecordAgain,
      isProcessing = false,
    },
    ref
  ) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);

    // Auto-resize textarea
    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 150);
        textarea.style.height = `${newHeight}px`;
      }
    }, [editedText]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (transcribedText || editedText.trim()) {
          onSend();
        }
      } else if (e.key === "Escape") {
        onCancel();
      }
    };

    const hasContent = transcribedText || editedText.trim();

    return (
      <div className="voice-prompt-box">
        {/* Transcribed text editing mode */}
        {transcribedText ? (
          <div className="voice-prompt-content has-text">
            {/* Left side controls */}
            <div className="voice-prompt-left-controls">
              <button
                type="button"
                className="voice-prompt-btn icon-btn"
                onClick={onRecordAgain}
                title="Record Again"
              >
                <RefreshIcon className="voice-prompt-icon" />
              </button>
              <button
                type="button"
                className="voice-prompt-btn icon-btn cancel"
                onClick={onCancel}
                title="Cancel"
              >
                <XIcon className="voice-prompt-icon" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={internalTextareaRef}
              className="voice-prompt-textarea"
              value={editedText}
              onChange={(e) => onEditedTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Edit your voice command..."
              rows={1}
              autoFocus
            />

            {/* Send button */}
            <button
              type="button"
              className="voice-prompt-btn send-btn"
              onClick={onSend}
              disabled={!hasContent || isProcessing}
              title="Send (Enter)"
            >
              <SendIcon className="voice-prompt-icon" />
            </button>
          </div>
        ) : (
          /* Recording mode */
          <div className="voice-prompt-content">
            {/* Mic button */}
            <button
              type="button"
              className={`voice-prompt-btn mic-btn ${isRecording ? "recording" : ""}`}
              onClick={isRecording ? onStopRecording : onStartRecording}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? (
                <>
                  <StopIcon className="voice-prompt-icon stop-icon" />
                  <div className="recording-pulse"></div>
                </>
              ) : (
                <MicIcon className="voice-prompt-icon mic-icon" />
              )}
            </button>

            {/* Status text */}
            <div className="voice-prompt-status">
              <span className="voice-prompt-status-text">
                {isRecording ? "Listening..." : "Click mic to start"}
              </span>
            </div>

            {/* Send button (disabled when no content) */}
            <button
              type="button"
              className="voice-prompt-btn send-btn"
              disabled={true}
              title="Send"
            >
              <SendIcon className="voice-prompt-icon" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

VoicePromptBox.displayName = "VoicePromptBox";
