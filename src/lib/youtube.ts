export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  
  // Si c'est déjà un ID brut valide de 11 caractères
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const regExp = /(?:youtu\.be\/|(?:music\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(videoId: string): string {
  const safeId = encodeURIComponent(videoId.trim());
  return `https://img.youtube.com/vi/${safeId}/hqdefault.jpg`;
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
