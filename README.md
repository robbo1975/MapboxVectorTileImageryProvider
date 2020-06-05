MapboxVectorTileImageryProvider
===============================

A Mapbox Styled Vector Tile plugin for the Cesium map client.  Please note that this project is in the very early stages of development.  Please get in touch if you feel as though you can contribute.  Javascript is not my first language and I am not an expert in Spatial systems or Cesium.

![MapboxVectorTileImageryProvider](/img/image1.png)
![MapboxVectorTileImageryProvider](/img/image2.png)
![MapboxVectorTileImageryProvider](/img/image3.png)
![MapboxVectorTileImageryProvider](/img/image4.png)

## Installation

  //TODO: 
  `npm install @robbo1975/MapboxVectorTileImageryProvider`

## Usage

    import MapboxVectorTileImageryProvider from '../node_modules/@robbo1975/index.js';
      
    var mapbox = new MapboxVectorTileImageryProvider({
      url : 'https://basemaps.arcgis.com/arcgis/rest/services/OpenStreetMap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf',
      styleUrl : 'https://www.arcgis.com/sharing/rest/content/items/3e1a00aeae81496587988075fe529f71/resources/styles/root.json'
    });

    var viewer = new Cesium.Viewer("cesiumContainer", {
      imageryProvider: mapbox
    });


## Tests

  //TODO:
  `npm test`

## Contributing
Please contact me at robbo.blah@gmail.com
