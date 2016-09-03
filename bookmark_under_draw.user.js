// ==UserScript==
// @id             iitc-plugin-bookmarkUnderDraw
// @name           IITC plugin: Bookmark portals under draw or search result.
// @author         Jormund
// @category       Controls
// @version        0.1.5.20160903.2300
// @description    [2016-09-03-2300] Bookmark portals under draw or search result.
// @downloadURL    https://github.com/Jormund/bookmark_under_draw/raw/master/bookmark_under_draw.user.js
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
    if (typeof window.plugin !== 'function') window.plugin = function () { };

    // PLUGIN START ////////////////////////////////////////////////////////
    window.plugin.bookmarkUnderDraw = function () { };
    window.plugin.bookmarkUnderDraw.datas = {};

    window.plugin.bookmarkUnderDraw.KEY_STORAGE_DRAW_TOOLS = 'plugin-draw-tools-layer';

    //star icon
    //    window.plugin.bookmarkUnderDraw.ico = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">'
    //	                                            + '<g style="fill: #FACA00; fill-opacity: 1; stroke: none;">'
    //                                                    + '<path d="M 15,1 18,12 29,12 20,18 24,28 15,21 6,28 10,18 1,12 12,12 Z" />'
    //	                                            + '</g>'
    //                                            + '</svg>';//utf-8 svg not working for reason unknown, using base64 instead
    window.plugin.bookmarkUnderDraw.bookmarkIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+DQoJPGcgc3R5bGU9ImZpbGw6ICNGQUNBMDA7IGZpbGwtb3BhY2l0eTogMTsgc3Ryb2tlOiBub25lOyI+DQogICAgPHBhdGggZD0iTSAxNSwxIDE4LDEyIDI5LDEyIDIwLDE4IDI0LDI4IDE1LDIxIDYsMjggMTAsMTggMSwxMiAxMiwxMiBaIiAvPg0KCTwvZz4NCjwvc3ZnPg==";

    // STORAGE //////////////////////////////////////////////////////////
    window.plugin.bookmarkUnderDraw.loadStorage = function (key, store) {
        if (localStorage[store]) {
            window.plugin.bookmarkUnderDraw.datas[key] = JSON.parse(localStorage[store]);
        } else {
            window.plugin.bookmarkUnderDraw.datas[key] = '';
        }
        if (window.plugin.bookmarkUnderDraw.datas[key] == '') {
            return false;
        }
        return true;
    };
    //    window.plugin.bookmarkUnderDraw.testClicked = function () {
    //        try {
    //            if (window.search.lastSearch &&
    //            window.search.lastSearch.selectedResult &&
    //            window.search.lastSearch.selectedResult.layer) {
    //                window.search.lastSearch.selectedResult.layer.eachLayer(function (l) {
    //                    if (l instanceof L.MultiPolygon ||
    //                                l instanceof L.Polygon) {
    //                        var searchPolyline = {
    //                            type: 'polygon',
    //                            latLngs: l.toGeoJSON().geometry.coordinates
    //                        };
    //                        console.log(searchPolyline);
    //                    }
    //                });
    //            }
    //        }
    //        catch (err) {
    //            alert(err.stack);
    //        }
    //    };

    // FUNCTIONS ////////////////////////////////////////////////////////
    window.plugin.bookmarkUnderDraw.doTheJob = function () {
        var loadDraws = window.plugin.bookmarkUnderDraw.loadStorage('draw', window.plugin.bookmarkUnderDraw.KEY_STORAGE_DRAW_TOOLS);

        if (typeof window.plugin.bookmarkUnderDraw.datas.draw == 'undefined'
            || window.plugin.bookmarkUnderDraw.datas.draw == '')
            window.plugin.bookmarkUnderDraw.datas.draw = [];

        //if search, add it to job
        if (window.search.lastSearch &&
            window.search.lastSearch.selectedResult &&
            window.search.lastSearch.selectedResult.layer) {

            window.search.lastSearch.selectedResult.layer.eachLayer(function (l) {
                if (l instanceof L.MultiPolygon ||
                            l instanceof L.Polygon) {
                    var latLngArr = l.toGeoJSON().geometry.coordinates[0];
                    var latLngs = [];
                    $.each(latLngArr, function (index, latlng) {
                        var obj = { lng: latlng[0], lat: latlng[1] };
                        latLngs.push(obj);
                    });
                    var searchPolyline = {
                        type: 'polygon',
                        latLngs: latLngs
                    }
                    window.plugin.bookmarkUnderDraw.datas.draw.push(searchPolyline);
                }
            });
        }

        if (window.plugin.bookmarkUnderDraw.datas.draw.length == 0) {
            var img = '<img style="vertical-align:middle;" src="data:image/png;base64,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"/>';
            alert(img + ' A form (polygon or circle) must be drawn');
            return false;
        }



        var bookmarkUnderDraw = function () {
            var t = this;
            this._w_ = {}; //work variables
            this.bookmarkedPortals = {}; //bookmarks guids
            //this.portalUnderDrawCount = 0;//unused
            this.distinctPortalUnderDrawCount = 0;
            this.bookmarkAddCount = 0;
			this.wrongDataCount = 0;
			this.alreadyExistCount = 0;
			this.foundTwiceCount = 0;
            return t;
        };
        bookmarkUnderDraw.prototype.initialize = function (datas) {
            var t = this;
            t._w_ = {
                draw_datas: datas,
                draw_coords: { 'lat': [], 'lng': [] },
                portalsUnderDraw: []//guids of portals under draw
            };
        };

        bookmarkUnderDraw.prototype.run = function () {
            var t = this;
            $.each(window.plugin.bookmarkUnderDraw.datas.draw, function (id, formdatas) {
                t.initialize(formdatas);
                switch (t._w_.draw_datas.type) {
                    case 'circle':
                        if (!t.underCircle()) {
                            return;
                        }
                        t.bookmarkPortals();
                        break;
                    case 'polygon':
                        if (!t.underPoligon()) {
                            return;
                        }
                        t.bookmarkPortals();
                        break;
                    default:
                        console.log('Bookmark Under Draw ERROR : invalid draw type (' + t._w_.draw_datas.type + ')');
                        return;
                        break;
                };
            });
            t.render();
        };
        bookmarkUnderDraw.prototype.latlngPoligon = function () {
            var t = this;
            $.each(t._w_.draw_datas.latLngs, function (id, point) {
                t._w_.draw_coords.lat.push(point.lat);
                t._w_.draw_coords.lng.push(point.lng);
            });
        };
        bookmarkUnderDraw.prototype.latlngCircle = function () {
            var t = this;
            t._w_.draw_coords.lat.push(t._w_.draw_datas.latLng.lat);
            t._w_.draw_coords.lng.push(t._w_.draw_datas.latLng.lng);
        };
        bookmarkUnderDraw.prototype.underPoligon = function () {
            var t = this;
            var found = false;
            t.latlngPoligon();
            $.each(window.portals, function (guid, r) {
                var i, j;
                var lat_i, lat_j, lng_i, lng_j;
                var nodeIn = false;
                var posX = window.portals[guid].getLatLng()['lng'];
                var posY = window.portals[guid].getLatLng()['lat'];
                var nbpoints = t._w_.draw_coords.lat.length;

                for (i = 0, j = 1; i < nbpoints; i++, j++) {
                    if (j == nbpoints) {
                        j = 0;
                    }
                    lat_i = t._w_.draw_coords.lat[i];
                    lat_j = t._w_.draw_coords.lat[j];
                    lng_i = t._w_.draw_coords.lng[i];
                    lng_j = t._w_.draw_coords.lng[j];

                    if (((lat_i < posY) && (lat_j >= posY)) ||
                        ((lat_j < posY) && (lat_i >= posY)) &&
                        ((lng_i <= posX) || (lng_j <= posX))) {
                        if (lng_i + (posY - lat_i) / (lat_j - lat_i) * (lng_j - lng_i) < posX) {
                            nodeIn = !nodeIn;
                        }
                    }
                }

                if (nodeIn) {
                    t._w_.portalsUnderDraw.push(guid);
                    found = true;
                }
            });
            return found;
        };
        bookmarkUnderDraw.prototype.underCircle = function () {
            var t = this;
            var found = false;
            t.latlngCircle();
            var circle = L.circle([t._w_.draw_coords.lat[0], t._w_.draw_coords.lng[0]], t._w_.draw_datas.radius, '');
            var circlebounds = circle.getBounds();
            var circlecenter = circlebounds.getCenter();
            $.each(window.portals, function (guid, r) {
                if (circlecenter.distanceTo(window.portals[guid].getLatLng()) <= t._w_.draw_datas.radius) {
                    t._w_.portalsUnderDraw.push(guid);
                    found = true;
                }
            });
            return found;
        };
		//used instead of bookmark plugin because the original code makes only 99 different IDs in the same millisecond
		bookmarkUnderDraw.prototype.generateID = function() {
			var d = new Date();
			var ID = Math.floor(Math.random()*1e10)+1;
			//var ID = d.getTime()+(Math.floor(Math.random()*99)+1);//id1 472 936 881 241
			ID = 'id'+ID.toString();
			return ID;
		  }
        bookmarkUnderDraw.prototype.bookmarkPortals = function () {
            var t = this;
            //t.portalUnderDrawCount += t._w_.portalsUnderDraw.length;//unused
            $.each(t._w_.portalsUnderDraw, function (index, guid) {
                var portal = window.portals[guid];
                var ll = portal.getLatLng();
                var portalName = portal.options.data.title;
                if (typeof t.bookmarkedPortals[guid] == 'undefined') {//we check if portal was added by our loop, can happen if draws overlap
                    var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
                    if (bkmrkData) {
                        //bookmark exists
						t.alreadyExistCount++;
                    }
                    else {
                        if (typeof portalName == 'string') {//add portal only if name is loaded
                            //window.plugin.bookmarks.addPortalBookmark(guid, ll.lat + ',' + ll.lng, portalName); //actually bookmarks the portal
                            //02/09/2016: only add the bookmark to JS obj to make it faster
                            var ID = t.generateID();
                            // Add bookmark in the localStorage
                            var latlng = ll.lat + ',' + ll.lng;
                            var label = portalName;

                            window.plugin.bookmarks.bkmrksObj['portals'][window.plugin.bookmarks.KEY_OTHER_BKMRK]['bkmrk'][ID] = { "guid": guid, "latlng": latlng, "label": label };
                            //console.log('bookmarkUnderDraw: added portal ' + ID);
                            t.bookmarkAddCount++;
                        }
						else {
							t.wrongDataCount++;
						}
                    }
                    t.bookmarkedPortals[guid] = {}; //keep result for the count and the next checks
                    t.distinctPortalUnderDrawCount++;
                }
                else {
                    //bookmark exists
					t.foundTwiceCount++;
                }
            });
            //02/09/2016: only refresh once
            window.plugin.bookmarks.saveStorage();
            window.plugin.bookmarks.refreshBkmrks();
            //window.runHooks('pluginBkmrksEdit', { "target": "portal", "action": "add", "id": ID, "guid": guid });//can't run
            window.runHooks('pluginBkmrksEdit', { "target": "all", "action": "import" });
            console.log('bookmarkUnderDraw: refreshed bookmarks');
        };

        bookmarkUnderDraw.prototype.render = function () {
            var t = this;

            var message = '';
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
			if(t.alreadyExistCount > 0)
				message += ', '+t.alreadyExistCount+' old';			
			if(t.wrongDataCount > 0)
				message += ', '+t.wrongDataCount+' not loaded';

            var zoomLevel = $('#loadlevel').html();
            if (zoomLevel != 'all') {
                message += ' <span style="color:orange">Portals might be missing. Zoom level :<b>' + zoomLevel + '<b></span>';
            }

            var btn = window.plugin.bookmarkUnderDraw.button;
            var messageBox = window.plugin.bookmarkUnderDraw.messageBox;
            btn.classList.add("active");
            setTimeout(function () {
                messageBox.innerHTML = message;
            }, 10); //setTimeout copied from layer-count, don't know why


            //            if ($('#loadlevel').html() != 'all') {
            //                var html = '<div class="bookmark-under-draw-box">';
            //                html += "<div style='margin:5px; padding-top:10px; color:red'>"
            //                + "<strong>Your attention please ! </strong><br />"
            //                + "<font style='color:white'>Zoom level is actually <span style='color:yellow;'><b>" + $('#loadlevel').html() + "</b></span>. "
            //                + "Some portals might not be visible and cannot be bookmarked. Please adjust your zoom level and run Bookmarks Under Draw again.</font>"
            //                + "</div>";
            //                html += '</div>';

            //                dialog({
            //                    width:'600px',
            //                    html: html,
            //                    id: 'plugin-bookmarkUnderDraw-box',
            //                    dialogClass: '',
            //                    title: 'Bookmarks Under Draw - results',
            //                });
            //            }
        };

        //doTheJob
        var ap = new bookmarkUnderDraw();
        ap.run();
    };

    window.plugin.bookmarkUnderDraw.messageBoxClicked = function (evt) {
        //console.log('window.plugin.bookmarkUnderDraw.messageBoxClicked');
        var btn = window.plugin.bookmarkUnderDraw.button;
        var messageBox = window.plugin.bookmarkUnderDraw.messageBox;
        btn.classList.remove("active");
        messageBox.textContent = "";
        evt.stopPropagation();
    }

    // init setup
    window.plugin.bookmarkUnderDraw.setup = function () {
        console.log('Bookmarks Under Draw loading.');
        if (!window.plugin.bookmarks) {
            console.log('ERROR : Bookmarks plugin required');
            return false;
        }
        if (!window.plugin.drawTools) {
            console.log('ERROR : Draw tools plugin required');
            return false;
        }
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
        button.addEventListener("click", window.plugin.bookmarkUnderDraw.doTheJob, false);
        button.title = 'Bookmark portals';
        container.appendChild(button);

        var messageBox = document.createElement("div");
        messageBox.className = "leaflet-control-bookmark-under-draw-messageBox";
        messageBox.addEventListener("click", window.plugin.bookmarkUnderDraw.messageBoxClicked, false);
        button.appendChild(messageBox);

        //        var buttonTest = document.createElement("a");
        //        buttonTest.className = "leaflet-bar-part leaflet-control-bookmark-under-draw-bookmark";
        //        buttonTest.addEventListener("click", window.plugin.bookmarkUnderDraw.testClicked, false);
        //        buttonTest.title = 'Bookmark portals';
        //        container.appendChild(buttonTest);
        //        var tooltipContainer = document.createElement("div");
        //	    tooltipContainer.className = "leaflet-control-bookmark-under-draw-messageBox";
        //        var messageBox = document.createElement("a");
        //        messageBox.addEventListener("click", window.plugin.bookmarkUnderDraw.messageBoxClicked, false);
        //	    button.appendChild(tooltipContainer);
        //        tooltipContainer.appendChild(messageBox);

        plugin.bookmarkUnderDraw.button = button;
        plugin.bookmarkUnderDraw.messageBox = messageBox;
        plugin.bookmarkUnderDraw.container = container;
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
