#!/bin/bash

# Generate PDF from HTML using system tools
echo "🚀 ClassReflect Proposal PDF Generator"
echo "======================================"

HTML_FILE="/Users/guntarsdikis/websites/ClassReflect/proposal.html"
PDF_FILE="/Users/guntarsdikis/websites/ClassReflect/ClassReflect_Client_Proposal.pdf"

# Check if HTML file exists
if [ ! -f "$HTML_FILE" ]; then
    echo "❌ HTML file not found: $HTML_FILE"
    exit 1
fi

echo "📄 HTML file found: $HTML_FILE"

# Method 1: Try using wkhtmltopdf if available
if command -v wkhtmltopdf &> /dev/null; then
    echo "🔧 Using wkhtmltopdf..."
    wkhtmltopdf --page-size A4 --margin-top 1in --margin-bottom 1in --margin-left 1in --margin-right 1in "$HTML_FILE" "$PDF_FILE"
    echo "✅ PDF generated successfully: $PDF_FILE"
    exit 0
fi

# Method 2: Try using pandoc with different engines
if command -v pandoc &> /dev/null; then
    echo "🔧 Trying pandoc..."
    
    # Convert HTML to markdown first, then to PDF
    MD_FILE="/tmp/proposal_temp.md"
    pandoc "$HTML_FILE" -o "$MD_FILE"
    
    # Try different PDF engines
    for engine in weasyprint pdflatex xelatex lualatex; do
        if pandoc "$MD_FILE" --pdf-engine="$engine" -o "$PDF_FILE" 2>/dev/null; then
            echo "✅ PDF generated with $engine: $PDF_FILE"
            rm "$MD_FILE"
            exit 0
        fi
    done
    
    rm "$MD_FILE"
fi

# Method 3: Instructions for manual generation
echo "⚠️  Automatic PDF generation not available."
echo ""
echo "📋 Manual PDF Generation Instructions:"
echo "1. Open Chrome/Safari"
echo "2. Open file: $HTML_FILE"
echo "3. Press Cmd+P (Print)"
echo "4. Select 'Save as PDF'"
echo "5. Save to: $PDF_FILE"
echo ""
echo "🌐 The HTML file has been optimized for PDF printing with:"
echo "   - A4 page size"
echo "   - Professional margins"
echo "   - Print-friendly colors"
echo "   - Proper page breaks"

exit 1