git pull
pm2 stop animeta
pm2 start app.js -n animeta -- --port 1919
cp .prod/baseurl.js api/helpers/baseurl.js
cp .prod/landingpage/script.js assets/js/landingpage/script.js