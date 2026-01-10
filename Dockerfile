# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Install system dependencies for Nikto (Perl) and Nuclei (unzip/curl)
RUN apt-get update && apt-get install -y \
    perl \
    curl \
    unzip \
    libnet-ssleay-perl \
    && rm -rf /var/lib/apt/lists/*

# Install Nikto
RUN curl -sL https://github.com/sullo/nikto/archive/master.tar.gz | tar xz \
    && mv nikto-master/program /usr/local/nikto \
    && ln -s /usr/local/nikto/nikto.pl /usr/local/bin/nikto

# Install Nuclei
RUN curl -sL https://github.com/projectdiscovery/nuclei/releases/download/v3.1.8/nuclei_3.1.8_linux_amd64.zip -o nuclei.zip \
    && unzip nuclei.zip \
    && mv nuclei /usr/local/bin/ \
    && rm nuclei.zip

# Set the working directory
WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port Flask runs on
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]
