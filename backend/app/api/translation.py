from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Union
from deep_translator import GoogleTranslator
import logging

router = APIRouter()

class TranslationRequest(BaseModel):
    texts: List[str]
    target_lang: str

class TranslationResponse(BaseModel):
    translations: List[str]

@router.post("/", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    if not request.texts:
        return {"translations": []}
    
    try:
        # GoogleTranslator expects a target language code
        target = request.target_lang.split('-')[0] # e.g. "en-US" to "en"
        translator = GoogleTranslator(source='auto', target=target)
        
        # Translate handles single string or list of strings
        if len(request.texts) == 1:
            result = [translator.translate(request.texts[0])]
        else:
            result = translator.translate_batch(request.texts)
            
        return {"translations": result}
    except Exception as e:
        logging.error(f"Translation error: {e}")
        # Fallback to original text on error
        return {"translations": request.texts}
