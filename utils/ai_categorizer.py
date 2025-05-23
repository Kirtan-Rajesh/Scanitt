import os
import logging
import json
import requests
from typing import Tuple, List

logger = logging.getLogger(__name__)

# Get API key from environment variable
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def categorize_document(text: str) -> Tuple[str, List[str], str]:
    """
    Categorize a document using the Groq AI API based on extracted text.
    
    Args:
        text: Extracted text from the document
        
    Returns:
        Tuple of (category, tags, summary)
    """
    if not text or len(text.strip()) < 10:
        logger.warning("Text too short for categorization")
        return "Uncategorized", ["unreadable"], "No readable text found"
    
    try:
        # Truncate text if it's too long to avoid token limits
        if len(text) > 4000:
            logger.info(f"Truncating text from {len(text)} to 4000 characters")
            text = text[:4000] + "..."
        
        # Define the prompt for document categorization
        prompt = f"""
        You are an AI document analyzer that categorizes and tags documents based on their content.
        Analyze the following document text and provide:
        1. A primary category (e.g., Receipt, Invoice, ID Card, Medical, Legal, Note, Letter, Form)
        2. A list of relevant tags (3-5 tags)
        3. A brief summary (2-3 sentences)
        
        Document text:
        {text}
        
        Respond in JSON format:
        {{
            "category": "primary_category",
            "tags": ["tag1", "tag2", "tag3"],
            "summary": "Brief summary of the document content."
        }}
        
        Only return the JSON, no additional text.
        """
        
        # Prepare the API request
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Try with a different model (Claude model instead of LLaMA)
        data = {
            "model": "llama3-8b-8192",  # This is a model that should be available on Groq
            "messages": [
                {"role": "system", "content": "You are a helpful document analysis assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2  # Lower temperature for more consistent results
        }
        
        try:
            # Make the API request
            response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=15)
            response.raise_for_status()
            
            # Parse the response
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"].strip()
            
            # Extract JSON from the response
            try:
                # Clean up the response in case it has markdown code blocks
                if "```json" in ai_response:
                    ai_response = ai_response.split("```json")[1].split("```")[0].strip()
                elif "```" in ai_response:
                    ai_response = ai_response.split("```")[1].split("```")[0].strip()
                
                analysis = json.loads(ai_response)
                
                category = analysis.get("category", "Uncategorized")
                tags = analysis.get("tags", ["document"])
                summary = analysis.get("summary", "No summary available")
                
                logger.info(f"Document categorized as: {category}")
                return category, tags, summary
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing AI response as JSON: {e}")
                logger.debug(f"Raw AI response: {ai_response}")
                return "Uncategorized", ["document"], "Failed to analyze document content"
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error: {e}")
            # If the first model fails, try a fallback model
            try:
                # Try a different model as fallback
                data["model"] = "mixtral-8x7b-32768"
                response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=15)
                response.raise_for_status()
                
                # Process response from fallback model
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"].strip()
                
                if "```json" in ai_response:
                    ai_response = ai_response.split("```json")[1].split("```")[0].strip()
                elif "```" in ai_response:
                    ai_response = ai_response.split("```")[1].split("```")[0].strip()
                
                analysis = json.loads(ai_response)
                
                category = analysis.get("category", "Uncategorized")
                tags = analysis.get("tags", ["document"])
                summary = analysis.get("summary", "No summary available")
                
                logger.info(f"Document categorized as: {category} (fallback model)")
                return category, tags, summary
                
            except Exception:
                # If all API calls fail, use a simple classifier based on keywords
                logger.warning("All API calls failed, using keyword-based classification")
                return classify_by_keywords(text)
                
    except Exception as e:
        logger.error(f"Error in AI categorization: {e}")
        return classify_by_keywords(text)

def classify_by_keywords(text: str) -> Tuple[str, List[str], str]:
    """
    Simple keyword-based classifier as a fallback when API calls fail
    """
    text_lower = text.lower()
    
    # Check for receipts
    if any(word in text_lower for word in ['receipt', 'total:', 'subtotal:', 'payment', 'cash', 'credit card', 'transaction']):
        return "Receipt", ["purchase", "payment", "transaction"], "This appears to be a receipt containing purchase details."
    
    # Check for invoices
    elif any(word in text_lower for word in ['invoice', 'bill to:', 'payment terms', 'due date', 'invoice #']):
        return "Invoice", ["billing", "payment", "business"], "This appears to be an invoice requesting payment for goods or services."
    
    # Check for ID documents
    elif any(word in text_lower for word in ['passport', 'license', 'identification', 'id card', 'birth date', 'expiration']):
        return "ID", ["identification", "personal", "official"], "This appears to be an identification document containing personal information."
    
    # Check for medical documents
    elif any(word in text_lower for word in ['patient', 'diagnosis', 'prescription', 'doctor', 'hospital', 'clinic']):
        return "Medical", ["health", "patient", "treatment"], "This appears to be a medical document containing health information."
    
    # Check for legal documents
    elif any(word in text_lower for word in ['agreement', 'contract', 'legal', 'parties', 'terms', 'conditions']):
        return "Legal", ["agreement", "terms", "official"], "This appears to be a legal document outlining terms and conditions."
    
    # Check for notes
    elif any(word in text_lower for word in ['note', 'memo', 'reminder', 'meeting']):
        return "Note", ["memo", "information", "reminder"], "This appears to be a note or memorandum with informal information."
    
    # Default category if no keywords match
    return "Document", ["text", "scanned", "document"], "A scanned document with text content."
