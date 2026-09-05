import React from 'react';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react';

export interface MessageStatusTicksProps {
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({
  status,
  deliveredAt,
  onRetry,
  className = '',
}) => {
  // If failed: red alert icon with retry
  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onRetry}
        title="Sending failed. Click to retry."
        className={`inline-flex items-center text-red-200 hover:text-white transition-colors ml-1 ${className}`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
      </button>
    );
  }

  // If sending: Clock icon (optimistic in-flight)
  if (status === 'sending') {
    return (
      <span
        title="Sending message..."
        className={`inline-flex items-center text-rose-200/90 ml-1 ${className}`}
      >
        <Clock className="w-3.5 h-3.5 animate-pulse" />
      </span>
    );
  }

  // If delivered: Double Checkmarks (Delivered to recipient)
  if (deliveredAt || status === 'delivered') {
    return (
      <span
        title="Delivered to recipient"
        className={`inline-flex items-center text-white/95 ml-1 ${className}`}
      >
        <CheckCheck className="w-4 h-4" />
      </span>
    );
  }

  // Else: Single Checkmark (Sent to server)
  return (
    <span
      title="Sent to server"
      className={`inline-flex items-center text-rose-200/90 ml-1 ${className}`}
    >
      <Check className="w-3.5 h-3.5" />
    </span>
  );
};

export default MessageStatusTicks;
