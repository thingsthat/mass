export const formatProcessingTime = (diffTime: number) => {
  const diffMinutes = Math.round(diffTime / (1000 * 60));
  const diffSeconds = Math.round(diffTime / 1000);
  if (diffSeconds < 60) {
    return `Just now`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffMinutes < 1440) {
    return `${Math.round(diffMinutes / 60)} hour${Math.round(diffMinutes / 60) > 1 ? 's' : ''}`;
  } else {
    return `${Math.round(diffMinutes / 1440)} day${Math.round(diffMinutes / 1440) > 1 ? 's' : ''}`;
  }
};

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
