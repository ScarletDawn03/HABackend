import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import { fileURLToPath } from "url";
import { PDFDocument } from 'pdf-lib';  

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resumeDir = path.join(__dirname, '../uploads/resumes');

const processAllResumes = async () => {
  const files = fs.readdirSync(resumeDir).filter(f => f.endsWith('.pdf'));

  const worker = await createWorker();

  for (const file of files) {
    const filePath = path.join(resumeDir, file);

    // Read PDF bytes
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    // Define output directory per file
    const outputDir = path.join(resumeDir, 'images', file.replace('.pdf', ''));

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const convert = fromPath(filePath, {
      density: 200,
      saveFilename: "page",
      savePath: outputDir,
      format: "png",
    });

    console.log(`Converting PDF to images: ${file}, total pages: ${totalPages}`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
  console.log(`Converting page ${pageNum} of ${totalPages}`);
  await convert(pageNum);

  const imagePath = path.join(outputDir, `page.${pageNum}.png`);

  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    continue;
  }

  console.log(`Running OCR on ${imagePath}`);

  const { data: { text } } = await worker.recognize(imagePath);
  // process or store `text` as needed
}
  }

  await worker.terminate();
};

processAllResumes();
