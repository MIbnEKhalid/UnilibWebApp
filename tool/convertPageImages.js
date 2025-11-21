import fs from 'fs/promises';
import path from 'path';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

/**
 * Convert a specific page from PDF to image
 * Usage: node tool/convertPageImages.js <pdfPath> <pageNumber> <outputFormat> [outputPath]
 * Example: node tool/convertPageImages.js ./document.pdf 1 png ./output.png
 * Example: node tool/convertPageImages.js ./document.pdf 2 jpg
 * 
 * Supported formats: png, jpg, jpeg, webp, tiff, avif
 */

async function convertPdfPageToImage(pdfPath, pageNumber, outputFormat = 'png', outputPath = null) {
    try {
        // Validate inputs
        if (!pdfPath) {
            throw new Error('PDF path is required');
        }

        const pageNum = parseInt(pageNumber);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new Error('Page number must be a positive integer');
        }

        const supportedFormats = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'avif'];
        const format = outputFormat.toLowerCase();
        if (!supportedFormats.includes(format)) {
            throw new Error(`Unsupported format. Supported formats: ${supportedFormats.join(', ')}`);
        }

        // Check if PDF exists
        try {
            await fs.access(pdfPath);
        } catch {
            throw new Error(`PDF file not found: ${pdfPath}`);
        }

        console.log(`Extracting page ${pageNum} from ${pdfPath}...`);

        // Generate output path if not provided
        if (!outputPath) {
            const pdfBaseName = path.basename(pdfPath, path.extname(pdfPath));
            outputPath = path.join(
                path.dirname(pdfPath),
                `${pdfBaseName}_page${pageNum}.${format}`
            );
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Convert PDF to images
        const document = await pdf(pdfPath, { scale: 3.0 }); // scale 3.0 for high quality (300 DPI equivalent)
        
        let currentPage = 0;
        let pageFound = false;

        for await (const image of document) {
            currentPage++;
            
            if (currentPage === pageNum) {
                pageFound = true;
                
                // Convert to desired format using sharp
                const sharpInstance = sharp(image);
                
                if (format === 'jpg' || format === 'jpeg') {
                    await sharpInstance.jpeg({ quality: 95 }).toFile(outputPath);
                } else if (format === 'webp') {
                    await sharpInstance.webp({ quality: 95 }).toFile(outputPath);
                } else if (format === 'png') {
                    await sharpInstance.png({ compressionLevel: 6 }).toFile(outputPath);
                } else if (format === 'tiff') {
                    await sharpInstance.tiff({ compression: 'lzw' }).toFile(outputPath);
                } else if (format === 'avif') {
                    await sharpInstance.avif({ quality: 95 }).toFile(outputPath);
                }
                
                console.log(`✓ Successfully converted page ${pageNum} to ${outputPath}`);
                console.log(`Format: ${format.toUpperCase()}`);
                break;
            }
        }

        if (!pageFound) {
            throw new Error(`Page ${pageNum} does not exist in the PDF. Please check the page number.`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: node tool/convertPageImages.js <pdfPath> <pageNumber> <outputFormat> [outputPath]');
    console.log('');
    console.log('Arguments:');
    console.log('  pdfPath      - Path to the PDF file');
    console.log('  pageNumber   - Page number to extract (starting from 1)');
    console.log('  outputFormat - Output image format (png, jpg, jpeg, webp, tiff, avif)');
    console.log('  outputPath   - (Optional) Output file path');
    console.log('');
    console.log('Examples:');
    console.log('  node tool/convertPageImages.js ./document.pdf 1 png');
    console.log('  node tool/convertPageImages.js ./document.pdf 2 jpg ./output.jpg');
    console.log('  node tool/convertPageImages.js ./book.pdf 5 webp ./page5.webp');
    process.exit(1);
}

const [pdfPath, pageNumber, outputFormat, outputPath] = args;
convertPdfPageToImage(pdfPath, pageNumber, outputFormat, outputPath);
