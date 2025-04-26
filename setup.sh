
#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install required packages
echo "Installing required packages..."
pip install aiogram>=3.0.0
pip install gspread oauth2client
pip install python-dotenv

# Create .env file for environment variables if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    echo "BOT_TOKEN=YOUR_BOT_TOKEN" > .env
    echo "SHEET_ID=YOUR_GOOGLE_SHEET_ID" >> .env
    echo "Please update .env file with your actual credentials."
fi

# Create media directory if it doesn't exist
if [ ! -d "media" ]; then
    echo "Creating media directory..."
    mkdir -p media
    echo "Please add your media files (gift.mp4, care.pdf, history.pdf) to the media directory."
fi

# Create a placeholder for Google API credentials
if [ ! -f "credentials.json" ]; then
    echo "IMPORTANT: You need to create a credentials.json file with your Google API credentials."
    echo "Visit https://console.developers.google.com/ to create a service account and download the JSON key."
fi

echo "Setup completed successfully!"
echo "To run the bot, use: source venv/bin/activate && python nabibot.py"