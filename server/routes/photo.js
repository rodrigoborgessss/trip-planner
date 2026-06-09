// Foto de uma cidade: GET /api/photo?city=Madrid&country=Spain -> { url, source }
// 'source' indica de onde veio (pexels / wikipedia / null) para diagnóstico.
// A chave do Pexels (se houver) fica só no servidor, nunca no frontend.
const express = require('express');
const router = express.Router();
const photos = require('../services/photos');

router.get('/photo', async (req, res) => {
  const { city, country } = req.query;
  try {
    const { url, source } = await photos.getCityPhoto(city, country);
    res.json({ ok: true, url: url || null, source: source || null, pexels: photos.hasPexels() });
  } catch (e) {
    res.json({ ok: true, url: null, source: null });
  }
});

module.exports = router;
