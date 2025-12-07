import axios from 'axios';

const DEEPSEEK_OCR_URL = process.env.DEEPSEEK_OCR_URL || 'http://192.168.110.103:8000/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-ai/DeepSeek-OCR';

/**
 * Clean base64 string (remove newlines that cause errors)
 */
const cleanBase64 = (buffer) => {
  return buffer.toString('base64').replace(/[\r\n]/g, '');
};

/**
 * Extract text from a single screenshot using DeepSeek-OCR
 * Uses simple "Free OCR." prompt for best results
 */
const extractTextFromScreenshot = async (screenshot, pageName) => {
  const base64Image = cleanBase64(screenshot);
  
  const response = await axios.post(DEEPSEEK_OCR_URL, {
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          },
          {
            type: 'text',
            text: 'Free OCR.'  // Simple prompt = best results
          }
        ]
      }
    ],
    max_tokens: 2048,
    temperature: 0.0
  }, {
    timeout: 60000
  });

  return response.data.choices[0].message.content || '';
};

/**
 * Analyze website screenshots using DeepSeek-OCR (local GPU server)
 * SIMPLIFIED: Only extracts text, Claude does the analysis
 * @param {Array<{page: string, screenshot: Buffer}>} screenshots - Screenshots to analyze
 * @param {string} domain - Domain being analyzed
 * @returns {Promise<Object>} Extracted text for Claude to analyze
 */
export const analyzeWithDeepSeekOCR = async (screenshots, domain) => {
  if (!screenshots || screenshots.length === 0) {
    console.log('⚠️ No screenshots to analyze');
    return null;
  }

  console.log(`🔍 DeepSeek-OCR: Extracting text from ${screenshots.length} screenshots for ${domain}`);

  try {
    const extractions = [];
    
    // Process screenshots sequentially to avoid overloading
    for (const { page, screenshot } of screenshots) {
      try {
        console.log(`  📄 Processing: ${page}`);
        const text = await extractTextFromScreenshot(screenshot, page);
        
        if (text && text.trim().length > 10) {
          extractions.push({
            page,
            text: text.trim()
          });
          console.log(`  ✅ Extracted ${text.length} chars from ${page}`);
        } else {
          console.log(`  ⚠️ No text found on ${page}`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to extract from ${page}:`, err.message);
      }
    }

    if (extractions.length === 0) {
      return {
        domain,
        error: 'No text could be extracted from screenshots',
        fallback: true
      };
    }

    // Combine all extracted text
    const combinedText = extractions
      .map(e => `## ${e.page}\n${e.text}`)
      .join('\n\n---\n\n');

    console.log(`✅ DeepSeek-OCR: Extracted text from ${extractions.length}/${screenshots.length} pages`);
    
    return {
      domain,
      extractedText: combinedText,
      pageCount: extractions.length,
      totalChars: combinedText.length,
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ DeepSeek-OCR error:', error.message);
    
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    
    return {
      domain,
      error: error.message,
      fallback: true
    };
  }
};

/**
 * Health check for DeepSeek-OCR service
 */
export const checkDeepSeekHealth = async () => {
  try {
    // Check /v1/models endpoint instead of /health (more reliable for vLLM)
    const response = await axios.get(DEEPSEEK_OCR_URL.replace('/v1/chat/completions', '/v1/models'), {
      timeout: 5000
    });
    const hasModel = response.data?.data?.some(m => m.id.includes('DeepSeek-OCR'));
    return { available: hasModel, status: response.status, models: response.data?.data?.length || 0 };
  } catch (error) {
    return { available: false, error: error.message };
  }
};

/**
 * Simple OCR extraction without structuring
 */
export const extractTextFromImage = async (imageBuffer) => {
  const base64Image = imageBuffer.toString('base64');
  
  const response = await axios.post(DEEPSEEK_OCR_URL, {
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          },
          { type: 'text', text: 'Free OCR.' }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.0
  }, {
    timeout: 30000
  });

  return response.data.choices[0].message.content;
};

export default {
  analyzeWithDeepSeekOCR,
  checkDeepSeekHealth,
  extractTextFromImage
};
