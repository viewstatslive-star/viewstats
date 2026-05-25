const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos`,
      {
        params: {
          id: videoId,
          part: 'snippet,statistics',
          key: apiKey
        }
      }
    );

    const video = response.data.items[0];
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      views: parseInt(video.statistics.viewCount),
      channelName: video.snippet.channelTitle
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;