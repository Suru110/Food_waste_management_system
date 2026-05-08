const getBackendUrl = () => {
  const hostname = window.location.hostname;
  // If we are running in dev mode (Vite default port 5173), target the backend on port 8000
  if (window.location.port === '5173') {
    return `http://${hostname}:8000`;
  }
  // In production/monolith, use the same origin
  return window.location.origin;
};

export const API_BASE_URL = getBackendUrl();

export const translateTexts = async (texts, targetLang) => {
  if (!targetLang || targetLang.startsWith('en')) return texts;
  try {
    const res = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, target_lang: targetLang })
    });
    const data = await res.json();
    return data.translations || texts;
  } catch (error) {
    console.error("Translation error", error);
    return texts;
  }
};
