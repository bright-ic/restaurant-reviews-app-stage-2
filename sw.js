self.importScripts('./js/idb.js'); // add the idb library
const filesToCache = [
    "./",
    "./index.html",
    "./restaurant.html",
    "./css/styles.css",
    //"/data/restaurants.json",
    "./js/dbhelper.js",
    ".js/main.js",
    "./js/restaurant_info.js",
    "./img/1.jpg",
    "./img/2.jpg",
    "./img/3.jpg",
    "./img/4.jpg",
    "./img/5.jpg",
    "./img/6.jpg",
    "./img/7.jpg",
    "./img/8.jpg",
    "./img/9.jpg",
    "./img/10.jpg"
];
const appCacheName = "resturant-review-app-cache-v1";
let dbPromise;

/**************************Service worker Install event listener ******************************************/
// install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        // creating/opening cache
        caches.open(appCacheName).then(cache => {
            console.log('service worker installed succesfully');
            return cache.addAll(filesToCache); // add app shell to cache
        })
    );
});

/**************************Service worker Activate event listener ******************************************/
self.addEventListener('activate', event =>{
    event.waitUntil(
    // try to delete old caches for this app.
      caches.keys().then( cacheNames => {
        console.log('service worker activated successfully');
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName.startsWith('resturant-review-app-cache-') && appCacheName !== cacheName;
          }).map( cacheName => {
            if(appCacheName !== cacheName){
                return caches.delete(cacheName);
            }
          })
        );
      })
      , self.clients.claim()
    );
});

/**************************Service worker Fetch event listener ******************************************/
self.addEventListener('fetch', event => {
    
   const requestUrl = new URL(event.request.url);

  if (requestUrl.origin === location.origin) {
         if (requestUrl.pathname === '/') {
            event.respondWith(caches.match("/index.html"));
            return;
        }
        if (requestUrl.pathname === '/index.html') {
            event.respondWith(caches.match("/index.html"));
            return;
        }
        if (requestUrl.pathname === '/restaurant.html') {
            event.respondWith(caches.match("/restaurant.html"));
            return;
        }
    }

;    event.respondWith(serveFromCatchOrNetwork(event.request));
});

/****************nETWORK FETCHING SCRIPT*************************************************/
 serveFromCatchOrNetwork = request => {
    const storageUrl = request.url;
    const requestUrl = new URL(request.url);

    return caches.open(appCacheName).then(cache =>{
        return cache.match(storageUrl).then(response =>{
            return response || fetch(request).then(networkResponse =>{
                
                 // check whether request is for getting/pulling restaurant info or details from server.
                if(requestUrl.pathname === "/restaurants"){
                    addRestaurantDataToIDB(networkResponse.clone().json()); // call to function that stores restaurant details to index db
                }
                else{
                    cache.put(storageUrl, networkResponse.clone()); // add the other response to cache
                }
                return networkResponse;
            });
            
        //return response || networkfetch;
      });
    });
} 

/* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 create/open an indexDB database
*/
openIndexDatabase = () => {
    if (!('indexedDB' in self)) {
        console.log('This browser doesn\'t support IndexedDB');
        return Promise.resolve();
    }
    
    return idb.open('resturant-review-app', 1, upgradeDb => {
        switch(upgradeDb.oldVersion) {
            case 0:
                upgradeDb.createObjectStore('restaurants');
            case 2:
                upgradeDb.transaction.objectStore('restaurants').createIndex('id', 'id', {unique: true});
        }
    });
}

dbPromise = openIndexDatabase();
 /*************************************************************************************************************/
// ADD RESTAURANT DETAILS TO CACHE
addRestaurantDataToIDB = (restaurants) => {
   
    dbPromise.then(db => {
        if (!db) return;
        
        let tx = db.transaction('restaurants', 'readwrite'); // create a transaction 
        let store = tx.objectStore('restaurants'); // access restaurants in the object store
        restaurants.then(rest=>{
            // loop through the restaurant objects and store them in the  object store
            Object.keys(rest).forEach(function (key){
                restaurant = rest[key];
                const storeKey = restaurant.photograph == undefined ? 10 : restaurant.photograph; // the last restaurant reurned does not have photograph property make it 10
                store.put(restaurant, storeKey); // add each restaurant to index db store
            });
        });

        return tx.complete;
      }).then(() => {
      console.log('Restaurants object store (db) updated successfully.');
  }).catch(error => console.log('Something went wrong: '+ error));
  }
/*************************************************************************************************************/
