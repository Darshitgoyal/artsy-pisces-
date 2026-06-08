const cloudinary = require('cloudinary').v2;
const { pool } = require('../src/lib/supabase');
const path = require('path');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Map each artwork title to its local image file
const imageMap = [
  { title: 'The Afterglow of Ambition',    file: 'art-01.png' },
  { title: 'Flight of the Unfettered',     file: 'art-02.jpg' },
  { title: 'The Afterglow of Ambition II', file: 'art-03.jpg' },
  { title: 'The Quiet Silver',             file: 'art-04.jpg' },
  { title: 'The Unspoken Roar',            file: 'art-05.jpg' },
  { title: 'Eternal Melodies of Braj',     file: 'art-06.jpg' },
  { title: 'The Electric Metamorphosis',   file: 'art-07.jpg' },
  { title: 'The Fragrance of Thought',     file: 'art-08.jpg' },
  { title: 'Pokemon',                      file: 'art-09.jpg' },
];

// Path to your frontend public images folder
const IMAGES_DIR = path.join(__dirname, '../../frontend/public/images');

async function migrate() {
  console.log('Starting image migration to Cloudinary...\n');

  for (const item of imageMap) {
    const localPath = path.join(IMAGES_DIR, item.file);
    console.log(`Uploading: ${item.file}...`);

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(localPath, {
        folder: 'artsy-pisces',
        public_id: item.file.split('.')[0], // use art-01, art-02 etc as IDs
        overwrite: true,
      });

      // Update the image_url in Supabase database
      await pool.query(
        `UPDATE artworks SET image_url = $1 WHERE title = $2`,
        [result.secure_url, item.title]
      );

      console.log(`✅ ${item.title} → ${result.secure_url}\n`);
    } catch (err) {
      console.error(`❌ Failed for ${item.file}:`, err.message);
    }
  }

  console.log('Migration complete!');
  await pool.end();
}

migrate();