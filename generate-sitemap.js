// generate-sitemap.js
const RouterSitemap = require('react-router-sitemap').default;
const path = require('path');
const routes = require('./src/routes'); // あなたが用意したルート配列

async function generateSitemap() {
  const YOUR_DOMAIN = "https://ichneumonoidea-world.com/"; // あなたの本番URL
  
  return new RouterSitemap(routes)
    .build(YOUR_DOMAIN)
    .save(path.resolve(__dirname, 'build', 'sitemap.xml'));
}

generateSitemap()
  .then(() => {
    console.log("Sitemap generated successfully!");
  })
  .catch(err => {
    console.error("Error generating sitemap:", err);
  });
