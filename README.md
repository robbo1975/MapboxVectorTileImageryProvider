MapboxVectorTileImageryProvider
===============================

A plugin for Cesium map client

## Installation

  `npm install @robbo1975/MapboxVectorTileImageryProvider`

## Usage

    require('@robbo1975/MapboxVectorTileImageryProvider');
    
    var mapbox = new MapboxVectorTileImageryProvider({
      url : 'https://basemaps.arcgis.com/arcgis/rest/services/OpenStreetMap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf',
      styleUrl : 'https://www.arcgis.com/sharing/rest/content/items/3e1a00aeae81496587988075fe529f71/resources/styles/root.json'
    });

    var viewer = new Viewer("cesiumContainer", {
      imageryProvider: mapbox
    });


## Tests

  `npm test`

## Contributing
