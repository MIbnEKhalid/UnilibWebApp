import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const deleteOld = process.argv.includes('--delete-old');

async function convertToWebp(dir) {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await convertToWebp(filePath);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
                    const baseName = path.basename(file, ext);
                    const outputPath = path.join(dir, baseName + '.webp');
                    await sharp(filePath).webp().toFile(outputPath);
                    console.log(`Converted ${filePath} to ${outputPath}`);
                    if (deleteOld) {
                        await fs.unlink(filePath);
                        console.log(`Deleted original ${filePath}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
    }
}

// Start conversion from the BookCovers directory
convertToWebp('./public/BookCovers');