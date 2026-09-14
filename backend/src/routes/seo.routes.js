import express from 'express';
import Product from '../models/Product.model.js';
import config from '../config/env.js';

// Mounted at the app root (not under /api) — see app.js. In production,
// route your storefront domain's /robots.txt and /sitemap.xml here via a
// reverse-proxy rule (the shipped frontend/nginx.conf already does this
// for the Docker Compose setup) so Google crawls them from the domain
// customers actually browse, not the API subdomain.
const seoRouter = express.Router();

seoRouter.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /cart',
      'Disallow: /place-order',
      'Disallow: /order',
      `Sitemap: ${config.frontendUrl}/sitemap.xml`,
    ].join('\n')
  );
});

const escapeXml = (str) =>
  String(str).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

seoRouter.get('/sitemap.xml', async (req, res, next) => {
  try {
    const staticPages = ['', '/collection', '/about', '/contact', '/track'];
    const products = await Product.find({}, '_id updatedAt').lean();

    const urls = [
      ...staticPages.map(
        (path) =>
          `<url><loc>${escapeXml(config.frontendUrl + path)}</loc><changefreq>daily</changefreq><priority>${path === '' ? '1.0' : '0.6'}</priority></url>`
      ),
      ...products.map(
        (p) =>
          `<url><loc>${escapeXml(`${config.frontendUrl}/product/${p._id}`)}</loc><lastmod>${new Date(p.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
      ),
    ].join('');

    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch (err) {
    next(err);
  }
});

export default seoRouter;
