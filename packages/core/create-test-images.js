const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createTestImages() {
  const testDir = path.join(__dirname, 'test-images');
  
  // Opprett test-mappe hvis den ikke eksisterer
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const images = [
    { name: 'image1.png', width: 800, height: 600, color: '#ff6b6b' },
    { name: 'image2.jpg', width: 1024, height: 768, color: '#4ecdc4' },
    { name: 'image3.webp', width: 640, height: 480, color: '#45b7d1' },
    { name: 'image4.png', width: 1200, height: 800, color: '#96ceb4' },
    { name: 'image5.jpg', width: 900, height: 600, color: '#feca57' },
    { name: 'image6.webp', width: 750, height: 500, color: '#ff9ff3' },
    { name: 'image7.png', width: 1100, height: 700, color: '#54a0ff' },
    { name: 'image8.jpg', width: 850, height: 650, color: '#5f27cd' },
    { name: 'image9.webp', width: 700, height: 550, color: '#00d2d3' },
    { name: 'image10.png', width: 950, height: 750, color: '#ff9f43' }
  ];

  console.log('Oppretter test-bilder...');

  for (const image of images) {
    const outputPath = path.join(testDir, image.name);
    
    try {
      // Opprett et enkelt farget bilde
      await sharp({
        create: {
          width: image.width,
          height: image.height,
          channels: 3,
          background: image.color
        }
      })
      .composite([{
        input: Buffer.from(`
          <svg width="${image.width}" height="${image.height}">
            <text x="50%" y="50%" font-family="Arial" font-size="48" fill="white" text-anchor="middle" dy=".3em">
              ${image.name}
            </text>
            <text x="50%" y="60%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
              ${image.width}x${image.height}
            </text>
          </svg>
        `),
        top: 0,
        left: 0
      }])
      .toFile(outputPath);

      console.log(`✅ Opprettet: ${image.name}`);
    } catch (error) {
      console.error(`❌ Feil ved opprettelse av ${image.name}:`, error.message);
    }
  }

  console.log('\nTest-bilder opprettet!');
}

createTestImages().catch(console.error);
