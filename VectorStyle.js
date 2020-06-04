/*
Derived from teriajs: https://github.com/TerriaJS/terriajs/blob/master/lib/Map/MapboxVectorTileImageryProvider.js
Apache v2.0
*/
'use strict';

// import defined from "../Core/defined.js";
// import DeveloperError from "../Core/DeveloperError.js";
import Point from './ThirdParty/Point.js';
// import Resource from "../Core/Resource.js";
// import Cartesian2 from "../Core/Cartesian2.js";

const Cartesian2 = Cesium.Cartesian2;
const defined = Cesium.defined;
const DeveloperError = Cesium.DeveloperError;
const Resource = Cesium.Resource;


var UNKNOWN_FEATURE = 0;
var POINT_FEATURE = 1;
var LINESTRING_FEATURE = 2;
var POLYGON_FEATURE = 3; // feature.type == 3 for polygon features

function VectorStyle(resource) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(resource)) {
        throw new DeveloperError("style resource is needed.");
    }
    //>>includeEnd('debug');

    this._styleLayers = undefined;
    this._version = undefined;
    this._sprites = undefined;
    this._glyphs = undefined;
    this._backgroundColor = "black";

    this._loadJsonStyle(resource);
}

VectorStyle.prototype._loadJsonStyle = function (resource) {
    var res = resource;
    var styleLayers = new Object();
    this._styleLayers = styleLayers;
    var that = this;

    resource.fetchJson().then(function (style) {
        // var indexUrl = res.getDerivedResource({
        //     url: '' + style.sprite + ".json"
        // }).url

        // var imageUrl = res.getDerivedResource({
        //     url: '/' + style.sprite + ".png"
        // }).url
        var indexUrl = style.sprite + ".json"
        var imageUrl = style.sprite + ".png"
        that._loadSprites(indexUrl, imageUrl);
        //console.log(imageUrl);
        //tiles layers must be ordered by the style order
        //cache style information into variable for use
        for (var i = 0; i < Object.keys(style.layers).length; i++) {
            var layer = style.layers[i]["source-layer"];
            //if (LAYERS.indexOf(layer) < 0) continue;
            styleLayers[style.layers[i]["id"]] = style.layers[i];
        }
        return true;
    }).otherwise(function (error) {
        console.log("style error:" + error);
        return Cesium.when.reject("style error");
    });
}

var extentFactor;
VectorStyle.prototype.drawTile = function (origCanvas, tile, nativeTile, requestedTile) {

    var layers = Object.keys(tile.layers);
    var styles = Object.keys(this._styleLayers);

    //fix blur
    //TODO: I think some of the blur is down to the zoom interpolation and also scaling the 'stops' against the metric
    var canvas = document.createElement("canvas");
    var scale = 2;
    canvas.width = origCanvas.width * scale;
    canvas.height = origCanvas.height * scale;
    var context = canvas.getContext('2d'); // an offscreen canvas
    var origContext = origCanvas.getContext("2d");

    var ratio = window.devicePixelRatio;
    canvas.width = canvas.width * ratio;
    canvas.height = canvas.height * ratio;
    context.scale(ratio, ratio);
    var transVal = 0.5;
    context.translate(transVal, transVal);

    //loop over styles (to get correct order of layers)
    for (var l = 0; l < styles.length; l++) {
        var jStyle = this._styleLayers[styles[l]];

        if (jStyle["type"] === "background") {
            if ("paint" in jStyle && "background-color" in jStyle.paint) {
                this._backgroundColor = jStyle.paint["background-color"];
            }
        }

        canvas.style.background = this._backgroundColor;

        context.fillStyle = this._backgroundColor;
        if ("layout" in jStyle && "visibility" in jStyle.layout && jStyle.layout.visibility === "none") {
            context.fillRect(0, 0, canvas.width, canvas.height);
            continue;
        }

        //current style not in layers
        if (!(jStyle["source-layer"] in tile.layers)) continue;
        
        //get layer based on style
        var layer = tile.layers[jStyle["source-layer"]];

        if (!defined(layer)) {
            return; // return blank canvas for blank tile
        }

        extentFactor = canvas.width / layer.extent; // Vector tile works with extent [0, 4095], but canvas is only [0,255]

        //if styles' specified zoom levels are not within current zoom, move to next style layer
        if ("minzoom" in jStyle && nativeTile.level < parseInt(jStyle.minzoom)) { continue; }
        if ("maxzoom" in jStyle && nativeTile.level >= parseInt(jStyle.maxzoom)) { continue; }

        var textLabel = "";


        context.lineJoin = "miter";
        context.lineCap = "butt";
        var fillColor = getPaintValue(jStyle, nativeTile.level, "fill-color");
        var outlineColor = getPaintValue(jStyle, nativeTile.level, "fill-outline-color");
        var fillPattern = getPaintValue(jStyle, nativeTile.level, "fill-pattern");
        var pattern = getFillPattern(context, this._sprites[fillPattern]);
        //TODO: paint["fill-pattern"] pattern = ctx.createPattern; context.fillStyle = pattern; this._sprites[iconImage]
        //fill pattern returns name of image stored in sprites image to use when calling context.createPattern(image, repetition);

        var lineColor = getPaintValue(jStyle, nativeTile.level, "line-color");
        var lineWidth = getPaintValue(jStyle, nativeTile.level, "line-width");
        var lineOpacity = getPaintValue(jStyle, nativeTile.level, "line-opacity");
        var lineJoin = getLayoutValue(jStyle, nativeTile.level, "line-join");
        var lineCap = getLayoutValue(jStyle, nativeTile.level, "line-cap");
        var dashArray = getPaintValue(jStyle, nativeTile.level, "line-dasharray");

        var textSize = getLayoutValue(jStyle, nativeTile.level, "text-size");
        var textFont = getLayoutValue(jStyle, nativeTile.level, "text-font");
        var textAnchor = getLayoutValue(jStyle, nativeTile.level, "text-anchor");
        var textMaxWidth = getLayoutValue(jStyle, nativeTile.level, "text-max-width");
        var textPadding = getLayoutValue(jStyle, nativeTile.level, "text-padding");
        var textLineHeight = getLayoutValue(jStyle, nativeTile.level, "text-line-height");
        var textField = getLayoutValue(jStyle, nativeTile.level, "text-field");
        var textOptional = getLayoutValue(jStyle, nativeTile.level, "text-optional");
        var textOffset = getLayoutValue(jStyle, nativeTile.level, "text-offset");
        var textColor = getPaintValue(jStyle, nativeTile.level, "text-color");
        var textHaloColor = getPaintValue(jStyle, nativeTile.level, "text-halo-color");
        var textHaloWidth = getPaintValue(jStyle, nativeTile.level, "text-halo-width");

        var iconImage = getLayoutValue(jStyle, nativeTile.level, "icon-image");

        if (defined(fillColor)) context.fillStyle = fillColor;
        if (defined(outlineColor)) context.strokeStyle = outlineColor;
        if (defined(pattern)) context.fillStyle = pattern;

        if (defined(lineColor)) context.strokeStyle = lineColor;
        if (defined(lineWidth)) context.lineWidth = lineWidth;
        if (defined(lineJoin)) context.lineJoin = lineJoin;
        if (defined(lineCap)) context.lineCap = lineCap;

        //TODO: multiplying by linewidth seems to degrade performance significantly - may need to pre-calculate this in a pre-step when loading style in
        //calculate actual dash size based on linewidth for zoom
        context.setLineDash([]);
        if (defined(dashArray) && lineWidth) {
            for (var x = 0; x < dashArray.length; x++) {
                dashArray[x] = dashArray[x];// * lineWidth;
            }
            context.setLineDash(dashArray);
        }


        //context.font = ["16px Open Sans Regular","Arial Unicode MS Regular"];
        var fontsize = "16";
        var font = "Arial Unicode MS Regular";
        if (defined(textSize)) fontsize = parseInt(textSize);
        if (defined(textFont)) font = textFont[0];
        fontsize = fontsize + "px";
        font = fontsize + " " + font;
        context.font = font;
        //TODO: implement extraction of relevant value
        context.textAlign = "center";
        context.textBaseline = "top";

        //TODO: set font information
        if (defined(textField)) {
            //if ("layout" in jStyle && "symbol-placement" in jStyle.layout && jStyle.layout["symbol-placement"] === "line") return;
            textField = textField.replace("{", "");
            textField = textField.replace("}", "");            
            //TODO: these may override colours for lines/fills!
            context.fillStyle = textColor;
            context.strokeStyle = textColor;
        }


        // Features
        //loop through each feature within the layer
        for (var i = 0; i < layer.length; i++) {
            canvas.style.background = this._backgroundColor;

            var feature = layer.feature(i);

            //if the current style has a 'filter', check it to see if it matches the current feature's property
            if (jStyle.filter !== undefined) {
                var prop = feature.properties[jStyle.filter[1]];
                if (prop !== undefined) {
                    var val = feature.properties[jStyle.filter[1]];
                    if (val != jStyle.filter[2]) continue;
                }
            }

            //if the current feature's specified zoom is not within the current zoom, move to next feature
            //if ("_minzoom" in feature.properties && nativeTile.level < parseInt(feature.properties._minzoom)) { continue };
            //if ("_maxzoom" in feature.properties && nativeTile.level >= parseInt(feature.properties._maxzoom)) { continue; }

            var label = undefined;

            if (defined(feature.properties[textField])) label = feature.properties[textField];

            var coordinates = getCoordinates(nativeTile, requestedTile, layer, feature);
            if (!defined(coordinates)) {
                continue;
            }

            
            context.translate(transVal, transVal);
            
            switch (jStyle.type) {
                case "fill":
                    drawPath(context, extentFactor, coordinates);
                    context.closePath();
                    if (defined(fillColor) || defined(pattern)) context.fill();
                    if (defined(outlineColor)) context.stroke();
                    break;
                case "line":
                    drawPath(context, extentFactor, coordinates);
                    if (defined(fillColor)) context.fill();
                    if (defined(lineOpacity)) context.globalAlpha = lineOpacity;
                    if (defined(lineColor) && defined(lineWidth)) context.stroke();
                    context.globalAlpha = 1.0;
                    break;
                case "symbol":

                    if (defined(label)) drawSpriteAndText(context, extentFactor, coordinates, label, this._sprites[iconImage])
                    break;
            }
            context.translate(-transVal, -transVal);
        }

    }
    
    origContext.drawImage(canvas, 0, 0, origCanvas.width, origCanvas.height);

};

//TODO: not sure if this function is needed, see  comments in getCoordinates() function
// Use x,y,level vector tile to produce imagery for newX,newY,newLevel
function overzoomGeometry(rings, nativeTile, newExtent, newTile) {
    var diffZ = newTile.level - nativeTile.level;
    if (diffZ === 0) {
        return rings;
    } else {
        var newRings = [];
        // (offsetX, offsetY) is the (0,0) of the new tile
        var offsetX = newExtent * (newTile.x - (nativeTile.x << diffZ));
        var offsetY = newExtent * (newTile.y - (nativeTile.y << diffZ));
        for (var i = 0; i < rings.length; i++) {
            var ring = [];
            for (var i2 = 0; i2 < rings[i].length; i2++) {
                ring.push(rings[i][i2].sub(new Point(offsetX, offsetY)));
            }
            newRings.push(ring);
        }
        return newRings;
    }
}

//function used to calculate the coordinates for a specific layer-feature
//on a given tile canvas
function getCoordinates(nativeTile, requestedTile, layer, feature) {
    var coordinates;
    //TODO: not sure what the purpose of the over-zoom feature is - this was in the original implementation
    //and appears to mess up the tile alignment and artifcially increase the zoom by bloating all of the shapes

    if (nativeTile.level !== requestedTile.level) {
        // Overzoom feature
        var bbox = feature.bbox(); // [w, s, e, n] bounding box
        var featureRect = new BoundingRectangle(
            bbox[0],
            bbox[1],
            bbox[2] - bbox[0],
            bbox[3] - bbox[1]
        );
        var levelDelta = requestedTile.level - nativeTile.level;
        var size = layer.extent >> levelDelta;
        if (size < 16) {
            // Tile has less less detail than 16x16
            throw new DeveloperError(("maxLevelError"));
        }
        var x1 = size * (requestedTile.x - (nativeTile.x << levelDelta)); //
        var y1 = size * (requestedTile.y - (nativeTile.y << levelDelta));
        var tileRect = new BoundingRectangle(x1, y1, size, size);
        extentFactor = canvas.width / size;console.log(extentFactor);
        if (
            BoundingRectangle.intersect(featureRect, tileRect) ===
            Intersect.OUTSIDE
        ) {
            return undefined;
        }
        coordinates = overzoomGeometry(
            feature.loadGeometry(),
            nativeTile,
            size,
            requestedTile
        );
    } else {
        coordinates = feature.loadGeometry();
    }
    return coordinates;
}

//function used to get Paint node from style json
//handles the 'stops' to return value for specific zoom
function getPaintValue(style, zoomLevel, field) {
    var value = undefined;
    if ("paint" in style && defined(style.paint[field])) {
        if (defined(style.paint[field].stops)) {
            //note that 'zoom functions' (i.e. stops) are reportedly deprecated
            //TODO: interpolate between zoom levels
            if (Array.isArray(style.paint[field].stops)) {
                var arr = style.paint[field].stops;
                //for (var x = 0; x < arr.length; x++) {
                for (var x = arr.length - 1; x >= 0; x--) {
                    if (zoomLevel >= arr[x][0]) {
                        value = arr[x][1];
                        break;
                    }
                }
            }
        } else {
            value = style.paint[field];
        }
    }
    return value;
}

//function used to get Layout node from style json
//handles the 'stops' to return value for specific zoom
function getLayoutValue(style, zoomLevel, field) {
    var value = undefined;
    if ("layout" in style && defined(style.layout[field])) {
        if (defined(style.layout[field].stops)) {
            //note that 'zoom functions' (i.e. stops) are reportedly deprecated
            //TODO: interpolate between zoom levels
            if (Array.isArray(style.layout[field].stops)) {
                var arr = style.layout[field].stops;
                //for (var x = 0; x < arr.length; x++) {
                for (var x = arr.length - 1; x >= 0; x--) {
                    if (zoomLevel >= arr[x][0]) {
                        value = arr[x][1];
                        break;
                    }
                }
            }
        } else {
            value = style.layout[field];
        }
    }
    return value;
}

//function used to draw a path for geometry and line based rendering
function drawPath(context, extentFactor, coordinates) {
    // Polygon rings
    context.beginPath();
    for (var i2 = 0; i2 < coordinates.length; i2++) {
        var pos = coordinates[i2][0];
        context.moveTo(pos.x * extentFactor, pos.y * extentFactor);
        //context.fillText("" + jStyle.id, coordinates[i2][0].x, coordinates[i2][0].y);
        // Polygon ring points
        for (var j = 1; j < coordinates[i2].length; j++) {
            pos = coordinates[i2][j];
            context.lineTo(pos.x * extentFactor, pos.y * extentFactor);

        }
    }
}

//function used to draw  text and sprites onto canvas
// function drawSpriteAndText(context, extentFactor, coordinates, text, image) {
//     for (var i2 = 0; i2 < coordinates.length; i2++) {
//         var pos = coordinates[i2][0];
//         var xPos = pos.x * extentFactor;
//         var yPos = pos.y * extentFactor;
//         // if (jStyle.id==="road/label/residential"){
//         //     console.log(coordinates);
//         //     console.log(feature);
//         //     console.log(jStyle);
//         //     }

//         // var t = context.measureText(text);
//         // var tt = {};
//         // tt.y1 = t.actualBoundingBoxAscent + yPos;
//         // tt.y2 = t.actualBoundingBoxDescent + yPos;
//         // tt.x1 = t.actualBoundingBoxLeft + xPos;
//         // tt.x2 = t.actualBoundingBoxRight + xPos;
//         if (defined(image)) drawSprite(context, extentFactor, xPos, yPos, image);
//         context.fillText(text, xPos, yPos);
//     }
// }
var temp = true;
function drawSpriteAndText(context, extentFactor, coordinates, text, image) {
    context.beginPath();
    for (var i2 = 0; i2 < coordinates.length; i2++) {
        var pos = coordinates[i2][0];//first coordinate
        //TODO: text alignment and offset
        // if (coordinates[i2].length > 1) {
        //     try {
        //         if (temp) {
        //             context.strokeStyle = "black";
        //             context.fillStyle = "black";
        //             temp = false;
        //         } else {
        //             context.strokeStyle = "red";
        //             context.fillStyle = "red";
        //             temp = true;
        //         }

        //         context.save();
        //         var v1 = Cartesian2.fromElements(pos.x * extentFactor, pos.y * extentFactor);
        //         var pos2 = coordinates[i2][coordinates[i2].length - 1];//last coordinate
        //         var v2 = Cartesian2.fromElements(pos2.x * extentFactor, pos2.y * extentFactor);
        //         var v3 = Cartesian2.subtract(v1, v2, new Cartesian2());
        //         var v4 = Cartesian2.multiplyByScalar(v3, 0.5, new Cartesian2());
        //         var angle = Cartesian2.angleBetween(v2, v1, new Cartesian2());

        //         //context.translate(v4.x, v4.y);
        //         context.translate(v1.x, v1.y);
        //         context.rotate(angle);
        //         if (defined(image)) drawSprite(context, extentFactor, 0.0, 0.0, image);
        //         context.fillText(text, 0.0, 0.0);
        //         context.restore();

        //         context.moveTo(pos.x * extentFactor, pos.y * extentFactor);
        //         context.lineTo(pos2.x * extentFactor, pos2.y * extentFactor);
        //         context.lineWidth = 1;
        //         context.stroke();
        //     } catch (error) {
        //         console.log(error);
        //     }
        //     return;
        // }

        if (defined(image)) drawSprite(context, extentFactor, pos.x, pos.y, image);
        context.fillText(text, pos.x * extentFactor, pos.y * extentFactor);
    }
}

//function used to draw an image on the canvas
//this must be drawn offscreen in order to maintain alpha transparency
function drawSprite(context, extentFactor, xPos, yPos, image) {    
    var offscreen = document.createElement("canvas");
    offscreen.width = image.width;
    offscreen.height = image.height;
    var offCtx = offscreen.getContext('2d'); // an offscreen canvas

    offCtx.globalAlpha = 0.0;
    offCtx.clearRect(0, 0, image.width, image.height);
    offCtx.putImageData(image, 0, 0);
    //draw on main canvas (putimage will lose alpha)
    context.drawImage(offCtx.canvas, (xPos * extentFactor), (yPos * extentFactor), image.width, image.height);
}

function getFillPattern(context, image) {
    if (!defined(image)) return undefined;

    //var offscreen = new OffscreenCanvas(image.width, image.height);
    var offscreen = document.createElement("canvas");
    offscreen.width = image.width;
    offscreen.height = image.height;
    var offcontext = offscreen.getContext('2d');

    offcontext.putImageData(image, 0, 0);
    var pattern = context.createPattern(offscreen, 'repeat');
    return pattern;
}

//function used to load in and cache locally the sprites from json/png files
//this._sprites holds all of the image binary data and a lookup key for each  image
VectorStyle.prototype._loadSprites = function (spriteIndexUrl, spriteImgUrl) {
    //icons are loaded from a single png file
    //locations specified in a json file
    var resource = Resource.createIfNeeded(spriteIndexUrl);
    var spriteIndexResource = resource.getDerivedResource({
        url: spriteIndexUrl
    });

    var sprites = new Object();
    this._sprites = sprites;
    var image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = function () {
        var spriteCanvas = document.createElement("canvas");
        spriteCanvas.width = image.width;
        spriteCanvas.height = image.height;
        var spriteCtx = spriteCanvas.getContext("2d");
        spriteCtx.fillStyle = "red";
        spriteCtx.globalAlpha = 1.0;
        //spriteCtx.fillRect(0, 0, image.width, image.height);
        spriteCtx.clearRect(0, 0, image.width, image.height);
        spriteCtx.drawImage(image, 0, 0, image.width, image.height);

        spriteIndexResource.fetchJson().then(function (spriteIndex) {
            //cache image data for later use
            for (var i = 0; i < Object.keys(spriteIndex).length; i++) {
                var k = Object.keys(spriteIndex)[i];
                var v = Object.values(spriteIndex)[i];
                var data = spriteCtx.getImageData(v.x, v.y, v.width, v.height);
                sprites[k] = data;
            }
        });

    }
    image.src = spriteImgUrl;
}

export default VectorStyle;