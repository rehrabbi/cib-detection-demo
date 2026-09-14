export const getYouTubeThumbnail = (url: string) => {
  if (!url) return null;
  
  // Regex to extract the video ID from various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    // hqdefault.jpg is high quality. You can also use maxresdefault.jpg for 1080p if available
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  
  return null; // Return null if it's not a valid YouTube link
};