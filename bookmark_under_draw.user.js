// ==UserScript==
// @id             iitc-plugin-bookmarkUnderDraw
// @name           IITC plugin: Bookmark portals under draw or search result.
// @author         Jormund
// @category       Controls
// @version        0.1.15.20181031.1930
// @description    [2018-10-31-1930] Bookmark portals under draw or search result.
// @updateURL      https://github.com/Jormund/bookmark_under_draw/raw/master/bookmark_under_draw.meta.js
// @downloadURL    https://github.com/Jormund/bookmark_under_draw/raw/master/bookmark_under_draw.user.js
// @include        https://ingress.com/intel*
// @include        http://ingress.com/intel*
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @include        https://intel.ingress.com/*
// @match          https://intel.ingress.com/*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @grant          none
// ==/UserScript==
//Changelog
//0.1.15: activate on intel.ingress.com, changed download url to github
//0.1.14: remove bookmarks under draw or search
//0.1.13: sort by name
//0.1.12: buttons to clear draw and bookmarks
//0.1.11: sort new bookmarks
//0.1.10: preference dialog now opens with the star button (removed from portal detail)
//0.1.9: handle holes (can happen in search result)
//0.1.8: use same algorithm as layer-count (better approximation of "curved" edges), still not an exact solution for GeodesicPolygons
//0.1.7: handle ingress.com and www.ingress.com
//0.1.6: dropdownlist to choose folder

function wrapper(plugin_info) {
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN START ////////////////////////////////////////////////////////
    window.plugin.bookmarkUnderDraw = function () { };
    window.plugin.bookmarkUnderDraw.work = {};


    window.plugin.bookmarkUnderDraw.KEY_STORAGE = 'bookmarkUnderDraw-storage';
    window.plugin.bookmarkUnderDraw.DRAW_TOOLS_KEY_STORAGE = 'plugin-draw-tools-layer';

    window.plugin.bookmarkUnderDraw.actions = { ADD: 'ADD', REMOVE: 'REMOVE' };
    window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID = 'idOthers'; //using string constant because bookmark plugin might not be loaded yet
    window.plugin.bookmarkUnderDraw.DEFAULT_NOT_LOADED_PORTAL_NAME = 'UNKNOWN PORTAL NAME';
    window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_UNKNOWN_PORTAL = false;
    window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_HIDDEN_PORTAL = true;
    window.plugin.bookmarkUnderDraw.sorts = {
        NONE: { code: "NONE", name: "No sort", compareFunction: function (a, b) { return 0 }
        },
        EAST_TO_WEST: { code: "EAST_TO_WEST", name: "East to west",
            compareFunction: function (a, b) {
                if (a.lng > b.lng) return -1;
                if (a.lng < b.lng) return 1;
                //when lng are equal, sort SOUTH_TO_NORTH to make the sort stable
                if (a.lat > b.lat) return 1;
                if (a.lat < b.lat) return -1;
                return 0;
            }
        },
        WEST_TO_EAST: { code: "WEST_TO_EAST", name: "West to east",
            compareFunction: function (a, b) {
                if (a.lng > b.lng) return 1;
                if (a.lng < b.lng) return -1;
                //when lng are equal, sort SOUTH_TO_NORTH to make the sort stable
                if (a.lat > b.lat) return 1;
                if (a.lat < b.lat) return -1;
                return 0;
            }
        },
        NORTH_TO_SOUTH: { code: "NORTH_TO_SOUTH", name: "North to south",
            compareFunction: function (a, b) {
                if (a.lat > b.lat) return -1;
                if (a.lat < b.lat) return 1;
                //when lat are equal, sort WEST_TO_EAST to make the sort stable
                if (a.lng > b.lng) return 1;
                if (a.lng < b.lng) return -1;
                return 0;
            }
        },
        SOUTH_TO_NORTH: { code: "SOUTH_TO_NORTH", name: "South to north",
            compareFunction: function (a, b) {
                if (a.lat > b.lat) return 1;
                if (a.lat < b.lat) return -1;
                //when lat are equal, sort WEST_TO_EAST to make the sort stable
                if (a.lng > b.lng) return 1;
                if (a.lng < b.lng) return -1;
                return 0;
            }
        },
        PORTAL_NAME: { code: "PORTAL_NAME", name: "Portal name",
            compareFunction: function (a, b) {
                var comp = a.label.localeCompare(b.label, "en-GB"); //TODO:let user choose locale ?
                if (comp != 0) return comp;
                //if (a.label > b.label) return 1;
                //if (a.label < b.label) return -1;
                //when equal, use lat&lng to make the sort stable
                //WEST_TO_EAST
                if (a.lng > b.lng) return 1;
                if (a.lng < b.lng) return -1;
                //SOUTH_TO_NORTH
                if (a.lat > b.lat) return 1;
                if (a.lat < b.lat) return -1;
                return 0;
            }
        }
    };
    window.plugin.bookmarkUnderDraw.sortedSorts = [
        window.plugin.bookmarkUnderDraw.sorts.NONE,
        window.plugin.bookmarkUnderDraw.sorts.WEST_TO_EAST,
        window.plugin.bookmarkUnderDraw.sorts.EAST_TO_WEST,
        window.plugin.bookmarkUnderDraw.sorts.NORTH_TO_SOUTH,
        window.plugin.bookmarkUnderDraw.sorts.SOUTH_TO_NORTH,
        window.plugin.bookmarkUnderDraw.sorts.PORTAL_NAME
        ];
    //window.plugin.bookmarkUnderDraw.DEFAULT_SORT = window.plugin.bookmarkUnderDraw.sorts.NONE;
    window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE = window.plugin.bookmarkUnderDraw.sorts.NONE.code;

    window.plugin.bookmarkUnderDraw.storage = {
        folderId: window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID,
        sortCode: window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE,
        notLoadedPortalName: window.plugin.bookmarkUnderDraw.DEFAULT_NOT_LOADED_PORTAL_NAME,
        bookmarkUnknownPortal: window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_UNKNOWN_PORTAL,
        bookmarkHiddenPortal: window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_HIDDEN_PORTAL
    };

    //star icon
    //    window.plugin.bookmarkUnderDraw.ico = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">'
    //	                                            + '<g style="fill: #FACA00; fill-opacity: 1; stroke: none;">'
    //                                                    + '<path d="M 15,1 18,12 29,12 20,18 24,28 15,21 6,28 10,18 1,12 12,12 Z" />'
    //	                                            + '</g>'
    //                                            + '</svg>';//utf-8 svg not working for reason unknown, using base64 instead
    window.plugin.bookmarkUnderDraw.bookmarkIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+DQoJPGcgc3R5bGU9ImZpbGw6ICNGQUNBMDA7IGZpbGwtb3BhY2l0eTogMTsgc3Ryb2tlOiBub25lOyI+DQogICAgPHBhdGggZD0iTSAxNSwxIDE4LDEyIDI5LDEyIDIwLDE4IDI0LDI4IDE1LDIxIDYsMjggMTAsMTggMSwxMiAxMiwxMiBaIiAvPg0KCTwvZz4NCjwvc3ZnPg==";

    // STORAGE //////////////////////////////////////////////////////////
    // update the localStorage with preferences
    window.plugin.bookmarkUnderDraw.saveStorage = function () {
        localStorage[window.plugin.bookmarkUnderDraw.KEY_STORAGE] = JSON.stringify(window.plugin.bookmarkUnderDraw.storage);
    };

    // load the localStorage datas
    window.plugin.bookmarkUnderDraw.loadStorage = function () {
        if (typeof localStorage[window.plugin.bookmarkUnderDraw.KEY_STORAGE] != "undefined") {
            window.plugin.bookmarkUnderDraw.storage = JSON.parse(localStorage[window.plugin.bookmarkUnderDraw.KEY_STORAGE]);
        }

        //ensure default values are always set
        if (typeof window.plugin.bookmarkUnderDraw.storage.folderId == "undefined") {
            window.plugin.bookmarkUnderDraw.storage.folderId = window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID;
        }
        if (typeof window.plugin.bookmarkUnderDraw.storage.sortCode == "undefined") {
            window.plugin.bookmarkUnderDraw.storage.sortCode = window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE;
        }
        if (typeof window.plugin.bookmarkUnderDraw.storage.notLoadedPortalName == "undefined") {
            window.plugin.bookmarkUnderDraw.storage.notLoadedPortalName = window.plugin.bookmarkUnderDraw.DEFAULT_NOT_LOADED_PORTAL_NAME;
        }
        if (typeof window.plugin.bookmarkUnderDraw.storage.bookmarkUnknownPortal == "undefined") {
            window.plugin.bookmarkUnderDraw.storage.bookmarkUnknownPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_UNKNOWN_PORTAL;
        }
        if (typeof window.plugin.bookmarkUnderDraw.storage.bookmarkHiddenPortal == "undefined") {
            window.plugin.bookmarkUnderDraw.storage.bookmarkHiddenPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_HIDDEN_PORTAL;
        }
    };

    // FUNCTIONS ////////////////////////////////////////////////////////
    /*
    pnpoly Copyright (c) 1970-2003, Wm. Randolph Franklin

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
    rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
    persons to whom the Software is furnished to do so, subject to the following conditions:

    1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
    disclaimers.
    2. Redistributions in binary form must reproduce the above copyright notice in the documentation and/or other
    materials provided with the distribution.
    3. The name of W. Randolph Franklin may not be used to endorse or promote products derived from this Software without
    specific prior written permission.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
    WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    window.plugin.bookmarkUnderDraw.pnpoly = function (latlngs, point) {
        var length = latlngs.length, c = false;

        for (var i = 0, j = length - 1; i < length; j = i++) {
            if (((latlngs[i].lat > point.lat) != (latlngs[j].lat > point.lat)) &&
			(point.lng < latlngs[i].lng + (latlngs[j].lng - latlngs[i].lng) * (point.lat - latlngs[i].lat) / (latlngs[j].lat - latlngs[i].lat))) {
                c = !c;
            }
        }

        return c;
    }

    window.plugin.bookmarkUnderDraw.circleToSearchCircle = function (drawnItem) {
        var circleCenter = drawnItem.getLatLng();
        var result = { type: 'circle', radius: drawnItem.getRadius(), center: new L.LatLng(circleCenter.lat, circleCenter.lng) };
        return result;
    };

    //drawnItem can be multipolygon or polygon
    window.plugin.bookmarkUnderDraw.multiPolygonToSearchPolygons = function (drawnItem) {
        var result = [];
        var polygonArr = [];
        if (drawnItem instanceof L.GeodesicPolygon) {
            //_latlngs contains the Polygon path used to approximate the GeodesicPolygon
            //we use this because the pnpoly algorithm is not suited for GeodesicPolygon and the approximation works better
            polygonArr = drawnItem._latlngs.map(function (item) { return [item.lng, item.lat] });
        }
        else {
            //console.log("Not a GeodesicPolygon");
            polygonArr = drawnItem.toGeoJSON().geometry.coordinates;
        }
        if (drawnItem instanceof L.Polygon && !(drawnItem instanceof L.MultiPolygon)) {
            //console.log("Not a MultiPolygon");
            polygonArr = [polygonArr]; //handle simple polygon like a multipolygon of one polygon only
        }
        //console.log("polygonArr:"+polygonArr.length);
        $.each(polygonArr, function (i, polygonCoords) {//each polygonCoords is a polygon of a multipolygon
            var searchPolygon = {
                type: 'polygon',
                outerRing: [],
                holes: []
            };
            if (polygonCoords[0].length == 2 && typeof polygonCoords[0][0] == "number") {
                //polygon has no hole, we wrap it in an array
                polygonCoords = [polygonCoords];
            }
            //console.log(i+" polygonCoords:"+polygonCoords.length);
            $.each(polygonCoords, function (j, linearRing) {//in a polygon, the first set of coords is the outside bound, the others are holes
                var latLngArr = [];
                //console.log(j+" linearRing:"+linearRing.length);
                $.each(linearRing, function (k, latlng) {
                    var obj = { lng: latlng[0], lat: latlng[1] };
                    latLngArr.push(obj);
                    //console.log(k+" latLngArr:" + latLngArr.length);
                });
                if (j == 0) {
                    searchPolygon.outerRing = latLngArr;
                }
                else {
                    searchPolygon.holes.push(latLngArr);
                }
                //console.log("searchPolygon.outerRing:"+searchPolygon.outerRing.length);
                //console.log("searchPolygon.holes:"+searchPolygon.holes.length);
            });
            result.push(searchPolygon);
            //console.log("result:"+result.length);
        });
        return result;
    };

    window.plugin.bookmarkUnderDraw.doTheJob = function (options) {
        if (!window.plugin.bookmarks) {
            console.log('Bookmarks Under Draw ERROR : Bookmark plugin required');
            alert('Bookmarks plugin required');
            return false;
        }

        window.plugin.bookmarkUnderDraw.work.searchItems = [];
        if (!!window.plugin.drawTools && !!window.plugin.drawTools.drawnItems) {
            window.plugin.drawTools.drawnItems.eachLayer(function (drawnItem) {
                if (drawnItem instanceof L.GeodesicCircle) {//must be tested first because GeodesicCircle inherit from Polygon
                    var searchCircle = window.plugin.bookmarkUnderDraw.circleToSearchCircle(drawnItem);
                    window.plugin.bookmarkUnderDraw.work.searchItems.push(searchCircle);
                }
                else if (drawnItem instanceof L.GeodesicPolygon) {
                    var searchPolygons = window.plugin.bookmarkUnderDraw.multiPolygonToSearchPolygons(drawnItem);
                    //console.log("searchPolygons:"+searchPolygons.length);
                    $.each(searchPolygons, function (index, searchItem) {
                        window.plugin.bookmarkUnderDraw.work.searchItems.push(searchItem);
                    });
                }
                else if (drawnItem instanceof L.GeodesicPolyline || drawnItem instanceof L.Marker) {
                    //ignored, nothing to do
                }
                else {
                    //should not happen
                    console.log('Bookmark Under Draw : unknown drawn item type');
                }
            });
        }

        //if search, add it to job
        if (window.search.lastSearch &&
            window.search.lastSearch.selectedResult &&
            window.search.lastSearch.selectedResult.layer) {

            window.search.lastSearch.selectedResult.layer.eachLayer(function (drawnItem) {
                if (drawnItem instanceof L.MultiPolygon || drawnItem instanceof L.Polygon) {
                    var searchPolygons = window.plugin.bookmarkUnderDraw.multiPolygonToSearchPolygons(drawnItem);
                    $.each(searchPolygons, function (index, searchItem) {
                        window.plugin.bookmarkUnderDraw.work.searchItems.push(searchItem);
                    });
                }
            });
        }

        if (window.plugin.bookmarkUnderDraw.work.searchItems.length == 0) {
            //warning icon
            var img = '<img style="vertical-align:middle;" src="data:image/png;base64,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"/>';
            alert(img + ' A polygon or circle must be drawn or a search result selected');
            return false;
        }
        else {
            console.log('Bookmark Under Draw :' + window.plugin.bookmarkUnderDraw.work.searchItems.length + ' shapes found');
        }

        var bookmarkUnderDraw = function (options) {
            if (typeof options == 'undefined') options = {};
            if (typeof options.folderId == 'undefined') options.folderId = window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID;
            if (typeof options.notLoadedPortalName == 'undefined') options.notLoadedPortalName = window.plugin.bookmarkUnderDraw.DEFAULT_NOT_LOADED_PORTAL_NAME;
            if (typeof options.bookmarkUnknownPortal == 'undefined') options.bookmarkUnknownPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_UNKNOWN_PORTAL;
            if (typeof options.bookmarkHiddenPortal == 'undefined') options.bookmarkHiddenPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_HIDDEN_PORTAL;
            if (typeof options.sort == 'undefined' || typeof options.sortCode == 'undefined') {
                options.sortCode = window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE;
                options.sort = window.plugin.bookmarkUnderDraw.sorts[options.sortCode];
            }

            var t = this;
            this._w_ = {}; //work variables
            this.bookmarkedPortals = {}; //bookmarks guids
            this.distinctPortalUnderDrawCount = 0;
            this.bookmarkAddCount = 0;
            this.bookmarkRemoveCount = 0;
            this.wrongDataCount = 0;
            this.alreadyExistCount = 0;
            //this.foundTwiceCount = 0;//obsolete
            this.options = options;
            return t;
        };
        bookmarkUnderDraw.prototype.initialize = function (searchItems) {
            var t = this;
            //t._w_ = window.plugin.bookmarkUnderDraw.work;
            t._w_.searchItems = searchItems;
            t._w_.portalsUnderDraw = []; //guids of portals under draw
        };

        bookmarkUnderDraw.prototype.run = function () {
            var t = this;

            var input = window.portals;
            //when removing bookmarks, we can restrict ourselves to bookmarks
            if (t.options.action == window.plugin.bookmarkUnderDraw.actions.REMOVE) {
                input = {};
                var list = window.plugin.bookmarks.bkmrksObj['portals'];
                for (var idFolders in list) {
                    for (var idBkmrk in list[idFolders]['bkmrk']) {
                        var portalGuid = list[idFolders]['bkmrk'][idBkmrk]['guid'];
                        var portal = window.portals[portalGuid];
                        if (portal) {
                            input[portalGuid] = portal;
                        }
                    }
                }
            }
            console.log("portals:" + input.length);
            $.each(input, function (guid, portal) {
                var point = portal.getLatLng();
                var found = false;
                $.each(t._w_.searchItems, function (index, searchItem) {
                    switch (searchItem.type) {
                        case 'circle':
                            if (t.pointIsInCircle(point, searchItem)) {
                                found = true;
                                console.log("in circle:" + point.lat + "," + point.lng);
                                return false; //breaks the $.each
                            }
                            break;
                        case 'polygon':
                            if (t.pointIsInPolygon(point, searchItem)) {
                                found = true;
                                console.log("in polygon:" + point.lat + "," + point.lng);
                                return false; //breaks the $.each
                            }
                            break;
                        default:
                            console.log('Bookmark Under Draw ERROR : invalid draw type (' + searchItem.type + ')');
                            return true; //continue the $.each
                            break;
                    };
                });
                //console.log("found"+found);
                if (found) {
                    t._w_.portalsUnderDraw.push(guid);
                }
            });
            if (t.options.action == window.plugin.bookmarkUnderDraw.actions.ADD) {
                t.bookmarkPortals();
            }
            else if (t.options.action == window.plugin.bookmarkUnderDraw.actions.REMOVE) {
                t.removeBookmarks();
            }
            else {
                //should not happen
            }
            t.render();
        };

        bookmarkUnderDraw.prototype.pointIsInPolygon = function (point, searchItem) {
            var nodeIn = window.plugin.bookmarkUnderDraw.pnpoly(searchItem.outerRing, point);
            $.each(searchItem.holes, function (index, hole) {
                var inHole = window.plugin.bookmarkUnderDraw.pnpoly(hole, point);
                if (inHole) {
                    nodeIn = false; //portal is in the hole so not in the polygon
                    return false; //breaks the loop
                }
            });
            return nodeIn;
        };
        bookmarkUnderDraw.prototype.pointIsInCircle = function (point, searchItem) {
            //var t = this;
            var found = false;
            if (searchItem.center.distanceTo(point) <= searchItem.radius) {
                found = true;
            }
            return found;
        };


        bookmarkUnderDraw.prototype.removeBookmarks = function () {
            var t = this;

            $.each(t._w_.portalsUnderDraw, function (index, guid) {
                var list = window.plugin.bookmarks.bkmrksObj['portals'];
                var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                if (bkmrkData) {
                    //bookmark exists
                    t.bookmarkRemoveCount++;

                    delete list[bkmrkData['id_folder']]['bkmrk'][bkmrkData['id_bookmark']]; //inspired by window.plugin.bookmarks.switchStarPortal
                    //$('.bkmrk#' + bkmrkData['id_bookmark'] + '').remove();//handled by the refresh below
                }
                else {
                    //do nothing
                }
            });

            window.plugin.bookmarks.saveStorage();
            window.plugin.bookmarks.refreshBkmrks();
            window.runHooks('pluginBkmrksEdit', { "target": "all", "action": "import" });
            console.log('bookmarkUnderDraw: refreshed bookmarks');
        }
        //used instead of bookmark plugin because the original code makes only 99 different IDs in the same millisecond
        bookmarkUnderDraw.prototype.generateID = function () {
            var d = new Date();
            var ID = Math.floor(Math.random() * 1e10) + 1;
            //var ID = d.getTime()+(Math.floor(Math.random()*99)+1);//id1 472 936 881 241
            ID = 'id' + ID.toString();
            return ID;
        }
        bookmarkUnderDraw.prototype.bookmarkPortals = function () {
            var t = this;

            var folderBkmrks = window.plugin.bookmarks.bkmrksObj['portals'][t.options.folderId]['bkmrk'];
            var newBookmarks = [];
            $.each(t._w_.portalsUnderDraw, function (index, guid) {
                //if (typeof t.bookmarkedPortals[guid] == 'undefined') {//we check if portal was added by our loop, can happen if draws overlap//28/05/2018: cannot happen since we loop on portals only once
                var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                if (bkmrkData) {
                    //bookmark exists
                    t.alreadyExistCount++;
                }
                else {
                    var portal = window.portals[guid];
                    var portalName = portal.options.data.title;
                    if (typeof portalName == 'string' || t.options.bookmarkUnknownPortal) {//add portal only if name is loaded or override is chosen
                        if (t.options.bookmarkHiddenPortal || window.map.hasLayer(portal)) {//add portal only if it is not filtered out or override is chosen
                            var ll = portal.getLatLng();
                            //window.plugin.bookmarks.addPortalBookmark(guid, ll.lat + ',' + ll.lng, portalName); //actually bookmarks the portal
                            //02/09/2016: only add the bookmark to JS obj to make it faster
                            var bookmarkID = t.generateID();
                            // Add bookmark in the localStorage
                            var latlng = ll.lat + ',' + ll.lng;
                            var label = portalName || t.options.notLoadedPortalName;
                            var newBookmark = { "guid": guid, "latlng": latlng, "label": label,
                                "id": bookmarkID, lat: ll.lat, lng: ll.lng //used for sort, will be deleted before adding to the bookmark plugin
                            };
                            newBookmarks.push(newBookmark);
                            //console.log('bookmarkUnderDraw: added portal ' + ID);
                            //window.runHooks('pluginBkmrksEdit', { "target": "portal", "action": "add", "id": ID, "guid": guid });//02/09/2016: only refresh once
                            t.bookmarkAddCount++;
                        }
                    }
                    else {
                        t.wrongDataCount++;
                    }
                }
                t.bookmarkedPortals[guid] = {}; //keep result for the count and the next checks
                t.distinctPortalUnderDrawCount++;
                //                }
                //                else {
                //                    //bookmark exists
                //                    t.foundTwiceCount++;
                //                }
            });
            //sort result if a sort is selected
            if (t.options.sort.code != window.plugin.bookmarkUnderDraw.sorts.NONE.code) {
                newBookmarks.sort(t.options.sort.compareFunction);
            }

            //create the bookmarks
            $.each(newBookmarks, function (index, newBookmark) {
                var bookmarkID = newBookmark.id;
                delete newBookmark.id;
                delete newBookmark.lat;
                delete newBookmark.lng;
                folderBkmrks[bookmarkID] = newBookmark;
            });

            //02/09/2016: only refresh once
            window.plugin.bookmarks.saveStorage();
            window.plugin.bookmarks.refreshBkmrks();
            window.runHooks('pluginBkmrksEdit', { "target": "all", "action": "import" });
            console.log('bookmarkUnderDraw: refreshed bookmarks');
        };

        bookmarkUnderDraw.prototype.setMessage = function (message, makeVisible) {
            if (makeVisible) {
                setTimeout(function () {
                    window.plugin.bookmarkUnderDraw.button.classList.add("active");
                }, 1);
            }
            setTimeout(function () {
                window.plugin.bookmarkUnderDraw.messageBox.innerHTML = message;
            }, 1);
        };
        bookmarkUnderDraw.prototype.render = function () {
            var t = this;

            var message = '';
            if (t.options.action == window.plugin.bookmarkUnderDraw.actions.ADD) {
                var bookmarkedPortalCount = t.bookmarkAddCount; // Object.keys(t.bookmarkedPortals).length;
                var totalPortalCount = t.distinctPortalUnderDrawCount;
                if (totalPortalCount > 0) {
                    if (totalPortalCount == 1)
                        message += totalPortalCount + ' portal found';
                    else
                        message += totalPortalCount + ' portals found';
                }
                else {
                    message += 'No portal found';
                }
                message += ', ' + bookmarkedPortalCount + ' new';
                if (t.alreadyExistCount > 0)
                    message += ', ' + t.alreadyExistCount + ' old';
                if (t.wrongDataCount > 0)
                    message += ', ' + t.wrongDataCount + ' not loaded';
            } else if (t.options.action == window.plugin.bookmarkUnderDraw.actions.REMOVE) {
                if (t.bookmarkRemoveCount > 0) {
                    if (t.bookmarkRemoveCount == 1)
                        message += t.bookmarkRemoveCount + ' bookmark removed';
                    else
                        message += t.bookmarkRemoveCount + ' bookmarks removed';
                }
                else {
                    message += 'No bookmark removed';
                }
            }


            var zoomLevel = $('#loadlevel').html();
            if (zoomLevel != 'all') {
                message += ' <span style="color:orange">Portals might be missing. Zoom level :<b>' + zoomLevel + '<b></span>';
            }

            t.setMessage(message, true); //setTimeout copied from layer-count, don't know why
        };

        //doTheJob
        //var options = window.plugin.bookmarkUnderDraw.storage;
        var worker = new bookmarkUnderDraw(options);
        window.plugin.bookmarkUnderDraw.work.lastWorker = worker; //debug
        worker.initialize(window.plugin.bookmarkUnderDraw.work.searchItems);
        worker.run();
    };

    window.plugin.bookmarkUnderDraw.messageBoxClicked = function (evt) {
        //console.log('window.plugin.bookmarkUnderDraw.messageBoxClicked');
        var btn = window.plugin.bookmarkUnderDraw.button;
        var messageBox = window.plugin.bookmarkUnderDraw.messageBox;
        btn.classList.remove("active");
        messageBox.textContent = "";
        evt.stopPropagation();
    };

    //inspired by window.plugin.drawTools.optReset
    window.plugin.bookmarkUnderDraw.resetDraw = function () {
        if (window.plugin.drawTools) {
            delete localStorage[window.plugin.bookmarkUnderDraw.DRAW_TOOLS_KEY_STORAGE];
            window.plugin.drawTools.drawnItems.clearLayers();
            window.plugin.drawTools.load();
            runHooks('pluginDrawTools', { event: 'clear' });
        }
    };
    //inspired by window.plugin.bookmarks.optReset
    window.plugin.bookmarkUnderDraw.resetBookmarks = function () {
        delete localStorage[window.plugin.bookmarks.KEY_STORAGE];
        window.plugin.bookmarks.createStorage();
        window.plugin.bookmarks.loadStorage();
        window.plugin.bookmarks.refreshBkmrks();
        window.runHooks('pluginBkmrksEdit', { "target": "all", "action": "reset" });
    };
    window.plugin.bookmarkUnderDraw.resetOpt = function () {
        window.plugin.bookmarkUnderDraw.storage.folderId = window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID;
        window.plugin.bookmarkUnderDraw.storage.sortCode = window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE;
        window.plugin.bookmarkUnderDraw.storage.notLoadedPortalName = window.plugin.bookmarkUnderDraw.DEFAULT_NOT_LOADED_PORTAL_NAME;
        window.plugin.bookmarkUnderDraw.storage.bookmarkUnknownPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_UNKNOWN_PORTAL;
        window.plugin.bookmarkUnderDraw.storage.bookmarkHiddenPortal = window.plugin.bookmarkUnderDraw.DEFAULT_BOOKMARK_HIDDEN_PORTAL;

        window.plugin.bookmarkUnderDraw.saveStorage();
        window.plugin.bookmarkUnderDraw.openOptDialog();
    }

    window.plugin.bookmarkUnderDraw.saveOpt = function () {
        var options = {};
        options.folderId = $('#bookmarkUnderDraw-folderId').val();
        options.notLoadedPortalName = $('#bookmarkUnderDraw-notLoadedPortalName').val();
        options.bookmarkUnknownPortal = $('#bookmarkUnderDraw-bookmarkUnknownPortal').is(":checked");
        options.bookmarkHiddenPortal = $('#bookmarkUnderDraw-bookmarkHiddenPortal').is(":checked");
        options.sortCode = $('#bookmarkUnderDraw-sortCode').val();
        var sort = window.plugin.bookmarkUnderDraw.sorts[options.sortCode];
        if (typeof sort == 'undefined') {
            options.sortCode = window.plugin.bookmarkUnderDraw.DEFAULT_SORT_CODE;
            sort = window.plugin.bookmarkUnderDraw.sorts[options.sortCode];
        }
        options.sort = sort;

        window.plugin.bookmarkUnderDraw.storage.folderId = options.folderId;
        window.plugin.bookmarkUnderDraw.storage.sortCode = options.sortCode;
        window.plugin.bookmarkUnderDraw.storage.notLoadedPortalName = options.notLoadedPortalName;
        window.plugin.bookmarkUnderDraw.storage.bookmarkUnknownPortal = options.bookmarkUnknownPortal;
        window.plugin.bookmarkUnderDraw.storage.bookmarkHiddenPortal = options.bookmarkHiddenPortal;
        window.plugin.bookmarkUnderDraw.saveStorage();

        return options;
    }
    window.plugin.bookmarkUnderDraw.saveOptAndRemoveBookmarks = function () {
        var options = window.plugin.bookmarkUnderDraw.saveOpt();
        options.action = window.plugin.bookmarkUnderDraw.actions.REMOVE;

        window.plugin.bookmarkUnderDraw.doTheJob(options);
    }
    window.plugin.bookmarkUnderDraw.saveOptAndBookmarkPortals = function () {
        var options = window.plugin.bookmarkUnderDraw.saveOpt();
        options.action = window.plugin.bookmarkUnderDraw.actions.ADD;

        window.plugin.bookmarkUnderDraw.doTheJob(options);
    }

    window.plugin.bookmarkUnderDraw.openOptDialog = function () {
        var html =
		'<div>' +
			'<table>';
        html +=
			'<tr>' +
				'<td>' +
					'Send alert even if portal name is not loaded' +
				'</td>' +
				'<td>' +
					'<input id="bookmarkUnderDraw-bookmarkUnknownPortal" type="checkbox" ' +
						(window.plugin.bookmarkUnderDraw.storage.bookmarkUnknownPortal ? 'checked="checked" ' : '') +
						'/>' +
                '</td>' +
			'</tr>';
        html +=
			'<tr>' +
				'<td>' +
					'Send alert even if portal is hidden' +
				'</td>' +
				'<td>' +
					'<input id="bookmarkUnderDraw-bookmarkHiddenPortal" type="checkbox" ' +
						(window.plugin.bookmarkUnderDraw.storage.bookmarkHiddenPortal ? 'checked="checked" ' : '') +
						'/>' +
                '</td>' +
			'</tr>';
        html +=
			'<tr>' +
				'<td>' +
                    'Folder :' +
                '</td>' +
				'<td>';
        html += '<select id="bookmarkUnderDraw-folderId">';
        //loop on bookmark folders
        for (folderId in window.plugin.bookmarks.bkmrksObj['portals']) {
            var folder = window.plugin.bookmarks.bkmrksObj['portals'][folderId];
            var folderName = folderId == window.plugin.bookmarks.KEY_OTHER_BKMRK ? 'Root' : folder.label;
            html += '<option value="' + folderId +
                            '" ' + (window.plugin.bookmarkUnderDraw.storage.folderId == folderId ? 'selected="selected"' : '') +
                            '>' + folderName + '</option>';
        }
        html += '</select>';
        html += '</td>' +
			'</tr>';
        html +=
			'<tr>' +
				'<td>' +
                    'Sort :' +
                '</td>' +
				'<td>';
        html += '<select id="bookmarkUnderDraw-sortCode">';
        for (var i = 0; i < window.plugin.bookmarkUnderDraw.sortedSorts.length; i++) {
            var sort = window.plugin.bookmarkUnderDraw.sortedSorts[i];
            html += '<option value="' + sort.code +
                            '" ' + (window.plugin.bookmarkUnderDraw.storage.sortCode == sort.code ? 'selected="selected"' : '') +
                            '>' + sort.name + '</option>';
        }
        html += '</select>';
        html += '</td>' +
			'</tr>';
        html +=
			'<tr>' +
				'<td>' +
                    'Missing portal name :' +
                '</td>' +
				'<td>' +
					'<input id="bookmarkUnderDraw-notLoadedPortalName" type="text" ' +
                        'value="' + window.plugin.bookmarkUnderDraw.storage.notLoadedPortalName + '" />' +
				'</td>' +
			'</tr>';

        html +=
			'</table>' +
		'</div>'
        ;
        var d = dialog({
            html: html,
            id: 'bookmarkUnderDraw_opt',
            title: 'Bookmark under draw',
            width: 'auto',
            buttons: [
                {
                    text: 'Reset options',
                    title: 'Reset Bookmark under draw preferences (this dialog)',
                    click: function () {
                        window.plugin.bookmarkUnderDraw.resetOpt();
                    }
                },
                {
                    text: 'Clear drawn items',
                    click: function () {
                        window.plugin.bookmarkUnderDraw.resetDraw();
                    }
                },
                {
                    text: 'Clear all bookmarks',
                    click: function () {
                        window.plugin.bookmarkUnderDraw.resetBookmarks();
                    }
                },
                {
                    text: 'Remove under draw',
                    title: 'Remove bookmarks found under draw or search result',
                    click: function () {
                        window.plugin.bookmarkUnderDraw.saveOptAndRemoveBookmarks();
                    }
                },
                {
                    text: 'Add under draw',
                    title: 'Add bookmarks found under draw or search result',
                    click: function () {
                        window.plugin.bookmarkUnderDraw.saveOptAndBookmarkPortals();
                    }
                }
                ]
        });
        var dialogId = d.data('id'); //dialog-bookmarkUnderDraw_opt
        $("#" + dialogId + "").parent().find(".ui-dialog-buttonpane .ui-button .ui-button-text:contains('OK')").parent().hide(); //remove the default OK button
    }

    window.plugin.bookmarkUnderDraw.optClicked = function () {
        window.plugin.bookmarkUnderDraw.openOptDialog();
    };

    // init setup
    window.plugin.bookmarkUnderDraw.setup = function () {
        console.log('Bookmarks Under Draw loading.');
        //        if (!window.plugin.bookmarks) {
        //            console.log('ERROR : Bookmarks plugin required');
        //            return false;
        //        }
        //        if (!window.plugin.drawTools) {
        //            console.log('ERROR : Draw tools plugin required');
        //            return false;
        //        }
        if (window.plugin.bookmarks) {
            window.plugin.bookmarkUnderDraw.DEFAULT_FOLDER_ID = window.plugin.bookmarks.KEY_OTHER_BKMRK;
        }

        window.plugin.bookmarkUnderDraw.loadStorage();

        window.plugin.bookmarkUnderDraw.addButtons();
        console.log('Bookmarks Under Draw loaded.');
    };

    // toolbox menu
    window.plugin.bookmarkUnderDraw.addButtons = function () {
        var css = '.leaflet-control-bookmark-under-draw-bookmark{background-image:url(' + window.plugin.bookmarkUnderDraw.bookmarkIcon + ')!important; background-repeat:no-repeat;}'
            + '.leaflet-control-bookmark-under-draw-messageBox{background-color: rgba(255, 255, 255, 0.6); display: none; height: 24px; left: 30px; line-height: 24px; margin-left: 15px; margin-top: -12px; padding: 0 10px; position: absolute; top: 50%; white-space: nowrap; width: auto; }'
            + '.leaflet-control-bookmark-under-draw a.active .leaflet-control-bookmark-under-draw-messageBox{ display: block;} '
            + '.leaflet-control-bookmark-under-draw-messageBox:before { border-color: transparent rgba(255, 255, 255, 0.6); border-style: solid; border-width: 12px 12px 12px 0; content: ""; display: block; height: 0; left: -12px; position: absolute; width: 0; } ';

        $('head').append('<style>' + css + '</style>');

        var leafletLeft = $(".leaflet-top.leaflet-left", window.map.getContainer());

        var container = document.createElement("div");
        container.className = "leaflet-control-bookmark-under-draw leaflet-bar leaflet-control";
        leafletLeft.append(container);

        var button = document.createElement("a");
        button.className = "leaflet-bar-part leaflet-control-bookmark-under-draw-bookmark";
        //button.addEventListener("click", window.plugin.bookmarkUnderDraw.doTheJob, false);
        button.addEventListener("click", window.plugin.bookmarkUnderDraw.optClicked, false);
        button.title = 'Bookmark portals';
        container.appendChild(button);

        var messageBox = document.createElement("div");
        messageBox.className = "leaflet-control-bookmark-under-draw-messageBox";
        messageBox.addEventListener("click", window.plugin.bookmarkUnderDraw.messageBoxClicked, false);
        button.appendChild(messageBox);

        plugin.bookmarkUnderDraw.button = button;
        plugin.bookmarkUnderDraw.messageBox = messageBox;
        plugin.bookmarkUnderDraw.container = container;

        //0.1.10: removed options menu, replaced by dialog before bookmarking
        //add options menu
        //$('#toolbox').append('<a onclick="window.plugin.bookmarkUnderDraw.optClicked();return false;">Bookmark under draw Opt</a>');
    };

    // runrun
    var setup = window.plugin.bookmarkUnderDraw.setup;

    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') {
        setup();
    }

    // PLUGIN END ////////////////////////////////////////////////////////    
} // WRAPPER END ////////////////////////////////////////////////////////    

var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
