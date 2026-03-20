export const formatTime = (diffTime: number) => {
  const diffMinutes = Math.round(diffTime / (1000 * 60));
  const diffSeconds = Math.round(diffTime / 1000);
  if (diffSeconds < 60) {
    return `Just now`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffMinutes < 1440) {
    return `${Math.round(diffMinutes / 60)} hour${Math.round(diffMinutes / 60) > 1 ? 's' : ''} ago`;
  } else {
    return `${Math.round(diffMinutes / 1440)} day${Math.round(diffMinutes / 1440) > 1 ? 's' : ''} ago`;
  }
};

// This formats into words like "12 minutes ago"
export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);

  // If date is NaN, return 'Invalid date'
  if (isNaN(date.getTime())) {
    return '';
  }

  const diffTime = Math.abs(Date.now() - date.getTime());
  return formatTime(diffTime);
};

/**
 * Formats a date as English relative time: "Just now", "2 seconds ago", "5 minutes ago", "Yesterday", "2 days ago".
 */
export const formatRelativeTime = (updatedAt: string | undefined): string => {
  if (!updatedAt) {
    return '';
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) {
    return 'Just now';
  }
  if (diffSec < 60) {
    return `${diffSec} seconds ago`;
  }
  if (diffMin === 1) {
    return '1 minute ago';
  }
  if (diffMin < 60) {
    return `${diffMin} minutes ago`;
  }
  if (diffHours === 1) {
    return '1 hour ago';
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return `${diffDays} days ago`;
};
