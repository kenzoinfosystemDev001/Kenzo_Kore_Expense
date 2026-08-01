/**
 * Triggers an immediate, automatic browser file download for PDFs, images, data URLs, blobs, or Cloudinary/R2 remote URLs.
 */
export const downloadFileAutomatically = async (url: string, filename: string) => {
  if (!url) return;

  // Infer extension if not provided
  let extension = '';
  if (url.toLowerCase().includes('.pdf') || url.includes('application/pdf')) {
    extension = '.pdf';
  } else if (url.toLowerCase().includes('.png')) {
    extension = '.png';
  } else if (url.toLowerCase().includes('.webp')) {
    extension = '.webp';
  } else if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) {
    extension = '.jpg';
  } else if (!filename.includes('.')) {
    extension = '.pdf';
  }

  const finalFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

  try {
    // 1. Data URLs and Blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 2. HTTP Remote URLs: fetch blob and trigger instant automatic download
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.warn('Direct blob fetch download fallback:', error);
    // Fallback: Anchor click
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
