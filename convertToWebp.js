import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Determine whether to delete original images after conversion.
// Support direct CLI flag (--delete-old) and npm forwarded args (npm_config_argv).
let deleteOld = process.argv.includes('--delete-old');
try {
    // Check npm's env mapping for flags like --delete-old -> npm_config_delete_old
    if (!deleteOld && process.env.npm_config_delete_old) {
        const v = process.env.npm_config_delete_old;
        deleteOld = v === 'true' || v === '1' || v === 'yes';
    }
    if (!deleteOld && process.env.npm_config_argv) {
        // npm forwards args in JSON in npm_config_argv
        const parsed = JSON.parse(process.env.npm_config_argv);
        if (parsed && Array.isArray(parsed.cooked)) {
            deleteOld = parsed.cooked.includes('--delete-old');
        }
    }
} catch (e) {
    // ignore JSON parse errors and fall back to argv check
}

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
                        try {
                            console.log(`Deleting original ${filePath}`);
                            await fs.unlink(filePath);
                            console.log(`Deleted original ${filePath}`);
                        } catch (err) {
                            console.error(`Failed to delete ${filePath}:`, err.message || err);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
    }
}

// Start conversion from the BookCovers directory
convertToWebp('./BookCovers');