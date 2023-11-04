const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const details = {
  token: '',
  interval: 60000 // Default interval in milliseconds (1 minute)
};

const requiredPackages = ['axios', 'child_process', 'fs', 'readline'];

const cacheFile = 'cachedToken.json'; // File to store the cached token

// Function to check if a package is installed
const isPackageInstalled = (packageName) => {
  try {
    require.resolve(packageName);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to install missing packages
const installMissingPackages = () => {
  const missingPackages = requiredPackages.filter((pkg) => !isPackageInstalled(pkg));

  if (missingPackages.length > 0) {
    console.log('Installing missing packages...');
    const installCommand = `npm install ${missingPackages.join(' ')}`;
    execSync(installCommand, { stdio: 'inherit' });
    console.log('Packages installed successfully.');
  }
};

// Determine the location of the script
const scriptDirectory = path.resolve(__dirname);

// Set the images folder location based on the script directory
const imagesFolder = path.join(scriptDirectory, 'images');

// Function to set the user's avatar
const setAvatar = async (base64) => {
  console.info('Updating your Discord avatar...');
  try {
    const res = await axios.patch('https://discord.com/api/v9/users/@me', {
      avatar: `data:image/png;base64,${base64}`
    }, {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        Authorization: details.token
      }
    });

    if (res.status === 200) {
      console.info('Avatar updated successfully.');
      console.info('Script shutting down.');
      process.exit();
    }
  } catch (error) {
    console.error('Error updating the avatar:', error.message);
  }
};

// Function to change the avatar periodically
const changeAvatarPeriodically = () => {
  const imageFiles = fs.readdirSync(imagesFolder);

  if (imageFiles.length === 0) {
    console.error('No image files found in the "images" folder.');
    process.exit();
  }

  let currentIndex = 0;

  const changeAvatarInterval = setInterval(() => {
    if (currentIndex >= imageFiles.length) {
      currentIndex = 0;
    }

    const imageFileName = imageFiles[currentIndex];
    const base64 = fs.readFileSync(path.join(imagesFolder, imageFileName), 'base64');

    setAvatar(base64);

    currentIndex++;
  }, details.interval);
};

// Function to convert user-friendly interval input to milliseconds
const convertIntervalToMilliseconds = (intervalString) => {
  const regex = /^(\d+)\s*(seconds|minutes|hours)?$/;
  const matches = intervalString.match(regex);
  if (matches) {
    const value = parseInt(matches[1]);
    const unit = matches[2];

    if (unit === 'seconds') {
      return value * 1000;
    } else if (unit === 'minutes') {
      return value * 60 * 1000;
    } else if (unit === 'hours') {
      return value * 60 * 60 * 1000;
    }
  }

  // Default to milliseconds if input is invalid
  return parseInt(intervalString) || 60000;
};

// Function to cache and retrieve the token
const cacheToken = (token) => {
  fs.writeFileSync(cacheFile, JSON.stringify({ token }), 'utf8');
};

const getCachedToken = () => {
  if (fs.existsSync(cacheFile)) {
    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    return cachedData.token;
  }
  return null;
};

// Prompt for the user's token and interval
const getTokenAndInterval = () => {
  const cachedToken = getCachedToken();

  if (cachedToken) {
    rl.question(`Use the cached token: ${cachedToken}? (yes/no): `, (useCached) => {
      if (useCached.toLowerCase() === 'yes') {
        details.token = cachedToken;
        rl.close();
        changeAvatarPeriodically();
      } else {
        rl.question('Enter your Discord token: ', (token) => {
          details.token = token;
          cacheToken(token);

          rl.question('Enter the interval for changing photos (e.g., 5 minutes): ', (interval) => {
            details.interval = convertIntervalToMilliseconds(interval);

            rl.close();
            changeAvatarPeriodically();
          });
        });
      }
    });
  } else {
    rl.question('Enter your Discord token: ', (token) => {
      details.token = token;
      cacheToken(token);

      rl.question('Enter the interval for changing photos (e.g., 5 minutes): ', (interval) => {
        details.interval = convertIntervalToMilliseconds(interval);

        rl.close();
        changeAvatarPeriodically();
      });
    });
  }
};

// Check if the "images" folder exists, and create it if not
if (!fs.existsSync(imagesFolder)) {
  fs.mkdirSync(imagesFolder);
}

// Check and install missing packages
installMissingPackages();

getTokenAndInterval();
