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

	for(var s = 0; s < shapes.length; s++)
	{
		switch(shapes[s].length)
		{
			case 1:
				mouseState = 4;
				addPoint(shapes[s][0]);
				currentShape = [];
				mouseState = 0;
				break;
			case 2:
				var origin = new L.latLng(shapes[s][0]);
				var point = new L.latLng(shapes[s][1]);
				drawCircle(point, origin);
				currentShape = [];
				break;
			default:
				cutPoint(shapes[s]);
				break;
		}
	}
}

var addPoint = function(location) {
	var point = new L.latLng(location.lat, location.lng);
	var marker = new L.marker(location, {draggable: true});

	//functions for markers
	if(mouseState == 2)
		marker.on('click', cutPoint);
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);

	if(mouseState !== 4)
		corners.addLayer(marker);
	else
		markers.addLayer(marker);
	//add point to array of polygon's current corners
	currentShape.push(point);
}

var drawLine = function() {
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

var drawCircle = function(point, origin) {
	var distance = point.distanceTo(origin);
	var circle = L.circle(origin, distance);
	circle.on('click', selectCircle);
	circles.addLayer(circle);
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
	//Adding a point
	case 1:
		addPoint(e.latlng);
		mouseState = 2;
		break;
	//In shape polygon defining mode.
	case 2:
		//Drawing a line between point selected and previous one
		addPoint(e.latlng);
		drawLine();
		break;
	case 3:
		//Deselecting the current selected polygon
		corners.clearLayers();
		polygons.getLayer(currentSelected).setStyle({fillColor: 'blue'});
		currentSelected = undefined;
		mouseState = 0;
		break;
	//Adding a point
	case 4:
		addPoint(e.latlng);
		currentShape = [];
		mouseState = 0;
		break;
	//Defining the start point of a circle
	case 5:
		addPoint(e.latlng);
		mouseState = 6;
		break;
	//Defining the radius of the circle 
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

var cutPoint = function(e) {
	switch(mouseState){
	case 0:
		var polygon = L.polygon(e)
		currentShape = [];
		polygon.on('click', selectPolygon);
		polygon.addTo(polygons);
		break;
	case 1:
		mouseState = 0;
		break;
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

var definePolygon = function() {
	if(currentShape !== [])
		currentShape = [];
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
	mouseState = 1;
}

var definePoint = function() {
	if(currentShape !== [])
		currentShape = [];
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
	mouseState = 4;
}

var defineCircle = function() {
	if(currentShape !== [])
		currentShape = [];
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
	mouseState = 5;
}

var selectPolygon = function(polygon) {
	//reset if previous shape had been selected
	if(currentSelected !== undefined)
	{
		polygons.eachLayer(function (shape) {
			shape.setStyle({fillColor: 'blue'});
		});
		circles.eachLayer(function (shape) {
			shape.setStyle({fillColor: 'blue'});
		});
	}
	corners.clearLayers();
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

var selectCircle = function(circle) {
	//reset if previous shape had been selected
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
	corners.clearLayers();
	circle.target.setStyle({fillColor: 'yellow'});
	//Create a marker at the center of the circle
	var position = circle.target._latlng;
	var marker = new L.marker(position, {draggable: true});
	marker.on('dragstart', recordPosition);
	marker.on('dragend', setPosition);
	corners.addLayer(marker);

	//create a marker at the top of the circle
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

var recordPosition = function(element) {
	switch(mouseState)
	{
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
		//Get lines attached to that point
		var ends = []
		corners.eachLayer(function (corner) {
			ends.push(corner.getLatLng());
		});
		ends[currentMarker] = element.target.getLatLng();
		line.setLatLngs(ends);
		break;
	//Shape selected
	case 3:
		//Redraw the shape to match it's new coordinates
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
		if(corners.getLayers()[0]._leaflet_id == element.target._leaflet_id)
		{
			circle.setLatLng(element.target.getLatLng());
			var newCentre = element.target.getLatLng();
			var distance = circle.getRadius();
			var newLatLng = new L.latLng(newCentre.lat + getdistCoord(distance), newCentre.lng);
			corners.getLayers()[1].setLatLng(newLatLng);
		}
		else
		{
			var centre = corners.getLayers()[0];
			var distance = element.target.getLatLng().distanceTo(centre.getLatLng());
			circle.setRadius(distance);
		}
		break;
	default:
		break;
	}
}

var getdistCoord = function (distance){
	const RAD = 0.000008998719243599958;
	return distance * RAD;
}