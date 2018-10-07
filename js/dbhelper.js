/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    /* const port = 8000 // Change this to your server port
    return `http://localhost:${port}/data/restaurants.json`; */
    const port = 1337 // Change this to your server port
    return `http://localhost:1337/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    let dbPromise = DBHelper.openIndexDatabase();
    DBHelper.getRestaurantsDataFromIDB(dbPromise, callback); // fetch restaurant details from indexDB(cache)

    //also fetch restaurant details from server and update the page after successful network response
    fetch(DBHelper.DATABASE_URL).then(response =>{
        return response.json();
    }).then(restaurants =>{
        console.log('Restaurant fetched from the server.');
        DBHelper.setRestaurantFetchStatus("server");
        callback(null, restaurants);
    }).catch(err =>{
        const error = (`Request failed. Returned status of ${err}`);
        callback(error, null);
    });

  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i) 
        /* for(const restaurant of restaurants[0])
        {
          console.log(restaurant);
        } */
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    let restaurantPhoto = `/img/${restaurant.photograph}.jpg`;
    if(restaurant.photograph ==="undefined" || restaurant.photograph === undefined){
      restaurantPhoto = `/img/10.jpg`;
    }
    return restaurantPhoto; //(`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  create/open an indexDB database
  */
  static openIndexDatabase(){
    if (!('indexedDB' in window)) {
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

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    get restaurant details from idb store
    */
    static getRestaurantsDataFromIDB(dbPromise, callback){
      
      dbPromise.then(db => {
          if (!db) return;
              
          let index = db.transaction('restaurants')
            .objectStore('restaurants').index('id');

          return index.getAll().then( restaurants => { 
              /* check whether restaurant details has been fetched from server yet, 
                if yes don't update the page with details from cache.*/
                if(DBHelper.getRestaurantFetchStatus !=="server"){ // nothing has been returned from server/network
                  DBHelper.setRestaurantFetchStatus("cache");
                  console.log("Restaurant fetched from indexDB store");
                  callback(null, restaurants);
                    return restaurants;
                }
              return ;//restaurants;
          });
      }).catch(error => console.log('Something went wrong: '+ error));
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    static setRestaurantFetchStatus(status){
      this.fetcheRestaurantFrom = status;
   }
   /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
   static get getRestaurantFetchStatus(){
      return this.fetcheRestaurantFrom;
   }

}

