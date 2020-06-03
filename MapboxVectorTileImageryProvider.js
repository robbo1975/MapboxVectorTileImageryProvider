/*
Derived from teriajs: https://github.com/TerriaJS/terriajs/blob/master/lib/Map/MapboxVectorTileImageryProvider.js
Apache v2.0

dependencies:
https://www.npmjs.com/package/ieee754
https://www.npmjs.com/package/uri-js

*/

// import Cartesian2 from "../Core/Cartesian2.js";
// import Cartographic from "../Core/Cartographic.js";
// import combine from "../Core/combine.js";
// import Credit from "../Core/Credit.js";
// import defaultValue from "../Core/defaultValue.js";
// import defined from "../Core/defined.js";
// import DeveloperError from "../Core/DeveloperError.js";
// import Event from "../Core/Event.js";
// import Pbf from '../ThirdParty/pbf.js';//TODO: change this to use the shipped protobuf instead
// import Rectangle from "../Core/Rectangle.js";
// import Resource from "../Core/Resource.js";
// import VectorTile from '../ThirdParty/vectortile.js';
// import VectorStyle from './VectorStyle.js';
// import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
// import when from "../ThirdParty/when.js";
// import WindingOrder from "../Core/WindingOrder.js";

const Cartesian2 = Cesium.Cartesian2;
const Cartographic = Cesium.Cartographic;
const combine = Cesium.combine;
const Credit = Cesium.Credit;
const defaultValue = Cesium.defaultValue;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Event = Cesium.Event;
const Rectangle = Cesium.Rectangle;
const Resource = Cesium.Resource;
const WebMercatorTilingScheme = Cesium.WebMercatorTilingScheme;
const when = Cesium.when;
const WindingOrder = Cesium.WindingOrder;

import VectorTile from './ThirdParty/vectortile.js';
import VectorStyle from './VectorStyle.js';
import Pbf from './ThirdParty/pbf.js';//TODO: change this to use the shipped protobuf instead

var templateRegex = /{[^}]+}/g;

var tags = {
  x: xTag,
  y: yTag,
  z: zTag
}

var MapboxVectorTileImageryProvider = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options)) {
    throw new DeveloperError("options is required.");
  }
  if (!when.isPromise(options) && !defined(options.url)) {
    throw new DeveloperError("options is required.");
  }
  //>>includeEnd('debug');

  this._errorEvent = new Event();

  this._resource = undefined;
  this._urlSchemeZeroPadding = undefined;
  this._pickFeaturesResource = undefined;
  this._tileWidth = undefined;
  this._tileHeight = undefined;
  this._maximumLevel = undefined;
  this._minimumLevel = undefined;
  this._tilingScheme = undefined;
  this._rectangle = undefined;
  this._tileDiscardPolicy = undefined;
  this._credit = undefined;
  this._hasAlphaChannel = undefined;
  this._readyPromise = undefined;
  this._tags = undefined;
  this._pickFeaturesTags = undefined;

  this.enablePickFeatures = false;

  this._cachedStyle = undefined;

  this.initialize(options);

  this._ready = true;
};

Object.defineProperties(MapboxVectorTileImageryProvider.prototype, {
  url: {
    get: function () {
      return this._resource.url;
    }
  },

  tileWidth: {
    get: function () {
      return this._tileWidth;
    }
  },

  tileHeight: {
    get: function () {
      return this._tileHeight;
    }
  },

  maximumLevel: {
    get: function () {
      return this._maximumLevel;
    }
  },

  minimumLevel: {
    get: function () {
      return this._minimumLevel;
    }
  },

  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    }
  },

  rectangle: {
    get: function () {
      return this._rectangle;
    }
  },

  errorEvent: {
    get: function () {
      return this._errorEvent;
    }
  },

  ready: {
    get: function () {
      return this._ready;
    }
  },

  hasAlphaChannel: {
    get: function () {
      return true;
    }
  }
});

MapboxVectorTileImageryProvider.prototype.initialize = function (options) {
  var that = this;
  that._readyPromise = when(options).then(function (properties) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(properties)) {
      throw new DeveloperError("options is required.");
    }
    if (!defined(properties.url)) {
      throw new DeveloperError("options.url is required.");
    }
    if (!defined(properties.styleUrl)) {
      /*FUTURE: styles aren't required so a different processing path could be to drive
      the layer rendering from the tiles' availability using a 'default' in-built style*/
      throw new DeveloperError("options.styleUrl is required.");
    }
    //>>includeEnd('debug');

    //var customTags = properties.customTags;
    //var allTags = combine(tags, customTags);
    //var allPickFeaturesTags = combine(pickFeaturesTags, customTags);
    var allTags = tags;
    var resource = Resource.createIfNeeded(properties.url);
    var pickFeaturesResource = Resource.createIfNeeded(
      properties.pickFeaturesUrl
    );
    var styleResource = Resource.createIfNeeded(properties.styleUrl);
    var style = new VectorStyle(styleResource);

    that._cachedStyle = style;

    that.enablePickFeatures = defaultValue(
      properties.enablePickFeatures,
      that.enablePickFeatures
    );
    that._urlSchemeZeroPadding = defaultValue(
      properties.urlSchemeZeroPadding,
      that.urlSchemeZeroPadding
    );
    that._tileDiscardPolicy = properties.tileDiscardPolicy;
    that._getFeatureInfoFormats = properties.getFeatureInfoFormats;

    that._subdomains = properties.subdomains;
    if (Array.isArray(that._subdomains)) {
      that._subdomains = that._subdomains.slice();
    } else if (defined(that._subdomains) && that._subdomains.length > 0) {
      that._subdomains = that._subdomains.split("");
    } else {
      that._subdomains = ["a", "b", "c"];
    }

    that._tileWidth = defaultValue(properties.tileWidth, 256);
    that._tileHeight = defaultValue(properties.tileHeight, 256);
    that._minimumLevel = defaultValue(properties.minimumLevel, 0);
    that._maximumLevel = properties.maximumLevel;
    that._tilingScheme = defaultValue(
      properties.tilingScheme,
      new WebMercatorTilingScheme({ ellipsoid: properties.ellipsoid })
    );
    that._rectangle = defaultValue(
      properties.rectangle,
      that._tilingScheme.rectangle
    );
    that._rectangle = Rectangle.intersection(
      that._rectangle,
      that._tilingScheme.rectangle
    );
    that._hasAlphaChannel = defaultValue(properties.hasAlphaChannel, true);

    var credit = properties.credit;
    if (typeof credit === "string") {
      credit = new Credit(credit);
    }
    that._credit = credit;

    that._resource = resource;
    that._tags = allTags;
    that._pickFeaturesResource = pickFeaturesResource;
    that._pickFeaturesTags = allPickFeaturesTags;

    return true;
  });
};

MapboxVectorTileImageryProvider.prototype._getSubdomain = function (
  x,
  y,
  level
) {
  if (this._subdomains.length === 0) {
    return undefined;
  } else {
    var index = (x + y + level) % this._subdomains.length;
    return this._subdomains[index];
  }
};


function buildTileResource(imageryProvider, x, y, level, request) {

  var resource = imageryProvider._resource;
  var url = resource.getUrlComponent(true);
  var allTags = imageryProvider._tags;
  var templateValues = {};

  var match = url.match(templateRegex);
  if (defined(match)) {
    match.forEach(function (tag) {
      var key = tag.substring(1, tag.length - 1); //strip {}
      if (defined(allTags[key])) {
        templateValues[key] = allTags[key](imageryProvider, x, y, level);
      }
    });
  }

  return resource.getDerivedResource({
    request: request,
    templateValues: templateValues,
  }).url;
}

MapboxVectorTileImageryProvider.prototype.requestImage = function (
  x,
  y,
  level,
  request
) {
  var canvas = document.createElement("canvas");
  canvas.width = this._tileWidth;
  canvas.height = this._tileHeight;
  //return canvas;
  return this._requestImage(x, y, level, request, canvas);
};

MapboxVectorTileImageryProvider.prototype._requestImage = function (
  x,
  y,
  level,
  request,
  canvas
) {
  var requestedTile = {
    x: x,
    y: y,
    level: level
  };
  var nativeTile; // The level, x & y of the tile used to draw the requestedTile
  // Check whether to use a native tile or overzoom the largest native tile
  if (level > this._maximumNativeLevel) {
    // Determine which native tile to use
    var levelDelta = level - this._maximumNativeLevel;
    nativeTile = {
      x: x >> levelDelta,
      y: y >> levelDelta,
      level: this._maximumNativeLevel
    };
  } else {
    nativeTile = requestedTile;
  }

  var that = this;
  //var url = this._buildImageUrl(nativeTile.x, nativeTile.y, nativeTile.level);
  var url = buildTileResource(this, x, y, level, request);

  //console.log("url:" + url);
  //var promise = loadArrayBuffer(url)
  //if (!promise) return canvas;
  return loadArrayBuffer(url).then(function (data) {
    return that._drawTile(
      requestedTile,
      nativeTile,
      new VectorTile(new Pbf(data)),
      canvas
    );
  });
};

function loadArrayBuffer(urlOrResource) {
  var resource = Resource.createIfNeeded(urlOrResource);
  return resource.fetchArrayBuffer();
}

//MAIN tile drawing function
MapboxVectorTileImageryProvider.prototype._drawTile = function (
  requestedTile,
  nativeTile,
  tile,
  canvas
) {
  try {
    this._cachedStyle.drawTile(canvas, tile, nativeTile, requestedTile);
  } catch (error) {
    console.log(error);
  }
  return canvas;
};

function isExteriorRing(ring) {
  // check for counter-clockwise ring
  const windingOrder = computeRingWindingOrder(ring);
  return windingOrder === WindingOrder.COUNTER_CLOCKWISE;
}

// Adapted from npm package "point-in-polygon" by James Halliday
// Licence included in LICENSE.md
function inside(point, vs) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  var x = point.x,
    y = point.y;

  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i].x,
      yi = vs[i].y;
    var xj = vs[j].x,
      yj = vs[j].y;

    var intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// According to the Mapbox Vector Tile specifications, a polygon consists of one exterior ring followed by 0 or more interior rings. Therefore:
// for each ring:
//   if point in ring:
//     for each interior ring (following the exterior ring):
//       check point in interior ring
//     if point not in any interior rings, feature is clicked
function isFeatureClicked(rings, point) {
  for (var i = 0; i < rings.length; i++) {
    if (inside(point, rings[i])) {
      // Point is in an exterior ring
      // Check whether point is in any interior rings
      var inInteriorRing = false;
      while (i + 1 < rings.length && !isExteriorRing(rings[i + 1])) {
        i++;
        if (!inInteriorRing && inside(point, rings[i])) {
          inInteriorRing = true;
          // Don't break. Still need to iterate over the rest of the interior rings but don't do point-in-polygon tests on those
        }
      }
      // Point is in exterior ring, but not in any interior ring. Therefore point is in the feature region
      if (!inInteriorRing) {
        return true;
      }
    }
  }
  return false;
}

function xTag(imageryProvider, x, y, level) {
  return padWithZerosIfNecessary(imageryProvider, "{x}", x);
}

function reverseXTag(imageryProvider, x, y, level) {
  var reverseX =
    imageryProvider.tilingScheme.getNumberOfXTilesAtLevel(level) - x - 1;
  return padWithZerosIfNecessary(imageryProvider, "{reverseX}", reverseX);
}

function yTag(imageryProvider, x, y, level) {
  return padWithZerosIfNecessary(imageryProvider, "{y}", y);
}

function reverseYTag(imageryProvider, x, y, level) {
  var reverseY =
    imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1;
  return padWithZerosIfNecessary(imageryProvider, "{reverseY}", reverseY);
}

function reverseZTag(imageryProvider, x, y, level) {
  var maximumLevel = imageryProvider.maximumLevel;
  var reverseZ =
    defined(maximumLevel) && level < maximumLevel
      ? maximumLevel - level - 1
      : level;
  return padWithZerosIfNecessary(imageryProvider, "{reverseZ}", reverseZ);
}

function zTag(imageryProvider, x, y, level) {
  return padWithZerosIfNecessary(imageryProvider, "{z}", level);
}

function padWithZerosIfNecessary(imageryProvider, key, value) {
  if (
    imageryProvider &&
    imageryProvider.urlSchemeZeroPadding &&
    imageryProvider.urlSchemeZeroPadding.hasOwnProperty(key)
  ) {
    var paddingTemplate = imageryProvider.urlSchemeZeroPadding[key];
    if (typeof paddingTemplate === "string") {
      var paddingTemplateWidth = paddingTemplate.length;
      if (paddingTemplateWidth > 1) {
        value =
          value.length >= paddingTemplateWidth
            ? value
            : new Array(
              paddingTemplateWidth - value.toString().length + 1
            ).join("0") + value;
      }
    }
  }
  return value;
}


MapboxVectorTileImageryProvider.prototype.pickFeatures = function (
  x,
  y,
  level,
  longitude,
  latitude
) {
  var nativeTile;
  var levelDelta;
  var requestedTile = {
    x: x,
    y: y,
    level: level
  };
  // Check whether to use a native tile or overzoom the largest native tile
  if (level > this._maximumNativeLevel) {
    // Determine which native tile to use
    levelDelta = level - this._maximumNativeLevel;
    nativeTile = {
      x: x >> levelDelta,
      y: y >> levelDelta,
      level: this._maximumNativeLevel
    };
  } else {
    nativeTile = {
      x: x,
      y: y,
      level: level
    };
  }

  var that = this;
  //var url = this._buildImageUrl(nativeTile.x, nativeTile.y, nativeTile.level);

  return loadArrayBuffer(url).then(function (data) {
    var layer = new VectorTile(new Protobuf(data)).layers[that._layerName];

    if (!defined(layer)) {
      return []; // return empty list of features for empty tile
    }

    var vt_range = [0, (layer.extent >> levelDelta) - 1];

    var boundRect = that._tilingScheme.tileXYToNativeRectangle(x, y, level);
    var x_range = [boundRect.west, boundRect.east];
    var y_range = [boundRect.north, boundRect.south];

    var map = function (pos, in_x_range, in_y_range, out_x_range, out_y_range) {
      var offset = new Cartesian2();
      Cartesian2.subtract(
        pos,
        new Cartesian2(in_x_range[0], in_y_range[0]),
        offset
      ); // Offset of point from bottom left corner of bounding box
      var scale = new Cartesian2(
        (out_x_range[1] - out_x_range[0]) / (in_x_range[1] - in_x_range[0]),
        (out_y_range[1] - out_y_range[0]) / (in_y_range[1] - in_y_range[0])
      );
      return Cartesian2.add(
        Cartesian2.multiplyComponents(offset, scale, new Cartesian2()),
        new Cartesian2(out_x_range[0], out_y_range[0]),
        new Cartesian2()
      );
    };

    var pos = Cartesian2.fromCartesian3(
      that._tilingScheme.projection.project(
        new Cartographic(longitude, latitude)
      )
    );
    pos = map(pos, x_range, y_range, vt_range, vt_range);
    var point = new Point(pos.x, pos.y);

    var features = [];
    for (var i = 0; i < layer.length; i++) {
      var feature = layer.feature(i);
      if (
        feature.type === POLYGON_FEATURE &&
        //feature.type > UNKNOWN_FEATURE &&
        isFeatureClicked(
          overzoomGeometry(
            feature.loadGeometry(),
            nativeTile,
            layer.extent >> levelDelta,
            requestedTile
          ),
          point
        )
      ) {
        var featureInfo = that._featureInfoFunc(feature);
        if (defined(featureInfo)) {
          features.push(featureInfo);
        }
      }
    }

    return features;
  });
};

// MapboxVectorTileImageryProvider.prototype.createHighlightImageryProvider = function (
//   regionUniqueID
// ) {
//   var that = this;
//   var styleFunc = function (FID) {
//     if (regionUniqueID === FID) {
//       // No fill, but same style border as the regions, just thicker
//       var regionStyling = that._styleFunc(FID);
//       if (defined(regionStyling)) {
//         regionStyling.fillStyle = "rgba(0,0,0,0)";
//         regionStyling.lineJoin = "round";
//         regionStyling.lineWidth = Math.floor(
//           1.5 * defaultValue(regionStyling.lineWidth, 1) + 1
//         );
//         return regionStyling;
//       }
//     }
//     return undefined;
//   };
//   var imageryProvider = new MapboxVectorTileImageryProvider({
//     url: this._uriTemplate.expression,
//     layerName: this._layerName,
//     subdomains: this._subdomains,
//     rectangle: this._rectangle,
//     minimumZoom: this._minimumLevel,
//     maximumNativeZoom: this._maximumNativeLevel,
//     maximumZoom: this._maximumLevel,
//     uniqueIdProp: this._uniqueIdProp,
//     styleFunc: styleFunc
//   });
//   imageryProvider.pickFeatures = function () {
//     return undefined;
//   }; // Turn off feature picking
//   return imageryProvider;
// };

export default MapboxVectorTileImageryProvider;
