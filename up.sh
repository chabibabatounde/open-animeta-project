git pull
pm2 stop animeta
pm2 delete animeta
cp .prod/baseurl.js api/helpers/baseurl.js
cp .prod/landingpage/script.js assets/js/landingpage/script.js
cp .prod/datastores.js config/datastores.js
pm2 start app.js -n animeta -- --port 1919
# pm2 logs animeta --lines 50