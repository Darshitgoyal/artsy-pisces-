const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const artworks = [
  {
    title: 'The Afterglow of Ambition',
    description: 'A beautiful abstract depiction of human drive and ambition.',
    my_quote: 'Where passion meets its quiet twilight.',
    category: 'Abstract',
    price: 15000,
    image_url: '/images/art-01.png'
  },
  {
    title: 'Flight of the Unfettered',
    description: 'An expressive portrayal of freedom and flight.',
    my_quote: 'To soar beyond the borders of our own mind.',
    category: 'Modern',
    price: 18500,
    image_url: '/images/art-02.jpg'
  },
  {
    title: 'The Afterglow of Ambition II',
    description: 'The second installment in the Afterglow of Ambition series.',
    my_quote: 'Continuing the journey of pursuit.',
    category: 'Abstract',
    price: 16000,
    image_url: '/images/art-03.jpg'
  },
  {
    title: 'The Quiet Silver',
    description: 'A serene minimalist art piece showcasing shades of silver.',
    my_quote: 'Peace is found in the soft metallic whispers.',
    category: 'Minimalist',
    price: 12000,
    image_url: '/images/art-04.jpg'
  },
  {
    title: 'The Unspoken Roar',
    description: 'A bold, contemporary statement piece.',
    my_quote: 'The loudest thoughts are often the ones left unsaid.',
    category: 'Contemporary',
    price: 22000,
    image_url: '/images/art-05.jpg'
  },
  {
    title: 'Eternal Melodies of Braj',
    description: 'A traditional artwork capturing the cultural essence of Braj.',
    my_quote: 'Immerse in the divine music of the soul.',
    category: 'Traditional',
    price: 25000,
    image_url: '/images/art-06.jpg'
  },
  {
    title: 'The Electric Metamorphosis',
    description: 'A vibrant digital art style transformation piece.',
    my_quote: 'Energy never dies, it only changes form.',
    category: 'Digital Art',
    price: 14000,
    image_url: '/images/art-07.jpg'
  },
  {
    title: 'The Fragrance of Thought',
    description: 'A surreal landscape piece representing thought processes.',
    my_quote: 'Ideas bloom like flowers in the secret garden of the mind.',
    category: 'Surrealism',
    price: 19500,
    image_url: '/images/art-08.jpg'
  },
  {
    title: 'Pokemon',
    description: 'A stylized artistic tribute to classic pop culture characters.',
    my_quote: 'Gotta catch all the artistic expressions!',
    category: 'Pop Culture',
    price: 8500,
    image_url: '/images/art-09.jpg'
  }
];

async function seed() {
  console.log('Starting seeding of artworks...');
  
  try {
    for (const art of artworks) {
      // Check if artwork with title already exists
      const existing = await pool.query(
        'SELECT id FROM artworks WHERE title = $1',
        [art.title]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️ Artwork "${art.title}" already exists. Skipping.`);
        continue;
      }

      await pool.query(
        `INSERT INTO artworks (title, description, my_quote, category, price, image_url, available)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [art.title, art.description, art.my_quote, art.category, art.price, art.image_url]
      );
      console.log(`✅ Seeded: "${art.title}"`);
    }

    // Seed default coupons too, just in case
    const coupons = [
      { code: 'WELCOME10', discount_type: 'percent', discount_value: 10, min_order_value: 500, max_uses: 100 },
      { code: 'ARTSY500', discount_type: 'flat', discount_value: 500, min_order_value: 5000, max_uses: 50 }
    ];

    console.log('\nSeeding default coupons...');
    for (const c of coupons) {
      const existingCoupon = await pool.query(
        'SELECT id FROM coupons WHERE code = $1',
        [c.code]
      );

      if (existingCoupon.rows.length > 0) {
        console.log(`⚠️ Coupon "${c.code}" already exists. Skipping.`);
        continue;
      }

      await pool.query(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, used_count, active)
         VALUES ($1, $2, $3, $4, $5, 0, true)`,
        [c.code, c.discount_type, c.discount_value, c.min_order_value, c.max_uses]
      );
      console.log(`✅ Seeded Coupon: "${c.code}"`);
    }

    console.log('\nAll seeding complete!');
  } catch (err) {
    console.error('❌ Error seeding:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
