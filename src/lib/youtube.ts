export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export interface YouTubeMetadata {
  title: string;
  artist: string;
  thumbnail_url: string;
  duration?: number;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumb = getYouTubeThumbnail(videoId);

  try {
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Musique YouTube',
        artist: data.author_name || 'Artiste YouTube',
        thumbnail_url: data.thumbnail_url || defaultThumb,
      };
    }
  } catch (err) {
    console.warn('Erreur récupération oEmbed YouTube:', err);
  }

  return {
    title: 'Musique YouTube',
    artist: 'Artiste YouTube',
    thumbnail_url: defaultThumb,
  };
}

let ytApiPromise: Promise<any> | null = null;

export function loadYouTubeAPI(): Promise<any> {
  const win = window as any;
  if (win.YT && win.YT.Player) {
    return Promise.resolve(win.YT);
  }

  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      win.onYouTubeIframeAPIReady = () => {
        resolve(win.YT);
      };
    });
  }

  return ytApiPromise;
}
