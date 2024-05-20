# Build windows release

## Prepare to build
```
cd C:\asen\alisko3\alisko-gui
# nvm use 21.6.1
# npx npm-check-updates

# set environment vars
SET NODE_INSTALLER=npm
SET NODE_ENV=development
SET PLAYWRIGHT_BROWSERS_PATH=C:\asen\alisko3\alisko-gui\resources\browsers

# install 
npm i
npx playwright install
# and remove browsers for save free space
rmdir /Q /S resources\browsers\firefox-*
rmdir /Q /S resources\browsers\webkit-*
rmdir /Q /S resources\browsers\ffmpeg-*

# download 20240219_1280.onnx model for icon detection
# from https://github.com/vlesu/alisko/releases
# into resources/models/icons

# copy onnxruntime-common and onnxruntime-node folders
# from node_modules
# to resource/node_modules
```

## Start from source code
```
npm start
```

## Test package
```
SET GENERATE_SOURCEMAP=false
SET NODE_ENV=production
npm run package
cd C:\asen\alisko3\alisko-gui\out\Alisko-win32-x64
Alisko.exe
```

## Build arelease
```
SET GENERATE_SOURCEMAP=false
SET NODE_ENV=production
npm run make
```

## Publish release
```
# upload .\out\make\squirrel.windows\x64\* into http://alisko.vlesu.net/updates/win32/
# change recent version in http://alisko.vlesu.net/index.htm
```

# Build linux release

## Prepare
```
cd ~/ml/alisko2/alisko2-gui
npm i
export PLAYWRIGHT_BROWSERS_PATH=/home/asen/ml/alisko3/alisko-gui/resources/browsers
npx playwright install
rm -Rf ./resources/browsers/firefox-*
rm -Rf ./resources/browsers/webkit-*

# download 20240219_1280.onnx model for icon detection
# from https://github.com/vlesu/alisko/releases
# into resources/models/icons

# copy onnxruntime-common and onnxruntime-node folders
# from node_modules
# to resource/node_modules
```

## Test run
```
export NODE_INSTALLER=npm
export NODE_ENV=development
#export DISPLAY=:0
#export GTK_IM_MODULE=ibus
# cat /proc/sys/fs/inotify/max_user_watches
# echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
# npm i onnxruntime-node
# mkdir ./resources/node_modules
# cp -r node_modules/onnxruntime-* ./resources/node_modules/
# mkdir resources/models
# mkdir resources/models/icons
# cp ../artifacts/20240219_1280.onnx ./resources/models/icons/
npm start
```

## Test run package
```
npm run package
# XTerm:
cd ~/ml/alisko2/alisko2-gui/out/Alisko-linux-x64
./Alisko
```

## Build linux release
```
export GENERATE_SOURCEMAP=false
export NODE_ENV=production
#cp ./browsers.json ./resources/app/
npm run make
sudo dpkg -i out/make/deb/x64/alisko_*_amd64.deb
```


## Publish
```
ls -al out/make/deb/x64/alisko_*_amd64.deb
scp out/make/deb/x64/alisko_*_amd64.deb root@vlesu.com:/var/www/alisko/www/updates/linux/
# change version in http://alisko.vlesu.net/index.htm
```

# Build MAC release

## prepare
```
cd /Users/asen/alisko2-gui
sudo npm -i g n
sudo n latest
npm i

export PLAYWRIGHT_BROWSERS_PATH=/Users/asen/alisko3-gui/resources/browsers
npx playwright install
rm -Rf ./resources/browsers/firefox-*
rm -Rf ./resources/browsers/webkit-*

# download 20240219_1280.onnx model for icon detection
# from https://github.com/vlesu/alisko/releases
# into resources/models/icons

# copy onnxruntime-common and onnxruntime-node folders
# from node_modules
# to resource/node_modules
```

## test run
```
export NODE_INSTALLER=npm
export NODE_ENV=development
#export DISPLAY=:0
#export GTK_IM_MODULE=ibus
# cat /proc/sys/fs/inotify/max_user_watches
# echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
# npm i onnxruntime-node
# mkdir ./resources/node_modules
# cp -r node_modules/onnxruntime-* ./resources/node_modules/
# mkdir resources/models
# mkdir resources/models/icons
# cp ../artifacts/20240219_1280.onnx ./resources/models/icons/
npm start
```

## test package
```
# быстренько проверить exe форму без сборки инсталлера:
npm run package
# XTerm:
cd out/Alisko-darwin-arm64
./Alisko
```

## Build release under m1
export GENERATE_SOURCEMAP=false
export NODE_INSTALLER=npm
export NODE_ENV=production
npm run make

## Build for mac-x64 
``` (not working, require to have more data)
npm run make -- --arch=x64 --platform=darwin
```


## publish MAC
```
ls -al out/make/zip/darwin/arm64/Alisko-darwin-arm64-*.zip
scp out/make/zip/darwin/arm64/Alisko-darwin-arm64-*.zip root@vlesu.com:/var/www/alisko/www/updates/mac/
scp out/make/zip/darwin/x64/Alisko-darwin-x64-*.zip root@vlesu.com:/var/www/alisko/www/updates/mac/
# change version in http://alisko.vlesu.net/index.htm
```


# Build MAC x86 release

## prepare
```
# install node (version 20 is working)
npm i


export PLAYWRIGHT_BROWSERS_PATH=/Users/user/asen/alisko3-gui/resources/browsers
npx playwright install
rm -Rf ./resources/browsers/firefox-*
rm -Rf ./resources/browsers/webkit-*

# download 20240219_1280.onnx model for icon detection
# from https://github.com/vlesu/alisko/releases
# into resources/models/icons

# copy onnxruntime-common and onnxruntime-node folders
# from node_modules
# to resource/node_modules
```

## test run
```
export NODE_INSTALLER=npm
export NODE_ENV=development
#export DISPLAY=:0
#export GTK_IM_MODULE=ibus
# cat /proc/sys/fs/inotify/max_user_watches
# echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
# npm i onnxruntime-node
# mkdir ./resources/node_modules
# cp -r node_modules/onnxruntime-* ./resources/node_modules/
# mkdir resources/models
# mkdir resources/models/icons
# cp ../artifacts/20240219_1280.onnx ./resources/models/icons/
npm start
```

## test package
```
# быстренько проверить exe форму без сборки инсталлера:
npm run package
# XTerm:
cd out/Alisko-darwin-arm64
./Alisko
```

## Build release under m1
export GENERATE_SOURCEMAP=false
export NODE_INSTALLER=npm
export NODE_ENV=production
npm run make

## Build for mac-x64 
``` (not working, require to have more data)
npm run make 
npm run make -- --arch=x64 --platform=darwin
```


## publish MAC
```
ls -al out/make/zip/darwin/arm64/Alisko-darwin-arm64-*.zip
scp out/make/zip/darwin/arm64/Alisko-darwin-arm64-*.zip root@vlesu.com:/var/www/alisko/www/updates/mac/
scp out/make/zip/darwin/x64/Alisko-darwin-x64-*.zip root@vlesu.com:/var/www/alisko/www/updates/mac/
# change version in http://alisko.vlesu.net/index.htm
```

