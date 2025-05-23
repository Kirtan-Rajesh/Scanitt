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
        
        data = {
            "model": "llama-3.1-70b-versatile",  # Using the latest LLaMA model
            "messages": [
                {"role": "system", "content": "You are a helpful document analysis assistant."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2  # Lower temperature for more consistent results
        }
        
        # Make the API request
        response = requests.post(GROQ_API_URL, headers=headers, json=data)
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
            
    except Exception as e:
        logger.error(f"Error in AI categorization: {e}")
        return "Uncategorized", ["document"], "Error during document analysis"
