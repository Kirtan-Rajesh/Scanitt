import os
import logging
import json
import requests
from typing import Tuple, List
import traceback

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Get API key from environment variable
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def categorize_document(text: str) -> Tuple[str, List[str], str]:
    """
    Categorize a document using the Groq AI API based on extracted text.
    
    Args:
        text: Extracted text from the document
        
    Returns:
        Tuple of (category, tags, summary)
    """
    # Log API key status (not the actual key)
    logger.info(f"API Key status: {'Set' if GROQ_API_KEY else 'Not set'}")
    
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not set in environment variables")
        return "Error", ["api_error"], "API key not configured. Please set the GROQ_API_KEY environment variable."
    
    # Check if the image is likely a photo (no text or very little text)
    if not text or len(text.strip()) < 10:
        logger.info("No significant text found, categorizing as Photo")
        return "Photo", ["image", "picture", "photo"], "This appears to be a photo with no significant text content."
    
    try:
        # Truncate text if it's too long to avoid token limits
        original_length = len(text)
        if original_length > 4000:
            logger.info(f"Truncating text from {original_length} to 4000 characters")
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
        
        # Try with the primary model
        model = "llama3-8b-8192"
        logger.info(f"Attempting categorization with model: {model}")
        
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a helpful document analysis assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2  # Lower temperature for more consistent results
        }
        
        try:
            # Make the API request
            logger.info(f"Sending request to Groq API: {GROQ_API_URL}")
            response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=15)
            
            # Log response status
            logger.info(f"API response status code: {response.status_code}")
            
            # Check for HTTP errors
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code} - {response.text}")
                raise requests.exceptions.HTTPError(f"API returned status code {response.status_code}: {response.text}")
            
            # Parse the response
            result = response.json()
            logger.debug(f"API response: {json.dumps(result, indent=2)}")
            
            # Check if the expected fields exist in the response
            if "choices" not in result or len(result["choices"]) == 0:
                logger.error(f"Unexpected API response format: {result}")
                raise ValueError("API response missing 'choices' field")
                
            if "message" not in result["choices"][0]:
                logger.error(f"Unexpected API response format: {result}")
                raise ValueError("API response missing 'message' field in first choice")
                
            if "content" not in result["choices"][0]["message"]:
                logger.error(f"Unexpected API response format: {result}")
                raise ValueError("API response missing 'content' field in message")
            
            ai_response = result["choices"][0]["message"]["content"].strip()
            logger.info(f"Received AI response of length: {len(ai_response)}")
            logger.debug(f"Raw AI response: {ai_response}")
            
            # Extract JSON from the response
            try:
                # Clean up the response in case it has markdown code blocks
                if "```json" in ai_response:
                    logger.info("Detected JSON code block in response")
                    ai_response = ai_response.split("```json")[1].split("```")[0].strip()
                elif "```" in ai_response:
                    logger.info("Detected code block in response")
                    ai_response = ai_response.split("```")[1].split("```")[0].strip()
                
                # Try to parse the JSON
                try:
                    analysis = json.loads(ai_response)
                    logger.info(f"Successfully parsed JSON response: {json.dumps(analysis, indent=2)}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parsing error: {e}")
                    logger.error(f"Problematic JSON string: {ai_response}")
                    raise
                
                # Extract fields from the analysis
                if "category" not in analysis:
                    logger.warning("Missing 'category' in AI response")
                if "tags" not in analysis:
                    logger.warning("Missing 'tags' in AI response")
                if "summary" not in analysis:
                    logger.warning("Missing 'summary' in AI response")
                
                category = analysis.get("category", "Uncategorized")
                tags = analysis.get("tags", ["document"])
                summary = analysis.get("summary", "No summary available")
                
                logger.info(f"Document categorized as: {category}")
                return category, tags, summary
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing AI response as JSON: {e}")
                logger.error(f"Raw AI response: {ai_response}")
                return "Uncategorized", ["document"], f"Failed to analyze document content: JSON parsing error - {str(e)}"
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request error with primary model: {e}")
            logger.error(traceback.format_exc())
            
            # If the first model fails, try a fallback model
            try:
                # Try a different model as fallback
                fallback_model = "mixtral-8x7b-32768"
                logger.info(f"Attempting with fallback model: {fallback_model}")
                
                data["model"] = fallback_model
                response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=15)
                
                # Log response status
                logger.info(f"Fallback API response status code: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"Fallback API error: {response.status_code} - {response.text}")
                    raise requests.exceptions.HTTPError(f"Fallback API returned status code {response.status_code}: {response.text}")
                
                # Process response from fallback model
                result = response.json()
                ai_response = result["choices"][0]["message"]["content"].strip()
                logger.info(f"Received fallback AI response of length: {len(ai_response)}")
                
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
                
            except Exception as fallback_error:
                # If all API calls fail, use a simple classifier based on keywords
                logger.error(f"Fallback model error: {fallback_error}")
                logger.error(traceback.format_exc())
                logger.warning("All API calls failed, using keyword-based classification")
                return classify_by_keywords(text)
                
    except Exception as e:
        logger.error(f"Unexpected error in AI categorization: {e}")
        logger.error(traceback.format_exc())
        return "Error", ["processing_error"], f"Error processing document: {str(e)}"

def classify_by_keywords(text: str) -> Tuple[str, List[str], str]:
    """
    Simple keyword-based classifier as a fallback when API calls fail
    """
    logger.info("Using keyword-based classification fallback")
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
