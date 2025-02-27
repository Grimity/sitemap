import * as dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import xmlFormat from 'xml-formatter';
import { db } from './db/database';

const serviceUrl = 'https://www.grimity.com';
const sitemapUrl = 'https://sitemap.grimity.com';
const imageUrl = 'https://image.grimity.com';

const rootFoler = `${__dirname}/../sitemap`;
const feedFoler = `${__dirname}/../sitemap/feed`;
const userFoler = `${__dirname}/../sitemap/user`;
const postFoler = `${__dirname}/../sitemap/post`;

if (!fs.existsSync(rootFoler)) {
  fs.mkdirSync(rootFoler);
}

if (!fs.existsSync(feedFoler)) {
  fs.mkdirSync(feedFoler);
}

if (!fs.existsSync(userFoler)) {
  fs.mkdirSync(userFoler);
}

if (!fs.existsSync(postFoler)) {
  fs.mkdirSync(postFoler);
}

async function main() {
  const feedPage = await createFeedIndex();
  const userPage = await createUserIndex();
  const postPage = await createPostIndex();

  const rootSiteMap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${serviceUrl}</loc>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>${serviceUrl}/board</loc>
      </url>
    </urlset>
  `;
  fs.writeFileSync(
    `${rootFoler}/root.xml`,
    xmlFormat(rootSiteMap, {
      indentation: '  ',
      collapseContent: true,
    })
  );

  const rootIndex = `
    <?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>${sitemapUrl}/root.xml</loc>
      </sitemap>
      ${Array.from({ length: feedPage }).map(
        (_, i) =>
          `
        <sitemap>
          <loc>${sitemapUrl}/feed/feed-${i + 1}.xml</loc>
        </sitemap>
      `
      )}
      ${Array.from({ length: userPage }).map(
        (_, i) =>
          `
        <sitemap>
          <loc>${sitemapUrl}/user/user-${i + 1}.xml</loc>
        </sitemap>
      `
      )}
      ${Array.from({ length: postPage }).map(
        (_, i) =>
          `
        <sitemap>
          <loc>${sitemapUrl}/post/post-${i + 1}.xml</loc>
        </sitemap>
      `
      )}
    </sitemapindex>
  `;

  fs.writeFileSync(
    `${rootFoler}/index.xml`,
    xmlFormat(rootIndex, {
      indentation: '  ',
      collapseContent: true,
    })
  );
}

main().then(() => {
  db.destroy();
});

async function createFeedIndex() {
  const feeds = await db
    .selectFrom('Feed')
    .select(['id', 'cards', 'createdAt'])
    .execute();

  let count = Math.floor(feeds.length / 50000) + 1;

  for (let i = 0; i < count; i++) {
    const sitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        ${feeds
          .slice(i * 50000, (i + 1) * 50000)
          .map(
            (feed) =>
              `
          <url>
            <loc>${serviceUrl}/feeds/${feed.id}</loc>
            <lastmod>${feed.createdAt.toISOString().split('T')[0]}</lastmod>
            ${feed.cards
              .map(
                (card) =>
                  `
              <image:image>
                <image:loc>${imageUrl}/${card}</image:loc>
              </image:image>
            `
              )
              .join('')}
          </url>
        `
          )
          .join('')}
      </urlset>
    `;

    fs.writeFileSync(
      `${feedFoler}/feed-${i + 1}.xml`,
      xmlFormat(sitemap, {
        indentation: '  ',
        collapseContent: true,
      })
    );
  }

  return count;
}

async function createUserIndex() {
  const users = await db.selectFrom('User').select(['id']).execute();

  let count = Math.floor(users.length / 50000) + 1;

  for (let i = 0; i < count; i++) {
    const sitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${users
          .slice(i * 50000, (i + 1) * 50000)
          .map(
            (user) =>
              `
          <url>
            <loc>${serviceUrl}/users/${user.id}</loc>
          </url>
        `
          )
          .join('')}
      </urlset>
    `;

    fs.writeFileSync(
      `${userFoler}/user-${i + 1}.xml`,
      xmlFormat(sitemap, {
        indentation: '  ',
        collapseContent: true,
      })
    );
  }

  return count;
}

async function createPostIndex() {
  const posts = await db
    .selectFrom('Post')
    .select(['id', 'createdAt', 'thumbnail'])
    .execute();

  let count = Math.floor(posts.length / 50000) + 1;

  for (let i = 0; i < count; i++) {
    const sitemap = `
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        ${posts
          .slice(i * 50000, (i + 1) * 50000)
          .map(
            (post) =>
              `
          <url>
            <loc>${serviceUrl}/posts/${post.id}</loc>
            <lastmod>${post.createdAt.toISOString().split('T')[0]}</lastmod>
            ${
              post.thumbnail
                ? `
              <image:image>
                <image:loc>${post.thumbnail}</image:loc>
              </image:image>
            `
                : ''
            }
          </url>
        `
          )
          .join('')}
      </urlset>
    `;
    fs.writeFileSync(
      `${postFoler}/post-${i + 1}.xml`,
      xmlFormat(sitemap, {
        indentation: '  ',
        collapseContent: true,
      })
    );
  }

  return count;
}
