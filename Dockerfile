FROM gcr.io/google_appengine/nodejs
RUN install_node v14.9.0
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    build-essential \
    apt-transport-https \
    libgbm-dev \
    && apt-get install curl -y \
    && curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt-get install -y \
    git
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN dpkg -i google-chrome-stable_current_amd64.deb; apt-get -fy install
COPY . /var/www
WORKDIR /var/www
# Install dependencies.
RUN npm install pm2 -g
ENV PM2_PUBLIC_KEY w6hdsf5tzo1dnmk
ENV PM2_SECRET_KEY 6kk67dr1xgb8wcw
RUN npm --unsafe-perm install
CMD ["npm", "start"]
EXPOSE 8080