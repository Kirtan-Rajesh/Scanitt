# Scanitt - Smart Document Scanner & AI Organizer
## Overview
ScanittAi is a web application that allows users to upload document images (receipts, invoices, ID cards, notes, etc.), automatically processes them using computer vision techniques, extracts text via OCR (Optical Character Recognition), and uses AI to analyze and categorize the content into appropriate folders or tags. The application streamlines document management by transforming smartphone photos of documents into clean, organized, searchable digital files.

## Features
### Document Processing
- Automatic Document Detection : Detects document edges in photos
- Perspective Correction : Applies perspective transformation to straighten documents
- Image Enhancement : Converts to grayscale and applies adaptive thresholding for a clean "scanned" look
- Advanced Filters : Provides contrast, brightness, and sharpening adjustments for better readability
### Text Extraction & AI Analysis
- OCR Integration : Extracts text from processed document images
- AI Categorization : Automatically sorts documents into categories (receipts, invoices, ID cards, notes, etc.)
- Smart Tagging : Generates relevant tags based on document content
### User Interface
- Intuitive Upload : Simple drag-and-drop or file selection interface
- Document Viewer : View processed documents with zoom and rotation controls
- Category Browser : Browse documents by automatically assigned categories
- Dashboard : Overview of all processed documents
### Document Management
- Document Storage : Saves both original and processed images
- Metadata Storage : Maintains document information, categories, and tags
- Export Options : Download processed documents
## Technology Stack
### Backend
- Framework : Flask (Python web framework)
- Database : SQLAlchemy for ORM (Object-Relational Mapping)
- Image Processing : OpenCV for computer vision tasks
- OCR : Pytesseract for text extraction
- Deployment : Gunicorn as WSGI HTTP server
### Frontend
- JavaScript : Modern ES6+ for interactive UI components
- Bootstrap : For responsive design and UI components
- Custom Components : Document viewer, file uploader, and image filters
### Dependencies
- Web Framework : Flask 3.1.1+, Werkzeug 3.1.3+, Gunicorn 23.0.0+
- Database : Flask-SQLAlchemy 3.1.1+
- Image Processing : OpenCV 4.11.0+, Pillow 11.2.1+, Pytesseract 0.3.13+
- AI and NLP : Requests 2.32.3+, Python-dateutil 2.8.2+
- Utilities : Email-validator 2.2.0+, Python-dotenv 1.0.0+, UUID 1.30+, NumPy 1.24.0+
## Project Structure
The project follows a modular structure:

- Models : Document model for representing scanned documents
- Static Files : JavaScript for document processing, image filters, and application logic
- Templates : HTML templates for the user interface
- API Endpoints : For document upload, processing, and management
## Getting Started
### Prerequisites
- Python 3.11 or higher
- Required Python packages (listed in requirements.txt)
- Tesseract OCR engine installed on your system
### Installation
1. Clone the repository:

\```bash
git clone https://github.com/yourusername/ScanittAi.git
cd ScanittAi
 \```
\```

2. Install dependencies:
\```bash
pip install -r requirements.txt
 \```
\```

3. Run the application:
\```bash
gunicorn --bind 0.0.0.0:5000 main:app
 \```
\```

4. Access the application at http://localhost:5000
## Usage
1. Upload a Document : Click the upload button or drag and drop a document image
2. View Processing : Watch as the application detects, corrects, and enhances your document
3. Review Results : See the processed image, extracted text, and AI-assigned categories
4. Manage Documents : Browse your documents by category, add tags, or export as needed
## Future Enhancements
- User authentication for personalized document libraries
- Full-text search across all OCR text
- Advanced tagging with user corrections
- Export to PDF and integration with cloud storage
- Mobile-friendly design with camera integration
- Notifications for important documents
## License
[Add appropriate license information]

## Acknowledgments
- OpenCV for computer vision capabilities
- Tesseract for OCR functionality
- Flask for the web framework
