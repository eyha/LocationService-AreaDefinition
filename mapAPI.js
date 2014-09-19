var map, mouseState;
//defines the current location
var loc = 0;
//Defines the bounds for the different locations
var areas = [
	[52.987, -1.166, 52.994, -1.149],
	[52.940, -1.189, 52.947, -1.180]
];
//saves/loads shape locations to/from the database
var shapes = 
[
	[
		[52.99140795465868, -1.1580276489257812],
		[52.99089130680322, -1.1563968658447266],
		[52.98949632672248, -1.1584138870239258],
		[52.990219655351474, -1.1606025695800781]
	],
	[
		[52.99042976277312, -1.154637336730957],
		[52.98921215858968, -1.1554527282714844]
	],
	[
		[52.9885404810256, -1.1588001251220703]
	]
];
//used during the process of creating shapes
var currentShape = [];
var corners;
var line;
//holds the areas that have been defined
var markers, polygons, circles;
//used in editing shapes
var currentSelected, currentMarkerPosition, currentMarker;

//Initiates the map
var initMap = function() 
{
	map = L.map('map');
	//Current state affect how mouse clicks on the map work
	mouseState = 0;

	//setting attributes for the map
	var url = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var attributes = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
	var osm = new L.tileLayer(url, 
	{
		minZoom: 15, maxZoom: 19, 
		attribution: attributes
	});
	
	//creating bounds for the map
	var southwest = L.latLng(areas[loc][0], areas[loc][1]);
	var northeast = L.latLng(areas[loc][2], areas[loc][3]);
	var bounds = L.latLngBounds(southwest, northeast);
	
	//defining the various groups
	corners = L.featureGroup();
	markers = L.layerGroup();
	polygons = L.layerGroup();
	circles = L.layerGroup();

	// map.setView(new L.LatLng(52.9912, -1.1579), 16);
	map.addLayer(osm);
	map.fitBounds(bounds);
	map.setMaxBounds(bounds);
	map.on('click', mapClick);
	corners.addTo(map);
	polygons.addTo(map);
	markers.addTo(map);
	circles.addTo(map);

	//Creates shapes based on loaded data
	parseLoadData();
}

//Creates a marker at the point, either to represent part of a polygon/circle or as a point of its own
var addPoint = function(location) {
	var point = new L.latLng(location.lat, location.lng);
	var marker = new L.marker(location, {draggable: true});

	//functions for markers
	//Only add the cutPoint function when you are defining a polygon
	if(mouseState == 2 || mouseState == 1)
		marker.on('click', cutPoint);
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);

	//If part of a polygon or circle, add it to the corners layerGroup instead
	if(mouseState !== 4)
		corners.addLayer(marker);
	else
		markers.addLayer(marker);
	//add point to array of polygon's current corners
	currentShape.push(point);
}

//Draws a line between all of the current points in the current shape being defined
var drawLine = function() {
	//removes any existing line
	if(line !== undefined)
		map.removeLayer(line);
	line = new L.Polyline(currentShape, 
	{
		color: 'red',
		weight: 3,
		opacity: 0.5,
		smoothfactor: 1
	});
	line.addTo(map);
}

//draws a circle from the origin, with radius equal to the distance between the origin and the other given point
var drawCircle = function(point, origin) {
	var distance = point.distanceTo(origin);
	var circle = L.circle(origin, distance);
	//Gives the circle a function to select it
	circle.on('click', selectCircle);
	circles.addLayer(circle);
	//If the circle is being created by the user, select it
	if(mouseState == 6)
	{
		addPoint(point);
		circle.setStyle({fillColor: 'yellow'});
		currentSelected = circle._leaflet_id;
	}
}

var mapClick = function(e) {
	switch(mouseState){
	case 0:
		break;
	//Point adding mode
	case 1:
		addPoint(e.latlng);
		mouseState = 2;
		break;
	//In polygon defining mode.
	case 2:
		addPoint(e.latlng);
		//Drawing a line between points selected
		drawLine();
		break;
	//In polygon selected mode
	case 3:
		//Deselecting the current selected polygon
		corners.clearLayers();
		polygons.getLayer(currentSelected).setStyle({fillColor: 'blue'});
		currentSelected = undefined;
		mouseState = 0;
		break;
	//Marker adding mode
	case 4:
		addPoint(e.latlng);
		currentShape = [];
		mouseState = 0;
		break;
	//Defining the start point of a circle mode
	case 5:
		addPoint(e.latlng);
		mouseState = 6;
		break;
	//Defining the radius of the circle mode
	case 6:
		drawCircle(e.latlng, currentShape[0]);
		mouseState = 7;
		break;
	//Deselecting current selected circle
	case 7:
		corners.clearLayers();
		circles.getLayer(currentSelected).setStyle({fillColor: 'blue'});
		currentSelected = undefined;
		mouseState = 0;
		break;
	default:
		break;
	}
	return;
}

//Creates a polygon based on the current points added
var cutPoint = function(e) {
	switch(mouseState){
	//If the polygon was loaded from file
	case 0:
		var polygon = L.polygon(e)
		currentShape = [];
		polygon.on('click', selectPolygon);
		polygons.addLayer(polygon);
		break;
	case 1:
		mouseState = 0;
		break;
	//During shape defining mode when a previous point is clicked
	case 2:
		var polygon = L.polygon(currentShape,
		{
			fillColor: 'yellow'
		});
		currentShape = [];
		map.removeLayer(line);
		polygon.on('click', selectPolygon);
		polygon.addTo(polygons);

		//redraw the markers because their positions will be slightly out
		corners.clearLayers();
		var vertices = polygon.getLatLngs();
		for(var v = 0; v < vertices.length; v++)
		{
			var vertice = new L.marker(vertices[v], {draggable: true});
			vertice.on('dragstart', recordPosition);
			vertice.on('dragend', setPosition);
			corners.addLayer(vertice);
		}

		currentSelected = polygon._leaflet_id;
		mouseState = 3;
		break;
	default:
		break;
	}
}

//Called when the draw shape button is clicked
var definePolygon = function() {
	//Empties the current shape if it is not finished
	if(currentShape !== [])
		currentShape = [];
	deselect();
	mouseState = 1;
}

//Called when the draw point button is clicked
var definePoint = function() {
	if(currentShape !== [])
		currentShape = [];
	deselect();
	mouseState = 4;
}

//Called when the draw circle button is clicked
var defineCircle = function() {
	if(currentShape !== [])
		currentShape = [];
	deselect();
	mouseState = 5;
}

//Deselects any currently selected shapes
var deselect = function() {
	if(currentSelected !== undefined)
	{
		corners.clearLayers();
		polygons.eachLayer(function (shape) {
			shape.setStyle({fillColor: 'blue'});
		});
		circles.eachLayer(function (shape) {
			shape.setStyle({fillColor: 'blue'});
		});
		currentSelected = undefined;
	}
}

//Called whenever a polygon is clicked
var selectPolygon = function(polygon) {
	//reset if previous shape had been selected
	deselect();
	polygon.target.setStyle({fillColor: 'yellow'});
	//Create a marker at each one of the polygon's points
	var p, marker;
	var position = polygon.target._latlngs;
	for(p = 0; p < position.length; p++)
	{
		marker = new L.marker(position[p], {draggable: true});
		marker.on('dragstart', recordPosition);
		marker.on('dragend', setPosition);
		corners.addLayer(marker);
	}
	currentSelected = polygon.target._leaflet_id;
	mouseState = 3;
}

//Called whenever a circle is clicked
var selectCircle = function(circle) {
	//reset if previous shape had been selected
	deselect();
	circle.target.setStyle({fillColor: 'yellow'});
	//Create a marker at the center of the circle
	var position = circle.target._latlng;
	var marker = new L.marker(position, {draggable: true});
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);
	corners.addLayer(marker);

	//create a marker at the top of the circle to modify radius size
	var newCentre = marker.getLatLng();
	var distance = circle.target.getRadius();
	var newLatLng = new L.latLng(newCentre.lat + getdistCoord(distance), newCentre.lng);
	marker = new L.marker(newLatLng, {draggable: true});
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);
	corners.addLayer(marker);

	currentSelected = circle.target._leaflet_id;
	mouseState = 7;
}

//called whenever a marker starts to be dragged
var recordPosition = function(element) {
	switch(mouseState)
	{
	//Remembers which marker in the line was moved to remember how to redraw the line
	case 2:
		var m;
		var marks = corners.getLayers();
		for(m = 0; m < marks.length; m++)
		{
			if(marks[m].getLatLng() == element.target.getLatLng())
			{
				currentMarker = m;
				break;
			}
		}
		break;
	//Remembers the old position of the moved marker to determine which latLng to change
	case 3:
		currentMarkerPosition = element.target.getLatLng();
		break;
	default:
		break;
	}
}

var setPosition = function(element) {
	switch(mouseState)
	{	
	//Drawing lines mode
	case 2:
		//Replaces the part of the polyline that has been moved and changes its value
		var ends = []
		corners.eachLayer(function (corner) {
			ends.push(corner.getLatLng());
		});
		ends[currentMarker] = element.target.getLatLng();
		line.setLatLngs(ends);
		break;
	//Shape selected
	case 3:
		//Redraws the shape to match it's new coordinates
		var polygon = polygons.getLayer(currentSelected);
		var points = polygon.getLatLngs();
		var p;
		for(p = 0; p < points.length; p++)
		{
			if(points[p] == currentMarkerPosition)
			{
				points[p] = element.target.getLatLng();
				break;
			}
		}
		polygon.setLatLngs(points);
		break;
	case 7:
		var circle = circles.getLayer(currentSelected);
		//If the moved marker represented the centre of the circle, move the entire circle
		if(corners.getLayers()[0]._leaflet_id == element.target._leaflet_id)
		{
			circle.setLatLng(element.target.getLatLng());
			//find the new centre and reposition the resizing marker above it
			var newCentre = element.target.getLatLng();
			var distance = circle.getRadius();
			var newLatLng = new L.latLng(newCentre.lat + getdistCoord(distance), newCentre.lng);
			corners.getLayers()[1].setLatLng(newLatLng);
		}
		//If the resizing marker was moved
		else
		{
			//calculate the distance beween the centre and its new position and use that to set the radius
			var centre = corners.getLayers()[0];
			var distance = element.target.getLatLng().distanceTo(centre.getLatLng());
			circle.setRadius(distance);
		}
		break;
	default:
		break;
	}
}

//Used to convert between meters and pixels for the circles
var getdistCoord = function (distance){
	const RAD = 0.000008998719243599958;
	return distance * RAD;
}

//Saves the data to the database - currently unfinished
var saveData = function () {
	//Creates GeoJSONs for each one of the important layerGroups
	var markerJsons = [];
	markers.eachLayer(function (feature) {
		markerJsons.push(feature.toGeoJSON());
	});
	//Circle GeoJSON does not store the radius by default - need to fix this
	var circleJsons = [];
	circles.eachLayer(function (feature) {
		circleJsons.push(feature.toGeoJSON());
	});
	var polygonJsons = [];
	polygons.eachLayer(function (feature) {
		polygonJsons.push(feature.toGeoJSON());
	});
	//Calls jQuery's AJAX to send the data to the server
	$.ajax({
		url: 'localhost',
		type: 'post',
		data: JSON.stringify(markerJson),
		contentType: 'application/json',
		dataType: 'json',
		success: function(data, status)
		{
			//Should return the user's randomly generated id on success if they don't already have one
		}
	});
}

//Parses loaded data into a shapes on the map. Currently uses shapes, but will use GeoJSONs loaded from the database in future
var parseLoadData = function() {
/*var parseLoadData = function(type, jSON) {
	var parsedData = jQuery.parseJSON(jSON);
	if(type == 'marker')
	{
		var marker = L.geoJson(parsedData, {draggable: true});
		marker.on('dragstart', recordPosition);
		marker.on('dragend', setPosition);
		markers.addLayer(marker);
	}
	else if(type == 'circle')
	{
		var circle = L.geoJson(parsedData);
		circle.on('click', selectCircle);
		circles.addLayer(circle);
	}
	else if(type == 'polygon')
	{
		var polygon = L.geoJson(parsedData);
		polygon.on('click', selectPolygon);
		polygons.addLayer(polygon);
	}*/
	

	for(var s = 0; s < shapes.length; s++)
	{
		switch(shapes[s].length)
		{
			//If one point, it is a marker
			case 1:
				mouseState = 4;
				addPoint(shapes[s][0]);
				currentShape = [];
				mouseState = 0;
				break;
			//Two is a circle
			case 2:
				var origin = new L.latLng(shapes[s][0]);
				var point = new L.latLng(shapes[s][1]);
				drawCircle(point, origin);
				currentShape = [];
				break;
			//Anything else is a polygon
			default:
				cutPoint(shapes[s]);
				break;
		}
	}
}