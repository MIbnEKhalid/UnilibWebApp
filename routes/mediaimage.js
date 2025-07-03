import express from "express";
const router = express.Router();
import fetch from "node-fetch";
import { validateSessionAndRole } from "mbkauthe";


router.post('/upload', validateSessionAndRole("Any"), async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!/^data:image\/([a-zA-Z]*);base64,/.test(image)) {
      return res.status(400).json({ error: 'Invalid base64 image format' });
    }


    const base64Data = image.split(',')[1];

    const fileUrl = await uploadImage(base64Data, filename, req);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: fileUrl
    });

  } catch (error) {
    console.error('Route error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload image'
    });
  }
});


async function uploadImage(base64Image, filename = 'category-image.jpg', req) {
  const adminApiKey = process.env.PYTHON_ADMIN_API_KEY;
  const serverUrl = 'https://media.mbktechstudio.com/api/v1/admin/upload';
  const username = req.session.user.username;
  if (!adminApiKey) {
    console.error('PYTHON_ADMIN_API_KEY is not set.');
    throw new Error('Image upload service is not configured (API key missing).');
  }

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': adminApiKey
      },
      body: JSON.stringify({
        target_username: username,
        filename,
        category: 'images',
        base64_content: base64Image
      })
    });

    const data = await response.json();

    if (!response.ok || !data.fileUrl) {
      console.error('Upload API Error:', data);
      throw new Error(data.message || 'Image upload failed');
    }

    return data.fileUrl;
  } catch (error) {
    console.error('Upload error:', error.message);
    throw error;
  }
}
router.get('/api/media-images',validateSessionAndRole("Any"),  async (req, res) => {
  const ADMIN_API_KEY = process.env.PYTHON_ADMIN_API_KEY;
  const SERVER_BASE = "https://media.mbktechstudio.com";
  const ENDPOINT = "/api/v1/admin/get";
  const TARGET_USER = "maaz.waheed";
  const CATEGORY = "images";

  if (!ADMIN_API_KEY) {
    console.error("PYTHON_ADMIN_API_KEY is not set");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const fetchUrl = new URL(ENDPOINT, SERVER_BASE);
  fetchUrl.searchParams.append('target_username', TARGET_USER);
  fetchUrl.searchParams.append('category', CATEGORY);

  console.log('Final request URL:', fetchUrl.toString());

  try {
    const apiResponse = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': ADMIN_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Media API Error: ${apiResponse.status}`, {
        url: fetchUrl.toString(),
        error: errorText
      });
      return res.status(apiResponse.status).json({
        error: 'Media API request failed',
        details: errorText
      });
    }

    const data = await apiResponse.json();

    if (Array.isArray(data)) {
      return res.json(data);
    }

    console.error('Unexpected response format:', data);
    return res.status(500).json({ error: "Unexpected response format" });

  } catch (error) {
    console.error('Media API Connection Error:', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Failed to connect to media API' });
  }
});

export const media = router;