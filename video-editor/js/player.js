export function createPlayer() {
  let videoEl = null;
  let currentUrl = '';

  function requireVideo() {
    if (!videoEl) {
      throw new Error('Player has not been initialized');
    }

    return videoEl;
  }

  function init(videoElement) {
    videoEl = videoElement;
    currentUrl = videoElement?.currentSrc || videoElement?.src || '';
  }

  function load(url) {
    const video = requireVideo();

    return new Promise((resolve, reject) => {
      function cleanup() {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('error', handleError);
      }

      function handleMetadata() {
        cleanup();
        resolve({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
        });
      }

      function handleError() {
        cleanup();
        reject(new Error('无法加载视频文件'));
      }

      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('error', handleError);
      currentUrl = url;
      video.src = url;
      video.load();
    });
  }

  function play() {
    return requireVideo().play();
  }

  function pause() {
    requireVideo().pause();
  }

  function isPaused() {
    return requireVideo().paused;
  }

  function seek(time) {
    requireVideo().currentTime = Math.max(0, Number(time) || 0);
  }

  function getCurrentTime() {
    return requireVideo().currentTime || 0;
  }

  function getDuration() {
    const duration = requireVideo().duration;
    return Number.isFinite(duration) ? duration : 0;
  }

  function getElement() {
    return videoEl;
  }

  function getCurrentUrl() {
    return currentUrl;
  }

  return {
    init,
    load,
    play,
    pause,
    isPaused,
    seek,
    getCurrentTime,
    getDuration,
    getElement,
    getCurrentUrl,
  };
}

export const player = createPlayer();
