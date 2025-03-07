import { useState, Suspense, useMemo } from 'react';
import datazoom from '@datazoom/collector_videojs';
import VideoJS from './VideoJS';
import videojs from 'video.js';

import './App.css';

const ENV = {
  MEDIA_TAILOR_BASE_URL: import.meta.env.VITE_MEDIA_TAILOR_URL,
  MEDIA_TAILOR_TRACKING_URL: import.meta.env.VITE_MEDIA_TAILOR_TRACKING_URL,
  DATAZOOM_CONFIGURATION_ID: import.meta.env.VITE_DATAZOOM_CONFIGURATION_ID,
};

datazoom.init({
  configuration_id: ENV.DATAZOOM_CONFIGURATION_ID,
});

const Player = ({ data, handlePlayerReady }) => {
  const videoJsOptions = useMemo(() => ({
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2],
    controlBar: {
      skipButtons: { forward: 10, backward: 10 },
    },
    sources: [{
      src: data?.manifestUrl || '',
      type: 'application/x-mpegURL'
    }]
  }), [data]);

  return (
    <>
      <header className="header">
        <h1>Datazoom</h1>
      </header>
      <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
    </>
  );
};

const App = () => {
  const [datazoomContext, setDatazoomContext] = useState(null);
  const [playerContext, setPlayerContext] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTrackingUrls = async () => {
    try {
      const response = await fetch(ENV.MEDIA_TAILOR_TRACKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();

      setTrackingData({
        manifestUrl: `${ENV.MEDIA_TAILOR_BASE_URL}/${data.manifestUrl}`,
        trackingUrl: `${ENV.MEDIA_TAILOR_BASE_URL}/${data.trackingUrl}`
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePlayerReady = (player) => {
    setPlayerContext(player);
    const ctx = datazoom.createContext(player);
    ctx.attachMediaTailorTrackingURL(trackingData.trackingUrl, 10);
    setDatazoomContext(ctx);

    player.on('waiting', () => videojs.log('player is waiting'));
    player.on('dispose', () => {
      videojs.log('player will dispose');
      ctx.destroy();
      setDatazoomContext(null);
    });
  };

  useState(() => { getTrackingUrls(); }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Suspense fallback={<div>Loading player...</div>}>
        <Player data={trackingData} handlePlayerReady={handlePlayerReady} />
      </Suspense>
    </>
  );
};

export default App;
